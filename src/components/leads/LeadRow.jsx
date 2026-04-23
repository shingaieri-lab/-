// リード一覧の1行表示コンポーネント
import { useState } from 'react';
import { S } from '../../styles/index.js';
import { PencilIcon, TrashIcon, ExternalLinkIcon, GlobeIcon, FileTextIcon, CalendarNavIcon } from '../ui/Icons.jsx';
import { SourceIconSVG } from '../ui/SourceIconSVG.jsx';
import { NextActionEditBtn } from '../actions/NextActionEditBtn.jsx';
import { ActionHistoryPanel } from '../actions/ActionHistoryPanel.jsx';
import { getStatuses, getStatusColor, getSourceIcon, IS_COLORS } from '../../lib/master.js';
import { isOverdue, isDueToday, isDueSoon } from '../../lib/holidays.js';

export function LeadRow({ lead, onEdit, onDelete, onStatusChange, onUpdate, openId, setOpenId, readOnly, currentUser }) {
  const open = openId === lead.id;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const actions = lead.actions || [];
  const last = actions[0];

  const srcIconKey2 = getSourceIcon(lead.source) || "document";
  const sc = getStatusColor(lead.status);
  const nad = lead.next_action_date;
  const subParts = [
    lead.contact,
    lead.date ? `反響日：${lead.date}` : null,
    last ? `最終：${last.date}${last.time ? " "+last.time : ""}` : null,
  ].filter(Boolean);

  return (
    <div style={{...S.leadCard, border: open ? "1px solid #10b98155" : "1px solid #e2f0e8", boxShadow: open ? "0 4px 16px #10b98115" : "0 1px 6px #0569690a", transition:"box-shadow 0.15s, border-color 0.15s",}}
      onMouseEnter={e=>{ if(!open){ e.currentTarget.style.boxShadow="0 3px 12px #0569691a"; e.currentTarget.style.borderColor="#c0dece"; }}}
      onMouseLeave={e=>{ if(!open){ e.currentTarget.style.boxShadow="0 1px 6px #0569690a"; e.currentTarget.style.borderColor="#e2f0e8"; }}}>

      {/* ─ 1行メインロー ─ */}
      <div style={{display:"flex",alignItems:"center", gap:12,padding:"13px 16px", background: open ? "#f0faf5" : "transparent",cursor:"pointer", userSelect:"none"}}
        onClick={()=>setOpenId(id => id === lead.id ? null : lead.id)}>

        {/* アイコン */}
        <div style={{width:36, height:36,borderRadius:9, flexShrink:0, background: open ? sc+"22" : "#f0f5f2", border:`1.5px solid ${sc}33`, display:"flex",alignItems:"center", justifyContent:"center",fontSize:17}}>
          <SourceIconSVG iconKey={srcIconKey2} size={26}/>
        </div>

        {/* 会社名＋サブテキスト */}
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:"#174f35", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
            {lead.company || "（会社名未設定）"}
          </div>
          {subParts.length > 0 && (
            <div style={{fontSize:11,color:"#6a9a7a", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
              {subParts.join(" · ")}
            </div>
          )}
        </div>

        {/* 右側：ステータス＋操作（クリック伝播止め） */}
        <div style={{display:"flex",alignItems:"center", gap:6,flexShrink:0}}
          onClick={e=>e.stopPropagation()}>

          {/* IS担当バッジ */}
          {lead.is_member && (() => {
            const c = IS_COLORS[lead.is_member] || { bg:"#3d7a5e",border:"#47556966" };
            return <span style={{fontSize:11,fontWeight:700,color:c.bg, background:c.bg+"12",border:`1px solid ${c.bg}33`, borderRadius:6,padding:"2px 8px", whiteSpace:"nowrap"}}>{lead.is_member}</span>;
          })()}

          {/* MQL バッジ */}
          {(lead.mql||"").trim() === "MQL" && (
            <span style={{fontSize:11,fontWeight:700,color:"#6b7280", background:"#f3f4f6",border:"1px solid #d1d5db", borderRadius:6,padding:"2px 8px", whiteSpace:"nowrap"}}>MQL</span>
          )}

          {/* 課金対象外バッジ */}
          {lead.portal_site && lead.charge_applied && (
            <span style={{fontSize:11,fontWeight:700,color:"#6a9a7a", background:"#f0f5f2",border:"1px solid #c0dece", borderRadius:6,padding:"2px 7px", whiteSpace:"nowrap"}}>課金対象外</span>
          )}

          {/* ステータス select / badge */}
          {readOnly
            ? <span style={{fontSize:11,fontWeight:700,color:sc, background:sc+"15",border:`1px solid ${sc}44`, borderRadius:8,padding:"3px 8px", whiteSpace:"nowrap"}}>{lead.status||"新規"}</span>
            : <select value={lead.status||"新規"}
                onChange={e=>{ e.stopPropagation(); onStatusChange(e.target.value); }}
                style={{fontSize:11,fontWeight:700,color:sc, background:sc+"15",border:`1px solid ${sc}44`, borderRadius:8,padding:"3px 8px",cursor:"pointer", fontFamily:"inherit", outline:"none", whiteSpace:"nowrap"}}>
                {getStatuses().map(s=><option key={s}>{s}</option>)}
              </select>
          }

        </div>
      </div>

      {/* Always-visible: next action + Zoho link */}
      {(lead.next_action || lead.next_action_date || lead.zoho_url || lead.hp_url) && (() => {
        const nad = lead.next_action_date;
        const overdue  = isOverdue(nad);
        const today    = isDueToday(nad);
        const soon     = isDueSoon(nad);
        const dateColor = overdue ? "#dc2626" : today ? "#ea580c" : soon ? "#7c3aed" : "#059669";
        return (
          <div style={{...S.leadQuick,background:"transparent", borderTop:"1px solid #e8f5ee",padding:"5px 14px"}} onClick={e=>e.stopPropagation()}>
            {lead.zoho_url && (
              <a href={lead.zoho_url} target="_blank" rel="noopener noreferrer"
                style={{...S.zohoLinkSmall, fontSize:11, padding:"3px 9px", flexShrink:0, display:"flex", alignItems:"center", gap:4}} onClick={e=>e.stopPropagation()}>
                <ExternalLinkIcon size={12} color="#0284c7" /> Zoho
              </a>
            )}
            {lead.hp_url && (
              <a href={lead.hp_url} target="_blank" rel="noopener noreferrer"
                style={{...S.zohoLinkSmall, fontSize:11, padding:"3px 9px", flexShrink:0, background:"#e0f2fe", borderColor:"#7dd3fc", color:"#0369a1", display:"flex", alignItems:"center", gap:4}} onClick={e=>e.stopPropagation()}>
                <GlobeIcon size={12} color="#0369a1" /> HP
              </a>
            )}
            {(nad || lead.next_action) && (
              <div style={{...S.nextActInline, flex:1}}>
                {overdue && <span style={{fontSize:11,background:"#ef4444",color:"#fff",borderRadius:4,padding:"1px 6px", marginRight:6,fontWeight:700}}>期限切れ</span>}
                {today   && <span style={{fontSize:11,background:"#f97316",color:"#fff",borderRadius:4,padding:"1px 6px", marginRight:6,fontWeight:700}}>本日</span>}
                {soon && !today && !overdue && <span style={{fontSize:11,background:"#8b5cf6",color:"#fff",borderRadius:4,padding:"1px 6px", marginRight:6,fontWeight:700}}>まもなく</span>}
                <span style={{color:dateColor, marginRight:4}}>→</span>
                {nad && <span style={{fontWeight:700, marginRight:4,color:dateColor}}>{nad}{lead.next_action_time ? " "+lead.next_action_time : ""}</span>}
              </div>
            )}
            {(nad || lead.next_action) && <NextActionEditBtn nad={nad} lead={lead} onUpdate={onUpdate} currentUser={currentUser} compact />}
          </div>
        );
      })()}

      {/* Always-visible: メモ */}
      {lead.memo && (
        <div style={{display:"flex",alignItems:"flex-start",gap:6,padding:"5px 14px",borderTop:"1px solid #bae6fd",background:"#e0f2fe"}} onClick={e=>e.stopPropagation()}>
          <span style={{flexShrink:0,marginTop:1}}><FileTextIcon size={13} color="#0369a1" /></span>
          <span style={{fontSize:12,color:"#1e3a5f",lineHeight:1.5,wordBreak:"break-word"}}>{lead.memo}</span>
        </div>
      )}

      {/* Always-visible: 商談情報 */}
      {(lead.meeting_date || lead.sales_member || lead.is_accuracy) && (
        <div style={{...S.meetingBar,padding:"5px 16px", borderTop:"1px solid #e8f5ee"}} onClick={e=>e.stopPropagation()}>
          <span style={{fontSize:11,color:"#10b981",fontWeight:700,flexShrink:0,display:"flex",alignItems:"center",gap:4}}><CalendarNavIcon size={12} color="#10b981" /> 商談</span>
          {lead.meeting_date && (
            <span style={{fontSize:11,color:"#6b7280"}}>
              {lead.meeting_date}{lead.meeting_time ? " " + lead.meeting_time : ""}
            </span>
          )}
          {lead.sales_member && (
            <span style={{fontSize:11,color:"#6b7280",fontWeight:600}}>担当：{lead.sales_member}</span>
          )}
          {lead.is_accuracy && (
            <span style={{fontSize:10,fontWeight:700,color:"#6b7280",background:"#f3f4f6",border:"1px solid #d1d5db",borderRadius:6,padding:"2px 8px",whiteSpace:"nowrap"}}>IS確度：{lead.is_accuracy}</span>
          )}
        </div>
      )}
    </div>
  );
}
