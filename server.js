// エントリーポイント：Expressの設定とルートの登録のみ行う
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
