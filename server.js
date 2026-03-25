const express = require('express');
const { kv } = require('@vercel/kv');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10; // ハッシュ化の強度（数値が大きいほど安全だが遅い）

// パスワード暗号化キー
// PASSWORD_ENC_KEY（64文字16進数）を推奨。未設定時はKVトークンから自動導出
const ENC_KEY = process.env.PASSWORD_ENC_KEY
  ? Buffer.from(process.env.PASSWORD_ENC_KEY, 'hex')
  : crypto.createHash('sha256').update(process.env.KV_REST_API_TOKEN || 'internal-fallback-key').digest();

// AES-256-GCMでパスワードを暗号化（管理者表示用）
function encryptPassword(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

// AES-256-GCMでパスワードを復号
function decryptPassword(encoded) {
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

// APIレート制限ミドルウェア（1分間に100リクエストまで）
const RATE_LIMIT = 100;
async function rateLimit(req, res, next) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const minute = Math.floor(Date.now() / 60000);
  const key = `rateLimit:${ip}:${minute}`;
  try {
    const count = await kv.incr(key);
    if (count === 1) await kv.expire(key, 120); // 2分でTTL（次の分のリクエストも考慮）
    if (count > RATE_LIMIT) {
      return res.status(429).json({ error: 'リクエスト数の上限に達しました。しばらくしてから再試行してください。' });
    }
  } catch { /* KVエラー時はスルー（可用性優先） */ }
  next();
}

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

// セッション管理（Vercel KV）: サーバーレス環境でもセッションを永続化
async function requireAuth(req, res, next) {
  const token = req.headers['x-session-token'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const accountId = await kv.get('session:' + token);
    if (!accountId) return res.status(401).json({ error: 'Unauthorized' });
    req.accountId = accountId;
    next();
  } catch {
    return res.status(503).json({ error: 'Service unavailable' });
  }
}

// ブルートフォース対策の定数
const LOGIN_FAIL_LIMIT = 5;        // 何回失敗でロックするか
const LOGIN_LOCKOUT_SEC = 15 * 60; // ロック時間（秒）= 15分

// ログイン（認証不要）
app.post('/api/login', async (req, res) => {
  const { id, password } = req.body;

  // ブルートフォース対策: 失敗回数をVercel KVで管理
  const failKey = 'loginFail:' + id;
  const failCount = (await kv.get(failKey)) || 0;
  if (failCount >= LOGIN_FAIL_LIMIT) {
    return res.status(429).json({ error: 'ログイン試行回数の上限に達しました。15分後に再試行してください。' });
  }

  const accounts = await getAccounts();
  const account = accounts.find(a => a.id === id);

  // ハッシュ化済み（$2で始まる）か平文かを判定して比較
  const isHashed = account && account.password && account.password.startsWith('$2');
  const passwordMatch = account && (isHashed
    ? await bcrypt.compare(password, account.password)
    : account.password === password); // 平文（移行前の古いアカウント）

  if (!account || !passwordMatch) {
    // 失敗カウントを+1（TTLはロック時間に合わせる）
    await kv.set(failKey, failCount + 1, { ex: LOGIN_LOCKOUT_SEC });
    return res.status(401).json({ error: 'IDまたはパスワードが違います' });
  }

  // ログイン成功: 失敗カウントをリセット
  await kv.del(failKey);

  // 平文パスワードだった場合はこのタイミングでハッシュ化して保存（自動移行）
  if (!isHashed) {
    account.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await writeData('accounts', accounts);
  }

  const token = crypto.randomBytes(32).toString('hex');
  await kv.set('session:' + token, id, { ex: 60 * 60 * 24 * 30 }); // 30日間有効
  const { password: _pw, ...safeAccount } = account; // パスワードを除外してから返す
  res.json({ token, account: safeAccount });
});

// パスワード強度チェック（8文字以上・英字と数字を含む）
function validatePassword(password) {
  if (!password || password.length < 8) return 'パスワードは8文字以上で入力してください';
  if (!/[a-zA-Z]/.test(password)) return 'パスワードに英字を含めてください';
  if (!/[0-9]/.test(password)) return 'パスワードに数字を含めてください';
  return null; // nullは問題なし
}

// 新規アカウント作成（招待コード必須）
app.post('/api/signup', async (req, res) => {
  const { inviteCode, ...newAccount } = req.body;

  // 招待コードの検証（アカウントが1件もない場合は初回セットアップとして免除）
  const existingAccounts = await getAccounts();
  if (existingAccounts.length > 0) {
    if (!inviteCode) return res.status(400).json({ error: '招待コードが必要です' });
    const inviteKey = 'invite:' + inviteCode;
    const valid = await kv.get(inviteKey);
    if (!valid) return res.status(400).json({ error: '招待コードが無効または期限切れです' });
    await kv.del(inviteKey); // 使用済みにする（1回限り有効）
  }

  // パスワード強度チェック
  const pwError = validatePassword(newAccount.password);
  if (pwError) return res.status(400).json({ error: pwError });

  if (existingAccounts.some(a => a.id === newAccount.id)) {
    return res.status(409).json({ error: 'このIDは既に使われています' });
  }
  // パスワードをハッシュ化（ログイン用）＋暗号化（管理者表示用）して保存
  const hashedPassword = await bcrypt.hash(newAccount.password, BCRYPT_ROUNDS);
  const encryptedPassword = encryptPassword(newAccount.password);
  existingAccounts.push({ ...newAccount, password: hashedPassword, password_enc: encryptedPassword, role: 'admin' });
  await writeData('accounts', existingAccounts);
  res.json({ ok: true });
});

// ログアウト
app.post('/api/logout', requireAuth, rateLimit, async (req, res) => {
  await kv.del('session:' + req.headers['x-session-token']);
  res.json({ ok: true });
});

// 招待コード発行（管理者のみ・24時間有効・1回限り・同時に1つのみ有効）
app.post('/api/invite', requireAuth, rateLimit, async (req, res) => {
  const accounts = await getAccounts();
  const account = accounts.find(a => a.id === req.accountId);
  if (!account || account.role !== 'admin') {
    return res.status(403).json({ error: '管理者のみ実行できます' });
  }
  // 既存の有効なコードを削除（1つのみ有効にするため）
  const oldCode = await kv.get('activeInviteCode');
  if (oldCode) await kv.del('invite:' + oldCode);
  // 新しいコードを発行
  const code = crypto.randomBytes(8).toString('hex'); // 16文字のランダムコード
  await kv.set('invite:' + code, true, { ex: 60 * 60 * 24 }); // 24時間有効
  await kv.set('activeInviteCode', code, { ex: 60 * 60 * 24 }); // 管理用に現在のコードを記録
  res.json({ code });
});

// リセットコードを使ったパスワード再設定（認証不要・ログインできない場合の救済）
app.post('/api/reset-password-with-code', rateLimit, async (req, res) => {
  const { id, code, newPassword } = req.body;
  if (!id || !code || !newPassword) return res.status(400).json({ error: '全項目入力してください' });
  const targetId = await kv.get('resetCode:' + code);
  if (!targetId || targetId !== id) {
    return res.status(400).json({ error: 'リセットコードが無効または期限切れです' });
  }
  const pwError = validatePassword(newPassword);
  if (pwError) return res.status(400).json({ error: pwError });
  const accounts = await getAccounts();
  const target = accounts.find(a => a.id === id);
  if (!target) return res.status(404).json({ error: 'アカウントが見つかりません' });
  target.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  target.password_enc = encryptPassword(newPassword);
  await writeData('accounts', accounts);
  await kv.del('resetCode:' + code); // 使用済みにする（1回限り）
  res.json({ ok: true });
});

// コードなしパスワード再設定（認証不要・ログインできない場合の救済）
app.post('/api/reset-password-direct', rateLimit, async (req, res) => {
  const { id, newPassword } = req.body;
  if (!id || !newPassword) return res.status(400).json({ error: '全項目入力してください' });
  const pwError = validatePassword(newPassword);
  if (pwError) return res.status(400).json({ error: pwError });
  const accounts = await getAccounts();
  const target = accounts.find(a => a.id === id);
  if (!target) return res.status(404).json({ error: 'アカウントが見つかりません' });
  target.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  target.password_enc = encryptPassword(newPassword);
  await writeData('accounts', accounts);
  // ログインロックもリセット
  await kv.del('loginFail:' + id);
  res.json({ ok: true });
});

// パスワードリセット（管理者のみ・対象アカウントのパスワードのみ更新）
app.post('/api/reset-password/:id', requireAuth, rateLimit, async (req, res) => {
  const accounts = await getAccounts();
  const requester = accounts.find(a => a.id === req.accountId);
  if (!requester || requester.role !== 'admin') {
    return res.status(403).json({ error: '管理者のみ実行できます' });
  }
  const { password } = req.body;
  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });
  const target = accounts.find(a => a.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'アカウントが見つかりません' });
  target.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
  target.password_enc = encryptPassword(password);
  await writeData('accounts', accounts);
  res.json({ ok: true });
});

