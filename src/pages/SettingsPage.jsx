// 設定ページ（基本設定・リード管理・ポータル・API設定・Zoho CRM・アカウント管理）
import { useState } from 'react';
import { PencilIcon, LeadMgmtIcon, PortalIcon, ApiKeyIcon, ZohoIcon, AdminIcon, AccountIcon, EyeIcon, EyeOffIcon, GearIcon, UserIcon, PhoneOutIcon } from '../components/ui/Icons.jsx';
import { ZohoCrmSettings } from '../components/settings/ZohoCrmSettings.jsx';
import { AccountManager } from '../components/settings/AccountManager.jsx';
import { ApiKeyTab } from '../components/settings/ApiKeyTab.jsx';
import { LeadMgmtTab } from '../components/settings/LeadMgmtTab.jsx';
import { OutboundSettingsTab } from '../components/settings/OutboundSettingsTab.jsx';
import { PortalTab } from '../components/settings/PortalTab.jsx';
import { PALETTE } from '../constants/index.js';
import { getMaster, saveMasterSettings } from '../lib/master.js';

export function SettingsPage({ aiConfig, onSave, currentUser, onUpdateProfile, initialTab, onLeadsChange, onMasterSave, onOpenWizard }) {
  const [master, setMaster] = useState(() => getMaster());
  const defaultTab = initialTab || (currentUser?.role === "admin" ? "leadmgmt" : currentUser?.role === "outbound" ? "myaccount" : "apikey");
  const [tab, setTab] = useState(defaultTab);
  const [msg, setMsg] = useState("");
  const [profileForm, setProfileForm] = useState({ name: currentUser?.name||"", password: currentUser?.password||"", email: currentUser?.email||"", color: currentUser?.color||PALETTE[0], id: currentUser?.id||"", signature: currentUser?.signature||"", geminiKey: currentUser?.geminiKey||"", gmailClientId: currentUser?.gmailClientId||"", calendarId: currentUser?.calendarId||"", chatworkApiToken: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const saveProfile = () => {
    if (!profileForm.name.trim()) return;
    onUpdateProfile(profileForm);
    if (currentUser?.role === "admin" && profileForm.gmailClientId !== undefined) {
      onSave({ ...aiConfig, gmailClientId: profileForm.gmailClientId });
    }
    setProfileMsg("保存しました ✓");
    setTimeout(() => setProfileMsg(""), 2000);
  };

  const save = (next) => { setMaster(next); saveMasterSettings(next); onMasterSave?.(); setMsg("保存しました ✓"); setTimeout(()=>setMsg(""),2000); };

  const MENU = [
    { key:"leadmgmt",  Icon:LeadMgmtIcon,  color:"#10b981", label:"リード管理",      adminOnly:true  },
    { key:"outbound",  Icon:PhoneOutIcon,  color:"#0284c7", label:"アウトバウンド",  adminOnly:true  },
    { key:"portal",    Icon:PortalIcon,    color:"#3b82f6", label:"ポータルサイト",  adminOnly:true  },
    { key:"apikey",    Icon:ApiKeyIcon,    color:"#f97316", label:"API設定",          adminOnly:false, hideOutbound:true },
    { key:"zoho",      Icon:ZohoIcon,      color:"#8b5cf6", label:"Zoho CRM",         adminOnly:true  },
    { key:"accounts",  Icon:AdminIcon,     color:"#ef4444", label:"管理者設定",       adminOnly:true  },
    { key:"myaccount", Icon:AccountIcon,   color:"#06b6d4", label:"アカウント",       adminOnly:false },
  ];
  const activeMenu = MENU.find(m => m.key === tab);

  return (
    <div className="settings-page" style={{display:"flex", height:"100%", overflow:"hidden"}}>
      {/* 左サイドバー */}
      <div style={{width:260, flexShrink:0, borderRight:"1px solid #d8ede1", background:"#f8fbf9", overflowY:"auto", padding:"24px 14px"}}>
        <div style={{fontSize:22, fontWeight:800, color:"#174f35", letterSpacing:"-0.02em", marginBottom:20, paddingLeft:4, display:"flex", alignItems:"center", gap:7}}><GearIcon size={20} color="#174f35" /> 設定</div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
          {MENU.filter(m => (!m.adminOnly || currentUser?.role==="admin") && !(m.hideOutbound && currentUser?.role==="outbound")).map(({ key, Icon, color, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:8, padding:"18px 8px", borderRadius:14,
              border: tab===key ? `2px solid ${color}` : "2px solid #e2f0e8",
              background: tab===key ? color + "18" : "#fff",
              cursor:"pointer", fontFamily:"inherit",
              boxShadow: tab===key ? `0 2px 10px ${color}33` : "0 1px 4px #0000000d",
              transition:"all 0.15s",
            }}>
              <div style={{width:44, height:44, borderRadius:12, background: tab===key ? color + "22" : color + "14", display:"flex", alignItems:"center", justifyContent:"center"}}>
                <Icon size={26} color={color} />
              </div>
              <span style={{fontSize:11, color: tab===key ? color : "#6a9a7a", fontWeight: tab===key ? 700 : 500, textAlign:"center", lineHeight:1.4, wordBreak:"keep-all"}}>{label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* 右コンテンツ */}
      <div style={{flex:1, overflowY:"auto", padding:"32px 36px 12px 36px", background:"#fff"}}>
        {activeMenu && (
          <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:24, paddingBottom:16, borderBottom:"2px solid #e2f0e8"}}>
            <div style={{width:44, height:44, borderRadius:12, background:activeMenu.color+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
              <activeMenu.Icon size={26} color={activeMenu.color} />
            </div>
            <div><div style={{fontSize:18, fontWeight:800, color:"#174f35"}}>{activeMenu.label}</div></div>
          </div>
        )}
        {msg && <div style={{background:"#d1fae5",color:"#059669",border:"1px solid #6ee7b7",borderRadius:8,padding:"8px 16px",marginBottom:16,fontSize:12,fontWeight:700}}>{msg}</div>}
        {tab === "portal" && <PortalTab master={master} save={save} />}
        {tab === "apikey" && (
          <div style={{maxWidth:860}}><ApiKeyTab
            currentUser={currentUser} profileForm={profileForm}
            setProfileForm={setProfileForm} profileMsg={profileMsg}
            saveProfile={saveProfile} onOpenWizard={onOpenWizard}
          /></div>
        )}
        {tab === "leadmgmt" && currentUser?.role==="admin" && (
          <div style={{maxWidth:720}}><LeadMgmtTab master={master} save={save} onLeadsChange={onLeadsChange} /></div>
        )}
        {tab === "outbound" && currentUser?.role==="admin" && (
          <OutboundSettingsTab master={master} save={save} />
        )}
        {tab === "zoho" && currentUser?.role==="admin" && (
          <div style={{maxWidth:720}}><ZohoCrmSettings /></div>
        )}
        {tab === "accounts" && currentUser?.role==="admin" && (
          <AccountManager currentUser={currentUser} onClose={null} inline={true} onUpdateProfile={onUpdateProfile} />
        )}
        {tab === "myaccount" && (
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#174f35",marginBottom:16,display:"flex",alignItems:"center",gap:6}}><UserIcon size={15} color="#174f35" /> アカウント管理</div>
            <div style={{maxWidth:720}}>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:4}}>ID</label>
                <input type="text" value={profileForm.id||""} readOnly
                  style={{width:"100%",padding:"10px 14px",borderRadius:7,border:"1px solid #c0dece",fontSize:13,color:"#3d7a5e",outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#f0f5f2",cursor:"not-allowed"}} />
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:4}}>パスワード</label>
                <div style={{position:"relative"}}>
                  <input type={showPassword ? "text" : "password"} value={profileForm.password||""} onChange={e=>setProfileForm(p=>({...p,password:e.target.value}))}
                    style={{width:"100%",padding:"10px 40px 10px 14px",borderRadius:7,border:"1px solid #c0dece",fontSize:13,color:"#174f35",outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#fff"}} />
                  <button type="button" onClick={()=>setShowPassword(v=>!v)}
                    style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",padding:0}}>
                    {showPassword ? <EyeOffIcon size={18} color="#6a9a7a" /> : <EyeIcon size={18} color="#6a9a7a" />}
                  </button>
                </div>
              </div>
              {[["表示名","name","text"],["メールアドレス","email","email"]].map(([lbl,key,type])=>(
                <div key={key} style={{marginBottom:16}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:4}}>{lbl}</label>
                  <input type={type} value={profileForm[key]||""} onChange={e=>{ const v=e.target.value; if(key==="email"){ const prefix=v.includes("@")?v.split("@")[0]:v; setProfileForm(p=>({...p,email:v,id:prefix})); } else { setProfileForm(p=>({...p,[key]:v})); } }}
                    style={{width:"100%",padding:"10px 14px",borderRadius:7,border:"1px solid #c0dece",fontSize:13,color:"#174f35",outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#fff"}} />
                </div>
              ))}
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:6}}>アイコン色</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {PALETTE.map(c => (
                    <button key={c} onClick={()=>setProfileForm(p=>({...p,color:c}))}
                      style={{width:26,height:26,borderRadius:"50%",background:c, border: profileForm.color===c ? "3px solid #174f35" : "2px solid #fff", cursor:"pointer", boxShadow: profileForm.color===c ? "0 0 0 2px "+c : "0 1px 3px #0002", flexShrink:0}} />
                  ))}
                </div>
              </div>
              {currentUser?.role !== "outbound" && (
                <div style={{marginBottom:8}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"flex",alignItems:"center",gap:4,marginBottom:4}}><PencilIcon size={11} color="#6a9a7a" /> メール署名</label>
                  <textarea value={profileForm.signature||""} onChange={e=>setProfileForm(p=>({...p,signature:e.target.value}))}
                    placeholder={"例：\n---\n田中 太郎\n〇〇株式会社\nTEL: 03-xxxx-xxxx"}
                    style={{width:"100%",padding:"10px 14px",borderRadius:7,border:"1px solid #c0dece",fontSize:13,color:"#174f35",outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#fff",resize:"vertical",height:"calc(100vh - 640px)",minHeight:140,maxHeight:420,overflowY:"auto",lineHeight:1.5}} />
                </div>
              )}
              {currentUser?.role === 'outbound' && (
                <div style={{marginBottom:16,paddingTop:16,borderTop:"1px solid #e2f0e8"}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"flex",alignItems:"center",gap:4,marginBottom:4}}>
                    Chatwork APIトークン
                    {currentUser?.chatworkTokenConfigured
                      ? <span style={{fontSize:10,background:"#d1fae5",color:"#059669",borderRadius:20,padding:"1px 8px",fontWeight:700,marginLeft:6}}>設定済み</span>
                      : <span style={{fontSize:10,background:"#fef3c7",color:"#d97706",borderRadius:20,padding:"1px 8px",fontWeight:700,marginLeft:6}}>未設定</span>
                    }
                  </label>
                  <input
                    type="password"
                    value={profileForm.chatworkApiToken||""}
                    onChange={e=>setProfileForm(p=>({...p,chatworkApiToken:e.target.value}))}
                    placeholder={currentUser?.chatworkTokenConfigured ? "新しいトークンを入力（変更する場合のみ）" : "Chatwork APIトークンを入力"}
                    style={{width:"100%",padding:"10px 14px",borderRadius:7,border:"1px solid #c0dece",fontSize:13,color:"#174f35",outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#fff"}}
                    autoComplete="new-password"
                  />
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>
                    Chatwork → 右上アイコン →「サービス連携」→「APIトークン」から取得できます。
                  </div>
                </div>
              )}
              {profileMsg && <div style={{fontSize:12,color:"#059669",fontWeight:700,marginBottom:6}}>{profileMsg}</div>}
              <button onClick={saveProfile}
                style={{padding:"8px 28px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
