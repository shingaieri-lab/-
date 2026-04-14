// ルートコンポーネント（ページルーティング・認証・グローバル状態管理）
import { useState, useEffect, useMemo } from 'react';
import { useIsMobile } from './hooks/useIsMobile.js';
import { Nav } from './components/nav/Nav.jsx';
import { Splash } from './components/ui/Layout.jsx';
import { SetupWizard } from './components/wizard/SetupWizard.jsx';
import { Trend } from './components/charts/Trend.jsx';
import { LoginScreen } from './pages/LoginScreen.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { LeadsPage } from './pages/LeadsPage.jsx';
import { AIPage } from './pages/AIPage.jsx';
import { CalendarPage } from './pages/CalendarPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { EmailPage } from './pages/EmailPage.jsx';
import { CSS } from './styles/css.js';
import { USER_COLORS } from './lib/accounts.js';
import { IS_COLORS } from './lib/master.js';
import { loadAccounts, saveAccounts } from './lib/accounts.js';
import { loadLeads, saveLeads, apiPost } from './lib/api.js';

// ページ全体のコンテナスタイル
const rootStyle = { display:"flex", height:"100vh", background:"#f0f5f2", fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif", color:"#1f5c40", overflow:"hidden" };
const mainStyle = { flex:1, overflow:"auto", background:"#f0f5f2" };

export function App() {
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
    <div style={{...rootStyle, flexDirection: isMobile ? "column" : "row"}}>
      <style>{CSS}</style>
      <Nav page={page} setPage={navigate} setSettingsTab={setSettingsTab} count={leads.length} currentUser={currentUser} onLogout={logout} onUpdateProfile={updateMyProfile} isMobile={isMobile} />
      {showWizard && <SetupWizard currentUser={currentUser} onUpdateProfile={updateMyProfile} onSave={saveAiConfig} aiConfig={effectiveAiConfig} onClose={() => setShowWizard(false)} />}
      <main style={{...mainStyle, paddingBottom: isMobile ? 65 : 0}}>
        {page === "dashboard" && <DashboardPage leads={leads} currentUser={currentUser} onNavigate={(f)=>{ setDashFilter(f); navigate("leads"); }} masterVer={masterVer} isMobile={isMobile} />}
        {page === "trend"     && <Trend leads={leads} />}
        {page === "leads"     && <LeadsPage leads={leads} initialFilter={dashFilter} onFilterConsumed={()=>setDashFilter(null)} initialOpenId={aiOpenLeadId} onOpenIdConsumed={()=>setAiOpenLeadId(null)} onAdd={addLead} onUpdate={updateLead} onDelete={deleteLead} onAddAction={addAction} currentUser={currentUser} isMobile={isMobile} readOnly={false}
          onBulkAdd={newLeads => { const next = [...newLeads, ...leads]; setLeads(next); saveLeads(next); }} />}
        {page === "ai"        && <AIPage leads={leads} onAdd={addLead} onUpdate={updateLead} onAddAction={addAction} goLeads={(leadId) => { setAiOpenLeadId(leadId||null); navigate("leads"); }} goCalendar={() => navigate("calendar")} aiConfig={effectiveAiConfig} currentUser={currentUser} isMobile={isMobile} />}
        {page === "calendar"  && <CalendarPage candidateSlots={candidateSlots} onSlotsChange={setCandidateSlots} onGoEmail={(leadId)=>{ setCalendarLeadId(leadId); navigate("email"); }} currentUser={currentUser} leads={leads} />}
        {page === "settings"  && <SettingsPage aiConfig={effectiveAiConfig} onSave={saveAiConfig} currentUser={currentUser} onUpdateProfile={updateMyProfile} initialTab={settingsTab} onLeadsChange={setLeads} onMasterSave={() => setMasterVer(v => v + 1)} onOpenWizard={() => setShowWizard(true)} />}
        {page === "email"     && <EmailPage leads={leads} onUpdate={updateLead} currentUser={currentUser} candidateSlots={candidateSlots} initialLeadId={calendarLeadId} isMobile={isMobile} />}
      </main>
    </div>
  );
}
