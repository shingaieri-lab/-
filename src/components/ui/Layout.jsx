// レイアウト・表示用プリミティブコンポーネント
// ページ全体の構成要素（カード・ヘッダー・KPI 等）をまとめる

import { S } from '../../styles/index.js';

// ローディング画面
export function Splash() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f0f5f2", color:"#6a9a7a" }}>
      読み込み中...
    </div>
  );
}

// ページヘッダー（タイトル + サブタイトル + 右側スロット）
export function Header({ title, sub, children }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:10 }}>
      <div>
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:"#174f35", letterSpacing:"-0.02em" }}>{title}</h1>
        {sub && <p style={{ margin:"4px 0 0", fontSize:13, color:"#3d7a5e" }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// カードコンテナ
export function Card({ title, children }) {
  return (
    <div style={S.card}>
      {title && <div style={S.cardTitle}>{title}</div>}
      {children}
    </div>
  );
}

// KPI メトリクス表示
export function KPI({ icon, label, value, unit, color, sub }) {
  return (
    <div style={{ ...S.kpiCard, borderTop: `3px solid ${color}` }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <div style={{ fontSize:12, color:"#6a9a7a", marginBottom:3 }}>{label}</div>
        <div style={{ fontSize:24, fontWeight:800, color:"#174f35", letterSpacing:"-0.02em" }}>
          {value}
          {unit && <span style={{ fontSize:13, fontWeight:400, marginLeft:2 }}>{unit}</span>}
        </div>
        {sub && <div style={{ fontSize:12, color, marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// インフォメーションフィールド（ラベル + 値の読み取り専用表示）
export function IF({ label, v }) {
  return (
    <div style={{ background:"#ffffff", borderRadius:6, padding:"8px 10px" }}>
      <div style={{ fontSize:11, color:"#3d7a5e", marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:13, color:"#1f5c40" }}>{v || "—"}</div>
    </div>
  );
}

// ノート表示（見出し + 本文）
export function Note({ label, text }) {
  if (!text) return null;
  return (
    <div style={{ background:"#d8ede1", border:"1px solid #c0dece", borderRadius:8, overflow:"hidden" }}>
      <div style={{ padding:"6px 12px", background:"#162032", borderBottom:"1px solid #334155", fontSize:11, color:"#6a9a7a", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>
        {label}
      </div>
      <p style={{ margin:0, padding:"10px 12px", fontSize:13.5, color:"#2d6b4a", lineHeight:1.75 }}>
        {text}
      </p>
    </div>
  );
}

// 2カラムグリッドレイアウト
export function Row2({ children }) {
  return (
    <div className="two-col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
      {children}
    </div>
  );
}

// ラベル付き入力フィールド
export function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label style={S.lbl}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={S.inp}
      />
    </div>
  );
}
