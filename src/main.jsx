import React from 'react';
import ReactDOM from 'react-dom/client';

// Step 3: UI コンポーネント・フックのインポート確認
import { PencilIcon, TrashIcon } from './components/ui/Icons.jsx';
import { SourceIconSVG } from './components/ui/SourceIconSVG.jsx';
import { Badge, Chip } from './components/ui/Badges.jsx';
import { Splash, Header, Card, KPI, IF, Note, Row2, Field } from './components/ui/Layout.jsx';
import { useIsMobile } from './hooks/useIsMobile.js';
import { TODAY } from './lib/holidays.js';
import { ACTION_TYPES } from './constants/index.js';

function Preview() {
  const isMobile = useIsMobile();
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 600 }}>
      <Header title="IS進捗管理（Vite移行中）" sub={`今日: ${TODAY} / ${isMobile ? 'モバイル' : 'デスクトップ'}`} />
      <Card title="Step 3 進捗">
        <p>UI コンポーネント・フックの分離が完了しました。</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {ACTION_TYPES.map(a => <Badge key={a.v} color={a.color} label={a.label} />)}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <Chip label="タグA" color="#10b981" />
          <Chip label="タグB" color="#8b5cf6" />
          <SourceIconSVG iconKey="home" size={32} />
          <SourceIconSVG iconKey="phone" size={32} />
          <SourceIconSVG iconKey="mail" size={32} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <PencilIcon size={16} color="#059669" />
          <TrashIcon size={16} color="#ef4444" />
          <span style={{ fontSize: 13, color: '#6a9a7a' }}>アイコン確認OK</span>
        </div>
      </Card>
      <p style={{ color: '#888', fontSize: 13 }}>Step 4: 大きなコンポーネントを順番に移行していきます。</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Preview />
  </React.StrictMode>
);
