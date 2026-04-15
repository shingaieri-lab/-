// 商談候補日検索ページ（Google Calendar freeBusy API・候補日選択・カレンダー登録）
import { useState, useMemo } from 'react';
import { Header } from '../components/ui/Layout.jsx';
import { loadGCalConfig, saveGCalConfig } from '../lib/gcal.js';
import { loadAccounts } from '../lib/accounts.js';
import { JP_HOLIDAYS, TODAY } from '../lib/holidays.js';
import { getSalesMembers } from '../lib/master.js';
import { CalendarSetupPanel } from '../components/calendar/CalendarSetupPanel.jsx';
import { CalendarRegModal } from '../components/calendar/CalendarRegModal.jsx';
import { CalendarSearchForm } from '../components/calendar/CalendarSearchForm.jsx';
import { CalendarSlotResults } from '../components/calendar/CalendarSlotResults.jsx';

const S = {
  page:   { padding:"24px 28px", minHeight:"100vh" },
  card:   { background:"#ffffff", border:"1px solid #e2f0e8", borderRadius:14, padding:"18px 20px", marginBottom:14, boxShadow:"0 2px 10px #0569690a" },
  btnP:   { background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", border:"none", borderRadius:8, padding:"10px 18px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  btnSec: { background:"#d8ede1", color:"#2d6b4a", border:"1px solid #c0dece", borderRadius:8, padding:"9px 16px", fontSize:13, cursor:"pointer", fontFamily:"inherit" },
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

  const [selectedMembers, setSelectedMembers] = useState(() => {
    const salesMembers = getSalesMembers();
    const name = currentUser?.name;
    return (name && salesMembers.includes(name)) ? [name] : [];
  });
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

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [showCalReg, setShowCalReg] = useState(false);
  const [emailLeadId, setEmailLeadId] = useState("");

  const isConfigured = cfg.apiKey && Object.keys(mergedCalendarIds).length > 0;

  const search = async () => {
    if (!isConfigured) { setShowSetup(true); return; }
    setLoading(true); setError(""); setSlots([]); setSearched(false);
    try {
      const timeMin = dateFrom + "T00:00:00+09:00";
      const timeMax = dateTo   + "T23:59:59+09:00";
      const items = selectedMembers.map(m => mergedCalendarIds[m]).filter(Boolean).map(id => ({ id }));
      if (items.length === 0) { setError("選択したメンバーのカレンダーIDが設定されていません"); setLoading(false); return; }
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/freeBusy?key=${cfg.apiKey}`,
        { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ timeMin, timeMax, items }) }
      );
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "APIエラー"); }
      const data = await res.json();
      const busyByMember = {};
      selectedMembers.forEach(m => {
        const calId = mergedCalendarIds[m];
        if (!calId) return;
        busyByMember[m] = (data.calendars[calId]?.busy || []).map(b => ({ start: new Date(b.start), end: new Date(b.end) }));
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
          let slotStart = new Date(cur); slotStart.setHours(sh, sm, 0, 0);
          const dayEnd = new Date(cur); dayEnd.setHours(eh, em, 0, 0);
          while (slotStart.getTime() + duration * 60000 <= dayEnd.getTime()) {
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            const checkStart = new Date(slotStart.getTime() - bufBefore);
            const checkEnd   = new Date(slotEnd.getTime()   + bufAfter);
            const inExclude = excludeTimes.some(ex => {
              const [exSh,exSm]=ex.from.split(":").map(Number); const [exEh,exEm]=ex.to.split(":").map(Number);
              const exS=new Date(slotStart); exS.setHours(exSh,exSm,0,0);
              const exE=new Date(slotStart); exE.setHours(exEh,exEm,0,0);
              return slotStart<exE&&slotEnd>exS;
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
      setSlots(found); setSearched(true);
    } catch(e) {
      setError("エラー: " + e.message);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="cal-page" style={{...S.page, width:"60vw", maxWidth:"100%"}}>
      <Header title="📅 商談候補日検索" sub="Google Calendarの空き時間を自動検索します">
        <button onClick={()=>{ setEditCfg(loadGCalConfig()); setShowSetup(v=>!v); }} style={{...S.btnSec, fontSize:12}}>⚙️ カレンダー設定</button>
      </Header>
      {showSetup && (
        <CalendarSetupPanel editCfg={editCfg} setEditCfg={setEditCfg}
          onSave={() => { saveGCalConfig(editCfg); setCfg(editCfg); setShowSetup(false); }}
          onClose={() => setShowSetup(false)} members={members} />
      )}
      {!isConfigured && !showSetup && (
        <div style={{...S.card,textAlign:"center",padding:"32px",marginBottom:16}}>
          <div style={{fontSize:32,marginBottom:10}}>⚙️</div>
          <div style={{fontSize:14,color:"#2d6b4a",marginBottom:8}}>まずカレンダーAPIの設定が必要です</div>
          <button onClick={()=>setShowSetup(true)} style={S.btnP}>設定を開く</button>
        </div>
      )}
      {isConfigured && (
        <CalendarSearchForm
          dateFrom={dateFrom} setDateFrom={setDateFrom}
          dateTo={dateTo} setDateTo={setDateTo}
          timeStart={timeStart} setTimeStart={setTimeStart}
          timeEnd={timeEnd} setTimeEnd={setTimeEnd}
          duration={duration} setDuration={setDuration}
          bufferBefore={bufferBefore} setBufferBefore={setBufferBefore}
          bufferAfter={bufferAfter} setBufferAfter={setBufferAfter}
          activeDays={activeDays} setActiveDays={setActiveDays}
          includeHolidays={includeHolidays} setIncludeHolidays={setIncludeHolidays}
          excludeTimes={excludeTimes} setExcludeTimes={setExcludeTimes}
          members={members} selectedMembers={selectedMembers} setSelectedMembers={setSelectedMembers}
          mergedCalendarIds={mergedCalendarIds}
          loading={loading} error={error} onSearch={search}
        />
      )}
      <CalendarSlotResults
        searched={searched} slots={slots}
        candidateSlots={candidateSlots} onSlotsChange={onSlotsChange}
        emailLeadId={emailLeadId} setEmailLeadId={setEmailLeadId}
        leads={leads} isSlotSelected={isSlotSelected} toggleCandidateSlot={toggleCandidateSlot}
        onGoEmail={onGoEmail} onShowCalReg={() => setShowCalReg(true)}
        selectedMembers={selectedMembers}
      />
      <CalendarRegModal
        show={showCalReg} onClose={() => setShowCalReg(false)}
        initialLeadId={emailLeadId} candidateSlots={candidateSlots}
        leads={leads} selectedMembers={selectedMembers}
        currentUser={currentUser} mergedCalendarIds={mergedCalendarIds}
      />
    </div>
  );
}
