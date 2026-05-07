// ポータルサイト管理タブ
import { useState } from 'react';
import { PencilIcon, TrashIcon, BuildingIcon } from '../ui/Icons.jsx';

export function PortalTab({ master, save }) {
  const inp = { width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid #c0dece", fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit", background:"#fff", color:"#174f35" };

  const [newSite, setNewSite] = useState("");
  const [editSite, setEditSite] = useState(null);
  const [editSiteName, setEditSiteName] = useState("");
  const [selSite, setSelSite] = useState(master.portalSites[0] || "");
  const [editRowSource, setEditRowSource] = useState("");
  const [dragSrcIdx, setDragSrcIdx] = useState(null);
  const [dragOverSrcIdx, setDragOverSrcIdx] = useState(null);
  const [newPlan, setNewPlan] = useState({ label:"", price:"" });
  const [confirmDeleteSite, setConfirmDeleteSite] = useState(null);

  const addSite = () => {
    const s = newSite.trim(); if (!s) return;
    if (master.portalSites.includes(s)) { alert("既に存在します"); return; }
    const pt = { ...master.portalTypes, [s]: [{ label:"一括請求", price:10000 }] };
    const ps = { ...(master.portalSiteSource||{}), [s]: "" };
    save({ ...master, portalSites: [...master.portalSites, s], portalTypes: pt, portalSiteSource: ps });
    setNewSite("");
  };
  const removeSite = (s) => {
    const sites = master.portalSites.filter(x=>x!==s);
    const pt = { ...master.portalTypes }; delete pt[s];
    const ps = { ...(master.portalSiteSource||{}) }; delete ps[s];
    save({ ...master, portalSites: sites, portalTypes: pt, portalSiteSource: ps });
    setConfirmDeleteSite(null);
  };
  const startRowEdit = (site) => {
    setEditSite(site); setEditSiteName(site);
    setEditRowSource((master.portalSiteSource||{})[site]||"");
    setSelSite(site); setNewPlan({ label:"", price:"" });
    setConfirmDeleteSite(null);
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
    save(m); setEditSite(null); setEditSiteName("");
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

  return (
    <div style={{maxWidth:860}}>
      <div style={{display:"flex", gap:8, marginBottom:16}}>
        <input value={newSite} onChange={e=>setNewSite(e.target.value)} placeholder="新しいポータルサイト名" style={{...inp, flex:1, maxWidth:320}} onKeyDown={e=>e.key==="Enter"&&addSite()} />
        <button onClick={addSite} style={{padding:"7px 16px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>追加</button>
      </div>
      <div style={{border:"1px solid #e2f0e8", borderRadius:10, overflow:"hidden"}}>
        <div style={{display:"grid", gridTemplateColumns:"28px 1fr 160px 1fr 72px", background:"#f0f5f2", padding:"8px 12px", gap:12, borderBottom:"1px solid #e2f0e8"}}>
          <div/><div style={{fontSize:11, fontWeight:700, color:"#6a9a7a"}}>サイト名</div>
          <div style={{fontSize:11, fontWeight:700, color:"#6a9a7a"}}>流入元</div>
          <div style={{fontSize:11, fontWeight:700, color:"#6a9a7a"}}>プラン</div><div/>
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
                    {confirmDeleteSite === site ? (
                      <>
                        <button onClick={() => removeSite(site)} style={{padding:"3px 8px",borderRadius:5,border:"none",background:"#ef4444",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>削除確認</button>
                        <button onClick={() => setConfirmDeleteSite(null)} style={{padding:"3px 8px",borderRadius:5,border:"1px solid #c0dece",background:"#fff",color:"#6a9a7a",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>キャンセル</button>
                      </>
                    ) : (
                      <>
                        <button onClick={()=>startRowEdit(site)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}} title="編集"><PencilIcon size={16} color="#059669"/></button>
                        <button onClick={()=>setConfirmDeleteSite(site)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}} title="削除"><TrashIcon size={16} color="#ef4444"/></button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
