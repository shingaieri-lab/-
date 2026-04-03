const express = require('express');
const { kv } = require('@vercel/kv');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');

const BCRYPT_ROUNDS = 10; // ハッシュ化の強度（数値が大きいほど安全だが遅い）

// AIシステムプロンプト（サーバー側に保持。フロントエンドには渡さない）
const AI_SYSTEM_PROMPT = `あなたはIS進捗管理のインサイドセールス専任アシスタントです。

ユーザーが電話メモ・アクション記録を入力すると、以下のJSON形式のみで出力してください。

{"action_summary":"架電内容サマリー（2〜3文）","action_type":"call または email または sms または other","action_result":"取次 または 不在 または 不通 または 折電 または 送信済 または その他","next_action_date_offset":5,"next_action_time":"10:00","next_action_memo":"次回アクションメモ","next_action_type":"call または email または sms または schedule または other","followup_talk_points":["ポイント1","ポイント2"],"email_subject":"フォローメール件名","email_body":"フォローメール本文","interest_level":"高 または 中 または 低","memo_for_zoho":"Zoho用詳細サマリー（3〜5文）"}

【next_action_typeの決定ルール】
過去のアクション履歴を必ず参照した上で、次回アクションに最適な手段を判断してください。

- schedule：
  - 商談・打ち合わせの日程調整が必要で、候補日を提案するタイミング
  - 「日程を調整したい」「いつが都合いいか」「商談の予定を入れたい」等の発言があった場合
  - 興味度「高」で具体的な商談ステップに進める状況

- email：
  - 今回の通話で資料送付を依頼された（→ 送付後フォロー電話が次なので今はemail）
  - 過去に資料・メールを送っており、次は別手段（call）が自然な流れの場合は除く
  - 電話が繋がりにくい状況が続いており、メールでアプローチする方が有効
  - 検討中でまず情報提供が先決

- call：
  - 過去にメール・資料送付済みで、次はリアクション確認の電話が適切
  - 折電待ち・担当者から折り返し連絡が来る予定
  - 興味度「高」で前向きな反応があり、直接会話で次のステップを決めたい
  - 不在・不通が続いているが見込みがあり、引き続き電話アプローチが必要
  - 急ぎの確認や意思決定を求める場面

- sms：
  - 電話に出ない・メールも反応が薄い・短い日程リマインドで十分

- other：
  - 訪問・商談・展示会対応など電話・メール以外が適切

【next_action_date_offsetの決定ルール】
メモ内容・過去のアクション履歴・顧客の反応を読み取り、最適な営業日数（整数）を判断してください。

- 「来週」「1週間後」→ 5
- 「2週間後」「再来週」→ 10
- 「来月」「1ヶ月後」→ 22
- 「3日後」「数日後」→ 3
- 「明日」→ 1
- 「2〜3日後」→ 3
- 不在・不通が続いている → 過去の架電間隔を参考に同程度の日数
- 折電待ち → 2〜3営業日後（早めにフォロー）
- 興味度「高」で前向き → 2〜3営業日後
- 興味度「中」検討中 → 5〜7営業日後
- 興味度「低」・繁忙期 → 10〜22営業日後
- 過去履歴がある場合は架電間隔のパターンも参考にすること

【next_action_timeの制約】
- 必ず営業時間内（09:00〜18:00）で設定すること
- 12:00〜13:00（昼休み）は除外すること
- 09:00〜11:30 または 13:00〜17:30 の範囲で30分単位で設定すること
- 土日祝は next_action_date_offset で除外済みのため、時間のみこの制約に従うこと

【フォローメールの生成ルール】
- email_bodyの書き出しは「{会社名}\n{担当者名} 様」（【リード】の会社名・担当者名を使用、なければ「ご担当者」）
- 本文中には「ダンドリワークの{送信者名}でございます」（【送信者情報】の名前を使用）
- 【送信者情報】に署名が含まれる場合、メール本文末尾に必ずそのまま追加すること

必ずJSONのみ返してください。`;

