// データ保存・取得ルート
const express = require('express');
const bcrypt = require('bcryptjs');
const { kv, readData, writeData, getAccounts } = require('../lib/kv');
const { BCRYPT_ROUNDS, requireAuth, rateLimit, validatePassword } = require('../lib/auth');

const router = express.Router();

// 全データ取得（ログイン後の初期ロード）
router.get('/api/data', requireAuth, rateLimit, async (req, res) => {
  const rawAiConfig = (await readData('ai_config')) || {};
  const { geminiKey: _globalGeminiKey, ...safeAiConfig } = rawAiConfig;
  res.json({
    accounts: (await getAccounts()).map(({ password: _pw, geminiKey: _gk, ...a }) => ({
      ...a,
      geminiConfigured: !!_gk,
    })),
    leads: (await readData('leads')) || [],
    masterSettings: (await readData('master_settings')) || {},
    aiConfig: { ...safeAiConfig, geminiConfigured: !!_globalGeminiKey },
    gcalConfig: (await readData('gcal_config')) || {},
    emailTpls: (await readData('email_tpls')) || [],
    zohoConfig: await (async () => {
      const cfg = await readData('zoho_config');
      if (!cfg) return null;
      const { clientSecret: _cs, ...safeCfg } = cfg;
      return safeCfg;
    })(),
  });
});

// アカウント一括保存
router.post('/api/accounts', requireAuth, rateLimit, async (req, res) => {
  const accounts = req.body;
  const existingAccounts = await getAccounts();
  for (const account of accounts) {
    if (!account.password) {
      const existing = existingAccounts.find(a => a.id === account.id);
      if (existing) account.password = existing.password;
    } else if (!account.password.startsWith('$2')) {
      const pwError = validatePassword(account.password);
      if (pwError) return res.status(400).json({ error: `${account.id}: ${pwError}` });
      account.password = await bcrypt.hash(account.password, BCRYPT_ROUNDS);
    }
    // 既にハッシュ化済みの場合はそのまま保持
  }
  await writeData('accounts', accounts);
  res.json({ ok: true });
});

// リード保存
router.post('/api/leads', requireAuth, rateLimit, async (req, res) => {
  await writeData('leads', req.body);
  res.json({ ok: true });
});

// マスター設定保存
router.post('/api/master-settings', requireAuth, rateLimit, async (req, res) => {
  await writeData('master_settings', req.body);
  res.json({ ok: true });
});

// AI設定保存（Gemini APIキー・Gmail OAuth）
router.post('/api/ai-config', requireAuth, rateLimit, async (req, res) => {
  await writeData('ai_config', req.body);
  res.json({ ok: true });
});

// カレンダー設定保存
router.post('/api/gcal-config', requireAuth, rateLimit, async (req, res) => {
  await writeData('gcal_config', req.body);
  res.json({ ok: true });
});

// メールテンプレート保存
router.post('/api/email-tpls', requireAuth, rateLimit, async (req, res) => {
  await writeData('email_tpls', req.body);
  res.json({ ok: true });
});

// 全データリセット（管理者のみ）
router.post('/api/reset', requireAuth, rateLimit, async (req, res) => {
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

module.exports = router;
