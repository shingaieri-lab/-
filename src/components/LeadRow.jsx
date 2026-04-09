import React, { useState } from 'react';
import {
  getSourceIcon, getSourceColor, getStatusColor, getStatuses, IS_COLORS,
  getEffectiveAiConfig,
} from '../lib/master.js';
import { isOverdue, isDueToday, isDueSoon } from '../lib/date.js';
import { isTokenValid, handleOAuthCallbackError, handleOAuthPopupError } from '../lib/gmail.js';
import { S } from './styles.js';
import { PencilIcon, TrashIcon } from './icons.jsx';
import { SourceIconSVG } from './SourceIconSVG.jsx';

export function NextActionEditBtn({ nad, lead, onUpdate, currentUser }) {
  const [editNA, setEditNA] = useState(false);
  const [naDate, setNADate] = useState(nad||"");
  const [naTime, setNATime] = useState(lead.next_action_time||"");
  const [naMemo, setNAMemo] = useState(lead.next_action||"");
  const [calToken, setCalToken] = useState(null);
  const [calSaving, setCalSaving] = useState(false);
  const [calSaved, setCalSaved] = useState(false);

  const createCalTodo = async (date, time) => {
    const clientId = getEffectiveAiConfig(currentUser).gmailClientId;
    if (!clientId) { alert(currentUser?.role === "admin" ? "設定 > APIキー設定 で Gmail Client ID を入力してください" : "管理者にGmail OAuth Client IDの設定を依頼してください"); return; }
    if (!date) { alert("ネクストアクション日が設定されていません"); return; }
    setCalSaving(true);
    try {
      // 有効期限内のトークンがあれば再利用、期限切れなら再取得する
      let tokenObj = calToken;
      if (!isTokenValid(tokenObj)) {
        if (!window.google?.accounts?.oauth2) {
          await new Promise((res, rej) => {
            if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) { res(); return; }
            const s = document.createElement('script');
            s.src = 'https://accounts.google.com/gsi/client';
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
          await new Promise(r => setTimeout(r, 500));
        }
        const rawToken = await new Promise((res, rej) => {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/tasks',
            callback: (resp) => {
              if (resp.error) { handleOAuthCallbackError(resp, rej); }
              else { res(resp.access_token); }
            },
            error_callback: (err) => handleOAuthPopupError(err, rej)
          });
          client.requestAccessToken();
        });
        tokenObj = { token: rawToken, expiresAt: Date.now() + 55 * 60 * 1000 };
        setCalToken(tokenObj);
      }
      const token = tokenObj.token;
      const task = {
        title: lead.company || "(会社名未設定)",
        notes: lead.zoho_url || "",
        due: `${date}T00:00:00.000Z`
      };
      const calRes = await fetch("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(task)
      });
      if (!calRes.ok) {
        const err = await calRes.json();
        if ((err.error?.code===401)||(err.error?.status==='UNAUTHENTICATED')) { setCalToken(null); throw new Error('認証の期限が切れました。再度お試しください。'); }
        throw new Error(err.error?.message || 'タスク作成に失敗しました');
      }
      setCalSaved(true);
      setTimeout(() => setCalSaved(false), 3000);
    } catch(e) {
      alert('GoogleタスクTODO作成エラー: ' + e.message);
    } finally {
      setCalSaving(false);
    }
  };

  if (editNA) return (
    <div style={{display:"flex", gap:6, alignItems:"center",flexWrap:"wrap", marginLeft:4}}>
      <input type="date" value={naDate} onChange={e=>setNADate(e.target.value)}
        style={{...S.inp,padding:"3px 6px",fontSize:11, width:130}} />
      <select value={naTime} onChange={e=>setNATime(e.target.value)}
        style={{...S.inp,padding:"3px 6px",fontSize:11, width:80}}>
        <option value="">時刻なし</option>
        {Array.from({length:28},(_,i)=>{const h=String(Math.floor(i/2)+8).padStart(2,"0");const m=i%2===0?"00":"30";return <option key={i} value={`${h}:${m}`}>{h}:{m}</option>;})}
      </select>
      <input value={naMemo} onChange={e=>setNAMemo(e.target.value)} placeholder="メモ"
        style={{...S.inp,padding:"3px 6px",fontSize:11, width:120}} />
      <button onClick={()=>{ onUpdate({next_action_date:naDate,next_action_time:naTime,next_action:naMemo}); setEditNA(false); }}
        style={{...S.btnDelXs,background:"#059669"}}>保存</button>
      <button onClick={()=>setEditNA(false)} style={S.btnCancelXs}>✕</button>
    </div>
  );
  return (
    <div style={{display:"flex", gap:4, marginLeft:4}}>
      <button onClick={()=>{ setNADate(nad||""); setNATime(lead.next_action_time||""); setNAMemo(lead.next_action||""); setEditNA(true); }} style={{...S.btnIconSm}} title="編集"><PencilIcon size={11} color="#059669"/></button>
      {(currentUser?.gmailClientId || window.__appData?.aiConfig?.gmailClientId) && nad && (
        <button onClick={()=>createCalTodo(nad, lead.next_action_time)} disabled={calSaving}
          style={{...S.btnIconSm,fontSize:11,opacity:calSaving?0.5:1,color:calSaved?"#7c3aed":"inherit"}}
          title="GoogleカレンダーにTODO作成">{calSaved?"✅":"☑️"}</button>
      )}
      <button onClick={()=>onUpdate({next_action:"",next_action_date:"",next_action_time:""})}
        style={{...S.btnIconSm,background:"#fef2f2",border:"1px solid #fca5a5"}} title="削除"><TrashIcon size={11} color="#ef4444"/></button>
    </div>
  );
}

