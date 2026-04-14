// 商談候補日検索ページ（Google Calendar freeBusy API・候補日選択・カレンダー登録）
import { useState, useMemo } from 'react';
import { TrashIcon } from '../components/ui/Icons.jsx';
import { Header } from '../components/ui/Layout.jsx';
import { LeadCombobox } from '../components/leads/LeadCombobox.jsx';
import { loadGCalConfig, saveGCalConfig } from '../lib/gcal.js';
import { loadAccounts } from '../lib/accounts.js';
import { JP_HOLIDAYS, TODAY } from '../lib/holidays.js';
import { getSalesMembers } from '../lib/master.js';
import { CalendarSetupPanel } from '../components/calendar/CalendarSetupPanel.jsx';
import { CalendarRegModal } from '../components/calendar/CalendarRegModal.jsx';

// ローカルスタイル定数（このページでのみ使用）
const S = {
  page:    { padding:"24px 28px", minHeight:"100vh" },
  card:    { background:"#ffffff", border:"1px solid #e2f0e8", borderRadius:14, padding:"18px 20px", marginBottom:14, boxShadow:"0 2px 10px #0569690a" },
  lbl:     { display:"block", fontSize:11, color:"#6a9a7a", marginBottom:4, fontWeight:600 },
  inp:     { width:"100%", background:"#f8fffe", border:"1px solid #99e6d8", borderRadius:7, padding:"9px 12px", color:"#1f5c40", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", marginBottom:8 },
  btnP:    { background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", border:"none", borderRadius:8, padding:"10px 18px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  btnSec:  { background:"#d8ede1", color:"#2d6b4a", border:"1px solid #c0dece", borderRadius:8, padding:"9px 16px", fontSize:13, cursor:"pointer", fontFamily:"inherit" },
};

export function CalendarPage({ candidateSlots = [], onSlotsChange = ()=>{}, onGoEmail = ()=>{}, currentUser, leads = [] }) {
  const [cfg, setCfg] = useState(() => loadGCalConfig());
  const [showSetup, setShowSetup] = useState(false);
  const [editCfg, setEditCfg] = useState(() => loadGCalConfig());
  const accountCalendarIds = useMemo(() => {
    const accounts = loadAccounts();
    const ids = {};
    accounts.forEach(a => { if (a.calendarId) ids[a.name] = a.calendarId; });
    return ids;
  }, []);
  const mergedCalendarIds = useMemo(() => ({
    ...(cfg.calendarIds||{}),
    ...accountCalendarIds
  }), [cfg, accountCalendarIds]);

  // 検索条件
  const [selectedMembers, setSelectedMembers] = useState(["北原"]);
  const [dateFrom, setDateFrom] = useState(TODAY);
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date(TODAY + "T00:00:00"); d.setDate(d.getDate()+14);
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

  // 結果
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  // カレンダー登録モーダル用
  const [showCalReg, setShowCalReg] = useState(false);
  const [emailLeadId, setEmailLeadId] = useState("");

  const isConfigured = cfg.apiKey && Object.keys(mergedCalendarIds).length > 0;

  // Google Calendar freebusy APIを叩く
  const search = async () => {
    if (!isConfigured) { setShowSetup(true); return; }
    setLoading(true); setError(""); setSlots([]); setSearched(false);

    try {
      const timeMin = dateFrom + "T00:00:00+09:00";
      const timeMax = dateTo   + "T23:59:59+09:00";

      // 対象メンバーのカレンダーIDを収集
      const items = selectedMembers
        .map(m => mergedCalendarIds[m])
        .filter(Boolean)
        .map(id => ({ id }));

      if (items.length === 0) { setError("選択したメンバーのカレンダーIDが設定されていません"); setLoading(false); return; }

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/freeBusy?key=${cfg.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeMin, timeMax, items })
        }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error?.message || "APIエラー");
      }
      const data = await res.json();

      // 各メンバーの busy 時間帯を収集
      const busyByMember = {};
      selectedMembers.forEach(m => {
        const calId = mergedCalendarIds[m];
        if (!calId) return;
        busyByMember[m] = (data.calendars[calId]?.busy || []).map(b => ({
          start: new Date(b.start), end: new Date(b.end)
        }));
      });

      // 空き時間スロットを生成
      const found = [];
      const from = new Date(dateFrom + "T00:00:00+09:00");
      const to   = new Date(dateTo   + "T23:59:59+09:00");
      const [sh, sm] = timeStart.split(":").map(Number);
      const [eh, em] = timeEnd.split(":").map(Number);
      const bufBefore = bufferBefore * 60000; // ms
      const bufAfter  = bufferAfter  * 60000; // ms

      let cur = new Date(from);
      while (cur <= to) {
        const jstDate = new Date(cur.getTime() + 9*60*60000);
        const dow = jstDate.getUTCDay();
        const ds  = jstDate.toISOString().split("T")[0];
        if (activeDays.includes(dow) && (!JP_HOLIDAYS.has(ds) || includeHolidays)) {
          // この日の稼働時間内でスロットを探す
          let slotStart = new Date(cur);
          slotStart.setHours(sh, sm, 0, 0);
          const dayEnd = new Date(cur);
          dayEnd.setHours(eh, em, 0, 0);

          while (slotStart.getTime() + duration * 60000 <= dayEnd.getTime()) {
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            // バッファ込みの占有時間帯
            const checkStart = new Date(slotStart.getTime() - bufBefore);
            const checkEnd   = new Date(slotEnd.getTime()   + bufAfter);
            // 除外時間帯チェック
            const inExclude = excludeTimes.some(ex => {
              const [exSh,exSm]=ex.from.split(":").map(Number);
              const [exEh,exEm]=ex.to.split(":").map(Number);
              const exS=new Date(slotStart);exS.setHours(exSh,exSm,0,0);
              const exE=new Date(slotStart);exE.setHours(exEh,exEm,0,0);
              return slotStart<exE&&slotEnd>exS;
            });
            // OR検索：空いているメンバーを列挙
            const freeMembers = inExclude ? [] : selectedMembers.filter(m => {
              const busy = busyByMember[m] || [];
              return !busy.some(b => checkStart < b.end && checkEnd > b.start);
            });
            if (freeMembers.length > 0) {
              found.push({ date: ds, start: slotStart.toTimeString().slice(0,5), end: slotEnd.toTimeString().slice(0,5), members: freeMembers });
              // 次スロットは商談終了＋後バッファ後から
              slotStart = new Date(slotEnd.getTime() + bufAfter);
            } else {
              slotStart = new Date(slotStart.getTime() + 30 * 60000);
            }
          }
        }
        cur.setDate(cur.getDate() + 1);
      }

      setSlots(found);
      setSearched(true);
    } catch(e) {
      setError("エラー: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const copySlot = (slot) => {
    const txt = `${slot.date} ${slot.start}〜${slot.end}（${slot.members.join("・")}）`;
    navigator.clipboard?.writeText(txt).catch(()=>{});
    alert("コピーしました：\n" + txt);
  };
  const isSlotSelected = (slot) => candidateSlots.some(s=>s.date===slot.date&&s.start===slot.start&&s.end===slot.end);
  const toggleCandidateSlot = (slot) => {
    if (isSlotSelected(slot)) {
      onSlotsChange(candidateSlots.filter(s=>!(s.date===slot.date&&s.start===slot.start&&s.end===slot.end)));
    } else if (candidateSlots.length < 3) {
      onSlotsChange([...candidateSlots, slot]);
    }
  };

  const members = getSalesMembers();
  const inp2 = { ...S.inp, marginBottom:0 };

  return (
    <div className="cal-page" style={{...S.page, width:"60vw", maxWidth:"100%"}}>
      <Header title="📅 商談候補日検索" sub="Google Calendarの空き時間を自動検索します">
        <button onClick={()=>{ setEditCfg(loadGCalConfig()); setShowSetup(v=>!v); }}
          style={{...S.btnSec, fontSize:12}}>⚙️ カレンダー設定</button>
      </Header>

      {/* 設定パネル */}
      {showSetup && (
        <CalendarSetupPanel
          editCfg={editCfg}
          setEditCfg={setEditCfg}
          onSave={() => { saveGCalConfig(editCfg); setCfg(editCfg); setShowSetup(false); }}
          onClose={() => setShowSetup(false)}
          members={members}
        />
      )}

      {!isConfigured && !showSetup && (
        <div style={{...S.card,textAlign:"center",padding:"32px",marginBottom:16}}>
          <div style={{fontSize:32,marginBottom:10}}>⚙️</div>
          <div style={{fontSize:14,color:"#2d6b4a",marginBottom:8}}>まずカレンダーAPIの設定が必要です</div>
          <button onClick={()=>setShowSetup(true)} style={S.btnP}>設定を開く</button>
        </div>
      )}

      {/* 検索フォーム */}
      {isConfigured && (
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

          {/* 曜日選択 */}
          <div style={{marginBottom:12}}>
            <label style={S.lbl}>対象曜日</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              {[["日",0,"#ef4444"],["月",1,"#3b82f6"],["火",2,"#3b82f6"],["水",3,"#3b82f6"],["木",4,"#3b82f6"],["金",5,"#3b82f6"],["土",6,"#8b5cf6"]].map(([label,val,col])=>{
                const active=activeDays.includes(val);
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

          {/* 対象外時間帯 */}
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
                  <button key={m} onClick={()=>setSelectedMembers(prev=>
                    active ? prev.filter(x=>x!==m) : [...prev,m]
                  )} style={{fontSize:12,padding:"5px 12px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",
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
      )}

      {/* 検索結果 */}
      {searched && (
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div style={{fontSize:13,fontWeight:700,color:"#174f35"}}>
              検索結果：<span style={{color:"#10b981"}}>{slots.length}件</span> の空き時間
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {candidateSlots.length > 0 && (
                <span style={{fontSize:12,color:"#059669",fontWeight:700,background:"#ecfdf5",border:"1px solid #10b98144",borderRadius:8,padding:"4px 10px"}}>
                  ✅ {candidateSlots.length}件選択中
                </span>
              )}
              <button onClick={()=>onSlotsChange([])} disabled={candidateSlots.length===0}
                style={{fontSize:11,padding:"4px 10px",borderRadius:7,border:"1px solid #c0dece",background:"#f0f5f2",color:"#6a9a7a",cursor:candidateSlots.length===0?"default":"pointer",fontFamily:"inherit",opacity:candidateSlots.length===0?0.4:1}}>
                選択をクリア
              </button>
              <button onClick={()=>onGoEmail(emailLeadId)} disabled={candidateSlots.length===0}
                style={{fontSize:12,padding:"6px 14px",borderRadius:8,border:"none",background:candidateSlots.length===0?"#d1d5db":"linear-gradient(135deg,#10b981,#059669)",color:"#fff",cursor:candidateSlots.length===0?"default":"pointer",fontFamily:"inherit",fontWeight:700}}>
                📧 メールに使う
              </button>
              <button onClick={()=>setShowCalReg(true)} disabled={candidateSlots.length===0}
                style={{fontSize:12,padding:"6px 14px",borderRadius:8,border:"none",background:candidateSlots.length===0?"#d1d5db":"linear-gradient(135deg,#3b82f6,#2563eb)",color:"#fff",cursor:candidateSlots.length===0?"default":"pointer",fontFamily:"inherit",fontWeight:700}}>
                📅 カレンダーに登録
              </button>
            </div>
          </div>
          {candidateSlots.length > 0 && (
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
              <span style={{fontSize:11,color:"#6a9a7a",fontWeight:600,whiteSpace:"nowrap"}}>対象リード：</span>
              <div style={{flex:1,minWidth:180,maxWidth:280}}>
                <LeadCombobox leads={leads} value={emailLeadId} onChange={setEmailLeadId}
                  placeholder="会社名・担当者名で検索" inputStyle={{...S.inp,padding:"5px 10px",fontSize:12}} darkMode={false} />
              </div>
              {emailLeadId && <span style={{fontSize:11,color:"#059669",fontWeight:700}}>✅ {leads.find(l=>l.id===emailLeadId)?.company||""}</span>}
            </div>
          )}
          {candidateSlots.length === 0 && (
            <div style={{fontSize:11,color:"#6b7280",background:"#f9fafb",borderRadius:7,padding:"6px 10px",marginBottom:10,border:"1px dashed #d1d5db"}}>
              日時ボタンをクリックして候補日を選択（最大3つ）→「📧 メールに使う」でメールテンプレートに反映
            </div>
          )}
          {slots.length === 0 ? (
            <div style={{textAlign:"center",color:"#6a9a7a",padding:"24px",fontSize:14}}>
              指定期間に空き時間が見つかりませんでした
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:400,overflowY:"auto"}}>
              {/* 日付でグループ化 */}
              {[...new Set(slots.map(s=>s.date))].map(date => (
                <div key={date}>
                  <div style={{fontSize:12,fontWeight:700,color:"#6a9a7a",marginBottom:4,marginTop:8}}>
                    {date}（{["日","月","火","水","木","金","土"][new Date(date+"T00:00:00").getDay()]}）
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {slots.filter(s=>s.date===date).map((slot,i)=>{
                      const selected = isSlotSelected(slot);
                      const maxed = candidateSlots.length >= 3 && !selected;
                      return (
                        <button key={i} onClick={()=>toggleCandidateSlot(slot)} disabled={maxed}
                          style={{fontSize:12,padding:"6px 12px",borderRadius:8,cursor:maxed?"not-allowed":"pointer",fontFamily:"inherit",fontWeight:600,
                            border:selected?"2px solid #10b981":"1px solid #10b98144",
                            background:selected?"#10b981":"#ecfdf5",
                            color:selected?"#fff":"#059669",
                            opacity:maxed?0.4:1,
                            transition:"all 0.15s"}}>
                          {selected ? "✓ " : ""}{slot.start}〜{slot.end}{selectedMembers.length > 1 && slot.members && slot.members.length > 0 ? `（${slot.members.join("・")}）` : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* カレンダー登録モーダル */}
      <CalendarRegModal
        show={showCalReg}
        onClose={() => setShowCalReg(false)}
        initialLeadId={emailLeadId}
        candidateSlots={candidateSlots}
        leads={leads}
        selectedMembers={selectedMembers}
        currentUser={currentUser}
        mergedCalendarIds={mergedCalendarIds}
      />
    </div>
  );
}
