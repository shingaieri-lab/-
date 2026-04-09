import React from 'react';
import { S } from './styles.js';
import { LeadCombobox } from './LeadCombobox.jsx';

export function CalendarSlotResults({ slots, searched, candidateSlots, onSlotsChange, leads, emailLeadId, setEmailLeadId, selectedMembers, onGoEmail, onOpenCalReg }) {
  if (!searched) return null;

  const isSlotSelected = (slot) => candidateSlots.some(s=>s.date===slot.date&&s.start===slot.start&&s.end===slot.end);
  const toggleCandidateSlot = (slot) => {
    if (isSlotSelected(slot)) {
      onSlotsChange(candidateSlots.filter(s=>!(s.date===slot.date&&s.start===slot.start&&s.end===slot.end)));
    } else if (candidateSlots.length < 3) {
      onSlotsChange([...candidateSlots, slot]);
    }
  };

  return (
    <div style={S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#174f35"}}>
          検索結果：<span style={{color:"#10b981"}}>{slots.length}件</span> の空き時間
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {candidateSlots.length > 0 && (
            <span style={{fontSize:12,color:"#059669",fontWeight:700,background:"#ecfdf5",border:"1px solid #10b98144",borderRadius:8,padding:"4px 10px"}}>
              ✅ {candidateSlots.length}件選択中
            </span>
          )}
          <button onClick={()=>onSlotsChange([])} disabled={candidateSlots.length===0}
            style={{fontSize:11,padding:"4px 10px",borderRadius:7,border:"1px solid #c0dece",background:"#f0f5f2",color:"#6a9a7a",cursor:candidateSlots.length===0?"default":"pointer",fontFamily:"inherit",opacity:candidateSlots.length===0?0.4:1}}>
            選択をクリア
          </button>
          <button onClick={()=>onGoEmail(emailLeadId)} disabled={candidateSlots.length===0}
            style={{fontSize:12,padding:"6px 14px",borderRadius:8,border:"none",background:candidateSlots.length===0?"#d1d5db":"linear-gradient(135deg,#10b981,#059669)",color:"#fff",cursor:candidateSlots.length===0?"default":"pointer",fontFamily:"inherit",fontWeight:700}}>
            📧 メールに使う
          </button>
          <button onClick={onOpenCalReg} disabled={candidateSlots.length===0}
            style={{fontSize:12,padding:"6px 14px",borderRadius:8,border:"none",background:candidateSlots.length===0?"#d1d5db":"linear-gradient(135deg,#3b82f6,#2563eb)",color:"#fff",cursor:candidateSlots.length===0?"default":"pointer",fontFamily:"inherit",fontWeight:700}}>
            📅 カレンダーに登録
          </button>
        </div>
      </div>
      {candidateSlots.length > 0 && (
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
          <span style={{fontSize:11,color:"#6a9a7a",fontWeight:600,whiteSpace:"nowrap"}}>対象リード：</span>
          <div style={{flex:1,minWidth:180,maxWidth:280}}>
            <LeadCombobox leads={leads} value={emailLeadId} onChange={setEmailLeadId}
              placeholder="会社名・担当者名で検索" inputStyle={{...S.inp,padding:"5px 10px",fontSize:12}} darkMode={false} />
          </div>
          {emailLeadId && <span style={{fontSize:11,color:"#059669",fontWeight:700}}>✅ {leads.find(l=>l.id===emailLeadId)?.company||""}</span>}
        </div>
      )}
      {candidateSlots.length === 0 && (
        <div style={{fontSize:11,color:"#6b7280",background:"#f9fafb",borderRadius:7,padding:"6px 10px",marginBottom:10,border:"1px dashed #d1d5db"}}>
          日時ボタンをクリックして候補日を選択（最大3つ）→「📧 メールに使う」でメールテンプレートに反映
        </div>
      )}
      {slots.length === 0 ? (
        <div style={{textAlign:"center",color:"#6a9a7a",padding:"24px",fontSize:14}}>
          指定期間に空き時間が見つかりませんでした
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:400,overflowY:"auto"}}>
          {[...new Set(slots.map(s=>s.date))].map(date => (
            <div key={date}>
              <div style={{fontSize:12,fontWeight:700,color:"#6a9a7a",marginBottom:4,marginTop:8}}>
                {date}（{["日","月","火","水","木","金","土"][new Date(date+"T00:00:00").getDay()]}）
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {slots.filter(s=>s.date===date).map((slot,i)=>{
                  const selected = isSlotSelected(slot);
                  const maxed = candidateSlots.length >= 3 && !selected;
                  return (
                    <button key={i} onClick={()=>toggleCandidateSlot(slot)} disabled={maxed}
                      style={{fontSize:12,padding:"6px 12px",borderRadius:8,cursor:maxed?"not-allowed":"pointer",fontFamily:"inherit",fontWeight:600,
                        border:selected?"2px solid #10b981":"1px solid #10b98144",
                        background:selected?"#10b981":"#ecfdf5",
                        color:selected?"#fff":"#059669",
                        opacity:maxed?0.4:1,
                        transition:"all 0.15s"}}>
                      {selected ? "✓ " : ""}{slot.start}〜{slot.end}{selectedMembers.length > 1 && slot.members && slot.members.length > 0 ? `（${slot.members.join("・")}）` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
