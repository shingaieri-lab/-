// リード管理タブ（流入元・ステータス・営業担当管理）
import { useState } from 'react';
import { PencilIcon, TrashIcon } from '../ui/Icons.jsx';
import { SourceIconSVG } from '../ui/SourceIconSVG.jsx';
import { PALETTE, LEAD_SOURCE_ICONS } from '../../constants/index.js';
import { DEFAULT_SOURCES, DEFAULT_STATUSES_WITH_COLORS } from '../../lib/master.js';
import { loadLeads, saveLeads } from '../../lib/api.js';

export function LeadMgmtTab({ master, save, onLeadsChange }) {
  const inp = { width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid #c0dece", fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit", background:"#fff", color:"#174f35" };

  // 営業担当
  const [newSales, setNewSales] = useState("");
  const [editSalesIdx, setEditSalesIdx] = useState(null);
  const [editSalesName, setEditSalesName] = useState("");
  const addSales = () => {
    const s = newSales.trim(); if (!s) return;
    if (master.salesMembers.includes(s)) { alert("既に存在します"); return; }
    save({ ...master, salesMembers: [...master.salesMembers, s] });
    setNewSales("");
  };
  const removeSales = (m) => {
    if (!window.confirm(`「${m}」を削除しますか？`)) return;
    save({ ...master, salesMembers: master.salesMembers.filter(x => x !== m) });
  };
  const renameSales = (idx) => {
    const newName = editSalesName.trim(); if (!newName) return;
    if (master.salesMembers.some((m, i) => m === newName && i !== idx)) { alert("既に存在します"); return; }
    save({ ...master, salesMembers: master.salesMembers.map((m, i) => i === idx ? newName : m) });
    setEditSalesIdx(null); setEditSalesName("");
  };

  // ステータス
  const getStatusData = () => master.statuses || DEFAULT_STATUSES_WITH_COLORS;
  const [editStatusIdx, setEditStatusIdx] = useState(null);
  const [editStatusForm, setEditStatusForm] = useState({ label:"", color:"" });
  const [newStatusForm, setNewStatusForm] = useState({ label:"", color:"#0ea5e9" });
  const [dragStatusIdx, setDragStatusIdx] = useState(null);
  const [dragOverStatusIdx, setDragOverStatusIdx] = useState(null);
  const addStatus = () => {
    const l = newStatusForm.label.trim(); if (!l) return;
    if (getStatusData().some(s=>s.label===l)) { alert("既に存在します"); return; }
    save({ ...master, statuses: [...getStatusData(), { label:l, color:newStatusForm.color }] });
    setNewStatusForm({ label:"", color:"#0ea5e9" });
  };
  const removeStatus = (idx) => {
    if (!window.confirm("削除しますか？")) return;
    save({ ...master, statuses: getStatusData().filter((_,i)=>i!==idx) });
  };
  const startEditStatus = (idx) => { const s=getStatusData()[idx]; setEditStatusForm({label:s.label,color:s.color}); setEditStatusIdx(idx); };
  const saveStatus = () => {
    const l = editStatusForm.label.trim(); if (!l) return;
    if (getStatusData().some((s,i)=>s.label===l && i!==editStatusIdx)) { alert("既に存在します"); return; }
    save({ ...master, statuses: getStatusData().map((s,i)=>i===editStatusIdx?{...s,...editStatusForm,label:l}:s) });
    setEditStatusIdx(null);
  };
  const moveStatus = (idx, dir) => {
    const data = [...getStatusData()];
    if (dir==="up" && idx>0) { [data[idx-1],data[idx]]=[data[idx],data[idx-1]]; }
    else if (dir==="down" && idx<data.length-1) { [data[idx+1],data[idx]]=[data[idx],data[idx+1]]; }
    else return; save({ ...master, statuses: data });
  };

  // 流入元
  const [newSource, setNewSource] = useState("");
  const [newSourceIcon, setNewSourceIcon] = useState("home");
  const [editSourceIdx, setEditSourceIdx] = useState(null);
  const [editSourceVal, setEditSourceVal] = useState("");
  const [editSourceIcon, setEditSourceIcon] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(null);
  const [dragSrcIdx, setDragSrcIdx] = useState(null);
  const [dragOverSrcIdx, setDragOverSrcIdx] = useState(null);
  const addSource = () => {
    const s = newSource.trim(); if (!s) return;
    const currentSources = master.sources || DEFAULT_SOURCES;
    if (currentSources.some(x => (typeof x === "string" ? x : x.label) === s)) { alert("既に存在します"); return; }
    save({ ...master, sources: [...currentSources, {label: s, icon: newSourceIcon}] });
    setNewSource(""); setNewSourceIcon("home");
  };
  const removeSource = (s) => {
    if ((master.sources||DEFAULT_SOURCES).length <= 1) { alert("最低1つ必要です"); return; }
    save({ ...master, sources: (master.sources||DEFAULT_SOURCES).filter(x => (typeof x === "string" ? x : x.label) !== s) });
  };
  const startEditSource = (idx) => {
    setEditSourceIdx(idx);
    const src = (master.sources||DEFAULT_SOURCES)[idx];
    setEditSourceVal(typeof src === "string" ? src : src.label);
    setEditSourceIcon(typeof src === "object" ? src.icon : null);
  };
  const saveSource = async () => {
    const newVal = editSourceVal.trim();
    if (!newVal) return;
    const sources = master.sources||DEFAULT_SOURCES;
    const oldSrc = sources[editSourceIdx];
    const oldVal = typeof oldSrc === "string" ? oldSrc : oldSrc.label;
    if (newVal === oldVal && editSourceIcon === (typeof oldSrc === "object" ? oldSrc.icon : null)) { setEditSourceIdx(null); return; }
    if (sources.some((s,i) => i !== editSourceIdx && (typeof s === "string" ? s : s.label) === newVal)) { alert("既に存在します"); return; }
    const newSources = sources.map((s,i) => i===editSourceIdx ? {label: newVal, icon: editSourceIcon} : s);
    save({ ...master, sources: newSources });
    if (newVal !== oldVal) {
      const leads = await loadLeads();
      const updated = leads.map(l => l.source === oldVal ? { ...l, source: newVal } : l);
      await saveLeads(updated);
      if (onLeadsChange) onLeadsChange(updated);
    }
    setEditSourceIdx(null);
  };

  return (
    <div>
      {/* 流入元 */}
      <div style={{marginBottom:24}}>
        <div style={{fontSize:13,fontWeight:700,color:"#174f35",marginBottom:8}}>流入元</div>
        <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowIconPicker(showIconPicker==="new"?null:"new")} title="アイコン選択"
              style={{padding:4,borderRadius:8,border:"2px solid #c0dece",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:38,height:38}}>
              <SourceIconSVG iconKey={newSourceIcon} size={26}/>
            </button>
            {showIconPicker==="new" && (
              <div style={{position:"absolute",top:42,left:0,zIndex:200,background:"#fff",border:"1px solid #d8ede1",borderRadius:12,padding:10,boxShadow:"0 6px 24px #0003",display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,width:218}}>
                <div style={{gridColumn:"1/-1",fontSize:11,fontWeight:700,color:"#6a9a7a",marginBottom:4}}>アイコンを選択</div>
                {LEAD_SOURCE_ICONS.map(icon=>(
                  <button key={icon.key} onClick={()=>{setNewSourceIcon(icon.key);setShowIconPicker(null);}} title={icon.label}
                    style={{padding:2,borderRadius:8,border:"none",boxShadow:newSourceIcon===icon.key?"0 0 0 2.5px #10b981":"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxSizing:"border-box"}}>
                    <SourceIconSVG iconKey={icon.key} size={32}/>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input value={newSource} onChange={e=>setNewSource(e.target.value)} placeholder="新しい流入元" style={{...inp,flex:1,minWidth:120}} onKeyDown={e=>e.key==="Enter"&&addSource()} />
          <button onClick={addSource} style={{padding:"7px 16px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>追加</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {(master.sources||DEFAULT_SOURCES).map((srcObj,idx)=>{
            const sLabel = typeof srcObj==="string" ? srcObj : srcObj.label;
            const sIcon  = typeof srcObj==="object" ? srcObj.icon : null;
            return (
              <div key={sLabel}
                draggable={editSourceIdx!==idx}
                onDragStart={()=>setDragSrcIdx(idx)}
                onDragOver={e=>{e.preventDefault();setDragOverSrcIdx(idx);}}
                onDrop={()=>{
                  if(dragSrcIdx===null||dragSrcIdx===idx){setDragOverSrcIdx(null);return;}
                  const arr=[...(master.sources||DEFAULT_SOURCES)];
                  const [moved]=arr.splice(dragSrcIdx,1);
                  arr.splice(idx,0,moved);
                  save({...master,sources:arr});
                  setDragSrcIdx(null);setDragOverSrcIdx(null);
                }}
                onDragEnd={()=>{setDragSrcIdx(null);setDragOverSrcIdx(null);}}
                style={{display:"flex",alignItems:"center",gap:8,background:"#f8fbf9",borderRadius:10,padding:"8px 12px",
                  border:dragOverSrcIdx===idx&&dragSrcIdx!==idx?"2px solid #10b981":"1px solid #e2f0e8",
                  opacity:dragSrcIdx===idx?0.4:1,transition:"opacity 0.15s"}}>
                {editSourceIdx===idx ? (
                  <div style={{display:"flex",alignItems:"center",gap:6,flex:1,flexWrap:"wrap"}}>
                    <div style={{position:"relative"}}>
                      <button onClick={()=>setShowIconPicker(showIconPicker===idx?null:idx)} title="アイコン選択"
                        style={{padding:3,borderRadius:7,border:"2px solid #c0dece",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:34,height:34}}>
                        <SourceIconSVG iconKey={editSourceIcon||"home"} size={24}/>
                      </button>
                      {showIconPicker===idx && (
                        <div style={{position:"absolute",top:38,left:0,zIndex:200,background:"#fff",border:"1px solid #d8ede1",borderRadius:12,padding:10,boxShadow:"0 6px 24px #0003",display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,width:218}}>
                          <div style={{gridColumn:"1/-1",fontSize:11,fontWeight:700,color:"#6a9a7a",marginBottom:4}}>アイコンを選択</div>
                          {LEAD_SOURCE_ICONS.map(icon=>(
                            <button key={icon.key} onClick={()=>{setEditSourceIcon(icon.key);setShowIconPicker(null);}} title={icon.label}
                              style={{padding:2,borderRadius:8,border:"none",boxShadow:editSourceIcon===icon.key?"0 0 0 2.5px #10b981":"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxSizing:"border-box"}}>
                              <SourceIconSVG iconKey={icon.key} size={32}/>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input value={editSourceVal} onChange={e=>setEditSourceVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveSource();if(e.key==="Escape")setEditSourceIdx(null);}} style={{...inp,flex:1,minWidth:80,padding:"4px 8px"}} autoFocus />
                    <button onClick={saveSource} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"none",background:"#10b981",color:"#fff",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>保存</button>
                    <button onClick={()=>{setEditSourceIdx(null);setShowIconPicker(null);}} style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:"1px solid #c0dece",background:"#fff",color:"#6a9a7a",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>✕</button>
                  </div>
                ) : (
                  <>
                    <span title="ドラッグして並び替え" style={{cursor:"grab",color:"#c0dece",fontSize:18,flexShrink:0,lineHeight:1,userSelect:"none",paddingRight:2}}>⠿</span>
                    <SourceIconSVG iconKey={sIcon||"home"} size={28}/>
                    <span style={{fontSize:13,color:"#174f35",fontWeight:600,flex:1}}>{sLabel}</span>
                    <button onClick={()=>startEditSource(idx)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}} title="編集"><PencilIcon size={18} color="#059669"/></button>
                    <button onClick={()=>removeSource(sLabel)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}} title="削除"><TrashIcon size={18} color="#ef4444"/></button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ステータス */}
      <div style={{fontSize:13,fontWeight:700,color:"#174f35",marginBottom:8}}>ステータス管理</div>
      <div style={{background:"#f0f5f2",borderRadius:10,padding:"14px 16px",border:"1px solid #d8ede1",marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:"#174f35",marginBottom:10}}>＋ ステータス追加</div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <input value={newStatusForm.label} onChange={e=>setNewStatusForm(p=>({...p,label:e.target.value}))} placeholder="ステータス名" style={{...inp,flex:"1 1 120px",minWidth:120}} onKeyDown={e=>e.key==="Enter"&&addStatus()} />
          <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
            {PALETTE.map(c=>(
              <button key={c} onClick={()=>setNewStatusForm(p=>({...p,color:c}))} style={{width:18,height:18,borderRadius:"50%",background:c,border:newStatusForm.color===c?"3px solid #174f35":"2px solid #fff",cursor:"pointer",flexShrink:0}} />
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:16,height:16,borderRadius:"50%",background:newStatusForm.color,boxShadow:"0 1px 3px #0003"}} />
            <button onClick={addStatus} style={{padding:"6px 18px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>追加</button>
          </div>
        </div>
      </div>
      <div style={{marginBottom:12}}>
        {getStatusData().map((s, idx) => (
          <div key={idx}
            draggable={editStatusIdx!==idx}
            onDragStart={()=>setDragStatusIdx(idx)}
            onDragOver={e=>{e.preventDefault();setDragOverStatusIdx(idx);}}
            onDrop={()=>{
              if(dragStatusIdx===null||dragStatusIdx===idx){setDragOverStatusIdx(null);return;}
              const arr=[...getStatusData()];
              const [moved]=arr.splice(dragStatusIdx,1);
              arr.splice(idx,0,moved);
              save({...master,statuses:arr});
              setDragStatusIdx(null);setDragOverStatusIdx(null);
            }}
            onDragEnd={()=>{setDragStatusIdx(null);setDragOverStatusIdx(null);}}
            style={{display:"flex",alignItems:"center",gap:8,background:"#f8fbf9",borderRadius:8,padding:"8px 12px",marginBottom:6,
              border:dragOverStatusIdx===idx&&dragStatusIdx!==idx?"2px solid #10b981":"1px solid #e2f0e8",
              opacity:dragStatusIdx===idx?0.4:1,transition:"opacity 0.15s"}}>
            {editStatusIdx===idx ? (
              <div style={{display:"flex",alignItems:"center",gap:8,flex:1,flexWrap:"wrap"}}>
                <input value={editStatusForm.label} onChange={e=>setEditStatusForm(p=>({...p,label:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&saveStatus()} style={{...inp,flex:1,minWidth:100,padding:"4px 8px"}} autoFocus />
                <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                  {PALETTE.map(c=>(
                    <button key={c} onClick={()=>setEditStatusForm(p=>({...p,color:c}))} style={{width:18,height:18,borderRadius:"50%",background:c,border:editStatusForm.color===c?"3px solid #174f35":"2px solid #fff",cursor:"pointer",flexShrink:0}} />
                  ))}
                </div>
                <button onClick={saveStatus} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"none",background:"#10b981",color:"#fff",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>保存</button>
                <button onClick={()=>setEditStatusIdx(null)} style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:"1px solid #c0dece",background:"#fff",color:"#6a9a7a",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>✕</button>
              </div>
            ) : (
              <>
                <span title="ドラッグして並び替え" style={{cursor:"grab",color:"#c0dece",fontSize:18,flexShrink:0,lineHeight:1,userSelect:"none",paddingRight:2}}>⠿</span>
                <div style={{width:14,height:14,borderRadius:"50%",background:s.color,flexShrink:0,boxShadow:"0 1px 3px #0003"}} />
                <span style={{flex:1,fontSize:13,fontWeight:600,color:"#174f35"}}>{s.label}</span>
                <button onClick={()=>startEditStatus(idx)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}} title="編集"><PencilIcon size={18} color="#059669"/></button>
                <button onClick={()=>removeStatus(idx)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}} title="削除"><TrashIcon size={18} color="#ef4444"/></button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 営業担当 */}
      <div style={{marginTop:24}}>
        <div style={{fontSize:13,fontWeight:700,color:"#174f35",marginBottom:8}}>営業担当</div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <input value={newSales} onChange={e=>setNewSales(e.target.value)} placeholder="担当者名" style={{...inp,flex:1}} onKeyDown={e=>e.key==="Enter"&&addSales()} />
          <button onClick={addSales} style={{padding:"7px 16px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>追加</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {master.salesMembers.map((m, idx) => (
            <div key={m} style={{display:"flex",alignItems:"center",gap:6,background:"#f0f5f2",border:"1px solid #d8ede1",borderRadius:8,padding:"6px 10px"}}>
              {editSalesIdx === idx ? (
                <>
                  <input value={editSalesName} onChange={e=>setEditSalesName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&renameSales(idx)} style={{...inp,flex:1,padding:"4px 8px"}} autoFocus />
                  <button onClick={()=>renameSales(idx)} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"none",background:"#10b981",color:"#fff",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>保存</button>
                  <button onClick={()=>setEditSalesIdx(null)} style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:"1px solid #c0dece",background:"#fff",color:"#6a9a7a",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>✕</button>
                </>
              ) : (
                <>
                  <span style={{fontSize:12,color:"#174f35",fontWeight:600,flex:1}}>{m}</span>
                  <button onClick={()=>{setEditSalesIdx(idx);setEditSalesName(m)}} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}} title="編集"><PencilIcon size={18} color="#059669"/></button>
                  <button onClick={()=>removeSales(m)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}} title="削除"><TrashIcon size={18} color="#ef4444"/></button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
