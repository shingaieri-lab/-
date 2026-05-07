// 商談日アクション行（カレンダー追加・商談共有コピー）
import { useState } from 'react';
import { CalendarNavIcon, ClipboardIcon, CheckIcon } from '../ui/Icons.jsx';
import { buildDealShareText } from '../../lib/format.js';

export function DealActionBar({ lead, calLoading, onAddDealToCalendar, readOnly }) {
  const [dealCopied, setDealCopied] = useState(false);

  if (!lead.meeting_date) return null;

  const copyDealInfo = () => {
    const text = buildDealShareText(lead);
    navigator.clipboard?.writeText(text);
    setDealCopied(true);
    setTimeout(() => setDealCopied(false), 5000);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, padding: "6px 10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8 }}>
      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
        <CalendarNavIcon size={13} color="#64748b" />
        商談日：{lead.meeting_date}{lead.meeting_time ? " " + lead.meeting_time : ""}
      </span>
      {!readOnly && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {lead.status === '商談確定' && (
            <button onClick={copyDealInfo} style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", background: dealCopied ? "#10b981" : "none", border: `1px solid ${dealCopied ? "#10b981" : "#10b98166"}`, borderRadius: 6, cursor: "pointer", color: dealCopied ? "#fff" : "#059669", fontSize: 12, padding: "4px 10px", lineHeight: 1.4, fontWeight: 600, transition: "all 0.2s" }}>
              {dealCopied ? <><CheckIcon size={12} color="#fff" /> コピー済み</> : <><ClipboardIcon size={12} color="#059669" /> 商談共有用</>}
            </button>
          )}
          <button
            onClick={onAddDealToCalendar}
            disabled={calLoading}
            style={{ display: "flex", alignItems: "center", gap: 5, background: calLoading ? "#6ee7b7" : "#10b981", border: "none", borderRadius: 6, cursor: calLoading ? "not-allowed" : "pointer", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", opacity: calLoading ? 0.7 : 1, transition: "background 0.2s", whiteSpace: "nowrap" }}
          >
            <CalendarNavIcon size={12} color="#fff" />
            {calLoading ? "登録中..." : "Googleカレンダーに追加"}
          </button>
        </div>
      )}
    </div>
  );
}
