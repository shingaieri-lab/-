// Zoho CRM API連携の共通処理
const crypto = require('crypto');
const { kv, readData, writeData } = require('./kv');

// Zohoデータセンターに応じたドメイン
function getZohoDomain(dc) {
  return dc === 'com' ? 'zoho.com' : 'zoho.jp';
}

// Zohoトークン取得・保存
async function getZohoTokens() {
  return (await readData('zoho_tokens')) || null;
}

async function saveZohoTokens(tokens) {
  await writeData('zoho_tokens', tokens);
}

// Access Tokenをリフレッシュ（期限切れ時に自動更新）
// KVロックで複数リクエストの同時リフレッシュを防止
async function refreshZohoToken() {
  const lockKey = 'zoho_refresh_lock';
  const lockVal = crypto.randomBytes(8).toString('hex');
  const lockAcquired = await kv.set(lockKey, lockVal, { nx: true, ex: 30 });

  if (!lockAcquired) {
    // 別のプロセスがリフレッシュ中 → 1秒待って最新トークンを返す
    await new Promise(r => setTimeout(r, 1000));
    return await getZohoTokens();
  }

  try {
    const cfg = await readData('zoho_config');
    const tokens = await getZohoTokens();
    if (!cfg || !tokens?.refresh_token) throw new Error('Zoho未認証');

    const domain = getZohoDomain(cfg.dataCenter);
    const params = new URLSearchParams({
      refresh_token: tokens.refresh_token,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'refresh_token',
    });
    const r = await fetch(`https://accounts.${domain}/oauth/v2/token`, { method: 'POST', body: params });
    const data = await r.json();
    if (!data.access_token) throw new Error('トークンリフレッシュ失敗: ' + JSON.stringify(data));

    const newTokens = {
      ...tokens,
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in - 60) * 1000,
    };
    await saveZohoTokens(newTokens);
    return newTokens;
  } finally {
    const cur = await kv.get(lockKey);
    if (cur === lockVal) await kv.del(lockKey);
  }
}

// Zoho API呼び出し（トークン自動更新付き）
async function zohoApi(method, path, body) {
  const cfg = await readData('zoho_config');
  let tokens = await getZohoTokens();
  if (!cfg || !tokens) throw new Error('Zoho未認証');

  if (!tokens.expires_at || Date.now() > tokens.expires_at) {
    tokens = await refreshZohoToken();
  }

  const domain = getZohoDomain(cfg.dataCenter);
  const opts = {
    method,
    headers: {
      'Authorization': 'Zoho-oauthtoken ' + tokens.access_token,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const r = await fetch(`https://www.zohoapis.${domain}/crm/v2${path}`, opts);
  return r.json();
}

module.exports = { getZohoDomain, getZohoTokens, saveZohoTokens, refreshZohoToken, zohoApi };
