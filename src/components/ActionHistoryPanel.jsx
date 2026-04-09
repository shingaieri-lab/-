import React, { useState } from 'react';
import { getStatusColor, getSourceColor } from '../lib/master.js';
import { isOverdue, isDueToday, isDueSoon } from '../lib/date.js';
import { S } from './styles.js';
import { PencilIcon, TrashIcon } from './icons.jsx';
import { ActionForm, ActEntry } from './LeadForms.jsx';
import { NextActionEditBtn } from './LeadRow.jsx';

export function ActionHistoryPanel({ lead, onClose, onUpdate, onEditAction, onDeleteAction, onEdit, onDelete, currentUser, readOnly }) {
  const [showAF, setShowAF] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dealCopied, setDealCopied] = useState(false);
  const [zohoCreating, setZohoCreating] = useState(false);
  const [zohoMsg, setZohoMsg] = useState('');
  const [zohoPushingId, setZohoPushingId] = useState(null);
  const actions = lead.actions || [];

  const zohoAuthenticated = window.__appData?.zohoAuthenticated || false;

  // 商談確定時: Zohoに取引先・取引先責任者・商談を作成
  const createZohoDeal = async () => {
    if (!zohoAuthenticated) { alert('Zoho認証が必要です。設定 → Zoho CRM連携 から認証してください。'); return; }
    if (!window.confirm(`「${lead.company}」の取引先・取引先責任者・商談をZohoに作成しますか？`)) return;
    setZohoCreating(true); setZohoMsg('');
    try {
      const res = await fetch('/api/zoho/create-deal', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ lead }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        // 作成されたIDをリードに保存
        onUpdate({ zoho_account_id: data.accountId, zoho_contact_id: data.contactId, zoho_deal_id: data.dealId });
        if (data.warn === 'kv_save_failed') {
          setZohoMsg('✅ Zohoへの作成は完了しました。ページを再読み込みして「Zoho商談済」になっているか確認してください。');
        } else {
          setZohoMsg('✅ Zohoに取引先・取引先責任者・商談を作成しました');
        }
      } else if (res.status === 409) {
        // すでに作成済み → IDを反映して画面を「作成済み」状態に更新
        onUpdate({ zoho_account_id: data.zoho_account_id, zoho_contact_id: data.zoho_contact_id, zoho_deal_id: data.zoho_deal_id });
        setZohoMsg('ℹ️ この商談はすでにZohoに作成済みです');
      } else {
        setZohoMsg('❌ 作成失敗: ' + (data.error || '不明なエラー'));
      }
    } catch (e) {
      setZohoMsg('❌ 通信エラー: ' + e.message);
    } finally {
      setZohoCreating(false);
      setTimeout(() => setZohoMsg(''), 5000);
    }
  };

  // アクション履歴1件をZohoにNoteとして同期
  const pushActionToZoho = async (action) => {
    if (!zohoAuthenticated) { alert('Zoho認証が必要です。設定 → Zoho CRM連携 から認証してください。'); return; }
    if (!lead.zoho_lead_id) { alert('このリードはZohoと連携されていません。\nZohoリードIDが設定されていないため同期できません。'); return; }
    setZohoPushingId(action.id);
    try {
      const res = await fetch('/api/zoho/push-action', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ zohoLeadId: lead.zoho_lead_id, action }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setZohoMsg('✅ アクション履歴をZohoに同期しました');
      } else {
        setZohoMsg('❌ 同期失敗: ' + (data.error || '不明なエラー'));
      }
    } catch (e) {
      setZohoMsg('❌ 通信エラー: ' + e.message);
    } finally {
      setZohoPushingId(null);
      setTimeout(() => setZohoMsg(''), 4000);
    }
  };

  const copyDealInfo = () => {
    const meetingDateTime = [lead.meeting_date, lead.meeting_time].filter(Boolean).join(' ');
    const text = `商談担当：${lead.sales_member ? lead.sales_member+'さん' : ''}\n商談日時：${meetingDateTime}\n会社名：${lead.company||''}\nHP：${lead.hp_url||''}\nzoho：${lead.zoho_url||''}\nIS確度：${lead.is_accuracy||''}`;
    navigator.clipboard?.writeText(text);
    setDealCopied(true);
    setTimeout(() => setDealCopied(false), 2000);
  };

  const sc = getStatusColor(lead.status);
  const nad = lead.next_action_date;
  const overdue = isOverdue(nad);
  const today   = isDueToday(nad);
  const soon    = isDueSoon(nad);

  return (
    <div style={{display:"flex", flexDirection:"column"}}>
      {/* パネルヘッダー：リード情報 */}
      <div style={{padding:"14px 16px", borderBottom:"1px solid #e2f0e8", background:"#f0faf5", borderRadius:"12px 12px 0 0", position:"sticky", top:0, zIndex:1}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8}}>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:14, fontWeight:700, color:"#174f35", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{lead.company}</div>
            {(lead.contact || lead.email) && (
              <div style={{fontSize:11, color:"#6a9a7a", marginTop:2, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
                {lead.contact && <span>{lead.contact}</span>}
                {lead.email && <a href={`mailto:${lead.email}`} style={{color:"#0ea5e9", textDecoration:"none"}}>✉️ {lead.email}</a>}
              </div>
            )}
          </div>
          <div style={{display:"flex", alignItems:"center", gap:4, flexShrink:0, flexWrap:"wrap"}}>
            {/* 商談確定時のみZoho商談作成ボタンを表示 */}
            {!readOnly && lead.status === "商談確定" && zohoAuthenticated && !lead.zoho_deal_id && (
              <button onClick={createZohoDeal} disabled={zohoCreating}
                style={{background: zohoCreating?"#9ca3af":"linear-gradient(135deg,#0ea5e9,#0284c7)", border:"none", borderRadius:6, cursor: zohoCreating?"default":"pointer", color:"#fff", fontSize:11, padding:"3px 9px", fontWeight:700, lineHeight:1.4}}>
                {zohoCreating ? "作成中..." : "🔗 Zoho商談作成"}
              </button>
            )}
            {!readOnly && lead.status === "商談確定" && lead.zoho_deal_id && (
              <span style={{fontSize:11,color:"#0ea5e9",fontWeight:700,padding:"3px 8px",background:"#e0f2fe",border:"1px solid #7dd3fc",borderRadius:6}}>✅ Zoho商談済</span>
            )}
            <button onClick={copyDealInfo} style={{background: dealCopied?"#10b981":"none", border:`1px solid ${dealCopied?"#10b981":"#10b98166"}`, borderRadius:6, cursor:"pointer", color: dealCopied?"#fff":"#059669", fontSize:12, padding:"2px 8px", lineHeight:1.4, fontWeight:600, transition:"all 0.2s"}}>{dealCopied ? "✅ コピー済み" : "📋 商談共有用"}</button>
            {!readOnly && <button onClick={onEdit} style={{background:"#f0fdf4", border:"1px solid #86efac", borderRadius:6, cursor:"pointer", color:"#059669", fontSize:12, padding:"3px 7px", display:"flex", alignItems:"center"}} title="編集"><PencilIcon color="#059669"/></button>}
            {!readOnly && (confirmDelete
              ? <>
                  <button onClick={() => { onDelete(); onClose(); }} style={{background:"#ef4444", border:"none", borderRadius:6, cursor:"pointer", color:"#fff", fontSize:12, padding:"2px 8px", lineHeight:1.4, fontWeight:700}}>削除確認</button>
                  <button onClick={() => setConfirmDelete(false)} style={{background:"none", border:"1px solid #6a9a7a66", borderRadius:6, cursor:"pointer", color:"#6a9a7a", fontSize:12, padding:"2px 8px", lineHeight:1.4}}>キャンセル</button>
                </>
              : <button onClick={() => setConfirmDelete(true)} style={{background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:6, cursor:"pointer", color:"#ef4444", fontSize:12, padding:"3px 7px", display:"flex", alignItems:"center"}} title="削除"><TrashIcon color="#ef4444"/></button>
            )}
            <button onClick={onClose} style={{background:"none", border:"none", cursor:"pointer", color:"#6a9a7a", fontSize:16, flexShrink:0, lineHeight:1, padding:0, marginLeft:2}}>✕</button>
          </div>
        </div>
        {/* ステータス・情報チップ */}
        <div style={{display:"flex", gap:6, flexWrap:"wrap", marginTop:8, alignItems:"center"}}>
          <span style={{fontSize:11, fontWeight:700, color:sc, background:sc+"15", border:`1px solid ${sc}44`, borderRadius:8, padding:"2px 8px"}}>{lead.status||"新規"}</span>
          {lead.date && <span style={{fontSize:11, color:"#6a9a7a"}}>反響日：{lead.date}</span>}
          {lead.address && <span style={{fontSize:11, color:"#6a9a7a"}}>📍 {lead.address}</span>}
          {actions[0] && <span style={{fontSize:11, color:"#6a9a7a"}}>最終：{actions[0].date}{actions[0].time ? " "+actions[0].time : ""}</span>}
          {lead.source && (()=>{ const sc=getSourceColor(lead.source,0); return <span style={{fontSize:11, color:sc, background:sc+"1a", border:`1px solid ${sc}33`, borderRadius:6, padding:"1px 7px", fontWeight:600}}>📥 {lead.source}{lead.portal_site?" / "+lead.portal_site:""}</span>; })()}
          {lead.meeting_date && <span style={{fontSize:11, color:"#10b981", fontWeight:600}}>🤝 {lead.meeting_date}</span>}
          {lead.zoho_url && <a href={lead.zoho_url} target="_blank" rel="noopener noreferrer" style={{...S.zohoLinkSmall, fontSize:10, padding:"2px 8px"}}>🔗 Zoho</a>}
        </div>
        {/* ネクストアクション */}
        {(nad || lead.next_action) && (
          <div style={{marginTop:8, padding:"5px 8px", background: overdue?"#fef2f2":today?"#fff7ed":"#ffffff", borderRadius:6, border:`1px solid ${overdue?"#ef444466":today?"#f9731666":"#c0dece"}`, fontSize:12}}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:4}}>
              <div style={{display:"flex", alignItems:"center", flexWrap:"wrap", gap:4, minWidth:0}}>
                {overdue && <span style={{fontSize:10,background:"#ef4444",color:"#fff",borderRadius:4,padding:"1px 5px",fontWeight:700}}>期限切れ</span>}
                {today   && <span style={{fontSize:10,background:"#f97316",color:"#fff",borderRadius:4,padding:"1px 5px",fontWeight:700}}>本日</span>}
                {soon && !today && !overdue && <span style={{fontSize:10,background:"#f97316",color:"#fff",borderRadius:4,padding:"1px 5px",fontWeight:700}}>まもなく</span>}
                <span style={{color: overdue?"#dc2626":today?"#ea580c":"#059669"}}>→</span>
                {nad && <span style={{fontWeight:700, color: overdue?"#dc2626":today?"#ea580c":"#059669"}}>{nad}{lead.next_action_time ? " "+lead.next_action_time : ""}</span>}
              </div>
              {!readOnly && <NextActionEditBtn nad={nad} lead={lead} onUpdate={onUpdate} currentUser={currentUser} />}
            </div>
            {lead.next_action && (
              <div style={{color:"#174f35", marginTop:3, lineHeight:1.5, wordBreak:"break-word", whiteSpace:"pre-wrap", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden"}}>
                {lead.next_action}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zoho操作メッセージ */}
      {zohoMsg && (
        <div style={{padding:"6px 16px", background: zohoMsg.startsWith('✅') ? "#d1fae5" : "#fef2f2", borderBottom:"1px solid #e2f0e8", fontSize:12, fontWeight:700, color: zohoMsg.startsWith('✅') ? "#059669" : "#dc2626"}}>
          {zohoMsg}
        </div>
      )}

      {/* メモ */}
      {lead.memo && (
        <div style={{padding:"8px 16px", borderBottom:"1px solid #bae6fd", background:"#e0f2fe", display:"flex", alignItems:"flex-start", gap:6}}>
          <span style={{fontSize:12, color:"#0369a1", flexShrink:0, marginTop:1}}>📝</span>
          <span style={{fontSize:12, color:"#1e3a5f", lineHeight:1.6, wordBreak:"break-word"}}>{lead.memo}</span>
        </div>
      )}

      {/* アクション履歴本体 */}
      <div style={{padding:"12px 16px"}}>
        <div style={S.histHeader}>
          <span style={S.sectionLabel}>📋 アクション履歴（{actions.length}件）</span>
          {!readOnly && <button onClick={() => { setShowAF(v=>!v); setEditingAction(null); }} style={S.btnAddAct}>
            {showAF ? "✕ 閉じる" : "＋ 記録する"}
          </button>}
        </div>

        {!readOnly && showAF && (
          <ActionForm
            onSave={a => {
              const actionWithRecorder = { ...a, recorded_by: currentUser?.name || "" };
              const patch = { actions: [actionWithRecorder, ...(lead.actions || [])] };
              if (a.nextDate) { patch.next_action_date = a.nextDate; patch.next_action_time = a.nextTime||""; patch.next_action = a.next||""; }
              onUpdate(patch);
              setShowAF(false);
            }}
            onClose={() => setShowAF(false)} />
        )}

        {actions.length === 0 && !showAF
          ? <div style={S.noAct}>まだアクションがありません</div>
          : <div style={{display:"flex", flexDirection:"column", gap:5, marginTop: showAF ? 12 : 0}}>
              {[...actions].sort((a,b) => ((b.date||"")+(b.time||"")).localeCompare((a.date||"")+(a.time||""))).map((a,i) => (
                editingAction?.id === a.id
                  ? <ActionForm key={a.id} initial={a}
                      onSave={updated => { onEditAction(a.id, updated); setEditingAction(null); }}
                      onClose={() => setEditingAction(null)} />
                  : <ActEntry key={a.id||i} a={a} onEdit={() => setEditingAction(a)} onDelete={() => onDeleteAction(a.id)} readOnly={readOnly}
                      onPushZoho={lead.zoho_lead_id && zohoAuthenticated ? () => pushActionToZoho(a) : null}
                      zohoPushing={zohoPushingId === a.id} />
              ))}
            </div>
        }
      </div>
    </div>
  );
}
