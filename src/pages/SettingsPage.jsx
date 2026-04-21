// 設定ページ（基本設定・リード管理・ポータル・API設定・Zoho CRM・アカウント管理）
import { useState } from 'react';
import { PencilIcon, TrashIcon, LeadMgmtIcon, PortalIcon, ApiKeyIcon, ZohoIcon, AdminIcon, AccountIcon, EyeIcon, EyeOffIcon, GearIcon, BuildingIcon, UserIcon } from '../components/ui/Icons.jsx';
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
  const [editRowSource, setEditRowSource] = useState("");
  const [dragSrcIdx, setDragSrcIdx] = useState(null);
  const [dragOverSrcIdx, setDragOverSrcIdx] = useState(null);
  const [newPlan, setNewPlan] = useState({ label:"", price:"" });

  const startRowEdit = (site) => {
    setEditSite(site);
    setEditSiteName(site);
    setEditRowSource((master.portalSiteSource||{})[site]||"");
    setSelSite(site);
    setNewPlan({ label:"", price:"" });
  };
  const saveRowEdit = () => {
    const newName = editSiteName.trim(); if (!newName) return;
    const oldName = editSite;
    if (newName !== oldName && master.portalSites.includes(newName)) { alert("既に存在します"); return; }
    let m = { ...master };
    if (newName !== oldName) {
      m.portalSites = master.portalSites.map(s => s === oldName ? newName : s);
      const pt = {}; Object.keys(master.portalTypes).forEach(k => { pt[k===oldName?newName:k] = master.portalTypes[k]; }); m.portalTypes = pt;
      const ps = {}; Object.keys(master.portalSiteSource||{}).forEach(k => { ps[k===oldName?newName:k] = (master.portalSiteSource||{})[k]; }); m.portalSiteSource = ps;
    }
    m.portalSiteSource = { ...(m.portalSiteSource||{}), [newName]: editRowSource };
    save(m);
    setEditSite(null); setEditSiteName("");
  };
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
    { key:"leadmgmt",  Icon:LeadMgmtIcon, color:"#10b981", label:"リード管理",    adminOnly:true  },
    { key:"portal",    Icon:PortalIcon,   color:"#3b82f6", label:"ポータルサイト", adminOnly:true  },
    { key:"apikey",    Icon:ApiKeyIcon,   color:"#f97316", label:"API設定",        adminOnly:false },
    { key:"zoho",      Icon:ZohoIcon,     color:"#8b5cf6", label:"Zoho CRM",       adminOnly:true  },
    { key:"accounts",  Icon:AdminIcon,    color:"#ef4444", label:"管理者設定",     adminOnly:true  },
    { key:"myaccount", Icon:AccountIcon,  color:"#06b6d4", label:"アカウント",     adminOnly:false },
  ];
  const inp = { width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid #c0dece", fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit", background:"#fff", color:"#174f35" };
  const addRow = { display:"flex", gap:8, marginBottom:12 };
  const activeMenu = MENU.find(m => m.key === tab);

  return (
    <div className="settings-page" style={{display:"flex", height:"100%", overflow:"hidden"}}>
      {/* 左サイドバー */}
      <div style={{width:260, flexShrink:0, borderRight:"1px solid #d8ede1", background:"#f8fbf9", overflowY:"auto", padding:"24px 14px"}}>
        <div style={{fontSize:15, fontWeight:900, color:"#174f35", marginBottom:20, paddingLeft:4, display:"flex", alignItems:"center", gap:7}}><GearIcon size={16} color="#174f35" /> 設定</div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
          {MENU.filter(m => !m.adminOnly || currentUser?.role==="admin").map(({ key, Icon, color, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:8, padding:"18px 8px",
              borderRadius:14,
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
      <div style={{flex:1, overflowY:"auto", padding:"32px 36px", background:"#fff"}}>
        {activeMenu && (
          <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:24, paddingBottom:16, borderBottom:"2px solid #e2f0e8"}}>
            <div style={{width:44, height:44, borderRadius:12, background:activeMenu.color+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
              <activeMenu.Icon size={26} color={activeMenu.color} />
            </div>
            <div>
              <div style={{fontSize:18, fontWeight:800, color:"#174f35"}}>{activeMenu.label}</div>
            </div>
          </div>
        )}
        {msg && <div style={{background:"#d1fae5",color:"#059669",border:"1px solid #6ee7b7",borderRadius:8,padding:"8px 16px",marginBottom:16,fontSize:12,fontWeight:700}}>{msg}</div>}
        {tab === "portal" && (
          <div style={{maxWidth:860}}>
            <div style={{display:"flex", gap:8, marginBottom:16}}>
              <input value={newSite} onChange={e=>setNewSite(e.target.value)} placeholder="新しいポータルサイト名" style={{...inp, flex:1, maxWidth:320}} onKeyDown={e=>e.key==="Enter"&&addSite()} />
              <button onClick={addSite} style={{padding:"7px 16px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>追加</button>
            </div>
            <div style={{border:"1px solid #e2f0e8", borderRadius:10, overflow:"hidden"}}>
              {/* ヘッダー */}
              <div style={{display:"grid", gridTemplateColumns:"28px 1fr 160px 1fr 72px", background:"#f0f5f2", padding:"8px 12px", gap:12, borderBottom:"1px solid #e2f0e8"}}>
                <div/>
                <div style={{fontSize:11, fontWeight:700, color:"#6a9a7a"}}>サイト名</div>
                <div style={{fontSize:11, fontWeight:700, color:"#6a9a7a"}}>流入元</div>
                <div style={{fontSize:11, fontWeight:700, color:"#6a9a7a"}}>プラン</div>
                <div/>
              </div>
              {master.portalSites.map((site, siteIdx) => {
                const srcLabel = (master.portalSiteSource||{})[site]||"";
                const plans = master.portalTypes[site]||[];
                const isEditing = editSite === site;
                return (
                  <div key={site}
                    draggable={!isEditing}
                    onDragStart={()=>setDragSrcIdx(siteIdx)}
                    onDragOver={e=>{e.preventDefault();setDragOverSrcIdx(siteIdx);}}
                    onDrop={()=>{
                      if(dragSrcIdx===null||dragSrcIdx===siteIdx){setDragOverSrcIdx(null);return;}
                      const arr=[...master.portalSites]; const [m]=arr.splice(dragSrcIdx,1); arr.splice(siteIdx,0,m);
                      save({...master,portalSites:arr}); setDragSrcIdx(null);setDragOverSrcIdx(null);
                    }}
                    onDragEnd={()=>{setDragSrcIdx(null);setDragOverSrcIdx(null);}}
                    style={{borderTop: siteIdx===0?"none":"1px solid #e2f0e8", background: dragOverSrcIdx===siteIdx&&dragSrcIdx!==siteIdx?"#f0fdf4": isEditing?"#f8fbf9":"#fff", opacity:dragSrcIdx===siteIdx?0.4:1}}>
                    {isEditing ? (
                      <div style={{padding:"14px 16px"}}>
                        <div style={{display:"grid", gridTemplateColumns:"1fr 160px", gap:12, marginBottom:12}}>
                          <div>
                            <label style={{fontSize:11, color:"#6a9a7a", display:"block", marginBottom:3}}>サイト名</label>
                            <input value={editSiteName} onChange={e=>setEditSiteName(e.target.value)} style={{...inp, padding:"6px 10px"}} autoFocus />
                          </div>
                          <div>
                            <label style={{fontSize:11, color:"#6a9a7a", display:"block", marginBottom:3}}>流入元</label>
                            <select value={editRowSource} onChange={e=>setEditRowSource(e.target.value)} style={{...inp, padding:"6px 8px"}}>
                              <option value="">（未設定）</option>
                              {(master.sources||[]).map(s=>{ const l=typeof s==="string"?s:s.label; return <option key={l} value={l}>{l}</option>; })}
                            </select>
                          </div>
                        </div>
                        <div style={{marginBottom:10}}>
                          <label style={{fontSize:11, color:"#6a9a7a", display:"block", marginBottom:6}}>プラン・金額</label>
                          {plans.map((plan,idx)=>(
                            <div key={idx} style={{display:"flex", alignItems:"center", gap:8, marginBottom:6}}>
                              <input value={plan.label} onChange={e=>updatePlanLabel(site,idx,e.target.value)} style={{...inp, flex:1, padding:"5px 8px"}} />
                              <span style={{fontSize:11,color:"#6a9a7a"}}>¥</span>
                              <input type="number" value={plan.price} onChange={e=>updatePlanPrice(site,idx,e.target.value)} style={{...inp, width:100, padding:"5px 8px"}} />
                              <button onClick={()=>removePlan(site,idx)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}}><TrashIcon size={16} color="#ef4444"/></button>
                            </div>
                          ))}
                          <div style={{display:"flex", gap:6, marginTop:4}}>
                            <input value={selSite===site?newPlan.label:""} onFocus={()=>setSelSite(site)} onChange={e=>setNewPlan(p=>({...p,label:e.target.value}))} placeholder="プラン名" style={{...inp, flex:1, padding:"5px 8px"}} />
                            <input type="number" value={selSite===site?newPlan.price:""} onFocus={()=>setSelSite(site)} onChange={e=>setNewPlan(p=>({...p,price:e.target.value}))} placeholder="金額" style={{...inp, width:90, padding:"5px 8px"}} />
                            <button onClick={addPlan} style={{padding:"5px 12px",borderRadius:6,border:"none",background:"#10b981",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>追加</button>
                          </div>
                        </div>
                        <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
                          <button onClick={()=>{setEditSite(null);setEditSiteName("");}} style={{padding:"6px 14px",borderRadius:7,border:"1px solid #c0dece",background:"#fff",color:"#6a9a7a",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>キャンセル</button>
                          <button onClick={saveRowEdit} style={{padding:"6px 18px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>保存</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{display:"grid", gridTemplateColumns:"28px 1fr 160px 1fr 72px", padding:"10px 12px", gap:12, alignItems:"center"}}>
                        <span title="ドラッグして並び替え" style={{cursor:"grab",color:"#c0dece",fontSize:16,lineHeight:1,userSelect:"none"}}>⠿</span>
                        <span style={{fontSize:13, fontWeight:600, color:"#174f35", display:"flex", alignItems:"center", gap:4}}><BuildingIcon size={13} color="#174f35" /> {site}</span>
                        <span style={{fontSize:12, color: srcLabel?"#174f35":"#c0dece"}}>{srcLabel||"未設定"}</span>
                        <span style={{fontSize:12, color:"#6a9a7a"}}>{plans.length===0?"—":plans.map(p=>`${p.label} ¥${p.price.toLocaleString()}`).join("  /  ")}</span>
                        <div style={{display:"flex", gap:4, justifyContent:"flex-end"}}>
                          <button onClick={()=>startRowEdit(site)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}} title="編集"><PencilIcon size={16} color="#059669"/></button>
                          <button onClick={()=>removeSite(site)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}} title="削除"><TrashIcon size={16} color="#ef4444"/></button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {tab === "apikey" && (
          <div style={{maxWidth:860}}><ApiKeyTab
            currentUser={currentUser}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            profileMsg={profileMsg}
            saveProfile={saveProfile}
            onOpenWizard={onOpenWizard}
          /></div>
        )}
        {tab === "leadmgmt" && currentUser?.role==="admin" && (
          <div style={{maxWidth:720}}><LeadMgmtTab master={master} save={save} onLeadsChange={onLeadsChange} /></div>
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
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"flex",alignItems:"center",gap:4,marginBottom:4}}><PencilIcon size={11} color="#6a9a7a" /> メール署名</label>
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