// パスワード表示（管理者のみ・復号して返す）
app.get('/api/account-password/:id', requireAuth, rateLimit, async (req, res) => {
  const accounts = await getAccounts();
  const requester = accounts.find(a => a.id === req.accountId);
  if (!requester || requester.role !== 'admin') {
    return res.status(403).json({ error: '管理者のみ実行できます' });
  }
  const target = accounts.find(a => a.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'アカウントが見つかりません' });
  if (!target.password_enc) return res.status(404).json({ error: 'パスワード情報がありません（次回パスワード変更時に記録されます）' });
  try {
    const password = decryptPassword(target.password_enc);
    res.json({ password });
  } catch {
    res.status(500).json({ error: '復号に失敗しました' });
  }
});

// ロック中アカウント一覧取得（管理者のみ）
app.get('/api/login-locks', requireAuth, rateLimit, async (req, res) => {
  const accounts = await getAccounts();
  const account = accounts.find(a => a.id === req.accountId);
  if (!account || account.role !== 'admin') {
    return res.status(403).json({ error: '管理者のみ実行できます' });
  }
  const locks = {};
  for (const acc of accounts) {
    const failCount = await kv.get('loginFail:' + acc.id);
    if (failCount >= LOGIN_FAIL_LIMIT) locks[acc.id] = failCount;
  }
  res.json(locks);
});

