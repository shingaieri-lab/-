const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

const DATA_DIR = process.env.VERCEL ? '/tmp/data' : path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// セッション管理（メモリ内）
const sessions = {}; // token -> accountId

const DEFAULT_ACCOUNTS = [
  { id: "shingai",   name: "新谷",  password: "1234", role: "admin",  color: "#7c3aed", email: "" },
  { id: "kitahara",  name: "北原",  password: "1234", role: "member", color: "#0369a1", email: "" },
];

function readData(key) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${key}.json`), 'utf8')); } catch { return null; }
}
function writeData(key, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${key}.json`), JSON.stringify(data, null, 2));
}
function getAccounts() {
  return readData('accounts') || DEFAULT_ACCOUNTS;
}

function requireAuth(req, res, next) {
  const token = req.headers['x-session-token'];
  if (!token || !sessions[token]) return res.status(401).json({ error: 'Unauthorized' });
  req.accountId = sessions[token];
  next();
}

// ログイン（認証不要）
app.post('/api/login', (req, res) => {
  const { id, password } = req.body;
  const accounts = getAccounts();
  const account = accounts.find(a => a.id === id && a.password === password);
  if (!account) return res.status(401).json({ error: 'IDまたはパスワードが違います' });
  const token = crypto.randomBytes(32).toString('hex');
  sessions[token] = id;
  res.json({ token, account });
});

// 新規アカウント作成（認証不要）
app.post('/api/signup', (req, res) => {
  const newAccount = req.body;
  const accounts = getAccounts();
  if (accounts.some(a => a.id === newAccount.id)) {
    return res.status(409).json({ error: 'このIDは既に使われています' });
  }
  accounts.push({ ...newAccount, role: 'admin' });
  writeData('accounts', accounts);
  res.json({ ok: true });
});

// ログアウト
app.post('/api/logout', requireAuth, (req, res) => {
  delete sessions[req.headers['x-session-token']];
  res.json({ ok: true });
});

// 全データ一括取得（ログイン後の初期ロード用）
app.get('/api/data', requireAuth, (req, res) => {
  res.json({
    accounts: getAccounts(),
    leads: readData('leads') || [],
    masterSettings: readData('master_settings'),
    aiConfig: readData('ai_config') || {},
    gcalConfig: readData('gcal_config') || {},
    emailTpls: readData('email_tpls'),
  });
});

// アカウント一覧保存
app.post('/api/accounts', requireAuth, (req, res) => {
  writeData('accounts', req.body);
  res.json({ ok: true });
});

// リード保存
app.post('/api/leads', requireAuth, (req, res) => {
  writeData('leads', req.body);
  res.json({ ok: true });
});

// マスター設定保存
app.post('/api/master-settings', requireAuth, (req, res) => {
  writeData('master_settings', req.body);
  res.json({ ok: true });
});

// AI設定保存（Gemini APIキー・Gmail OAuth）
app.post('/api/ai-config', requireAuth, (req, res) => {
  writeData('ai_config', req.body);
  res.json({ ok: true });
});

// カレンダー設定保存（全ユーザー共通）
app.post('/api/gcal-config', requireAuth, (req, res) => {
  writeData('gcal_config', req.body);
  res.json({ ok: true });
});

// メールテンプレート保存
app.post('/api/email-tpls', requireAuth, (req, res) => {
  writeData('email_tpls', req.body);
  res.json({ ok: true });
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`IS進捗管理 サーバー起動: http://localhost:${PORT}`);
    console.log(`データ保存先: ${DATA_DIR}`);
  });
}

module.exports = app;