// パスワード暗号化キー（PASSWORD_ENC_KEY必須。未設定時はサーバー起動を失敗させる）
if (!process.env.PASSWORD_ENC_KEY) {
  console.error('致命的エラー: 環境変数 PASSWORD_ENC_KEY が未設定です。サーバーを起動できません。');
  process.exit(1);
}
const ENC_KEY = Buffer.from(process.env.PASSWORD_ENC_KEY, 'hex');

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
app.use(cookieParser());
app.use(express.static(__dirname));

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

// セッション管理（Vercel KV）: CookieからトークンをHTTPOnly属性で安全に取得
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
  await kv.set('session:' + token, id, { ex: 60 * 60 * 24 * 7 }); // 7日間有効
  // パスワード・APIキーをフロントエンドに渡さない
  const { password: _pw, geminiKey: _gk, ...safeAccount } = account;
  // トークンはHttpOnly Cookieにセット（フロントエンドからJSでは読めない）
  res.cookie('session', token, sessionCookieOptions(req));
  res.json({ account: { ...safeAccount, geminiConfigured: !!_gk } });
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
  await kv.del('session:' + req.cookies.session);
  res.clearCookie('session', { httpOnly: true, secure: req.headers['x-forwarded-proto'] === 'https' || req.secure, sameSite: 'strict', path: '/' });
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
  const zohoConfig = await readData('zoho_config');
  const zohoTokens = await getZohoTokens();
  const rawAiConfig = (await readData('ai_config')) || {};
  const { geminiKey: _globalGeminiKey, ...safeAiConfig } = rawAiConfig;
  res.json({
    // パスワード・APIキー情報をフロントエンドに渡さない。設定済みかどうかのフラグのみ返す
    accounts: (await getAccounts()).map(({ password: _pw, password_enc: _enc, geminiKey: _gk, ...a }) => ({
      ...a,
      geminiConfigured: !!_gk,
    })),
    leads: (await readData('leads')) || [],
    masterSettings: await readData('master_settings'),
    aiConfig: { ...safeAiConfig, geminiConfigured: !!_globalGeminiKey },
    gcalConfig: (await readData('gcal_config')) || {},
    emailTpls: await readData('email_tpls'),
    // Zoho設定（Client SecretはフロントエンドへはセキュリティのためSecretを除いて返す）
    zohoConfig: zohoConfig ? { ...zohoConfig, clientSecret: undefined } : null,
    zohoAuthenticated: !!zohoTokens?.refresh_token,
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

// AI解析（Gemini API呼び出しをサーバー経由に。APIキーはフロントエンドに渡さない）
app.post('/api/ai/analyze', requireAuth, rateLimit, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'promptが必要です' });

  // APIキーの優先順位: ユーザー個人設定 → グローバル設定
  const accounts = await getAccounts();
  const account = accounts.find(a => a.id === req.accountId);
  const globalAiConfig = (await readData('ai_config')) || {};
  const apiKey = account?.geminiKey || globalAiConfig.geminiKey;

  if (!apiKey) return res.status(400).json({ error: 'Gemini APIキーが未設定です。設定画面（⚙️）の「APIキー設定」タブから入力してください。' });

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: AI_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json' },
      }),
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'AI解析リクエストに失敗しました: ' + e.message });
  }
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

// ======== Zoho CRM 連携 ========

