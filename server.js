const express = require('express');
const { kv } = require('@vercel/kv');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

// セッション管理（メモリ内）
const sessions = {}; // token -> accountId

const DEFAULT_ACCOUNTS = [];

async function readData(key) {
  try { return await kv.get(key); } catch { return null; }
}

async function writeData(key, data) {
  await kv.set(key, data);
}

async function getAccounts() {
  return (await readData('accounts')) || DEFAULT_ACCOUNTS;
}

function requireAuth(req, res, next) {
  const token = req.headers['x-session-token'];
  if (!token || !sessions[token]) return res.status(401).json({ error: 'Unauthorized' });
  req.accountId = sessions[token];
  next();
}

// ログイン（認証不要）
app.post('/api/login', async (req, res) => {
  const { id, password } = req.body;
  const accounts = await getAccounts();
  const account = accounts.find(a => a.id === id && a.password === password);
  if (!account) return res.status(401).json({ error: 'IDまたはパスワードが違います' });
  const token = crypto.randomBytes(32).toString('hex');
  sessions[token] = id;
  res.json({ token, account });
});

// 新規アカウント作成（認証不要）
app.post('/api/signup', async (req, res) => {
  const newAccount = req.body;
  const accounts = await getAccounts();
  if (accounts.some(a => a.id === newAccount.id)) {
    return res.status(409).json({ error: 'このIDは既に使われています' });
  }
  accounts.push({ ...newAccount, role: 'admin' });
  await writeData('accounts', accounts);
  res.json({ ok: true });
});

// ログアウト
app.post('/api/logout', requireAuth, (req, res) => {
  delete sessions[req.headers['x-session-token']];
  res.json({ ok: true });
});

// 全データ一括取得（ログイン後の初期ロード用）
app.get('/api/data', requireAuth, async (req, res) => {
  res.json({
    accounts: await getAccounts(),
    leads: (await readData('leads')) || [],
    masterSettings: await readData('master_settings'),
    aiConfig: (await readData('ai_config')) || {},
    gcalConfig: (await readData('gcal_config')) || {},
    emailTpls: await readData('email_tpls'),
  });
});

// アカウント一覧保存
app.post('/api/accounts', requireAuth, async (req, res) => {
  await writeData('accounts', req.body);
  res.json({ ok: true });
});

// リード保存
app.post('/api/leads', requireAuth, async (req, res) => {
  await writeData('leads', req.body);
  res.json({ ok: true });
});

// マスター設定保存
app.post('/api/master-settings', requireAuth, async (req, res) => {
  await writeData('master_settings', req.body);
  res.json({ ok: true });
});

// AI設定保存（Gemini APIキー・Gmail OAuth）
app.post('/api/ai-config', requireAuth, async (req, res) => {
  await writeData('ai_config', req.body);
  res.json({ ok: true });
});

// カレンダー設定保存（全ユーザー共通）
app.post('/api/gcal-config', requireAuth, async (req, res) => {
  await writeData('gcal_config', req.body);
  res.json({ ok: true });
});

// メールテンプレート保存
app.post('/api/email-tpls', requireAuth, async (req, res) => {
  await writeData('email_tpls', req.body);
  res.json({ ok: true });
});

// 全データリセット（管理者のみ）
app.post('/api/reset', requireAuth, async (req, res) => {
  const accounts = await getAccounts();
  const account = accounts.find(a => a.id === req.accountId);
  if (!account || account.role !== 'admin') {
    return res.status(403).json({ error: '管理者のみ実行できます' });
  }
  try {
    await kv.del('accounts');
    await kv.del('leads');
    await kv.del('master_settings');
    await kv.del('ai_config');
    await kv.del('gcal_config');
    await kv.del('email_tpls');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'リセットに失敗しました: ' + e.message });
  }
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`IS進捗管理 サーバー起動: http://localhost:${PORT}`);
  });
}

module.exports = app;
