import React, { useState } from 'react';
import { TODAY } from '../lib/constants.js';
import { JP_HOLIDAYS } from '../lib/date.js';
import { fetchFreeBusy } from '../lib/gcal.js';
import { TrashIcon } from './icons.jsx';
import { S } from './styles.js';

export function CalendarSearchForm({ cfg, mergedCalendarIds, members, selectedMembers, onSelectedMembersChange, onSearchStart, onSearchComplete }) {
  const [dateFrom, setDateFrom] = useState(TODAY);
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date(TODAY + "T00:00:00"); d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [duration, setDuration] = useState(60);
  const [timeStart, setTimeStart] = useState("09:00");
  const [timeEnd, setTimeEnd] = useState("18:00");
  const [bufferBefore, setBufferBefore] = useState(30);
  const [bufferAfter, setBufferAfter] = useState(30);
  const [activeDays, setActiveDays] = useState([1,2,3,4,5]);
  const [includeHolidays, setIncludeHolidays] = useState(false);
  const [excludeTimes, setExcludeTimes] = useState([{from:"12:00",to:"13:00"}]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    setLoading(true); setError(""); onSearchStart();
    try {
      const timeMin = dateFrom + "T00:00:00+09:00";
      const timeMax = dateTo   + "T23:59:59+09:00";
      const items = selectedMembers
        .map(m => mergedCalendarIds[m])
        .filter(Boolean)
        .map(id => ({ id }));
      if (items.length === 0) { setError("選択したメンバーのカレンダーIDが設定されていません"); setLoading(false); return; }
      const data = await fetchFreeBusy(cfg.apiKey, timeMin, timeMax, items);
      const busyByMember = {};
      selectedMembers.forEach(m => {
        const calId = mergedCalendarIds[m];
        if (!calId) return;
        busyByMember[m] = (data.calendars[calId]?.busy || []).map(b => ({
          start: new Date(b.start), end: new Date(b.end)
        }));
      });
      const found = [];
      const from = new Date(dateFrom + "T00:00:00+09:00");
      const to   = new Date(dateTo   + "T23:59:59+09:00");
      const [sh, sm] = timeStart.split(":").map(Number);
      const [eh, em] = timeEnd.split(":").map(Number);
      const bufBefore = bufferBefore * 60000;
      const bufAfter  = bufferAfter  * 60000;
      let cur = new Date(from);
      while (cur <= to) {
        const jstDate = new Date(cur.getTime() + 9*60*60000);
        const dow = jstDate.getUTCDay();
        const ds  = jstDate.toISOString().split("T")[0];
        if (activeDays.includes(dow) && (!JP_HOLIDAYS.has(ds) || includeHolidays)) {
          let slotStart = new Date(cur);
          slotStart.setHours(sh, sm, 0, 0);
          const dayEnd = new Date(cur);
          dayEnd.setHours(eh, em, 0, 0);
          while (slotStart.getTime() + duration * 60000 <= dayEnd.getTime()) {
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            const checkStart = new Date(slotStart.getTime() - bufBefore);
            const checkEnd   = new Date(slotEnd.getTime()   + bufAfter);
            const inExclude = excludeTimes.some(ex => {
              const [exSh,exSm] = ex.from.split(":").map(Number);
              const [exEh,exEm] = ex.to.split(":").map(Number);
              const exS = new Date(slotStart); exS.setHours(exSh, exSm, 0, 0);
              const exE = new Date(slotStart); exE.setHours(exEh, exEm, 0, 0);
              return slotStart < exE && slotEnd > exS;
            });
            const freeMembers = inExclude ? [] : selectedMembers.filter(m => {
              const busy = busyByMember[m] || [];
              return !busy.some(b => checkStart < b.end && checkEnd > b.start);
            });
            if (freeMembers.length > 0) {
              found.push({ date: ds, start: slotStart.toTimeString().slice(0,5), end: slotEnd.toTimeString().slice(0,5), members: freeMembers });
              slotStart = new Date(slotEnd.getTime() + bufAfter);
            } else {
              slotStart = new Date(slotStart.getTime() + 30 * 60000);
            }
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
      onSearchComplete(found);
    } catch(e) {
      setError("エラー: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.card}>
      <div style={{fontSize:13,fontWeight:700,color:"#174f35",marginBottom:12}}>🔍 空き時間を検索</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div>
          <label style={S.lbl}>期間（開始）</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>期間（終了）</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>時間帯（開始）</label>
          <select value={timeStart} onChange={e=>setTimeStart(e.target.value)} style={S.inp}>
            {Array.from({length:24},(_,i)=>`${String(i).padStart(2,"0")}:00`).map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={S.lbl}>時間帯（終了）</label>
          <select value={timeEnd} onChange={e=>setTimeEnd(e.target.value)} style={S.inp}>
            {Array.from({length:24},(_,i)=>`${String(i).padStart(2,"0")}:00`).map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={S.lbl}>商談時間</label>
          <select value={duration} onChange={e=>setDuration(Number(e.target.value))} style={S.inp}>
            <option value={30}>30分</option>
            <option value={60}>1時間</option>
            <option value={90}>1時間30分</option>
            <option value={120}>2時間</option>
          </select>
        </div>
        <div>
          <label style={S.lbl}>前後バッファ（移動・準備時間）</label>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <select value={bufferBefore} onChange={e=>setBufferBefore(Number(e.target.value))} style={{...S.inp,flex:1}}>
              <option value={0}>前：なし</option>
              <option value={15}>前：15分</option>
              <option value={30}>前：30分</option>
              <option value={60}>前：60分</option>
            </select>
            <select value={bufferAfter} onChange={e=>setBufferAfter(Number(e.target.value))} style={{...S.inp,flex:1}}>
              <option value={0}>後：なし</option>
              <option value={15}>後：15分</option>
              <option value={30}>後：30分</option>
              <option value={60}>後：60分</option>
            </select>
          </div>
        </div>
      </div>
      {(bufferBefore > 0 || bufferAfter > 0) && (
        <div style={{fontSize:11,color:"#6a9a7a",marginBottom:10,background:"#f0f5f2",borderRadius:6,padding:"6px 10px"}}>
          💡 前後バッファON：既存予定の前{bufferBefore}分・後{bufferAfter}分も空きとして確保します（移動・準備時間）
        </div>
      )}
      <div style={{marginBottom:12}}>
        <label style={S.lbl}>対象曜日</label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          {[["日",0,"#ef4444"],["月",1,"#3b82f6"],["火",2,"#3b82f6"],["水",3,"#3b82f6"],["木",4,"#3b82f6"],["金",5,"#3b82f6"],["土",6,"#8b5cf6"]].map(([label,val,col])=>{
            const active = activeDays.includes(val);
            return <button key={val} onClick={()=>setActiveDays(prev=>active?prev.filter(d=>d!==val):[...prev,val].sort())} style={{width:40,height:40,borderRadius:20,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:active?col:"#f0f5f2",color:active?"#fff":col,transition:"all 0.15s"}}>
              {label}
            </button>;
          })}
          <button onClick={()=>setIncludeHolidays(v=>!v)} style={{height:40,padding:"0 12px",borderRadius:20,border:includeHolidays?"none":"1.5px dashed #f59e0b",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:includeHolidays?"#f59e0b":"#f0f5f2",color:includeHolidays?"#fff":"#f59e0b",transition:"all 0.15s",whiteSpace:"nowrap"}}>
            祝日
          </button>
        </div>
        {activeDays.length===0&&<div style={{fontSize:11,color:"#ef4444",marginTop:4}}>⚠️ 曜日を1つ以上選択</div>}
      </div>
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <label style={{...S.lbl,marginBottom:0}}>🚫 対象外時間帯</label>
          <button onClick={()=>setExcludeTimes(prev=>[...prev,{from:"12:00",to:"13:00"}])} style={{fontSize:11,padding:"4px 10px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>＋ 追加</button>
        </div>
        {excludeTimes.length===0&&<div style={{fontSize:11,color:"#9ca3af",padding:"6px 10px",background:"#f9fafb",borderRadius:6,border:"1px dashed #d1d5db"}}>対象外時間帯なし</div>}
        {excludeTimes.map((ex,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:"#fff8f0",border:"1px solid #fde68a",borderRadius:8,padding:"8px 12px"}}>
            <input type="time" value={ex.from} onChange={e=>setExcludeTimes(prev=>prev.map((t,j)=>j===i?{...t,from:e.target.value}:t))} style={{...S.inp,marginBottom:0,padding:"4px 8px",width:90,fontSize:12}}/>
            <span style={{fontSize:12,color:"#6b7280"}}>〜</span>
            <input type="time" value={ex.to} onChange={e=>setExcludeTimes(prev=>prev.map((t,j)=>j===i?{...t,to:e.target.value}:t))} style={{...S.inp,marginBottom:0,padding:"4px 8px",width:90,fontSize:12}}/>
            <span style={{fontSize:11,color:"#6b7280"}}>は除外</span>
            <button onClick={()=>setExcludeTimes(prev=>prev.filter((_,j)=>j!==i))} style={{marginLeft:"auto",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:5,cursor:"pointer",padding:"3px 6px",display:"flex",alignItems:"center"}} title="削除"><TrashIcon color="#dc2626"/></button>
          </div>
        ))}
      </div>
      <div style={{marginBottom:12}}>
        <label style={S.lbl}>対象メンバー（複数選択可）</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {members.map(m => {
            const active = selectedMembers.includes(m);
            const hasId = !!mergedCalendarIds[m];
            return (
              <button key={m} onClick={()=>onSelectedMembersChange(prev=>active?prev.filter(x=>x!==m):[...prev,m])} style={{fontSize:12,padding:"5px 12px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",
                background: active ? "#10b98133" : "transparent",
                color: active ? "#059669" : "#6a9a7a",
                border: `1px solid ${active ? "#10b98166" : "#c0dece"}`,
                fontWeight: active ? 700 : 400,
                opacity: hasId ? 1 : 0.5,
              }}>
                {m}{!hasId && " ⚠️"}
              </button>
            );
          })}
        </div>
        {selectedMembers.some(m=>!mergedCalendarIds[m]) && (
          <div style={{fontSize:11,color:"#f59e0b",marginTop:4}}>⚠️ カレンダーID未設定のメンバーは除外されます</div>
        )}
      </div>
      <button onClick={search} disabled={loading}
        style={{...S.btnP, width:"100%", opacity:loading?0.6:1}}>
        {loading ? "🔍 検索中..." : "🔍 空き時間を検索"}
      </button>
      {error && <div style={{color:"#ef4444",fontSize:12,marginTop:8}}>{error}</div>}
    </div>
  );
}
