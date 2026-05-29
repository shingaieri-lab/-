// Zoho CRM連携ルート
const express = require('express');
const crypto = require('crypto');
const { kv, readData, writeData } = require('../lib/kv');
const { requireAuth, rateLimit } = require('../lib/auth');
const { getZohoDomain, getZohoTokens, saveZohoTokens, refreshZohoToken, zohoApi } = require('../lib/zoho');
const { encrypt, decrypt } = require('../lib/encrypt');

const router = express.Router();

// Zoho設定保存（管理者のみ）
router.post('/api/zoho-config', requireAuth, rateLimit, async (req, res) => {
  const accounts = (await readData('accounts')) || [];
  const account = accounts.find(a => a.id === req.accountId);
  if (!account || account.role !== 'admin') {
    return res.status(403).json({ error: '管理者のみ実行できます' });
  }
  const existing = await readData('zoho_config');
  const { clientSecret, ...rest } = req.body;
  const newConfig = clientSecret
    ? { ...rest, clientSecret: encrypt(clientSecret) }
    : { ...rest, clientSecret: existing?.clientSecret };
  await writeData('zoho_config', newConfig);
  res.json({ ok: true });
});

// Zoho OAuth認証開始
router.get('/api/zoho/auth', async (req, res) => {
  // セッション確認（未認証時はJSON代わりにHTMLメッセージを返す）
  const token = req.cookies?.session;
  if (!token) {
    return res.status(401).send('<html><body style="font-family:sans-serif;padding:24px"><p style="color:#dc2626;font-weight:bold">セッションが切れています。<br>一度ログアウトして再度ログインしてから、もう一度「Zoho認証」を押してください。</p></body></html>');
  }
  try {
    const accountId = await kv.get('session:' + token);
    if (!accountId) {
      return res.status(401).send('<html><body style="font-family:sans-serif;padding:24px"><p style="color:#dc2626;font-weight:bold">セッションが切れています。<br>一度ログアウトして再度ログインしてから、もう一度「Zoho認証」を押してください。</p></body></html>');
    }
  } catch {
    return res.status(503).send('<html><body style="font-family:sans-serif;padding:24px"><p style="color:#dc2626;font-weight:bold">サーバーエラーが発生しました。しばらくしてから再試行してください。</p></body></html>');
  }
  const cfg = await readData('zoho_config');
  if (!cfg?.clientId) return res.status(400).json({ error: 'Zoho Client IDが未設定です' });

  const domain = getZohoDomain(cfg.dataCenter);
  const scopes = [
    'ZohoCRM.modules.ALL',
    'ZohoCRM.users.ALL',
    'ZohoCRM.settings.ALL',  // フィールド設定情報の読み取り（フィールド一覧取得に必要）
  ].join(',');

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const redirectUri = process.env.ZOHO_REDIRECT_URI || `${protocol}://${req.headers.host}/api/zoho/callback`;
  const url = `https://accounts.${domain}/oauth/v2/auth?response_type=code&client_id=${cfg.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&access_type=offline&prompt=consent`;
  res.redirect(url);
});

// Zoho OAuth コールバック（認証コードをトークンに交換）
router.get('/api/zoho/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.status(400).send('認証エラー: ' + (error || 'コードなし'));

  const cfg = await readData('zoho_config');
  if (!cfg?.clientId) return res.status(400).send('Zoho設定が未完了です');

  const domain = getZohoDomain(cfg.dataCenter);
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const redirectUri = process.env.ZOHO_REDIRECT_URI || `${protocol}://${req.headers.host}/api/zoho/callback`;
  const params = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: decrypt(cfg.clientSecret),
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  try {
    const r = await fetch(`https://accounts.${domain}/oauth/v2/token`, { method: 'POST', body: params });
    const data = await r.json();
    if (!data.access_token) throw new Error(JSON.stringify(data));

    await saveZohoTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in - 60) * 1000,
    });
    const origin = `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers.host}`;
    res.send(`<html><body><script>window.opener&&window.opener.postMessage("zoho_auth_success",${JSON.stringify(origin)});window.close();</script><p>認証完了。このウィンドウを閉じてください。</p></body></html>`);
  } catch (e) {
    res.status(500).send('トークン取得エラー: ' + e.message);
  }
});

// Zoho連携状態確認
router.get('/api/zoho/status', requireAuth, rateLimit, async (req, res) => {
  const cfg = await readData('zoho_config');
  const tokens = await getZohoTokens();
  res.json({
    configured: !!(cfg?.clientId && cfg?.clientSecret),
    authenticated: !!tokens?.refresh_token,
  });
});