// Zoho設定保存（管理者のみ）
app.post('/api/zoho-config', requireAuth, rateLimit, async (req, res) => {
  const accounts = await getAccounts();
  const account = accounts.find(a => a.id === req.accountId);
  if (!account || account.role !== 'admin') {
    return res.status(403).json({ error: '管理者のみ実行できます' });
  }
  // clientSecretが送られていない場合は既存の値を保持する（再入力不要にするため）
  const existing = await readData('zoho_config');
  const { clientSecret, ...rest } = req.body;
  const newConfig = clientSecret
    ? { ...rest, clientSecret }
    : { ...rest, clientSecret: existing?.clientSecret };
  await writeData('zoho_config', newConfig);
  res.json({ ok: true });
});

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
async function refreshZohoToken() {
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

// Zoho OAuth認証開始（ブラウザをZoho認証画面にリダイレクト）
app.get('/api/zoho/auth', requireAuth, async (req, res) => {
  const cfg = await readData('zoho_config');
  if (!cfg?.clientId) return res.status(400).json({ error: 'Zoho Client IDが未設定です' });

  const domain = getZohoDomain(cfg.dataCenter);
  const scopes = [
    'ZohoCRM.modules.Leads.ALL',
    'ZohoCRM.modules.Calls.CREATE',
    'ZohoCRM.modules.Accounts.CREATE',
    'ZohoCRM.modules.Contacts.CREATE',
    'ZohoCRM.modules.Deals.CREATE',
  ].join(',');

  const redirectUri = `${req.protocol}://${req.headers.host}/api/zoho/callback`;
  const url = `https://accounts.${domain}/oauth/v2/auth?response_type=code&client_id=${cfg.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&access_type=offline&prompt=consent`;
  res.redirect(url);
});

// Zoho OAuth コールバック（認証コードをトークンに交換）
app.get('/api/zoho/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.status(400).send('認証エラー: ' + (error || 'コードなし'));

  const cfg = await readData('zoho_config');
  if (!cfg?.clientId) return res.status(400).send('Zoho設定が未完了です');

  const domain = getZohoDomain(cfg.dataCenter);
  const redirectUri = `${req.protocol}://${req.headers.host}/api/zoho/callback`;
  const params = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
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
    // 認証完了後は親ウィンドウに通知してこのウィンドウを閉じる
    const origin = `${req.protocol}://${req.headers.host}`;
    res.send(`<html><body><script>window.opener&&window.opener.postMessage("zoho_auth_success",${JSON.stringify(origin)});window.close();</script><p>認証完了。このウィンドウを閉じてください。</p></body></html>`);
  } catch (e) {
    res.status(500).send('トークン取得エラー: ' + e.message);
  }
});

// Zoho連携状態確認
app.get('/api/zoho/status', requireAuth, rateLimit, async (req, res) => {
  const cfg = await readData('zoho_config');
  const tokens = await getZohoTokens();
  res.json({
    configured: !!(cfg?.clientId && cfg?.clientSecret),
    authenticated: !!tokens?.refresh_token,
  });
});

