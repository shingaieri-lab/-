import React, { useState, useMemo } from 'react';
import { loadGCalConfig, saveGCalConfig } from '../lib/gcal.js';
import { loadAccounts, getSalesMembers } from '../lib/master.js';
import { Header } from './ui.jsx';
import { S } from './styles.js';
import { CalendarSetupPanel } from './CalendarSetupPanel.jsx';
import { CalendarSearchForm } from './CalendarSearchForm.jsx';
import { CalendarSlotResults } from './CalendarSlotResults.jsx';
import { CalendarRegModal } from './CalendarRegModal.jsx';

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

  const [selectedMembers, setSelectedMembers] = useState(["北原"]);
  const [slots, setSlots] = useState([]);
  const [searched, setSearched] = useState(false);
  const [showCalReg, setShowCalReg] = useState(false);
  const [emailLeadId, setEmailLeadId] = useState("");

  const members = getSalesMembers();
  const isConfigured = cfg.apiKey && Object.keys(mergedCalendarIds).length > 0;

  return (
    <div className="cal-page" style={{...S.page, width:"60vw", maxWidth:"100%"}}>
      <Header title="📅 商談候補日検索" sub="Google Calendarの空き時間を自動検索します">
        <button onClick={()=>{ setEditCfg(loadGCalConfig()); setShowSetup(v=>!v); }}
          style={{...S.btnSec, fontSize:12}}>⚙️ カレンダー設定</button>
      </Header>

      {showSetup && (
        <CalendarSetupPanel
          editCfg={editCfg}
          setEditCfg={setEditCfg}
          members={members}
          onSave={(newCfg) => { saveGCalConfig(newCfg); setCfg(newCfg); setShowSetup(false); }}
          onClose={() => setShowSetup(false)}
        />
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
          cfg={cfg}
          mergedCalendarIds={mergedCalendarIds}
          members={members}
          selectedMembers={selectedMembers}
          onSelectedMembersChange={setSelectedMembers}
          onSearchStart={() => { setSlots([]); setSearched(false); }}
          onSearchComplete={(found) => { setSlots(found); setSearched(true); }}
        />
      )}

      <CalendarSlotResults
        slots={slots}
        searched={searched}
        candidateSlots={candidateSlots}
        onSlotsChange={onSlotsChange}
        leads={leads}
        emailLeadId={emailLeadId}
        setEmailLeadId={setEmailLeadId}
        selectedMembers={selectedMembers}
        onGoEmail={onGoEmail}
        onOpenCalReg={() => setShowCalReg(true)}
      />

      <CalendarRegModal
        show={showCalReg}
        onClose={() => setShowCalReg(false)}
        candidateSlots={candidateSlots}
        leads={leads}
        selectedMembers={selectedMembers}
        mergedCalendarIds={mergedCalendarIds}
        currentUser={currentUser}
        initialLeadId={emailLeadId}
      />
    </div>
  );
}
