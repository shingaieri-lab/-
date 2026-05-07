// リード一覧フィルターバー（流入元・ステータス・期間・追客日・IS担当・並び順）
import { S } from '../../styles/index.js';
import { FlameIcon, BuildingIcon } from '../ui/Icons.jsx';
import { getSources, getStatuses, getStatusColor, getISMembers, getPortalSitesForSource, sourceHasPortal } from '../../lib/master.js';
import { TODAY } from '../../lib/holidays.js';

export function LeadFilterBar({
  fQ, setFQ, fSource, setFSrc, fPortal, setFPortal, fMonth, setFMonth,
  fNextAction, setFNextAction, fIS, setFIS, fHasPortal, setFHasPortal,
  fMql, setFMql, fStatuses, setFStatuses,
  sort, setSort, sortDir, setSortDir,
  leads, isMobile,
}) {
  return (
    <>
      {/* フィルター 1行目 */}
      <div className="filter-bar" style={{display:"flex", gap:8, marginBottom:6, alignItems:"center"}}>
        <input value={fQ} onChange={e => setFQ(e.target.value)}
          placeholder="会社名・担当者" style={{...S.sel, width:220, flexShrink:0}} />
        <select value={fSource} onChange={e => { setFSrc(e.target.value); setFPortal(""); }} style={{...S.sel, flexShrink:0}}>
          <option value="">全流入元</option>
          {getSources().map(s => <option key={s}>{s}</option>)}
        </select>
        {fHasPortal && (
          <button onClick={() => setFHasPortal(false)} style={{fontSize:11,padding:"3px 9px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",flexShrink:0, background:"#8b5cf633", color:"#7c3aed", border:"1px solid #8b5cf666", fontWeight:700, display:"flex", alignItems:"center", gap:4}}><BuildingIcon size={11} color="#7c3aed" /> ポータル ✕</button>
        )}
        {sourceHasPortal(fSource) && (
          <select value={fPortal} onChange={e => setFPortal(e.target.value)} style={{...S.sel, flexShrink:0}}>
            <option value="">全サイト</option>
            {getPortalSitesForSource(fSource).map(p => <option key={p}>{p}</option>)}
          </select>
        )}
        <select value={fMonth} onChange={e => setFMonth(e.target.value)} style={{...S.sel, flexShrink:0}}>
          <option value="">全期間</option>
          {[...new Set(leads.map(l => {
            const s = l.date||"";
            if (/^\d{4}-\d{2}/.test(s)) return s.slice(0,7);
            const m = s.match(/^(\d{4})[\/-](\d{1,2})/);
            return m ? m[1]+"-"+m[2].padStart(2,"0") : "";
          }).filter(Boolean))].sort().reverse().map(m => <option key={m} value={m}>{m.slice(0,4)}年{parseInt(m.slice(5))}月</option>)}
        </select>
        <select value={fIS} onChange={e => setFIS(e.target.value)} style={{...S.sel, flexShrink:0}}>
          <option value="">全IS担当</option>
          {getISMembers().map(m => <option key={m}>{m}</option>)}
        </select>
      </div>

      {/* フィルター 2行目：並び順＋ステータス */}
      <div className="filter-bar" style={{display:"flex", gap:4, alignItems:"center", marginBottom:16, flexWrap: isMobile ? "wrap" : "nowrap"}}>
        <span style={{fontSize:11, color:"#6a9a7a", flexShrink:0}}>並び順:</span>
        {[["fixed","標準"],["date","反響日"],["nextAction","追客日"]].map(([v, label]) => (
          <button key={v} onClick={() => {
            if (sort === v) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
            else { setSort(v); setSortDir("asc"); }
          }} style={{fontSize:11,padding:"4px 10px",borderRadius:8,cursor:"pointer",fontFamily:"inherit", background: sort===v ? "#10b98122" : "transparent", color: sort===v ? "#059669" : "#3d7a5e", border: `1px solid ${sort===v ? "#10b98155" : "#c0dece"}`, fontWeight: sort===v ? 700 : 400}}>
            {label}{sort===v && v!=="fixed" ? (sortDir==="asc" ? " ↑" : " ↓") : ""}
          </button>
        ))}
        <span style={{fontSize:11, color:"#c0dece", flexShrink:0, margin:"0 4px"}}>|</span>
        <button onClick={() => setFNextAction(v => v==="today" ? "" : "today")}
          style={{fontSize:11,padding:"3px 9px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",flexShrink:0, background:fNextAction==="today"?"#ea580c33":"transparent", color:fNextAction==="today"?"#ea580c":"#3d7a5e", border:`1px solid ${fNextAction==="today"?"#ea580c66":"#c0dece"}`, fontWeight:fNextAction==="today"?700:400, display:"flex", alignItems:"center", gap:4}}>
          <FlameIcon size={12} color={fNextAction==="today"?"#ea580c":"#3d7a5e"} /> 本日追客
        </button>
        <span style={{fontSize:11, color:"#c0dece", flexShrink:0, margin:"0 4px"}}>|</span>
        <button onClick={() => setFMql(v => !v)}
          style={{fontSize:11,padding:"3px 9px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",flexShrink:0, background:fMql?"#059669":"transparent", color:fMql?"#fff":"#3d7a5e", border:`1px solid ${fMql?"#059669":"#c0dece"}`, fontWeight:fMql?700:400}}>
          MQL
        </button>
        <span style={{fontSize:11, color:"#c0dece", flexShrink:0, margin:"0 4px"}}>|</span>
        <span style={{fontSize:11, color:"#6a9a7a", flexShrink:0}}>ステータス:</span>
        {getStatuses().map(s => {
          const active = fStatuses.has(s);
          const c = getStatusColor(s);
          return (
            <button key={s} onClick={() => setFStatuses(prev => {
              const n = new Set(prev); active ? n.delete(s) : n.add(s); return n;
            })} style={{fontSize:11,padding:"3px 9px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",flexShrink:0, background: active ? c+"33" : "transparent", color: active ? c : "#3d7a5e", border: `1px solid ${active ? c+"66" : "#c0dece"}`, fontWeight: active ? 700 : 400}}>
              {s}
            </button>
          );
        })}
        {fStatuses.size > 0 && (
          <button onClick={() => setFStatuses(new Set())}
            style={{fontSize:11,color:"#6a9a7a",background:"none",border:"none",cursor:"pointer",padding:"2px 4px",flexShrink:0,whiteSpace:"nowrap"}}>
            ✕ クリア
          </button>
        )}
      </div>
    </>
  );
}
