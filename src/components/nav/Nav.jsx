// ナビゲーションコンポーネント（デスクトップ：左サイドバー / モバイル：下部タブバー）
import { useState, useEffect } from 'react';
import { DashboardIcon, TrendIcon, UsersIcon, SparkleIcon, CalendarNavIcon, MailIcon, GearIcon } from '../ui/Icons.jsx';
import mokumokuImg from '../../assets/mokumoku.png';
import mokumokuMorningImg from '../../assets/mokumoku-morning.png';
import mokumokuEveningImg from '../../assets/mokumoku-evening.png';

function getMokumokuImg() {
  const hour = parseInt(new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: 'numeric', hour12: false }).format(new Date()));
  if (hour >= 9 && hour < 10) return mokumokuMorningImg;
  if (hour >= 16) return mokumokuEveningImg;
  return mokumokuImg;
}

const NAV_ITEMS = [
  { id: "dashboard", Icon: DashboardIcon,   label: "ダッシュボード" },
  { id: "trend",     Icon: TrendIcon,       label: "月別推移" },
  { id: "leads",     Icon: UsersIcon,       label: "リード管理" },
  { id: "ai",        Icon: SparkleIcon,     label: "AI" },
  { id: "calendar",  Icon: CalendarNavIcon, label: "候補日" },
  { id: "email",     Icon: MailIcon,        label: "メール" },
  { id: "settings",  Icon: GearIcon,        label: "設定" },
];