// ZohoリードIDを指定してリード情報を取込
app.post('/api/zoho/import-lead', requireAuth, rateLimit, async (req, res) => {
  const { zohoLeadId } = req.body;
  if (!zohoLeadId) return res.status(400).json({ error: 'Zoho Lead IDが必要です' });

  try {
    // 重複チェック
    const leads = (await readData('leads')) || [];
    if (leads.some(l => l.zoho_lead_id === zohoLeadId)) {
      return res.status(409).json({ error: 'このZohoリードはすでに取込済みです' });
    }

    const cfg = await readData('zoho_config');
    const data = await zohoApi('GET', `/Leads/${zohoLeadId}`);
    if (!data.data?.[0]) return res.status(404).json({ error: 'Zohoリードが見つかりません' });

    const zl = data.data[0];
    // ステータスマッピング: Zoho側のステータス → 本ツールのステータス
    const statusMap = cfg?.statusMap || {};
    // IS担当フィールドのAPI名（Zoho管理画面で確認した値を設定）
    const isField = cfg?.isFieldApiName || 'Main_IS_Member';
    // IS担当マッピング: ZohoのフィールドValueの値 → 本ツールのメンバー名
    const isMemberMap = cfg?.isMemberMap || {};

    const zohoIsValue = zl[isField] || '';
    const today = new Date().toISOString().slice(0, 10);
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
      status: statusMap[zl.Lead_Status] || zl.Lead_Status || '',
      zoho_lead_id: zl.id,
      zoho_lead_type: zl.Lead_Type || '',
      zoho_synced_at: new Date().toISOString(),
    };

    res.json({ lead });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 本ツールのステータス変更をZohoリードに反映
app.post('/api/zoho/update-lead-status', requireAuth, rateLimit, async (req, res) => {
  const { zohoLeadId, localStatus } = req.body;
  if (!zohoLeadId || !localStatus) return res.status(400).json({ error: 'パラメータ不足' });

  try {
    const cfg = await readData('zoho_config');
    // 逆マッピング（本ツールのステータス → Zohoのステータス）を適用
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

// アクション履歴をZohoにNoteとして登録
app.post('/api/zoho/push-action', requireAuth, rateLimit, async (req, res) => {
  const { zohoLeadId, action } = req.body;
  if (!zohoLeadId || !action) return res.status(400).json({ error: 'パラメータ不足' });

  try {
    // 開始日時をISO 8601形式に変換（日本時間 +09:00）
    const dateStr = action.date || new Date().toISOString().slice(0, 10);
    const timeStr = action.time || '09:00';
    const callStartTime = `${dateStr}T${timeStr}:00+09:00`;

    // アクション方法のラベル（商談方法にマッピング）
    const typeLabels = { call: '電話', email: 'メール', sms: 'SMS', other: 'その他' };
    const methodLabel = typeLabels[action.type] || action.type || '電話';

    // 説明フィールドの内容（アクション履歴）
    const lines = [action.summary || ''];
    if (action.result) lines.push(`結果: ${action.result}`);
    if (action.next) lines.push(`次回アクション: ${action.next}`);
    if (action.nextDate) lines.push(`次回日時: ${action.nextDate}${action.nextTime ? ' ' + action.nextTime : ''}`);
    const description = lines.filter(Boolean).join('\n') || '（内容なし）';

    const data = await zohoApi('POST', '/Calls', {
      data: [{
        Subject: '電話）インバウンド',         // 行動名（固定）
        Call_Type: 'Inbound',                 // 電話種別：インバウンド
        Call_Start_Time: callStartTime,        // 開始日時 = アクション日時
        Call_Purpose: '追客',                  // 活動目的（固定）
        Description: description,             // 説明 = アクション履歴
        // 商談方法 = アクション方法（カスタムフィールドのAPI名はZoho管理画面で確認してください）
        // 例: Shodan_Houhou: methodLabel,
        Who_Id: { id: zohoLeadId },
        $se_module: 'Leads',
      }],
    });

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
app.post('/api/zoho/create-deal', requireAuth, rateLimit, async (req, res) => {
  const { lead } = req.body;
  if (!lead?.company || !lead?.id) return res.status(400).json({ error: 'リード情報が不足しています' });

  // ① KVストアのリードを取得して二重作成チェック
  const leads = (await readData('leads')) || [];
  const storedLead = leads.find(l => l.id === lead.id);
  if (storedLead?.zoho_deal_id) {
    // すでにZoho商談が存在する → ブロックして既存IDを返す
    return res.status(409).json({
      error: 'この商談はすでにZohoに作成済みです',
      zoho_deal_id: storedLead.zoho_deal_id,
      zoho_account_id: storedLead.zoho_account_id,
      zoho_contact_id: storedLead.zoho_contact_id,
    });
  }

  const cfg = await readData('zoho_config');

  try {
    // 1. 取引先（Account）作成
    const accountRes = await zohoApi('POST', '/Accounts', {
      data: [{ Account_Name: lead.company, Website: lead.hp_url || undefined }],
    });
    if (accountRes.data?.[0]?.status !== 'success') {
      return res.status(500).json({ error: '取引先作成失敗', detail: accountRes });
    }
    const accountId = accountRes.data[0].details?.id;

    // 2. 取引先責任者（Contact）作成
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

    // 3. 商談（Deal）作成
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
    // 設定画面で入力されたAPI名があればカスタムフィールドに商談日をセット
    if (cfg?.meetingDateFieldApiName) dealData[cfg.meetingDateFieldApiName] = closingDate;
    if (cfg?.closingDateFieldApiName) dealData[cfg.closingDateFieldApiName] = closingDate;

    const dealRes = await zohoApi('POST', '/Deals', { data: [dealData] });
    if (dealRes.data?.[0]?.status !== 'success') {
      return res.status(500).json({ error: '商談作成失敗', detail: dealRes });
    }
    const dealId = dealRes.data[0].details?.id;

    // ② Zoho作成成功後、KVストアに即時書き込む（フロントエンドの保存失敗に依存しない）
    let kvSaveFailed = false;
    if (storedLead) {
      try {
        storedLead.zoho_deal_id = dealId;
        storedLead.zoho_account_id = accountId;
        storedLead.zoho_contact_id = contactId;
        await writeData('leads', leads);
      } catch {
        // KV書き込み失敗：Zoho作成は成功しているのでエラーにしない。warnフラグで通知
        kvSaveFailed = true;
      }
    } else {
      // KVにリードが見つからない場合（通常は起きない）
      kvSaveFailed = true;
    }

    res.json({
      ok: true,
      accountId,
      contactId,
      dealId,
      ...(kvSaveFailed && { warn: 'kv_save_failed' }),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Zoho Webhook受信（Zoho → 本ツールへのリアルタイム連携）
// ZohoCRMのワークフローでこのURLをWebhook先に指定する
// URL例: https://is-kanri.vercel.app/api/zoho/webhook?token=<ZOHO_WEBHOOK_TOKEN>
app.post('/api/zoho/webhook', async (req, res) => {
  // トークン認証：クエリパラメータのtokenと環境変数を照合
  const webhookToken = process.env.ZOHO_WEBHOOK_TOKEN;
  if (!webhookToken) {
    console.error('ZOHO_WEBHOOK_TOKEN が未設定です');
    return res.status(500).json({ error: 'サーバー設定エラー' });
  }
  if (req.query.token !== webhookToken) {
    return res.status(401).json({ error: '認証エラー' });
  }

  try {
    const payload = req.body;
    const leads = (await readData('leads')) || [];
    const cfg = await readData('zoho_config');
    const isField = cfg?.isFieldApiName || 'Main_IS_Member';
    const statusMap = cfg?.statusMap || {};
    const isMemberMap = cfg?.isMemberMap || {};

    // IS進捗管理に登録されているメンバー名の一覧
    const accounts = (await readData('accounts')) || [];
    const registeredMembers = new Set(
      accounts.some(a => a.isStaff)
        ? accounts.filter(a => a.isStaff).map(a => a.name)
        : accounts.map(a => a.name)
    );

    // Zohoリードの作成・更新を本ツールに反映
    if (payload.module === 'Leads' && Array.isArray(payload.ids)) {
      for (const zohoId of payload.ids) {
        const data = await zohoApi('GET', `/Leads/${zohoId}`);
        const zl = data.data?.[0];
        if (!zl) continue;

        const zohoIsValue = zl[isField] || '';
        const mappedMember = isMemberMap[zohoIsValue] || zohoIsValue;

        // メインIS担当がこのツールに登録されているメンバーでなければスキップ
        if (registeredMembers.size > 0 && !registeredMembers.has(mappedMember)) continue;

        const patch = {
          company: zl.Company || '',
          contact: [zl.Last_Name, zl.First_Name].filter(Boolean).join(' '),
          email: zl.Email || '',
          address: [zl.State, zl.City, zl.Street].filter(Boolean).join(''),
          is_member: mappedMember,
          hp_url: zl.Website || '',
          status: statusMap[zl.Lead_Status] || zl.Lead_Status || '',
          zoho_lead_id: zohoId,
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
