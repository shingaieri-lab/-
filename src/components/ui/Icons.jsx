// アイコンコンポーネント
// SVGアイコンを React コンポーネントとして提供する

export function PencilIcon({ size = 13, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block" }}>
      <path d="M11.5 2.5l2 2L5 13H3v-2z"/>
      <line x1="9.5" y1="4.5" x2="11.5" y2="6.5"/>
    </svg>
  );
}

export function TrashIcon({ size = 13, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block" }}>
      <line x1="2" y1="4" x2="14" y2="4"/>
      <path d="M5 4V2h6v2"/>
      <path d="M3 4l1 9h8l1-9"/>
      <line x1="6" y1="7" x2="6" y2="11"/>
      <line x1="10" y1="7" x2="10" y2="11"/>
    </svg>
  );
}
