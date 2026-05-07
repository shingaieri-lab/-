// ネクストアクション表示・インライン編集
import { useState } from 'react';
import { S } from '../../styles/index.js';
import { NextActionEditBtn } from './NextActionEditBtn.jsx';

export function NextActionSection({ lead, overdue, today, soon, readOnly, onUpdate, currentUser }) {
  const nad = lead.next_action_date;
  const [editNA, setEditNA] = useState(false);
  const [naDate, setNADate] = useState(nad || "");
  const [naTime, setNATime] = useState(lead.next_action_time || "");
  const [naMemo, setNAMemo] = useState(lead.next_action || "");

  if (!nad && !lead.next_action) return null;

  return (
    <div style={{ marginTop: 8, padding: "5px 8px", background: overdue ? "#fef2f2" : today ? "#fff7ed" : "#ffffff", borderRadius: 6, border: `1px solid ${overdue ? "#ef444466" : today ? "#f9731666" : "#c0dece"}`, fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, minWidth: 0, flex: 1 }}>
          {!editNA && overdue && <span style={{ fontSize: 10, background: "#ef4444", color: "#fff", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>期限切れ</span>}
          {!editNA && today   && <span style={{ fontSize: 10, background: "#f97316", color: "#fff", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>本日</span>}
          {!editNA && soon && !today && !overdue && <span style={{ fontSize: 10, background: "#a78bfa", color: "#fff", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>まもなく</span>}
          <span style={{ color: overdue ? "#dc2626" : today ? "#ea580c" : "#059669" }}>→</span>
          {editNA ? (
            <>
              <input type="date" value={naDate} onChange={e => setNADate(e.target.value)}
                style={{ ...S.inp, padding: "3px 6px", fontSize: 12, width: 130 }} />
              <select value={naTime} onChange={e => setNATime(e.target.value)}
                style={{ ...S.inp, padding: "3px 6px", fontSize: 12, width: 96 }}>
                <option value="">時刻なし</option>
                {Array.from({ length: 29 }, (_, i) => {
                  const h = String(Math.floor(i / 2) + 7).padStart(2, "0");
                  const m = i % 2 === 0 ? "00" : "30";
                  return <option key={i} value={`${h}:${m}`}>{h}:{m}</option>;
                })}
              </select>
            </>
          ) : (
            nad && <span style={{ fontWeight: 700, color: overdue ? "#dc2626" : today ? "#ea580c" : "#059669" }}>{nad}{lead.next_action_time ? " " + lead.next_action_time : ""}</span>
          )}
        </div>
        {!readOnly && (
          editNA ? (
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => setEditNA(false)} style={S.btnCancelXs}>✕</button>
              <button onClick={() => { onUpdate({ next_action_date: naDate, next_action_time: naTime, next_action: naMemo, google_task_registered: false }); setEditNA(false); }}
                style={{ ...S.btnDelXs, background: "#059669" }}>保存</button>
            </div>
          ) : (
            <NextActionEditBtn nad={nad} lead={lead} onUpdate={onUpdate} currentUser={currentUser}
              onEdit={() => { setNADate(nad || ""); setNATime(lead.next_action_time || ""); setNAMemo(lead.next_action || ""); setEditNA(true); }} />
          )
        )}
      </div>
      {editNA ? (
        <textarea value={naMemo} onChange={e => setNAMemo(e.target.value)}
          placeholder="ネクストアクションの内容を入力"
          style={{ ...S.inp, marginTop: 6, padding: "7px 10px", fontSize: 13, width: "100%", minHeight: 72, resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }} />
      ) : (
        lead.next_action && (
          <div style={{ color: "#174f35", marginTop: 3, lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {lead.next_action}
          </div>
        )
      )}
    </div>
  );
}
