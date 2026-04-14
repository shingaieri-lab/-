// リード検索コンボボックス
// 会社名・担当者名でインクリメンタル検索して選択する

import { useState, useEffect, useRef } from 'react';

export function LeadCombobox({ leads, value, onChange, placeholder, inputStyle, darkMode }) {
  const [inputVal, setInputVal] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!value) { setInputVal(""); return; }
    const l = leads.find(l => l.id === value);
    if (l) setInputVal(l.company + (l.contact ? `（${l.contact}）` : ""));
  }, [value, leads]);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const q = inputVal.trim().toLowerCase();
  const filtered = value
    ? leads
    : leads.filter(l => !q || (l.company||"").toLowerCase().includes(q) || (l.contact||"").toLowerCase().includes(q));

  const select = l => { onChange(l.id); setInputVal(l.company + (l.contact ? `（${l.contact}）` : "")); setOpen(false); };
  const handleChange = e => { setInputVal(e.target.value); if (value) onChange(""); setOpen(true); };
  const handleClear = e => { e.stopPropagation(); onChange(""); setInputVal(""); setOpen(false); };

  const bg       = darkMode ? "#1e293b" : "#fff";
  const border   = darkMode ? "#334155" : "#c0dece";
  const textColor = darkMode ? "#e2e8f0" : "#174f35";
  const hoverBg  = darkMode ? "#334155" : "#f0f9f5";
  const rowBorder = darkMode ? "#334155" : "#e2f0e8";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input value={inputVal} onChange={handleChange} onFocus={() => { if (!value) setOpen(true); }}
          placeholder={placeholder} style={{ ...inputStyle, paddingRight: inputVal ? "28px" : undefined }} />
        {inputVal && (
          <button onMouseDown={handleClear}
            style={{ position:"absolute", right:7, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9ca3af", fontSize:13, padding:"0 2px", lineHeight:1 }}>
            ✕
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:9999, background:bg, border:`1px solid ${border}`, borderRadius:8, boxShadow:"0 4px 16px rgba(0,0,0,0.18)", maxHeight:240, overflowY:"auto", marginTop:2 }}>
          {filtered.map(l => (
            <div key={l.id} onMouseDown={() => select(l)}
              style={{ padding:"9px 12px", cursor:"pointer", fontSize:13, color:textColor, borderBottom:`1px solid ${rowBorder}` }}
              onMouseEnter={e => e.currentTarget.style.background = hoverBg}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              {l.company}{l.contact ? `（${l.contact}）` : ""}
              {darkMode && l.status
                ? <span style={{ marginLeft:6, fontSize:11, color:"#64748b" }}>[{typeof l.status === "object" ? l.status.label || "" : String(l.status)}]</span>
                : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