// ロック解除（管理者のみ）
app.delete('/api/login-lock/:id', requireAuth, rateLimit, async (req, res) => {
  const accounts = await getAccounts();
  const account = accounts.find(a => a.id === req.accountId);
  if (!account || account.role !== 'admin') {
    return res.status(403).json({ error: '管理者のみ実行できます' });
  }
  await kv.del('loginFail:' + req.params.id);
  res.json({ ok: true });
});

// 全データ一括取得（ログイン後の初期ロード用）
app.get('/api/data', requireAuth, rateLimit, async (req, res) => {
  res.json({
    accounts: (await getAccounts()).map(({ password: _pw, password_enc: _enc, ...a }) => a), // パスワード情報を除外
    leads: (await readData('leads')) || [],
    masterSettings: await readData('master_settings'),
    aiConfig: (await readData('ai_config')) || {},
    gcalConfig: (await readData('gcal_config')) || {},
    emailTpls: await readData('email_tpls'),
  });
});

// アカウント一覧保存
app.post('/api/accounts', requireAuth, rateLimit, async (req, res) => {
  const accounts = req.body;
  const existingAccounts = await getAccounts();
  // パスワードが平文（ハッシュ未適用）のアカウントがあれば強度チェック後にハッシュ化する
  // パスワードが空の場合は既存のパスワードを保持する
  for (const account of accounts) {
    if (!account.password) {
      // パスワード未入力 → 既存のハッシュと暗号化値を保持
      const existing = existingAccounts.find(a => a.id === account.id);
      if (existing) {
        account.password = existing.password;
        account.password_enc = existing.password_enc;
      }
    } else if (!account.password.startsWith('$2')) {
      // 新しい平文パスワード → ハッシュ化＋暗号化
      const pwError = validatePassword(account.password);
      if (pwError) return res.status(400).json({ error: `${account.id}: ${pwError}` });
      account.password_enc = encryptPassword(account.password);
      account.password = await bcrypt.hash(account.password, BCRYPT_ROUNDS);
    } else {
      // 既にハッシュ化済み（通常は発生しないが念のため既存の暗号化値を保持）
      const existing = existingAccounts.find(a => a.id === account.id);
      if (existing) account.password_enc = existing.password_enc;
    }
  }
  await writeData('accounts', accounts);
  res.json({ ok: true });
});

// リード保存
app.post('/api/leads', requireAuth, rateLimit, async (req, res) => {
  await writeData('leads', req.body);
  res.json({ ok: true });
});

// マスター設定保存
app.post('/api/master-settings', requireAuth, rateLimit, async (req, res) => {
  await writeData('master_settings', req.body);
  res.json({ ok: true });
});

// AI設定保存（Gemini APIキー・Gmail OAuth）
app.post('/api/ai-config', requireAuth, rateLimit, async (req, res) => {
  await writeData('ai_config', req.body);
  res.json({ ok: true });
});

// カレンダー設定保存（全ユーザー共通）
app.post('/api/gcal-config', requireAuth, rateLimit, async (req, res) => {
  await writeData('gcal_config', req.body);
  res.json({ ok: true });
});

// メールテンプレート保存
app.post('/api/email-tpls', requireAuth, rateLimit, async (req, res) => {
  await writeData('email_tpls', req.body);
  res.json({ ok: true });
});

// 全データリセット（管理者のみ）
app.post('/api/reset', requireAuth, rateLimit, async (req, res) => {
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

// Vercel 環境ではサーバーを起動しない（サーバーレス関数として動作するため）
// ステージング環境など Vercel 以外でも強制起動したい場合は RUN_SERVER=1 を設定する
if (!process.env.VERCEL || process.env.RUN_SERVER) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`IS進捗管理 サーバー起動: http://localhost:${PORT}`);
  });
}

module.exports = app;
