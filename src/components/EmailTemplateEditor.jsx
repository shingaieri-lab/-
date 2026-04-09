import React from 'react';

export function EmailTemplateEditor({ editTpl, setEditTpl, onSave, onCancel }) {
  return (
    <div style={{background:"#fff",borderRadius:12,border:"1px solid #fde68a",padding:"16px",display:"flex",flexDirection:"column",minHeight:"calc(100vh - 180px)"}}>
      <div style={{fontSize:13,fontWeight:700,color:"#d97706",marginBottom:12}}>✏️ テンプレート編集</div>
      {[["テンプレート名","name"],["件名","subject"]].map(([l,k])=>(
        <div key={k} style={{marginBottom:8}}><label style={{fontSize:11,color:"#6a9a7a",display:"block",marginBottom:3}}>{l}</label>
          <input value={editTpl[k]} onChange={e=>setEditTpl(p=>({...p,[k]:e.target.value}))} style={{width:"100%",padding:"7px 10px",borderRadius:7,border:"1px solid #c0dece",fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}} />
        </div>
      ))}
      <div style={{marginBottom:6}}>
        <label style={{fontSize:11,color:"#6a9a7a",display:"flex",alignItems:"center",gap:6,cursor:"pointer",userSelect:"none"}}>
          <input type="checkbox" checked={!!editTpl.useSlots} onChange={e=>setEditTpl(p=>({...p,useSlots:e.target.checked}))} />
          <span>{'{{候補日時}}'} を使用する（日程調整テンプレート）</span>
        </label>
      </div>
      <div style={{marginBottom:10}}>
        <label style={{fontSize:11,color:"#6a9a7a",display:"flex",alignItems:"center",gap:6,cursor:"pointer",userSelect:"none"}}>
          <input type="checkbox" checked={!!editTpl.useMeeting} onChange={e=>setEditTpl(p=>({...p,useMeeting:e.target.checked}))} />
          <span>{'{{商談月}}'}{'{{商談日}}'}{'{{商談曜日}}'}{'{{商談時}}'}{'{{商談分}}'}{'{{商談担当}}'} を使用する（確定商談テンプレート）</span>
        </label>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",marginBottom:12}}>
        <label style={{fontSize:11,color:"#6a9a7a",display:"block",marginBottom:3}}>本文</label>
        <textarea value={editTpl.body} onChange={e=>setEditTpl(p=>({...p,body:e.target.value}))} style={{flex:1,width:"100%",minHeight:320,padding:"7px 10px",borderRadius:7,border:"1px solid #c0dece",fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none",lineHeight:1.7}} />
      </div>
      <div style={{fontSize:12,color:"#6b7280",marginBottom:10}}>使用可能な変数：{"{{"+"担当者名"+"}}"}　{"{{"+"担当者苗字"+"}}"}　{"{{"+"会社名"+"}}"}　{"{{"+"送信者名"+"}}"}　{"{{"+"商談担当"+"}}"}　{"{{"+"候補日時"+"}}"}（useSlots ON時）　{"{{"+"商談月"+"}}"}　{"{{"+"商談日"+"}}"}　{"{{"+"商談曜日"+"}}"}　{"{{"+"商談時"+"}}"}　{"{{"+"商談分"+"}}"}</div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onCancel} style={{padding:"7px 16px",borderRadius:7,border:"1px solid #c0dece",background:"#f0f5f2",color:"#3d7a5e",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>キャンセル</button>
        <button onClick={onSave} style={{padding:"7px 16px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>保存</button>
      </div>
    </div>
  );
}
