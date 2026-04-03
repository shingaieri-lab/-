// バッジ・チップ系コンポーネント
// 流入元・ステータス・ラベル表示などに使う小さなタグ UI

import { getSourceColor } from '../../lib/master.js';

// 汎用バッジ（ステータス等）
export function Badge({ color, label }) {
  return (
    <span style={{
      background: color + "1a", color,
      border: `1px solid ${color}44`,
      borderRadius: 6, padding: "4px 12px",
      fontSize: 13, fontWeight: 700,
    }}>
      {label}
    </span>
  );
}

// 小さなチップ（タグ表示等）
export function Chip({ label, color = "#6a9a7a" }) {
  return (
    <span style={{
      background: color + "1a", color,
      border: `1px solid ${color}33`,
      borderRadius: 5, padding: "3px 10px", fontSize: 12,
    }}>
      {label}
    </span>
  );
}

// 流入元バッジ（流入元カラーを自動適用）
export function SrcBadge({ src, small }) {
  const c = getSourceColor(src, 0);
  return (
    <span style={{
      background: c + "1a", color: c,
      border: `1px solid ${c}44`,
      borderRadius: 5,
      padding: small ? "2px 7px" : "3px 10px",
      fontSize: small ? 11 : 12,
      fontWeight: 600, whiteSpace: "nowrap",
    }}>
      {src}
    </span>
  );
}
