// ウィザード共通部品
// SetupWizard の外で定義することで再マウントを防ぐ

import React, { useEffect, useRef } from 'react';
import { CheckIcon, CheckCircleIcon, AlertIcon } from '../ui/Icons.jsx';

// ウィザード全体をラップするオーバーレイ
// Escape キーまたは背景クリックで onDismiss を呼ぶ
export function WizardOverlay({ children, onDismiss }) {
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") dismissRef.current?.(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []); // マウント時1回だけ登録。ref経由で最新のonDismissを参照する

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) dismissRef.current?.(); }}>
      {children}
    </div>
  );
}

// ステップ進捗バー
export function WizardStepBar({ current, labels }) {
  const total = labels.length;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 24 }}>
      {labels.map((label, i) => (
        <React.Fragment key={i}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 0 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: i <= current ? "#10b981" : "#e5e7eb", color: i <= current ? "#fff" : "#9ca3af", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {i < current ? <CheckIcon size={13} color="#fff" /> : i + 1}
            </div>
            <div style={{ fontSize: 10, color: i === current ? "#174f35" : "#9ca3af", fontWeight: i === current ? 700 : 400, whiteSpace: "nowrap", textAlign: "center" }}>
              {label}
            </div>
          </div>
          {i < total - 1 && (
            <div style={{ flex: 1, height: 2, background: i < current ? "#10b981" : "#e5e7eb", margin: "12px 3px 0" }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// 設定済み / 未設定バッジ
export function WizardStatusBadge({ ok }) {
  return ok
    ? <span style={{ fontSize: 11, background: "#d1fae5", color: "#059669", borderRadius: 20, padding: "2px 10px", fontWeight: 700, display:"flex", alignItems:"center", gap:3 }}><CheckCircleIcon size={11} color="#059669" /> 設定済み</span>
    : <span style={{ fontSize: 11, background: "#fef3c7", color: "#d97706", borderRadius: 20, padding: "2px 10px", fontWeight: 700, display:"flex", alignItems:"center", gap:3 }}><AlertIcon size={11} color="#d97706" /> 未設定</span>;
}
