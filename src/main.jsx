import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

import {
  SOURCES, PORTAL_SITES, PORTAL_TYPES, PORTAL_PRICE,
  DEFAULT_SOURCES, DEFAULT_STATUSES_WITH_COLORS,
  SOURCE_COLOR_PALETTE, STATUS_COLOR_PALETTE, LEAD_SOURCE_ICONS,
  MQL_OPTIONS, ACTION_TYPES, ACTION_RESULTS,
  DEFAULT_SALES_MEMBERS, DEFAULT_IS_MEMBERS, DEFAULT_PORTAL_SITES, DEFAULT_PORTAL_TYPES,
  TODAY, THIS_MONTH, uid, PALETTE, NEXT_ACTION_RULES, at,
} from './lib/constants.js';
import { apiPost, loadLeads, saveLeads } from './lib/api.js';
import {
  loadMasterSettings, saveMasterSettings, getMaster,
  getStatuses, getStatusColor,
  getSalesMembers, getPortalSites, getPortalTypes, getPortalPrice,
  getPortalSiteSource, getPortalSitesForSource, sourceHasPortal,
  getSources, getSourcesWithMeta, getSourceIcon, getSourceColor,
  getISMembers, IS_COLORS, syncISColors,
  USER_COLORS, DEFAULT_ACCOUNTS, loadAccounts, saveAccounts, getEffectiveAiConfig,
} from './lib/master.js';
import { JP_HOLIDAYS, isBusinessDay, isOverdue, isDueToday, isDueSoon, addBusinessDays } from './lib/date.js';
import { handleOAuthCallbackError, handleOAuthPopupError, isTokenValid, acquireGmailToken, buildGmailDraftRaw, postGmailDraft } from './lib/gmail.js';
import { loadGCalConfig, saveGCalConfig } from './lib/gcal.js';
import { PencilIcon, TrashIcon } from './components/icons.jsx';
import { Splash, Header, Card, KPI, SrcBadge, Badge, Chip, IF, Note, Row2, Field } from './components/ui.jsx';
import { S, CSS } from './components/styles.js';
import { LoginScreen } from './components/LoginScreen.jsx';
import { Nav } from './components/Nav.jsx';
import { AccountManager } from './components/AccountManager.jsx';
import { SVGBarChart, SVGLineChart, Trend } from './components/Charts.jsx';
import { SourceIconSVG } from './components/SourceIconSVG.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { CSVImport, normalizeDate } from './components/CSVImport.jsx';
import { LeadForm, ActionForm, ActEntry } from './components/LeadForms.jsx';
import { LeadRow, NextActionEditBtn } from './components/LeadRow.jsx';
import { ActionHistoryPanel } from './components/ActionHistoryPanel.jsx';
import { LeadList } from './components/LeadList.jsx';
import { LeadCombobox } from './components/LeadCombobox.jsx';
import { EmailPage } from './components/EmailPage.jsx';
import { AIPage } from './components/AIPage.jsx';
import { SettingsPage } from './components/SettingsPage.jsx';
import { SetupWizard, useIsMobile } from './components/SetupWizard.jsx';
import { CalendarPage } from './components/CalendarPage.jsx';

