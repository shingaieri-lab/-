// 認証・セッション・レート制限の共通処理
const { kv } = require('./kv');

const BCRYPT_ROUNDS = 10;
const LOGIN_FAIL_LIMIT = 5;
const LOGIN_LOCKOUT_SEC = 15 * 60; // 15分
const RATE_LIMIT = 100;

// セッションCookieのオプション（HttpOnly + SameSite=Strict でXSS/CSRF対策）
function sessionCookieOptions(req) {
  return {
    httpOnly: true,
    secure: req.headers['x-forwarded-proto'] === 'https' || req.secure,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
    path: '/',
  };
}

// APIレート制限ミドルウェア（1分間に100リクエストまで）
async function rateLimit(req, res, next) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const minute = Math.floor(Date.now() / 60000);
  const key = `rateLimit:${ip}:${minute}`;
  try {
    const count = await kv.incr(key);
    if (count === 1) await kv.expire(key, 120);
    if (count > RATE_LIMIT) {
      return res.status(429).json({ error: 'リクエスト数の上限に達しました。しばらくしてから再試行してください。' });
    }
  } catch (e) {
    console.error('rateLimit KV error:', e);
    return res.status(429).json({ error: 'サービスが一時的に利用できません。しばらくしてから再試行してください。' });
  }
  next();
}

// セッション認証ミドルウェア
async function requireAuth(req, res, next) {
  const token = req.cookies?.session;
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

// パスワード強度チェック（8文字以上・英字と数字を含む）
function validatePassword(password) {
  if (!password || password.length < 8) return 'パスワードは8文字以上で入力してください';
  if (!/[a-zA-Z]/.test(password)) return 'パスワードに英字を含めてください';
  if (!/[0-9]/.test(password)) return 'パスワードに数字を含めてください';
  return null;
}

module.exports = {
  BCRYPT_ROUNDS,
  LOGIN_FAIL_LIMIT,
  LOGIN_LOCKOUT_SEC,
  sessionCookieOptions,
  rateLimit,
  requireAuth,
  validatePassword,
};