export function LeadRow({ lead, onEdit, onDelete, onStatusChange, onUpdate, openId, setOpenId, readOnly, currentUser }) {
  const open = openId === lead.id;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pc = "#10b981"; // 優先度廃止のためエメラルド固定
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

          {/* 編集・削除ボタン */}
          {!readOnly && <div style={{display:"flex", gap:3, alignItems:"center", marginLeft:4}}>
            <button onClick={e=>{e.stopPropagation();onEdit();}}
              style={{width:26, height:26,borderRadius:6,border:"1px solid #86efac", background:"#f0fdf4",cursor:"pointer", display:"flex",alignItems:"center", justifyContent:"center"}}
              title="編集"><PencilIcon color="#059669"/></button>
            {confirmDelete ? (
              <div style={{display:"flex", gap:3, alignItems:"center"}} onClick={e=>e.stopPropagation()}>
                <span style={{fontSize:10,color:"#ef4444"}}>削除?</span>
                <button onClick={e=>{e.stopPropagation();onDelete();}} style={S.btnDelXs}>削除</button>
                <button onClick={e=>{e.stopPropagation();setConfirmDelete(false);}} style={S.btnCancelXs}>✕</button>
              </div>
            ) : (
              <button onClick={e=>{e.stopPropagation();setConfirmDelete(true);}}
                style={{width:26, height:26,borderRadius:6,border:"1px solid #fca5a5", background:"#fef2f2",cursor:"pointer",color:"#ef4444", display:"flex",alignItems:"center", justifyContent:"center"}}
                title="削除"><TrashIcon color="#ef4444"/></button>
            )}
          </div>}
        </div>
      </div>

      {/* Always-visible: next action + Zoho link */}
      {(lead.next_action || lead.next_action_date || lead.zoho_url || lead.hp_url) && (() => {
        const nad = lead.next_action_date;
        const overdue  = isOverdue(nad);
        const today    = isDueToday(nad);
        const soon     = isDueSoon(nad);
        const dateColor = overdue ? "#dc2626" : today ? "#ea580c" : "#059669";
        return (
          <div style={{...S.leadQuick,background:"transparent", borderTop:"1px solid #e8f5ee",padding:"5px 14px"}} onClick={e=>e.stopPropagation()}>
            {lead.zoho_url && (
              <a href={lead.zoho_url} target="_blank" rel="noopener noreferrer"
                style={{...S.zohoLinkSmall, fontSize:11, padding:"3px 9px", flexShrink:0}} onClick={e=>e.stopPropagation()}>
                🔗 Zoho
              </a>
            )}
            {lead.hp_url && (
              <a href={lead.hp_url} target="_blank" rel="noopener noreferrer"
                style={{...S.zohoLinkSmall, fontSize:11, padding:"3px 9px", flexShrink:0, background:"#e0f2fe", borderColor:"#7dd3fc", color:"#0369a1"}} onClick={e=>e.stopPropagation()}>
                🌐 HP
              </a>
            )}
            {(nad || lead.next_action) && (
              <div style={{...S.nextActInline, flex:1}}>
                {overdue && <span style={{fontSize:11,background:"#ef4444",color:"#fff",borderRadius:4,padding:"1px 6px", marginRight:6,fontWeight:700}}>期限切れ</span>}
                {today   && <span style={{fontSize:11,background:"#f97316",color:"#fff",borderRadius:4,padding:"1px 6px", marginRight:6,fontWeight:700}}>本日</span>}
                {soon && !today && !overdue && <span style={{fontSize:11,background:"#f97316",color:"#fff",borderRadius:4,padding:"1px 6px", marginRight:6,fontWeight:700}}>まもなく</span>}
                <span style={{color:dateColor, marginRight:4}}>→</span>
                {nad && <span style={{fontWeight:700, marginRight:4,color:dateColor}}>{nad}{lead.next_action_time ? " "+lead.next_action_time : ""}</span>}
                {lead.next_action && <span style={{color:"#174f35",fontSize:12}}>{lead.next_action}</span>}
              </div>
            )}
            {(nad || lead.next_action) && <NextActionEditBtn nad={nad} lead={lead} onUpdate={onUpdate} currentUser={currentUser} />}
          </div>
        );
      })()}

      {/* Always-visible: メモ */}
      {lead.memo && (
        <div style={{display:"flex",alignItems:"flex-start",gap:6,padding:"5px 14px",borderTop:"1px solid #bae6fd",background:"#e0f2fe"}} onClick={e=>e.stopPropagation()}>
          <span style={{fontSize:12,color:"#0369a1",flexShrink:0,marginTop:1}}>📝</span>
          <span style={{fontSize:12,color:"#1e3a5f",lineHeight:1.5,wordBreak:"break-word"}}>{lead.memo}</span>
        </div>
      )}

      {/* Always-visible: 商談情報 */}
      {(lead.meeting_date || lead.sales_member || lead.is_accuracy) && (
        <div style={{...S.meetingBar,padding:"5px 16px", borderTop:"1px solid #e8f5ee"}} onClick={e=>e.stopPropagation()}>
          <span style={{fontSize:11,color:"#10b981",fontWeight:700,flexShrink:0}}>🤝 商談</span>
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
