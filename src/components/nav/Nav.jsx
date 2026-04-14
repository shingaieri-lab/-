// ナビゲーションコンポーネント（デスクトップ：左サイドバー / モバイル：下部タブバー）
import { useState } from 'react';

const NAV_ITEMS = [
  { id: "dashboard", icon: "📊", label: "ダッシュボード" },
  { id: "trend",     icon: "📈", label: "月別推移" },
  { id: "leads",     icon: "👥", label: "リード管理" },
  { id: "ai",        icon: "🤖", label: "AI" },
  { id: "calendar",  icon: "📅", label: "候補日" },
  { id: "email",     icon: "📧", label: "メール" },
  { id: "settings",  icon: "⚙️", label: "設定" },
];

export function Nav({ page, setPage, setSettingsTab, count, currentUser, onLogout, onUpdateProfile, isMobile }) {
  const [tooltip, setTooltip] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const openUserMenu = () => setShowUserMenu(v => !v);
  const goPage = (id) => { if (id === "settings") setSettingsTab(null); setPage(id); setShowUserMenu(false); };

  if (isMobile) return (
    <nav style={{ width:"100%", background:"#134e3a", display:"flex", flexDirection:"row", alignItems:"center", justifyContent:"space-around", position:"fixed", bottom:0, left:0, right:0, height:60, zIndex:200, borderTop:"1px solid #10b98144", flexShrink:0 }}>
      {NAV_ITEMS.map(item => (
        <button key={item.id} onClick={() => goPage(item.id)}
          style={{ flex:1, height:"100%", border:"none", cursor:"pointer", fontFamily:"inherit", background: page===item.id ? "#10b98122" : "transparent", borderTop: page===item.id ? "2px solid #10b981" : "2px solid transparent", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, padding:"6px 2px" }}>
          <span style={{ fontSize:20, lineHeight:1 }}>{item.icon}</span>
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
              ⚙️ 設定
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
    <nav style={{ width:120, background:"#134e3a", display:"flex", flexDirection:"column", alignItems:"center", padding:"14px 0 12px", flexShrink:0, zIndex:10 }}>
      <div style={{ fontSize:22, marginBottom:12, lineHeight:1 }}>🌿</div>
      <div style={{ width:36, height:1, background:"#ffffff22", marginBottom:8 }} />
      <div style={{ display:"flex", flexDirection:"column", gap:1, width:"100%", alignItems:"center", flex:1 }}>
        {NAV_ITEMS.map(item => (
          <div key={item.id} style={{ position:"relative", width:"100%" }}
            onMouseEnter={() => setTooltip(item.id)} onMouseLeave={() => setTooltip(null)}>
            <button onClick={() => goPage(item.id)}
              style={{ width:"100%", padding:"9px 0", border:"none", cursor:"pointer", fontFamily:"inherit", background: page===item.id ? "#10b98122" : "transparent", borderLeft: page===item.id ? "3px solid #10b981" : "3px solid transparent", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:19, lineHeight:1 }}>{item.icon}</span>
              <span style={{ fontSize:10, color: page===item.id ? "#ffffff" : "#a7d9be", fontWeight: page===item.id ? 700 : 400, fontFamily:"inherit" }}>{item.label}</span>
            </button>
            {tooltip === item.id && (
              <div style={{ position:"absolute", left:124, top:"50%", transform:"translateY(-50%)", background:"#0d3d2b", color:"#fff", fontSize:12, fontWeight:600, padding:"5px 10px", borderRadius:7, whiteSpace:"nowrap", zIndex:300, pointerEvents:"none", boxShadow:"0 4px 14px #0005", border:"1px solid #10b98133" }}>
                {item.label}
                <div style={{ position:"absolute", left:-4, top:"50%", transform:"translateY(-50%)", borderTop:"4px solid transparent", borderBottom:"4px solid transparent", borderRight:"4px solid #0d3d2b", width:0, height:0 }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ textAlign:"center", marginBottom:10 }}>
        <div style={{ fontSize:14, fontWeight:900, color:"#6ee7b7" }}>{count}</div>
        <div style={{ fontSize:7.5, color:"#6ee7b755" }}>件</div>
      </div>
      <div style={{ width:36, height:1, background:"#ffffff22", marginBottom:10 }} />
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
              ⚙️ 設定
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
