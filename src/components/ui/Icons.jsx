// アイコンコンポーネント
// SVGアイコンを React コンポーネントとして提供する

// 設定メニュー用アイコン群

// リード管理（クリップボード＋リスト）
export function LeadMgmtIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"block"}}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <line x1="8" y1="11" x2="16" y2="11"/>
      <line x1="8" y1="15" x2="13" y2="15"/>
    </svg>
  );
}

// ポータルサイト（グリッド）
export function PortalIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"block"}}>
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}

// APIキー（鍵）
export function ApiKeyIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"block"}}>
      <circle cx="7.5" cy="12" r="4.5"/>
      <path d="M12 12h9"/>
      <path d="M17 10v4"/>
      <path d="M21 10v4"/>
    </svg>
  );
}

// Zoho CRM（リフレッシュ/連携矢印）
export function ZohoIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"block"}}>
      <polyline points="1 4 1 10 7 10"/>
      <polyline points="23 20 23 14 17 14"/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10"/>
      <path d="M3.51 15a9 9 0 0 0 14.85 3.36L23 14"/>
    </svg>
  );
}

// 管理者設定（シールド＋チェック）
export function AdminIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"block"}}>
      <path d="M12 2l9 4v6c0 5-3.9 9.8-9 11C6.9 21.8 3 17 3 12V6l9-4z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  );
}

// アカウント（人物）
export function AccountIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"block"}}>
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/>
    </svg>
  );
}

// 編集アイコン（四角＋斜めペン）
export function EditIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block" }}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

// タスク登録アイコン（チェックボックス・塗りつぶし）
export function TaskIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: "block" }}>
      <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );
}

// 後方互換のため PencilIcon は EditIcon のエイリアス
export function PencilIcon({ size = 16, color = "currentColor" }) {
  return <EditIcon size={size} color={color} />;
}

// ゴミ箱アイコン（塗りつぶし）
export function TrashIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: "block" }}>
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
  );
}
