import React from 'react';
import ReactDOM from 'react-dom/client';

// Step 2: 定数・ユーティリティのインポート確認
// 各モジュールが正しく解決できるかチェック
import { ACTION_TYPES, MQL_OPTIONS } from './constants/index.js';
import { TODAY, isBusinessDay } from './lib/holidays.js';
import { normalizeDate } from './lib/date.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>IS進捗管理（Vite移行中）</h1>
      <p>Step 2: 定数・ユーティリティの分離完了</p>
      <ul>
        <li>今日の日付: {TODAY}</li>
        <li>アクション種別: {ACTION_TYPES.map(a => a.label).join(' / ')}</li>
        <li>MQL区分: {MQL_OPTIONS.join(' / ')}</li>
        <li>2025-01-01は営業日?: {isBusinessDay('2025-01-01') ? 'はい' : 'いいえ（祝日）'}</li>
        <li>日付正規化テスト: {normalizeDate('2026/4/3')} → {normalizeDate('2026-04-03')}</li>
      </ul>
      <p style={{ color: '#888' }}>Step 3: コンポーネントを順番に移行していきます。</p>
    </div>
  </React.StrictMode>
);
