// 認証関連ルート（ログイン・サインアップ・パスワードリセット等）
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { kv, getAccounts, writeData } = require('../lib/kv');
const {
  BCRYPT_ROUNDS, LOGIN_FAIL_LIMIT, LOGIN_LOCKOUT_SEC,
  sessionCookieOptions, requireAuth, rateLimit, validatePassword,
} = require('../lib/auth');

const router = express.Router();

// ログイン（認証不要）
router.post('/api/login', async (req, res) => {
  const { id, password } = req.body;

  const failKey = 'loginFail:' + id;
  const failCount = (await kv.get(failKey)) || 0;
  if (failCount >= LOGIN_FAIL_LIMIT) {
    return res.status(429).json({ error: 'ログイン試行回数の上限に達しました。15分後に再試行してください。' });
  }

  const accounts = await getAccounts();
  const account = accounts.find(a => a.id === id);

  const isHashed = account && account.password && account.password.startsWith('$2');
  const passwordMatch = account && (isHashed
    ? await bcrypt.compare(password, account.password)
    : account.password === password);

  if (!account || !passwordMatch) {
    await kv.set(failKey, failCount + 1, { ex: LOGIN_LOCKOUT_SEC });
    return res.status(401).json({ error: 'IDまたはパスワードが違います' });
  }

  await kv.del(failKey);

  // 平文パスワードだった場合はハッシュ化して保存（自動移行）
  if (!isHashed) {
    account.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await writeData('accounts', accounts);
  }

  const token = crypto.randomBytes(32).toString('hex');
  await kv.set('session:' + token, id, { ex: 60 * 60 * 24 * 7 });
  const { password: _pw, geminiKey: _gk, ...safeAccount } = account;
  res.cookie('session', token, sessionCookieOptions(req));
  res.json({ account: { ...safeAccount, geminiConfigured: !!_gk } });
});

// 新規アカウント作成（招待コード必須）
router.post('/api/signup', async (req, res) => {
  const { inviteCode, ...newAccount } = req.body;

  const existingAccounts = await getAccounts();
  if (existingAccounts.length > 0) {
    if (!inviteCode) return res.status(400).json({ error: '招待コードが必要です' });
    const inviteKey = 'invite:' + inviteCode;
    const valid = await kv.get(inviteKey);
    if (!valid) return res.status(400).json({ error: '招待コードが無効または期限切れです' });
    await kv.del(inviteKey);
  }

  const pwError = validatePassword(newAccount.password);
  if (pwError) return res.status(400).json({ error: pwError });

  if (existingAccounts.some(a => a.id === newAccount.id)) {
    return res.status(409).json({ error: 'このIDは既に使われています' });
  }
  const hashedPassword = await bcrypt.hash(newAccount.password, BCRYPT_ROUNDS);
  existingAccounts.push({ ...newAccount, password: hashedPassword, role: 'admin' });
  await writeData('accounts', existingAccounts);
  res.json({ ok: true });
});

// ログアウト
router.post('/api/logout', requireAuth, rateLimit, async (req, res) => {
  await kv.del('session:' + req.cookies.session);
  res.clearCookie('session', { httpOnly: true, secure: req.headers['x-forwarded-proto'] === 'https' || req.secure, sameSite: 'strict', path: '/' });
  res.json({ ok: true });
});

// 招待コード発行（管理者のみ）
router.post('/api/invite', requireAuth, rateLimit, async (req, res) => {
  const accounts = await getAccounts();
  const account = accounts.find(a => a.id === req.accountId);
  if (!account || account.role !== 'admin') {
    return res.status(403).json({ error: '管理者のみ実行できます' });
  }
  const code = crypto.randomBytes(16).toString('hex');
  await kv.set('invite:' + code, true, { ex: 60 * 60 * 24 }); // 24時間有効
  res.json({ code });
});

// パスワードリセット（リセットコードあり）
router.post('/api/reset-password-with-code', rateLimit, async (req, res) => {
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
  await writeData('accounts', accounts);
  await kv.del('resetCode:' + code);
  res.json({ ok: true });
});

// パスワードリセット（コードなし・ログインできない場合の救済）
router.post('/api/reset-password-direct', rateLimit, async (req, res) => {
  const { id, newPassword } = req.body;
  if (!id || !newPassword) return res.status(400).json({ error: '全項目入力してください' });
  const pwError = validatePassword(newPassword);
  if (pwError) return res.status(400).json({ error: pwError });
  const accounts = await getAccounts();
  const target = accounts.find(a => a.id === id);
  if (!target) return res.status(404).json({ error: 'アカウントが見つかりません' });
  target.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await writeData('accounts', accounts);
  await kv.del('loginFail:' + id);
  res.json({ ok: true });
});

// パスワードリセット（管理者のみ・対象アカウントのパスワードのみ更新）
router.post('/api/reset-password/:id', requireAuth, rateLimit, async (req, res) => {
  const accounts = await getAccounts();
  const requester = accounts.find(a => a.id === req.accountId);
  if (!requester || requester.role !== 'admin') {
    return res.status(403).json({ error: '管理者のみ実行できます' });
  }
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'パスワードを入力してください' });
  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });
  const target = accounts.find(a => a.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'アカウントが見つかりません' });
  target.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await writeData('accounts', accounts);
  res.json({ ok: true });
});

// ロック中アカウント一覧取得（管理者のみ）
router.get('/api/login-locks', requireAuth, rateLimit, async (req, res) => {
  const accounts = await getAccounts();
  const account = accounts.find(a => a.id === req.accountId);
  if (!account || account.role !== 'admin') {
    return res.status(403).json({ error: '管理者のみ実行できます' });
  }
  const locks = {};
  for (const a of accounts) {
    const count = await kv.get('loginFail:' + a.id);
    if (count >= LOGIN_FAIL_LIMIT) locks[a.id] = count;
  }
  res.json(locks);
});

// ロック解除（管理者のみ）
router.delete('/api/login-lock/:id', requireAuth, rateLimit, async (req, res) => {
  const accounts = await getAccounts();
  const account = accounts.find(a => a.id === req.accountId);
  if (!account || account.role !== 'admin') {
    return res.status(403).json({ error: '管理者のみ実行できます' });
  }
  await kv.del('loginFail:' + req.params.id);
  res.json({ ok: true });
});

module.exports = router;
