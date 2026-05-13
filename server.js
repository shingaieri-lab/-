// エントリーポイント：Expressの設定とルートの登録のみ行う
require('dotenv').config({ path: '.env.local' }); // ローカルの環境変数を読み込む

// ENCRYPTION_KEY が未設定の場合は起動しない（CLAUDE.md: フォールバック禁止）
if (!process.env.ENCRYPTION_KEY || Buffer.from(process.env.ENCRYPTION_KEY, 'hex').length !== 32) {
  console.error('FATAL: ENCRYPTION_KEY must be set as a 64-character hex string (32 bytes).');
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const aiRoutes   = require('./routes/ai');
const zohoRoutes = require('./routes/zoho');

const path = require('path');
const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// ルート登録
app.use(authRoutes);
app.use(dataRoutes);
app.use(aiRoutes);
app.use(zohoRoutes);

// Vercel環境ではサーバーを起動しない（サーバーレス関数として動作するため）
// ステージング環境など Vercel 以外でも強制起動したい場合は RUN_SERVER=1 を設定する
if (!process.env.VERCEL || process.env.RUN_SERVER) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`IS進捗管理 サーバー起動: http://localhost:${PORT}`);
  });
}

module.exports = app;