function App() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(() => sessionStorage.getItem('current_page') || "dashboard");
  const navigate = (p) => { sessionStorage.setItem('current_page', p); setPage(p); };
  const [settingsTab, setSettingsTab] = useState(null);
  const [dashFilter, setDashFilter] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [masterVer, setMasterVer] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [aiConfig, setAiConfig] = useState({});
  const selectUser = (account, data) => {
    setCurrentUser(account);
    USER_COLORS[account.name] = account.color;
    localStorage.setItem("current_user_id", account.id);
    if (data) {
      const l = data.leads || [];
      const migrated = l.map(lead => lead.portal_type === "請求" ? { ...lead, portal_type: "一括請求" } : lead);
      // React 18 では非同期コールバック内の複数 setState も自動バッチ処理されるため
      // setLeads → setAiConfig → setMasterVer の順で呼んでも中間レンダリングは発生しない
      setLeads(migrated);
      setAiConfig(data.aiConfig || {});
      setMasterVer(v => v + 1);
    }
  };
  const logout = () => {
    apiPost('/api/logout', {});
    localStorage.removeItem('current_user_id');
    window.__appData = { accounts: [], leads: [], masterSettings: null, aiConfig: {}, gcalConfig: {}, emailTpls: null, zohoConfig: null, zohoAuthenticated: false };
    setCurrentUser(null);
    setLeads([]);
    setAiConfig({});
  };
  const updateMyProfile = (profile) => {
    const originalId = currentUser.id;
    const accounts = loadAccounts();
    const newAccounts = accounts.map(a => a.id === originalId ? { ...a, ...profile } : a);
    saveAccounts(newAccounts);
    const updated = newAccounts.find(a => a.id === (profile.id || originalId)) || { ...currentUser, ...profile };
    setCurrentUser(updated);
    USER_COLORS[updated.name] = updated.color;
    IS_COLORS[updated.name] = { bg: updated.color, text: updated.color, border: updated.color + "55" };
    localStorage.setItem("current_user_id", updated.id);
  };
  const [candidateSlots, setCandidateSlots] = useState([]);
  const [calendarLeadId, setCalendarLeadId] = useState("");
  const [aiOpenLeadId, setAiOpenLeadId] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  // geminiConfiguredの優先順位: 個人設定 > グローバル設定（APIキー自体はサーバー側のみ保持）
  // ※ aiConfig は React state（saveAiConfig で更新）、window.__appData.aiConfig と常に同期している
  const effectiveAiConfig = useMemo(() => ({
    ...aiConfig,
    geminiConfigured: !!(currentUser?.geminiConfigured || aiConfig.geminiConfigured),
    gmailClientId: currentUser?.gmailClientId || aiConfig.gmailClientId || ""
  }), [currentUser, aiConfig]);
  const saveAiConfig = (cfg) => {
    setAiConfig(cfg);
    window.__appData.aiConfig = cfg;
    apiPost('/api/ai-config', cfg);
  };

  useEffect(() => {
    async function init() {
      // セッションCookieが有効なら自動的に認証される（localStorageのトークン不要）
      const savedId = localStorage.getItem('current_user_id');
      try {
        const r = await fetch('/api/data');
        if (r.ok) {
          const data = await r.json();
          window.__appData = data;
          data.accounts.forEach(a => {
            USER_COLORS[a.name] = a.color;
            IS_COLORS[a.name] = { bg: a.color, text: a.color, border: a.color + "55" };
          });
          const user = data.accounts.find(a => a.id === savedId);
          if (user) {
            setCurrentUser(user);
            USER_COLORS[user.name] = user.color;
          } else {
            localStorage.removeItem('current_user_id');
          }
          setAiConfig(data.aiConfig || {});
          setMasterVer(v => v + 1);
        } else if (r.status === 401) {
          localStorage.removeItem('current_user_id');
        }
      } catch {}
      const l = await loadLeads();
      const migrated = l.map(lead => lead.portal_type === "請求" ? { ...lead, portal_type: "一括請求" } : lead);
      setLeads(migrated);
      setLoaded(true);
      if (migrated.some((lead,i) => lead.portal_type !== l[i].portal_type)) saveLeads(migrated);
    }
    init();
  }, []);

  const mut = (next) => { setLeads(next); saveLeads(next); };
  const addLead    = (l)       => mut([l, ...leads]);
  const updateLead = (id, p)   => mut(leads.map(l => l.id === id ? { ...l, ...p } : l));
  const deleteLead = (id)      => mut(leads.filter(l => l.id !== id));
  const addAction  = (id, act) => mut(leads.map(l => l.id === id
    ? { ...l, actions: [{ ...act, recorded_by: currentUser?.name || "" }, ...(l.actions || [])] } : l));

  if (!loaded) return <Splash />;
  if (!currentUser) return <LoginScreen onLogin={selectUser} />;

  return (
    <div style={{...S.root, flexDirection: isMobile ? "column" : "row"}}>
      <style>{CSS}</style>
      <Nav page={page} setPage={navigate} setSettingsTab={setSettingsTab} count={leads.length} currentUser={currentUser} onLogout={logout} onUpdateProfile={updateMyProfile} isMobile={isMobile} />
      {showWizard && <SetupWizard currentUser={currentUser} onUpdateProfile={updateMyProfile} onSave={saveAiConfig} aiConfig={effectiveAiConfig} onClose={() => setShowWizard(false)} />}
      <main style={{...S.main, paddingBottom: isMobile ? 65 : 0}}>
        {page === "dashboard" && <Dashboard leads={leads} currentUser={currentUser} onNavigate={(f)=>{ setDashFilter(f); navigate("leads"); }} masterVer={masterVer} isMobile={isMobile} />}
        {page === "trend"     && <Trend leads={leads} />}
        {page === "leads"     && <LeadList leads={leads} initialFilter={dashFilter} onFilterConsumed={()=>setDashFilter(null)} initialOpenId={aiOpenLeadId} onOpenIdConsumed={()=>setAiOpenLeadId(null)} onAdd={addLead} onUpdate={updateLead} onDelete={deleteLead} onAddAction={addAction} currentUser={currentUser} isMobile={isMobile} readOnly={false}
          onBulkAdd={newLeads => { const next = [...newLeads, ...leads]; setLeads(next); saveLeads(next); }} />}
        {page === "ai"        && <AIPage leads={leads} onAdd={addLead} onUpdate={updateLead} onAddAction={addAction} goLeads={(leadId) => { setAiOpenLeadId(leadId||null); navigate("leads"); }} goCalendar={() => navigate("calendar")} aiConfig={effectiveAiConfig} currentUser={currentUser} isMobile={isMobile} />}
        {page === "calendar"  && <CalendarPage candidateSlots={candidateSlots} onSlotsChange={setCandidateSlots} onGoEmail={(leadId)=>{ setCalendarLeadId(leadId); navigate("email"); }} currentUser={currentUser} leads={leads} />}
        {page === "settings"  && <SettingsPage aiConfig={effectiveAiConfig} onSave={saveAiConfig} currentUser={currentUser} onUpdateProfile={updateMyProfile} initialTab={settingsTab} onLeadsChange={setLeads} onMasterSave={() => setMasterVer(v => v + 1)} onOpenWizard={() => setShowWizard(true)} />}
        {page === "email"     && <EmailPage leads={leads} onUpdate={updateLead} currentUser={currentUser} candidateSlots={candidateSlots} initialLeadId={calendarLeadId} isMobile={isMobile} />}
      </main>
    </div>
  );
}






    class ErrorBoundary extends React.Component {
      constructor(props){super(props);this.state={hasError:false,error:null};}
      static getDerivedStateFromError(e){return{hasError:true,error:e};}
      render(){
        if(this.state.hasError){
          return <div style={{padding:40,textAlign:"center",fontFamily:"'Noto Sans JP',sans-serif"}}>
            <div style={{fontSize:40,marginBottom:16}}>⚠️</div>
            <div style={{fontSize:18,fontWeight:700,color:"#dc2626",marginBottom:8}}>エラーが発生しました</div>
            <div style={{fontSize:13,color:"#6b7280",marginBottom:24,maxWidth:400,margin:"0 auto 24px"}}>{String(this.state.error?.message||"予期しないエラーが発生しました")}</div>
            <button onClick={()=>this.setState({hasError:false,error:null})} style={{padding:"8px 24px",borderRadius:8,background:"#059669",color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer"}}>再試行</button>
          </div>;
        }
        return this.props.children;
      }
    }
    const root=ReactDOM.createRoot(document.getElementById('root'));
    root.render(<ErrorBoundary><App/></ErrorBoundary>);