// ZohoリードIDを指定してリード情報を取込
router.post('/api/zoho/import-lead', requireAuth, rateLimit, async (req, res) => {
  const { zohoLeadId } = req.body;
  if (!zohoLeadId) return res.status(400).json({ error: 'Zoho Lead IDが必要です' });

  try {
    const leads = (await readData('leads')) || [];
    if (leads.some(l => l.zoho_lead_id === zohoLeadId)) {
      return res.status(409).json({ error: 'このZohoリードはすでに取込済みです' });
    }

    const cfg = await readData('zoho_config');
    const data = await zohoApi('GET', `/Leads/${zohoLeadId}`);
    if (!data.data?.[0]) return res.status(404).json({ error: 'Zohoリードが見つかりません' });

    const zl = data.data[0];
    const statusMap = cfg?.statusMap || {};
    const isField = cfg?.isFieldApiName || 'Main_IS_Member';
    const statusField = cfg?.leadStatusFieldApiName || 'Lead_Status';
    const isMemberMap = cfg?.isMemberMap || {};

    const zohoIsValue = zl[isField] || '';
    const zohoStatus = zl[statusField] || '';
    const today = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' });
    const zohoDomain = getZohoDomain(cfg?.dataCenter);
    const lead = {
      id: 'zoho-' + zohoLeadId + '-' + Date.now(),
      date: today,
      actions: [],
      created_at: Date.now(),
      company: zl.Company || '',
      contact: [zl.Last_Name, zl.First_Name].filter(Boolean).join(' '),
      email: zl.Email || '',
      address: [zl.State, zl.City, zl.Street].filter(Boolean).join(''),
      is_member: isMemberMap[zohoIsValue] || zohoIsValue,
      hp_url: zl.Website || '',
      status: statusMap[zohoStatus] || zohoStatus,
      zoho_lead_id: zl.id,
      zoho_url: `https://crm.${zohoDomain}/crm/tab/Leads/${zl.id}`,
      zoho_lead_type: zl.Lead_Type || '',
      zoho_synced_at: new Date().toISOString(),
    };

    res.json({ lead });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 本ツールのステータス変更をZohoリードに反映
router.post('/api/zoho/update-lead-status', requireAuth, rateLimit, async (req, res) => {
  const { zohoLeadId, localStatus } = req.body;
  if (!zohoLeadId || !localStatus) return res.status(400).json({ error: 'パラメータ不足' });

  try {
    const cfg = await readData('zoho_config');
    const reverseStatusMap = cfg?.reverseStatusMap || {};
    const zohoStatus = reverseStatusMap[localStatus] || localStatus;

    const data = await zohoApi('PUT', `/Leads/${zohoLeadId}`, {
      data: [{ id: zohoLeadId, Lead_Status: zohoStatus }],
    });

    if (data.data?.[0]?.status === 'success') {
      res.json({ ok: true, zohoStatus });
    } else {
      res.status(500).json({ error: 'Zohoステータス更新失敗', detail: data });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ZohoユーザーIDの一覧を取得（担当者マッピング設定用）
router.get('/api/zoho/users', requireAuth, rateLimit, async (req, res) => {
  try {
    const data = await zohoApi('GET', '/users?type=AllUsers');
    const users = (data.users || []).map(u => ({
      id: u.id,
      name: u.full_name,
      email: u.email,
    }));
    res.json({ ok: true, users });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Zohoから商談確定リードの「営業確度（初回商談時）」「ステージ」を一括同期
// 対象：status==='商談確定' かつ zoho_lead_id があるリード
//
// フロー：
//   ① zoho_deal_id をすでに持っていればそれを使う（キャッシュ）
//   ② 持っていなければ Zoho Lead API を叩いて、コンバート済み Lead から Deal ID を取得
//      （Zohoでは Lead を Deal にコンバートすると Lead.$converted_detail.Deals に Deal IDが入る）
//   ③ Deal ID で /Deals/{id} を取得し field46（営業確度）と Stage（ステージ）を抽出
//   ④ 取得した zoho_deal_id / sales_accuracy / deal_stage / sales_synced_at を本ツールに保存
router.post('/api/zoho/sync-deals', requireAuth, rateLimit, async (req, res) => {
  // outboundロール（業務委託）は同期不可（アポ一覧自体が非表示のため一貫性を保つ）
  const accounts = (await readData('accounts')) || [];
  const account = accounts.find(a => a.id === req.accountId);
  if (account?.role === 'outbound') {
    return res.status(403).json({ error: 'この機能を実行する権限がありません' });
  }

  try {
    const leads = (await readData('leads')) || [];
    // 同期対象：商談確定 かつ Zoho連携済み（zoho_lead_id あり）のリード
    const targets = leads.filter(l => l.status === '商談確定' && l.zoho_lead_id);
    // スキップ対象：商談確定だが Zoho 連携されていない（Zoho外で作成されたリード）
    const skipped = leads.filter(l => l.status === '商談確定' && !l.zoho_lead_id).length;

    if (targets.length === 0) {
      return res.json({ ok: true, synced: 0, total: 0, skipped, leads });
    }

    const fetchedAt = new Date().toISOString();
    // 並列でDeal情報を取得（Zoho APIのレート制限を考慮し、過剰並列は避ける）
    const results = await Promise.all(
      targets.map(async (lead) => {
        try {
          let dealId = lead.zoho_deal_id;

          // ① キャッシュがなければ、Lead から Deal を逆引き
          if (!dealId) {
            const leadResp = await zohoApi('GET', `/Leads/${lead.zoho_lead_id}`);
            const leadRec = leadResp.data?.[0];
            if (!leadRec) return { leadId: lead.id, error: 'Zohoリードが見つかりません' };
            if (!leadRec.$converted) return { leadId: lead.id, error: 'Zoho側でまだ商談化されていません' };
            // $converted_detail.Deals に Deal ID が入る（V2 API）
            dealId = leadRec.$converted_detail?.Deals;
            if (!dealId) return { leadId: lead.id, error: '商談情報の取得に失敗しました' };
          }

          // ② Deal情報を取得して営業確度・ステージを抜き出す
          const dealResp = await zohoApi('GET', `/Deals/${dealId}`);
          const deal = dealResp.data?.[0];
          if (!deal) return { leadId: lead.id, error: 'Zoho商談が見つかりません' };

          return {
            leadId:          lead.id,
            zoho_deal_id:    dealId,            // 次回以降のキャッシュ
            sales_accuracy:  deal.field46 || '',  // 営業確度（初回商談時）
            deal_stage:      deal.Stage    || '',  // ステージ
            sales_synced_at: fetchedAt,
          };
        } catch (e) {
          return { leadId: lead.id, error: e.message };
        }
      })
    );

    // 成功した結果でリードを更新
    const successResults = results.filter(r => r && !r.error);
    const updatedLeads = leads.map(l => {
      const r = successResults.find(r => r.leadId === l.id);
      if (!r) return l;
      return {
        ...l,
        zoho_deal_id:    r.zoho_deal_id,
        sales_accuracy:  r.sales_accuracy,
        deal_stage:      r.deal_stage,
        sales_synced_at: r.sales_synced_at,
      };
    });

    await writeData('leads', updatedLeads);

    res.json({
      ok: true,
      synced: successResults.length,
      total: targets.length,
      skipped,
      errors: results.filter(r => r && r.error).map(r => ({ leadId: r.leadId, error: r.error })),
      leads: updatedLeads,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 【開発用】Zohoの指定モジュールのフィールド一覧を取得
// 営業確度・ステージなど、ZohoのAPI名（半角英数字）を確認するためのデバッグ用
// 管理者のみ実行可能
router.get('/api/zoho/module-fields', requireAuth, rateLimit, async (req, res) => {
  const accounts = (await readData('accounts')) || [];
  const account = accounts.find(a => a.id === req.accountId);
  if (!account || account.role !== 'admin') {
    return res.status(403).json({ error: '管理者のみ実行できます' });
  }
  const module = (req.query.module || 'Deals').toString();
  // SSRF対策：許可された英数字のみを通す
  if (!/^[A-Za-z0-9_]+$/.test(module)) {
    return res.status(400).json({ error: '不正なモジュール名です' });
  }
  try {
    const data = await zohoApi('GET', `/settings/fields?module=${module}`);
    if (data.code) {
      return res.status(400).json({ error: `Zoho APIエラー: ${data.code} ${data.message || ''}` });
    }
    const fields = (data.fields || []).map(f => ({
      label:    f.field_label,
      apiName:  f.api_name,
      dataType: f.data_type,
      isCustom: !!f.custom_field,
      // 選択肢フィールドの場合、選択肢一覧も返す
      pickList: Array.isArray(f.pick_list_values)
        ? f.pick_list_values.map(p => p.display_value)
        : null,
    }));
    res.json({ ok: true, module, fields });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// アクション履歴をZohoに行動（Events）として登録
router.post('/api/zoho/push-action', requireAuth, rateLimit, async (req, res) => {
  const { zohoLeadId, action } = req.body;
  if (!zohoLeadId || !action) return res.status(400).json({ error: 'パラメータ不足' });

  try {
    const dateStr = action.date || new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' });
    const timeStr = action.time || '09:00';
    const startDateTime = `${dateStr}T${timeStr}:00+09:00`;

    const typeToMethod = { call: '電話', email: 'メール', sms: 'SMS', other: 'その他' };
    const method = typeToMethod[action.type] || 'その他';

    const leads = (await readData('leads')) || [];
    const storedLead = leads.find(l => l.zoho_lead_id === zohoLeadId);
    const contactName = storedLead?.contact || '';

    const zohoConfig = await readData('zoho_config');
    const zohoUserId = zohoConfig?.memberUserIdMap?.[req.accountId];

    const eventRecord = {
      Name: '電話）インバウンド',
      field34: '電話）インバウンド',
      field12: startDateTime,
      field24: '追客',
      field22: method,
      field2: action.summary || '',
      field16: { id: zohoLeadId, name: contactName },
    };
    if (zohoUserId) {
      eventRecord.Owner = { id: zohoUserId };
      eventRecord.field15 = { id: zohoUserId };
    }

    const data = await zohoApi('POST', '/Event', { data: [eventRecord] });

    if (data.data?.[0]?.status === 'success') {
      res.json({ ok: true, activityId: data.data[0].details?.id });
    } else {
      res.status(500).json({ error: '行動作成失敗', detail: data });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 商談確定時: Zohoに取引先・取引先責任者・商談を一括作成
router.post('/api/zoho/create-deal', requireAuth, rateLimit, async (req, res) => {
  const { lead } = req.body;
  if (!lead?.company || !lead?.id) return res.status(400).json({ error: 'リード情報が不足しています' });

  const leads = (await readData('leads')) || [];
  const storedLead = leads.find(l => l.id === lead.id);
  if (storedLead?.zoho_deal_id) {
    return res.status(409).json({
      error: 'この商談はすでにZohoに作成済みです',
      zoho_deal_id: storedLead.zoho_deal_id,
      zoho_account_id: storedLead.zoho_account_id,
      zoho_contact_id: storedLead.zoho_contact_id,
    });
  }

  const cfg = await readData('zoho_config');

  try {
    const accountRes = await zohoApi('POST', '/Accounts', {
      data: [{ Account_Name: lead.company, Website: lead.hp_url || undefined }],
    });
    if (accountRes.data?.[0]?.status !== 'success') {
      return res.status(500).json({ error: '取引先作成失敗', detail: accountRes });
    }
    const accountId = accountRes.data[0].details?.id;

    const parts = (lead.contact || '').split(/\s+/);
    const lastName = parts[0] || lead.contact || '（未設定）';
    const firstName = parts.slice(1).join(' ') || undefined;
    const contactRes = await zohoApi('POST', '/Contacts', {
      data: [{
        Last_Name: lastName,
        First_Name: firstName,
        Email: lead.email || undefined,
        Account_Name: { id: accountId },
      }],
    });
    if (contactRes.data?.[0]?.status !== 'success') {
      return res.status(500).json({ error: '取引先責任者作成失敗', detail: contactRes });
    }
    const contactId = contactRes.data[0].details?.id;

    const probMap = { 'D（20％）': 20, 'C（40％）': 40, 'B（60％）': 60, 'A（80％）': 80 };
    const probability = probMap[lead.is_accuracy] || 20;
    const closingDate = lead.meeting_date || new Date().toISOString().slice(0, 10);

    const dealData = {
      Deal_Name: lead.zoho_lead_type,
      Account_Name: { id: accountId },
      Contact_Name: { id: contactId },
      Stage: '提案中',
      Probability: probability,
      Closing_Date: closingDate,
    };
    if (cfg?.meetingDateFieldApiName) dealData[cfg.meetingDateFieldApiName] = closingDate;
    if (cfg?.closingDateFieldApiName) dealData[cfg.closingDateFieldApiName] = closingDate;

    const dealRes = await zohoApi('POST', '/Deals', { data: [dealData] });
    if (dealRes.data?.[0]?.status !== 'success') {
      return res.status(500).json({ error: '商談作成失敗', detail: dealRes });
    }
    const dealId = dealRes.data[0].details?.id;

    let kvSaveFailed = false;
    if (storedLead) {
      try {
        storedLead.zoho_deal_id = dealId;
        storedLead.zoho_account_id = accountId;
        storedLead.zoho_contact_id = contactId;
        await writeData('leads', leads);
      } catch {
        kvSaveFailed = true;
      }
    } else {
      kvSaveFailed = true;
    }

    res.json({ ok: true, accountId, contactId, dealId, ...(kvSaveFailed && { warn: 'kv_save_failed' }) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Zoho Webhook受信
router.post('/api/zoho/webhook', async (req, res) => {
  // ① URLトークン検証（既存）
  const webhookToken = process.env.ZOHO_WEBHOOK_TOKEN;
  if (!webhookToken) {
    console.error('ZOHO_WEBHOOK_TOKEN が未設定です');
    return res.status(500).json({ error: 'サーバー設定エラー' });
  }
  if (req.query.token !== webhookToken) {
    return res.status(401).json({ error: '認証エラー' });
  }

  // ② HMAC-SHA256 署名検証（ZOHO_WEBHOOK_SECRET が設定されている場合は必須）
  // Zoho 側で "X-Zoho-Webhook-Signature" ヘッダーに HMAC-SHA256(body, secret) を設定する
  const webhookSecret = process.env.ZOHO_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers['x-zoho-webhook-signature'] || '';
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody || '')
      .digest('hex');
    let valid = false;
    try {
      valid = crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(signature.toLowerCase().replace(/^sha256=/, ''), 'hex')
      );
    } catch {
      valid = false;
    }
    if (!valid) {
      return res.status(401).json({ error: '署名が不正です' });
    }
  } else {
    console.warn('[webhook] ZOHO_WEBHOOK_SECRET 未設定: HMAC-SHA256 署名検証をスキップします');
  }

  const lockKey = 'webhook_lock';
  const lockVal = crypto.randomBytes(8).toString('hex');
  const lockAcquired = await kv.set(lockKey, lockVal, { nx: true, ex: 30 });
  if (!lockAcquired) {
    return res.status(409).json({ error: 'webhook処理中です。しばらくしてから再試行してください。' });
  }

  try {
    const payload = req.body;
    const leads = (await readData('leads')) || [];
    const cfg = await readData('zoho_config');
    const isField = cfg?.isFieldApiName || 'Main_IS_Member';
    const statusField = cfg?.leadStatusFieldApiName || 'Lead_Status';
    const statusMap = cfg?.statusMap || {};
    const isMemberMap = cfg?.isMemberMap || {};

    const accounts = (await readData('accounts')) || [];
    const registeredMembers = new Set(
      accounts.some(a => a.isStaff)
        ? accounts.filter(a => a.isStaff).map(a => a.name)
        : accounts.map(a => a.name)
    );

    if (payload.module === 'Leads' && Array.isArray(payload.ids)) {
      for (const zohoId of payload.ids) {
        const data = await zohoApi('GET', `/Leads/${zohoId}`);
        const zl = data.data?.[0];
        if (!zl) continue;

        const zohoIsValue = zl[isField] || '';
        const mappedMember = isMemberMap[zohoIsValue] || zohoIsValue;

        if (registeredMembers.size > 0 && !registeredMembers.has(mappedMember)) continue;

        const patch = {
          company: zl.Company || '',
          contact: [zl.Last_Name, zl.First_Name].filter(Boolean).join(' '),
          email: zl.Email || '',
          address: [zl.State, zl.City, zl.Street].filter(Boolean).join(''),
          is_member: mappedMember,
          hp_url: zl.Website || '',
          status: statusMap[zl[statusField] || ''] || zl[statusField] || '',
          zoho_lead_id: zohoId,
          zoho_url: `https://crm.${getZohoDomain(cfg?.dataCenter)}/crm/tab/Leads/${zohoId}`,
          zoho_lead_type: zl.Lead_Type || '',
          zoho_synced_at: new Date().toISOString(),
        };

        const existing = leads.find(l => l.zoho_lead_id === zohoId);
        if (existing) {
          Object.assign(existing, patch);
        } else {
          leads.push({
            id: 'zoho-' + zohoId + '-' + Date.now(),
            ...patch,
            date: new Date().toISOString().slice(0, 10),
            actions: [],
          });
        }
      }
      await writeData('leads', leads);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    const cur = await kv.get(lockKey);
    if (cur === lockVal) await kv.del(lockKey);
  }
});

module.exports = router;
