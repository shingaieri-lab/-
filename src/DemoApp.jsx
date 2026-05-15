// デモモード用アプリ（サーバー不要・localStorageのみ）
import { useState, useEffect } from 'react';
import { useIsMobile } from './hooks/useIsMobile.js';
import { Nav } from './components/nav/Nav.jsx';
import { Splash } from './components/ui/Layout.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { LeadsPage } from './pages/LeadsPage.jsx';
import { AIPage } from './pages/AIPage.jsx';
import { CalendarPage } from './pages/CalendarPage.jsx';
import { EmailPage } from './pages/EmailPage.jsx';
import { Trend } from './components/charts/Trend.jsx';
import { ConsultationPage } from './pages/ConsultationPage.jsx';
import { CSS } from './styles/css.js';
import { USER_COLORS } from './lib/accounts.js';
import { IS_COLORS } from './lib/master.js';
import { DEMO_DATA, DEMO_ACCOUNTS } from './lib/demoData.js';

const DEMO_LS_KEY = 'demo_leads';
const DEMO_USER = DEMO_ACCOUNTS[0]; // 田中 みなみ（admin）

const rootStyle = { display:"flex", height:"100vh", background:"#f0f5f2", fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif", color:"#1f5c40", overflow:"hidden" };
const mainStyle = { flex:1, overflow:"auto", background:"#f0f5f2", minHeight:0 };

function DemoBanner({ onReset }) {
  const [confirmed, setConfirmed] = useState(false);
  const handleReset = () => {
    if (!confirmed) { setConfirmed(true); return; }
    onReset();
    setConfirmed(false);
  };
  return (
    <div style={{background:"#f59e0b",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:16,padding:"5px 16px",fontSize:12,fontWeight:700,flexShrink:0,flexWrap:"wrap"}}>
      <span>DEMO — データはブラウザ内のみに保存され、本番環境には影響しません</span>
      <button onClick={handleReset}
        style={{background:confirmed?"#dc2626":"#fff3",color:"#fff",border:"1px solid #fff9",borderRadius:5,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
        {confirmed ? "本当にリセット？（もう一度押す）" : "データをリセット"}
      </button>
    </div>
  );
}

// ページを表示しつつ操作を無効化するラッパー
function DemoLockedPage({ children }) {
  return (
    <>
      <div style={{ pointerEvents: "none", opacity: 0.75 }}>
        {children}
      </div>
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 200,
        background: "#fff", borderRadius: 14, padding: "24px 36px",
        boxShadow: "0 8px 40px #00000020",
        border: "1px solid #e2f0e8", textAlign: "center",
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>デモ版では操作できません</div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 6 }}>実際の環境では本機能を使用できます</div>
      </div>
    </>
  );
}

export function DemoApp() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState('dashboard');
  const [leads, setLeads] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [masterVer, setMasterVer] = useState(0);
  const [dashFilter, setDashFilter] = useState(null);
  const [aiOpenLeadId, setAiOpenLeadId] = useState(null);
  const [candidateSlots, setCandidateSlots] = useState([]);

  const navigate = (p) => setPage(p);

  useEffect(() => {
    window.__appData = {
      accounts: DEMO_DATA.accounts,
      leads: [],
      masterSettings: DEMO_DATA.masterSettings,
      aiConfig: {},
      gcalConfig: {},
      emailTpls: null,
      zohoConfig: null,
      zohoAuthenticated: false,
    };
    DEMO_DATA.accounts.forEach(a => {
      USER_COLORS[a.name] = a.color;
      IS_COLORS[a.name] = { bg: a.color, text: a.color, border: a.color + "55" };
    });
    const saved = localStorage.getItem(DEMO_LS_KEY);
    setLeads(saved ? JSON.parse(saved) : DEMO_DATA.leads);
    setMasterVer(v => v + 1);
    setLoaded(true);
  }, []);

  const saveLeadsLocal = (next) => {
    localStorage.setItem(DEMO_LS_KEY, JSON.stringify(next));
    setLeads(next);
  };

  const resetDemo = () => {
    localStorage.removeItem(DEMO_LS_KEY);
    setLeads(DEMO_DATA.leads);
  };

  const addLead    = (l)       => saveLeadsLocal([l, ...leads]);
  const updateLead = (id, p)   => saveLeadsLocal(leads.map(l => l.id === id ? { ...l, ...p } : l));
  const deleteLead = (id)      => saveLeadsLocal(leads.filter(l => l.id !== id));
  const addAction  = (id, act) => saveLeadsLocal(leads.map(l => l.id === id
    ? { ...l, actions: [{ ...act, recorded_by: DEMO_USER.name }, ...(l.actions || [])] } : l));

  if (!loaded) return <Splash />;

  return (
    <div style={{...rootStyle, flexDirection: isMobile ? "column" : "row"}}>
      <style>{CSS}</style>
      <Nav
        page={page} setPage={navigate} setSettingsTab={() => {}}
        count={leads.length} currentUser={DEMO_USER}
        onLogout={() => {}} onUpdateProfile={() => {}}
        isMobile={isMobile}
      />
      <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>
        <DemoBanner onReset={resetDemo} />
        <main style={{...mainStyle, paddingBottom: isMobile ? 65 : 0}}>

          {/* 操作可能なページ */}
          {page === "dashboard" && (
            <DashboardPage leads={leads} currentUser={DEMO_USER}
              onNavigate={(f) => { setDashFilter(f); navigate("leads"); }}
              masterVer={masterVer} isMobile={isMobile} />
          )}
          {page === "leads" && (
            <LeadsPage leads={leads}
              initialFilter={dashFilter} onFilterConsumed={() => setDashFilter(null)}
              initialOpenId={aiOpenLeadId} onOpenIdConsumed={() => setAiOpenLeadId(null)}
              onAdd={addLead} onUpdate={updateLead} onDelete={deleteLead} onAddAction={addAction}
              currentUser={DEMO_USER} isMobile={isMobile} readOnly={false}
              onBulkAdd={newLeads => saveLeadsLocal([...newLeads, ...leads])}
              onGoToZohoSettings={() => navigate("settings")} />
          )}

          {/* 見た目だけ表示・操作不可のページ */}
          {page === "ai" && (
            <DemoLockedPage>
              <AIPage leads={leads} onAdd={() => {}} onUpdate={() => {}} onAddAction={() => {}}
                goLeads={() => {}} goCalendar={() => {}}
                aiConfig={{ geminiConfigured: true }} currentUser={DEMO_USER} isMobile={isMobile} />
            </DemoLockedPage>
          )}
          {page === "calendar" && (
            <DemoLockedPage>
              <CalendarPage candidateSlots={candidateSlots} onSlotsChange={setCandidateSlots}
                onGoEmail={() => {}} currentUser={DEMO_USER} leads={leads} />
            </DemoLockedPage>
          )}
          {page === "email" && (
            <DemoLockedPage>
              <EmailPage leads={leads} onUpdate={() => {}} currentUser={DEMO_USER}
                candidateSlots={[]} isMobile={isMobile} />
            </DemoLockedPage>
          )}
          {page === "trend" && <Trend leads={leads} />}
          {page === "consultation" && (
            <ConsultationPage leads={leads}
              onOpenLead={(id) => { setAiOpenLeadId(id); navigate("leads"); }}
              onUpdate={updateLead} />
          )}
          {page === "settings" && (
            <DemoLockedPage>
              <div style={{padding:40, color:"#6b7280", fontSize:14}}>設定画面</div>
            </DemoLockedPage>
          )}

        </main>
      </div>
    </div>
  );
}
