// アウトバウンド機能のAPIルート
const express = require('express');
const router = express.Router();
const { kv, readData, writeData, getAccounts } = require('../lib/kv');
const { requireAuth, rateLimit } = require('../lib/auth');
const { encrypt, decrypt } = require('../lib/encrypt');

// ロール取得ヘルパー
async function getRole(accountId) {
  const accounts = await getAccounts();
  return accounts.find(a => a.id === accountId)?.role || null;
}

// ISチーム（admin/member）のみ許可
async function checkIS(req, res) {
  const role = await getRole(req.accountId);
  if (role !== 'admin' && role !== 'member') {
    res.status(403).json({ error: 'ISチームのみ実行できます' });
    return false;
  }
  return true;
}

// アウトバウンド書き込み権限（outbound + admin）
async function checkOutboundWrite(req, res) {
  const role = await getRole(req.accountId);
  if (role !== 'outbound' && role !== 'admin') {
    res.status(403).json({ error: '権限がありません' });
    return false;
  }
  return true;
}

// リスト一覧取得（全ロール）
router.get('/api/outbound/lists', requireAuth, rateLimit, async (req, res) => {
  const lists = (await readData('outbound_lists')) || [];
  res.json(lists);
});

// リスト作成（ISチームのみ）
router.post('/api/outbound/lists', requireAuth, rateLimit, async (req, res) => {
  if (!await checkIS(req, res)) return;

  const { name, leads } = req.body;
  if (!name || !Array.isArray(leads)) {
    return res.status(400).json({ error: 'リスト名と架電リストが必要です' });
  }

  const listId = 'obl_' + Date.now();
  const leadsWithMeta = leads.map((l, i) => ({
    id: `ol_${listId}_${i}`,
    listId,
    company:  l.company  || '',
    contact:  l.contact  || '',
    phone:    l.phone    || '',
    mobile:   l.mobile   || '',
    email:    l.email    || '',
    industry: l.industry || '',
    position: l.position || '',
    address:  l.address  || '',
    memo:     l.memo     || '',
    status: '未架電',
    callHistory: [],
    appointmentInfo: null,
  }));

  const lists = (await readData('outbound_lists')) || [];
  await writeData('outbound_lists', [...lists, {
    id: listId,
    name,
    createdAt: new Date().toISOString(),
    leadCount: leadsWithMeta.length,
  }]);
  await writeData(`outbound_leads:${listId}`, leadsWithMeta);

  res.json({ ok: true, listId });
});

// リスト削除（ISチームのみ）
router.delete('/api/outbound/lists/:listId', requireAuth, rateLimit, async (req, res) => {
  if (!await checkIS(req, res)) return;

  const { listId } = req.params;
  const lists = (await readData('outbound_lists')) || [];
  await writeData('outbound_lists', lists.filter(l => l.id !== listId));
  await kv.del(`outbound_leads:${listId}`);
  res.json({ ok: true });
});

// リードデータ取得（全ロール）
router.get('/api/outbound/leads/:listId', requireAuth, rateLimit, async (req, res) => {
  const leads = (await readData(`outbound_leads:${req.params.listId}`)) || [];
  res.json(leads);
});

// リードデータ保存（outbound + admin）
router.put('/api/outbound/leads/:listId', requireAuth, rateLimit, async (req, res) => {
  if (!await checkOutboundWrite(req, res)) return;

  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: 'リードデータが不正です' });
  }

  const { listId } = req.params;
  await writeData(`outbound_leads:${listId}`, req.body);

  // リスト件数を最新値に同期
  const lists = (await readData('outbound_lists')) || [];
  await writeData('outbound_lists', lists.map(l =>
    l.id === listId ? { ...l, leadCount: req.body.length } : l
  ));

  res.json({ ok: true });
});

// Chatwork送信（outbound + admin）
router.post('/api/outbound/chatwork', requireAuth, rateLimit, async (req, res) => {
  if (!await checkOutboundWrite(req, res)) return;

  const config = (await readData('outbound_config')) || {};
  const roomId = config.roomId;
  if (!roomId) {
    return res.status(400).json({ error: 'Chatwork設定が未完了です。管理者にお問い合わせください。' });
  }

  // ユーザー個人のトークンのみ使用
  const accounts = await getAccounts();
  const userAccount = accounts.find(a => a.id === req.accountId);
  const apiToken = userAccount?.chatworkApiToken ? decrypt(userAccount.chatworkApiToken) : null;

  if (!apiToken) {
    return res.status(400).json({ error: 'Chatwork APIトークンが設定されていません。設定＞API設定からご自身のトークンを登録してください。' });
  }

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'メッセージが空です' });

  // 登録済みメンション先をメッセージ先頭に付与
  const mentions = (config.mentions || [])
    .filter(m => m.id)
    .map(m => `[To:${m.id}]${m.name || ''}`)
    .join('\n');
  const body = mentions ? `${mentions}\n${message}` : message;

  try {
    const r = await fetch(`https://api.chatwork.com/v2/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: {
        'X-ChatWorkToken': apiToken,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ body }).toString(),
    });
    if (!r.ok) {
      console.error('Chatwork API error:', r.status, await r.text());
      return res.status(502).json({ error: 'Chatworkへの送信に失敗しました。設定を確認してください。' });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('Chatwork fetch error:', e);
    res.status(502).json({ error: 'Chatworkとの通信に失敗しました。' });
  }
});

// Chatwork設定取得（adminのみ・トークンは非表示）
router.get('/api/outbound/config', requireAuth, rateLimit, async (req, res) => {
  if (await getRole(req.accountId) !== 'admin') {
    return res.status(403).json({ error: '管理者のみ実行できます' });
  }
  const config = (await readData('outbound_config')) || {};
  res.json({ roomId: config.roomId || '', mentions: config.mentions || [], apiTokenConfigured: !!config.apiToken });
});

// Chatwork設定保存（adminのみ）
router.post('/api/outbound/config', requireAuth, rateLimit, async (req, res) => {
  if (await getRole(req.accountId) !== 'admin') {
    return res.status(403).json({ error: '管理者のみ実行できます' });
  }
  const { apiToken, roomId, mentions } = req.body;
  const existing = (await readData('outbound_config')) || {};
  await writeData('outbound_config', {
    roomId:   roomId   ?? existing.roomId   ?? '',
    mentions: mentions ?? existing.mentions ?? [],
    apiToken: apiToken ? encrypt(apiToken) : (existing.apiToken || ''),
  });
  res.json({ ok: true });
});

module.exports = router;
