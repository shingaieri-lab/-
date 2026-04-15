// 設定ページ（基本設定・リード管理・ポータル・API設定・Zoho CRM・アカウント管理）
import { useState } from 'react';
import { PencilIcon, TrashIcon } from '../components/ui/Icons.jsx';
import { ZohoCrmSettings } from '../components/settings/ZohoCrmSettings.jsx';
import { AccountManager } from '../components/settings/AccountManager.jsx';
import { ApiKeyTab } from '../components/settings/ApiKeyTab.jsx';
import { LeadMgmtTab } from '../components/settings/LeadMgmtTab.jsx';
import { PALETTE } from '../constants/index.js';
import { getMaster, saveMasterSettings } from '../lib/master.js';

export function SettingsPage({ aiConfig, onSave, currentUser, onUpdateProfile, initialTab, onLeadsChange, onMasterSave, onOpenWizard }) {
  const [master, setMaster] = useState(() => getMaster());
  const [tab, setTab] = useState(initialTab || (currentUser?.role === "admin" ? "leadmgmt" : "apikey"));
  const [msg, setMsg] = useState("");
  const [profileForm, setProfileForm] = useState({ name: currentUser?.name||"", password: currentUser?.password||"", email: currentUser?.email||"", color: currentUser?.color||PALETTE[0], id: currentUser?.id||"", signature: currentUser?.signature||"", geminiKey: currentUser?.geminiKey||"", gmailClientId: currentUser?.gmailClientId||"", calendarId: currentUser?.calendarId||"" });
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

  // ポータルサイト
  const [newSite, setNewSite] = useState("");
  const [editSite, setEditSite] = useState(null);
  const [editSiteName, setEditSiteName] = useState("");
  const addSite = () => {
    const s = newSite.trim(); if (!s) return;
    if (master.portalSites.includes(s)) { alert("既に存在します"); return; }
    const pt = { ...master.portalTypes, [s]: [{ label:"一括請求", price:10000 }] };
    const ps = { ...(master.portalSiteSource||{}), [s]: "" };
    save({ ...master, portalSites: [...master.portalSites, s], portalTypes: pt, portalSiteSource: ps });
    setNewSite("");
  };
  const removeSite = (s) => {
    if (!window.confirm(`「${s}」を削除しますか？`)) return;
    const sites = master.portalSites.filter(x=>x!==s);
    const pt = { ...master.portalTypes }; delete pt[s];
    const ps = { ...(master.portalSiteSource||{}) }; delete ps[s];
    save({ ...master, portalSites: sites, portalTypes: pt, portalSiteSource: ps });
  };
  const renameSite = (oldName) => {
    const newName = editSiteName.trim(); if (!newName) return;
    if (newName !== oldName && master.portalSites.includes(newName)) { alert("既に存在します"); return; }
    const sites = master.portalSites.map(s => s === oldName ? newName : s);
    const pt = {}; Object.keys(master.portalTypes).forEach(k => { pt[k === oldName ? newName : k] = master.portalTypes[k]; });
    const ps = {}; Object.keys(master.portalSiteSource||{}).forEach(k => { ps[k === oldName ? newName : k] = (master.portalSiteSource||{})[k]; });
    save({ ...master, portalSites: sites, portalTypes: pt, portalSiteSource: ps });
    setEditSite(null); setEditSiteName("");
  };
  const moveSite = (site, dir) => {
    const idx = master.portalSites.indexOf(site); const sites = [...master.portalSites];
    if (dir==="up" && idx>0) { [sites[idx-1],sites[idx]]=[sites[idx],sites[idx-1]]; }
    else if (dir==="down" && idx<sites.length-1) { [sites[idx+1],sites[idx]]=[sites[idx],sites[idx+1]]; }
    else return; save({ ...master, portalSites: sites });
  };
  const [selSite, setSelSite] = useState(master.portalSites[0]||"");
  const [newPlan, setNewPlan] = useState({ label:"", price:"" });
  const addPlan = () => {
    const l = newPlan.label.trim(), p = parseInt(newPlan.price);
    if (!l || isNaN(p)) { alert("プラン名と金額を入力してください"); return; }
    const plans = [...(master.portalTypes[selSite]||[]), { label:l, price:p }];
    save({ ...master, portalTypes: { ...master.portalTypes, [selSite]: plans } });
    setNewPlan({ label:"", price:"" });
  };
  const removePlan = (site, idx) => {
    const plans = (master.portalTypes[site]||[]).filter((_,i)=>i!==idx);
    save({ ...master, portalTypes: { ...master.portalTypes, [site]: plans } });
  };
  const updatePlanPrice = (site, idx, price) => {
    const plans = (master.portalTypes[site]||[]).map((p,i)=>i===idx?{...p,price:parseInt(price)||0}:p);
    save({ ...master, portalTypes: { ...master.portalTypes, [site]: plans } });
  };
  const updatePlanLabel = (site, idx, label) => {
    if (!label.trim()) return;
    const plans = (master.portalTypes[site]||[]).map((p,i)=>i===idx?{...p,label:label.trim()}:p);
    save({ ...master, portalTypes: { ...master.portalTypes, [site]: plans } });
  };

  const MENU = [
    { key:"leadmgmt",  icon:"📋", label:"リード管理",    adminOnly:true  },
    { key:"portal",    icon:"🏢", label:"ポータルサイト", adminOnly:true  },
    { key:"apikey",    icon:"🔑", label:"API設定",        adminOnly:false },
    { key:"zoho",      icon:"🔗", label:"Zoho CRM",       adminOnly:true  },
    { key:"accounts",  icon:"👥", label:"管理者設定",     adminOnly:true  },
    { key:"myaccount", icon:"👤", label:"アカウント",     adminOnly:false },
  ];
  const inp = { width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid #c0dece", fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit", background:"#fff", color:"#174f35" };
  const addRow = { display:"flex", gap:8, marginBottom:12 };

  return (
    <div className="settings-page" style={{display:"flex", height:"100%", overflow:"hidden"}}>
      {/* 左サイドバー */}
      <div style={{width:220, flexShrink:0, borderRight:"1px solid #d8ede1", background:"#f8fbf9", overflowY:"auto", padding:"20px 12px"}}>
        <div style={{fontSize:15, fontWeight:900, color:"#174f35", marginBottom:16, paddingLeft:4}}>⚙️ 設定</div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
          {MENU.filter(m => !m.adminOnly || currentUser?.role==="admin").map(m => (
            <button key={m.key} onClick={() => setTab(m.key)} style={{
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:6, padding:"14px 6px",
              borderRadius:12,
              border: tab===m.key ? "2px solid #10b981" : "1.5px solid #e2f0e8",
              background: tab===m.key ? "#e8f5ef" : "#fff",
              cursor:"pointer", fontFamily:"inherit",
              boxShadow: tab===m.key ? "0 2px 8px #10b98122" : "0 1px 3px #0000000a",
            }}>
              <span style={{fontSize:22, lineHeight:1}}>{m.icon}</span>
              <span style={{fontSize:10, color: tab===m.key ? "#059669" : "#6a9a7a", fontWeight: tab===m.key ? 700 : 400, textAlign:"center", lineHeight:1.3, wordBreak:"keep-all"}}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* 右コンテンツ */}
      <div style={{flex:1, overflowY:"auto", padding:"24px 28px", maxWidth:680}}>
        {msg && <div style={{background:"#d1fae5",color:"#059669",border:"1px solid #6ee7b7",borderRadius:8,padding:"8px 16px",marginBottom:16,fontSize:12,fontWeight:700}}>{msg}</div>}
        {tab === "portal" && (
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#174f35",marginBottom:8}}>ポータルサイト一覧</div>
            <div style={addRow}>
              <input value={newSite} onChange={e=>setNewSite(e.target.value)} placeholder="新しいポータルサイト名" style={{...inp, flex:1}} onKeyDown={e=>e.key==="Enter"&&addSite()} />
              <button onClick={addSite} style={{padding:"7px 16px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>追加</button>
            </div>
            {master.portalSites.map((site, siteIdx) => (
              <div key={site} style={{background:"#f8fbf9",borderRadius:10,border:"1px solid #e2f0e8",marginBottom:12,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,padding:"10px 14px",background:"#f0f5f2",borderBottom:"1px solid #e2f0e8"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
                    <button onClick={()=>moveSite(site,"up")} disabled={siteIdx===0} style={{fontSize:9,padding:"1px 5px",borderRadius:3,border:"1px solid #c0dece",background:siteIdx===0?"#f5f5f5":"#fff",color:siteIdx===0?"#ccc":"#6a9a7a",cursor:siteIdx===0?"default":"pointer",lineHeight:1.2,fontFamily:"inherit"}}>▲</button>
                    <button onClick={()=>moveSite(site,"down")} disabled={siteIdx===master.portalSites.length-1} style={{fontSize:9,padding:"1px 5px",borderRadius:3,border:"1px solid #c0dece",background:siteIdx===master.portalSites.length-1?"#f5f5f5":"#fff",color:siteIdx===master.portalSites.length-1?"#ccc":"#6a9a7a",cursor:siteIdx===master.portalSites.length-1?"default":"pointer",lineHeight:1.2,fontFamily:"inherit"}}>▼</button>
                  </div>
                  {editSite===site ? (
                    <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
                      <input value={editSiteName} onChange={e=>setEditSiteName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&renameSite(site)} style={{...inp,flex:1,padding:"4px 8px"}} autoFocus />
                      <button onClick={()=>renameSite(site)} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"none",background:"#10b981",color:"#fff",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>保存</button>
                      <button onClick={()=>setEditSite(null)} style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:"1px solid #c0dece",background:"#fff",color:"#6a9a7a",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>✕</button>
                    </div>
                  ) : (
                    <>
                      <span style={{fontWeight:700,color:"#174f35",fontSize:13,flex:1}}>🏢 {site}</span>
                      <button onClick={()=>{setEditSite(site);setEditSiteName(site)}} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}} title="編集"><PencilIcon size={18} color="#059669"/></button>
                      <button onClick={()=>removeSite(site)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}} title="削除"><TrashIcon size={18} color="#ef4444"/></button>
                    </>
                  )}
                </div>
                <div style={{padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"#6a9a7a",marginBottom:6,fontWeight:600}}>流入元設定</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <select value={(master.portalSiteSource||{})[site]||""} onChange={e=>{ const ps = { ...(master.portalSiteSource||{}), [site]: e.target.value }; save({ ...master, portalSiteSource: ps }); }}
                      style={{flex:1,padding:"5px 8px",borderRadius:7,border:"1px solid #c0dece",fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#fff",color:"#174f35"}}>
                      <option value="">（未設定）</option>
                      {(master.sources||[]).map(srcObj=>{ const lbl = typeof srcObj==="string"?srcObj:srcObj.label; return <option key={lbl} value={lbl}>{lbl}</option>; })}
                    </select>
                    <span style={{fontSize:11,color:"#6a9a7a",flexShrink:0}}>に連結</span>
                  </div>
                  <div style={{fontSize:11,color:"#6a9a7a",marginBottom:8,fontWeight:600}}>プラン・金額</div>
                  {(master.portalTypes[site]||[]).map((plan,idx)=>(
                    <div key={idx} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <input value={plan.label} onChange={e=>updatePlanLabel(site,idx,e.target.value)} style={{...inp,flex:1,padding:"4px 8px"}} />
                      <span style={{fontSize:11,color:"#6a9a7a"}}>¥</span>
                      <input type="number" value={plan.price} onChange={e=>updatePlanPrice(site,idx,e.target.value)} style={{...inp,width:100,padding:"4px 8px"}} />
                      <button onClick={()=>removePlan(site,idx)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}} title="削除"><TrashIcon size={18} color="#ef4444"/></button>
                    </div>
                  ))}
                  <div style={{display:"flex",gap:6,marginTop:8}} onClick={()=>setSelSite(site)}>
                    <input value={selSite===site?newPlan.label:""} onFocus={()=>setSelSite(site)} onChange={e=>setNewPlan(p=>({...p,label:e.target.value}))} placeholder="プラン名" style={{...inp,flex:1,padding:"5px 8px"}} />
                    <input type="number" value={selSite===site?newPlan.price:""} onFocus={()=>setSelSite(site)} onChange={e=>setNewPlan(p=>({...p,price:e.target.value}))} placeholder="金額" style={{...inp,width:90,padding:"5px 8px"}} />
                    <button onClick={addPlan} style={{padding:"5px 12px",borderRadius:6,border:"none",background:"#10b981",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>追加</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "apikey" && (
          <ApiKeyTab
            currentUser={currentUser}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            profileMsg={profileMsg}
            saveProfile={saveProfile}
            onOpenWizard={onOpenWizard}
          />
        )}
        {tab === "leadmgmt" && currentUser?.role==="admin" && (
          <LeadMgmtTab master={master} save={save} onLeadsChange={onLeadsChange} />
        )}
        {tab === "zoho" && currentUser?.role==="admin" && (
          <ZohoCrmSettings />
        )}
        {tab === "accounts" && currentUser?.role==="admin" && (
          <AccountManager currentUser={currentUser} onClose={null} inline={true} onUpdateProfile={onUpdateProfile} />
        )}
        {tab === "myaccount" && (
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#174f35",marginBottom:16}}>👤 アカウント管理</div>
            <div style={{maxWidth:520}}>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:4}}>ID</label>
                <input type="text" value={profileForm.id||""} readOnly
                  style={{width:"100%",padding:"10px 14px",borderRadius:7,border:"1px solid #c0dece",fontSize:13,color:"#3d7a5e",outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#f0f5f2",cursor:"not-allowed"}} />
              </div>
              {[["パスワード","password","password"],["表示名","name","text"],["メールアドレス","email","email"]].map(([lbl,key,type])=>(
                <div key={key} style={{marginBottom:16}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:4}}>{lbl}</label>
                  <input type={type} value={profileForm[key]||""} onChange={e=>{ const v=e.target.value; if(key==="email"){ const prefix=v.includes("@")?v.split("@")[0]:v; setProfileForm(p=>({...p,email:v,id:prefix})); } else { setProfileForm(p=>({...p,[key]:v})); } }}
                    style={{width:"100%",padding:"10px 14px",borderRadius:7,border:"1px solid #c0dece",fontSize:13,color:"#174f35",outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#fff"}} />
                </div>
              ))}
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:6}}>🎨 アイコン色</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {PALETTE.map(c => (
                    <button key={c} onClick={()=>setProfileForm(p=>({...p,color:c}))}
                      style={{width:26,height:26,borderRadius:"50%",background:c, border: profileForm.color===c ? "3px solid #174f35" : "2px solid #fff", cursor:"pointer", boxShadow: profileForm.color===c ? "0 0 0 2px "+c : "0 1px 3px #0002", flexShrink:0}} />
                  ))}
                </div>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:4}}>✍️ メール署名</label>
                <textarea value={profileForm.signature||""} onChange={e=>setProfileForm(p=>({...p,signature:e.target.value}))}
                  placeholder={"例：\n---\n田中 太郎\n〇〇株式会社\nTEL: 03-xxxx-xxxx"}
                  style={{width:"100%",padding:"10px 14px",borderRadius:7,border:"1px solid #c0dece",fontSize:13,color:"#174f35",outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#fff",resize:"vertical",minHeight:100,lineHeight:1.5}} />
              </div>
              {profileMsg && <div style={{fontSize:12,color:"#059669",fontWeight:700,marginBottom:10}}>{profileMsg}</div>}
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