export function Nav({ page, setPage, setSettingsTab, count, currentUser, onLogout, onUpdateProfile, isMobile }) {
  const [tooltip, setTooltip] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentMokumokuImg, setCurrentMokumokuImg] = useState(getMokumokuImg());
  useEffect(() => {
    const timer = setInterval(() => setCurrentMokumokuImg(getMokumokuImg()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  const openUserMenu = () => setShowUserMenu(v => !v);
  const goPage = (id) => { if (id === "settings") setSettingsTab(null); setPage(id); setShowUserMenu(false); };

  if (isMobile) return (
    <nav style={{ width:"100%", background:"#134e3a", display:"flex", flexDirection:"row", alignItems:"center", justifyContent:"space-around", position:"fixed", bottom:0, left:0, right:0, height:60, zIndex:200, borderTop:"1px solid #10b98144", flexShrink:0 }}>
      {NAV_ITEMS.map(item => (
        <button key={item.id} onClick={() => goPage(item.id)}
          style={{ flex:1, height:"100%", border:"none", cursor:"pointer", fontFamily:"inherit", background: page===item.id ? "#10b98122" : "transparent", borderTop: page===item.id ? "2px solid #10b981" : "2px solid transparent", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, padding:"6px 2px" }}>
          <item.Icon size={20} color={page===item.id ? "#6ee7b7" : "#a7d9be"} />
          <span style={{ fontSize:10, color: page===item.id ? "#6ee7b7" : "#a7d9be", fontWeight: page===item.id ? 700 : 400, fontFamily:"inherit" }}>{item.label}</span>
        </button>
      ))}
      <div style={{ position:"relative", flex:1, height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <button onClick={openUserMenu}
          style={{ width:32, height:32, borderRadius:"50%", background: currentUser?.color||"#059669", color:"#fff", border:"2px solid #ffffff33", fontSize:12, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>
          {currentUser?.name?.[0] || "?"}
        </button>
        {showUserMenu && (
          <div style={{ position:"absolute", bottom:56, right:4, background:"#fff", borderRadius:12, padding:"14px 16px", minWidth:180, zIndex:300, boxShadow:"0 8px 28px #0003", border:"1px solid #d8ede1" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, paddingBottom:10, borderBottom:"1px solid #e8f5ee" }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background: currentUser?.color||"#059669", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, flexShrink:0 }}>
                {currentUser?.name?.[0] || "?"}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#174f35" }}>{currentUser?.name}</div>
                {currentUser?.role === "admin" && <div style={{ fontSize:10, color:"#d97706", fontWeight:700 }}>管理者</div>}
              </div>
            </div>
            <button onClick={() => { setSettingsTab("myaccount"); setPage("settings"); setShowUserMenu(false); }}
              style={{ width:"100%", fontSize:11, padding:"7px 10px", borderRadius:7, border:"1px solid #c0dece", background:"#f0f5f2", color:"#174f35", cursor:"pointer", fontFamily:"inherit", textAlign:"left", marginBottom:6 }}>
              設定
            </button>
            <button onClick={() => { onLogout(); setShowUserMenu(false); }}
              style={{ width:"100%", fontSize:11, padding:"7px 10px", borderRadius:7, border:"1px solid #c0dece", background:"#f0f5f2", color:"#6a9a7a", cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
              ↩ ログアウト
            </button>
          </div>
        )}
      </div>
    </nav>
  );

  return (
    <nav style={{ width:110, background:"#0f3d2a", display:"flex", flexDirection:"column", alignItems:"center", padding:"12px 0 10px", flexShrink:0, zIndex:10 }}>
      <div style={{ marginBottom:10 }}><img src={currentMokumokuImg} alt="もくもくさん" style={{ width:70, height:70, objectFit:"contain", display:"block" }} /></div>
      <div style={{ width:48, height:1, background:"#ffffff18", marginBottom:6 }} />
      <div style={{ display:"flex", flexDirection:"column", gap:2, width:"100%", padding:"0 8px", alignItems:"center", flex:1, boxSizing:"border-box" }}>
        {NAV_ITEMS.map(item => (
          <div key={item.id} style={{ position:"relative", width:"100%" }}
            onMouseEnter={() => setTooltip(item.id)} onMouseLeave={() => setTooltip(null)}>
            <button onClick={() => goPage(item.id)}
              style={{ width:"100%", padding:"7px 0", border:"none", cursor:"pointer", fontFamily:"inherit",
                background: page===item.id ? "#10b98130" : "transparent",
                borderRadius: 10,
                display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                transition:"background 0.15s",
              }}>
              {page===item.id && (
                <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:3, height:28, background:"#10b981", borderRadius:"0 3px 3px 0" }} />
              )}
              <item.Icon size={22} color={page===item.id ? "#6ee7b7" : "#7db89a"} />
              <span style={{ fontSize:9.5, color: page===item.id ? "#d1fae5" : "#7db89a", fontWeight: page===item.id ? 700 : 400, fontFamily:"inherit", letterSpacing:"0.02em" }}>{item.label}</span>
            </button>
            {tooltip === item.id && (
              <div style={{ position:"absolute", left:114, top:"50%", transform:"translateY(-50%)", background:"#0d3d2b", color:"#fff", fontSize:12, fontWeight:600, padding:"5px 10px", borderRadius:7, whiteSpace:"nowrap", zIndex:300, pointerEvents:"none", boxShadow:"0 4px 14px #0005", border:"1px solid #10b98133" }}>
                {item.label}
                <div style={{ position:"absolute", left:-4, top:"50%", transform:"translateY(-50%)", borderTop:"4px solid transparent", borderBottom:"4px solid transparent", borderRight:"4px solid #0d3d2b", width:0, height:0 }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ textAlign:"center", marginBottom:8 }}>
        <div style={{ fontSize:13, fontWeight:900, color:"#6ee7b7" }}>{count}</div>
        <div style={{ fontSize:7.5, color:"#6ee7b755" }}>件</div>
      </div>
      <div style={{ width:48, height:1, background:"#ffffff18", marginBottom:8 }} />
      <div style={{ position:"relative" }}
        onMouseEnter={() => { if (!showUserMenu) setTooltip("user"); }}
        onMouseLeave={() => setTooltip(null)}>
        <button onClick={openUserMenu}
          style={{ width:36, height:36, borderRadius:"50%", background: currentUser?.color||"#059669", color:"#fff", border:"2px solid #ffffff33", fontSize:13, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>
          {currentUser?.name?.[0] || "?"}
        </button>
        {tooltip === "user" && !showUserMenu && (
          <div style={{ position:"absolute", left:50, bottom:0, background:"#0d3d2b", color:"#fff", fontSize:11, padding:"4px 9px", borderRadius:6, whiteSpace:"nowrap", zIndex:300, pointerEvents:"none", border:"1px solid #10b98133" }}>
            {currentUser?.name}
          </div>
        )}
        {showUserMenu && (
          <div style={{ position:"absolute", left:50, bottom:0, background:"#fff", borderRadius:12, padding:"14px 16px", minWidth:180, zIndex:300, boxShadow:"0 8px 28px #0003", border:"1px solid #d8ede1" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, paddingBottom:10, borderBottom:"1px solid #e8f5ee" }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background: currentUser?.color||"#059669", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, flexShrink:0 }}>
                {currentUser?.name?.[0] || "?"}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#174f35" }}>{currentUser?.name}</div>
                {currentUser?.role === "admin" && <div style={{ fontSize:10, color:"#d97706", fontWeight:700 }}>管理者</div>}
              </div>
            </div>
            <button onClick={() => { setSettingsTab("myaccount"); setPage("settings"); setShowUserMenu(false); }}
              style={{ width:"100%", fontSize:11, padding:"7px 10px", borderRadius:7, border:"1px solid #c0dece", background:"#f0f5f2", color:"#174f35", cursor:"pointer", fontFamily:"inherit", textAlign:"left", marginBottom:6 }}>
              設定
            </button>
            <button onClick={() => { onLogout(); setShowUserMenu(false); }}
              style={{ width:"100%", fontSize:11, padding:"7px 10px", borderRadius:7, border:"1px solid #c0dece", background:"#f0f5f2", color:"#6a9a7a", cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
              ↩ ログアウト
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
