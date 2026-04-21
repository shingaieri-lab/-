// アクション記録フォーム（新規記録 / 編集）
import { useState } from 'react';
import { S } from '../../styles/index.js';
import { ACTION_TYPES, ACTION_RESULTS, uid } from '../../constants/index.js';
import { TODAY, isBusinessDay } from '../../lib/holidays.js';
import { AlertIcon } from '../ui/Icons.jsx';
import { VoiceButton } from './VoiceButton.jsx';

export function ActionForm({ onSave, onClose, initial }) {
  const [type,      setType]      = useState(initial?.type      || "call");
  const [result,    setResult]    = useState(initial?.result    || "繋がった");
  const [summary,   setSummary]   = useState(initial?.summary   || "");
  const [date,      setDate]      = useState(initial?.date      || TODAY);
  const [time,      setTime]      = useState(() => {
    if (initial?.time !== undefined) return initial.time;
    const n = new Date();
    const m = Math.floor(n.getMinutes() / 30) * 30;
    return `${String(n.getHours()).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });
  const [nextDate,  setNextDate]  = useState(initial?.nextDate  || "");
  const [nextTime,  setNextTime]  = useState(initial?.nextTime  || "");
  const [nextLabel, setNextLabel] = useState(initial?.next      || "");
  const isEdit = !!initial;
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const h = String(Math.floor(i / 2)).padStart(2, "0");
    const m = i % 2 === 0 ? "00" : "30";
    return `${h}:${m}`;
  });

  return (
    <div style={S.actForm}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <label style={S.lbl}>方法</label>
          <select value={type} onChange={e => setType(e.target.value)} style={S.inp}>
            {ACTION_TYPES.map(a => <option key={a.v} value={a.v}>{a.icon} {a.label}</option>)}
          </select>
        </div>
        <div>
          <label style={S.lbl}>結果</label>
          <select value={result} onChange={e => setResult(e.target.value)} style={S.inp}>
            {ACTION_RESULTS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={S.lbl}>日付</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>時刻</label>
          <select value={time} onChange={e => setTime(e.target.value)} style={S.inp}>
            <option value="">指定なし</option>
            {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <label style={{ ...S.lbl, marginBottom: 0 }}>一言メモ</label>
          <VoiceButton onResult={t => setSummary(prev => prev ? prev + "　" + t : t)} style={{ padding: "3px 8px", fontSize: 13 }} />
        </div>
        <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2}
          placeholder="内容を簡単にメモ…"
          style={{ ...S.inp, resize: "vertical", minHeight: 52, lineHeight: 1.6, fontFamily: "inherit" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div>
          <label style={S.lbl}>次回追客日</label>
          <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}
            style={{ ...S.inp, borderColor: nextDate && !isBusinessDay(nextDate) ? "#ef4444" : "#c0dece" }} />
          {nextDate && !isBusinessDay(nextDate) && (
            <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3, display:"flex", alignItems:"center", gap:3 }}><AlertIcon size={11} color="#ef4444" /> 土日祝です</div>
          )}
        </div>
        <div>
          <label style={S.lbl}>次回時刻</label>
          <select value={nextTime} onChange={e => setNextTime(e.target.value)} style={S.inp}>
            <option value="">指定なし</option>
            {Array.from({ length: 28 }, (_, i) => {
              const h = String(Math.floor(i / 2) + 8).padStart(2, "0");
              const m = i % 2 === 0 ? "00" : "30";
              return <option key={i} value={`${h}:${m}`}>{`${h}:${m}`}</option>;
            })}
          </select>
        </div>
        <div>
          <label style={S.lbl}>メモ（任意）</label>
          <input value={nextLabel} onChange={e => setNextLabel(e.target.value)}
            placeholder="例：午前に架電" style={S.inp} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={S.btnSec}>キャンセル</button>
        <button onClick={() => {
          if (!summary.trim() && !nextDate) return alert("メモまたは次回追客日を入力してください");
          onSave({ id: initial?.id || uid(), type, result, summary, date, time, next: nextLabel, nextDate, nextTime, ts: initial?.ts || Date.now() });
        }} style={S.btnP}>{isEdit ? "更新する" : "記録する"}</button>
      </div>
    </div>
  );
}
