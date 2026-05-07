// アクション履歴パネル（リード詳細 + アクション一覧 + Zoho連携）
import { useState } from 'react';
import { S } from '../../styles/index.js';
import { PencilIcon, TrashIcon, MailIcon, ExternalLinkIcon, ClipboardIcon, CheckCircleIcon, XCircleIcon, InfoIcon, MapPinIcon, InboxIcon, FileTextIcon } from '../ui/Icons.jsx';
import { ActionForm } from './ActionForm.jsx';
import { ActEntry } from './ActEntry.jsx';
import { DealActionBar } from './DealActionBar.jsx';
import { NextActionSection } from './NextActionSection.jsx';
import { getStatusColor, getSourceColor } from '../../lib/master.js';
import { isOverdue, isDueToday, isDueSoon } from '../../lib/holidays.js';
import { acquireCalendarToken } from '../../lib/oauth.js';
import { loadGCalConfig, createMeetingEvent } from '../../lib/gcal.js';
import { pushZohoAction } from '../../lib/zoho.js';
import { loadAccounts } from '../../lib/accounts.js';

export function ActionHistoryPanel({ lead, onClose, onUpdate, onEditAction, onDeleteAction, onEdit, onDelete, currentUser, readOnly }) {
  const [showAF, setShowAF] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [zohoMsg, setZohoMsg] = useState(null);
  const [zohoPushingId, setZohoPushingId] = useState(null);
  const [calToken, setCalToken] = useState(null);
  const [calMsg, setCalMsg] = useState(null);
  const [calLoading, setCalLoading] = useState(false);
  const [editingZohoId, setEditingZohoId] = useState(false);
  const [zohoIdInput, setZohoIdInput] = useState(lead.zoho_lead_id || '');
  const actions = lead.actions || [];

  const zohoAuthenticated = window.__appData?.zohoAuthenticated || false;

  const pushActionToZoho = async (action) => {
    if (!zohoAuthenticated) { alert('Zoho認証が必要です。設定 → Zoho CRM連携 から認証してください。'); return; }
    if (!lead.zoho_lead_id) { alert('このリードはZohoと連携されていません。\nZohoリードIDが設定されていないため同期できません。'); return; }
    setZohoPushingId(action.id);
    try {
      const { ok, data } = await pushZohoAction(lead.zoho_lead_id, action);
      if (ok && data.ok) {
        setZohoMsg({ text: 'アクション履歴をZohoに同期しました', ok: true });
      } else {
        setZohoMsg({ text: '同期失敗: ' + (data.error || '不明なエラー'), ok: false });
      }
    } catch (e) {
      setZohoMsg({ text: '通信エラー: ' + e.message, ok: false });
    } finally {
      setZohoPushingId(null);
      setTimeout(() => setZohoMsg(null), 5000);
    }
  };

  const addDealToCalendar = async () => {
    const aiCfg = window.__appData?.aiConfig || {};
    const clientId = currentUser?.gmailClientId || aiCfg.gmailClientId || "";
    if (!clientId) {
      alert(currentUser?.role === "admin"
        ? "設定 > APIキー設定 で Gmail Client ID を入力してください"
        : "管理者にGmail OAuth Client IDの設定を依頼してください");
      return;
    }
    setCalLoading(true);
    try {
      const tokenObj = await acquireCalendarToken(clientId, calToken);
      setCalToken(tokenObj);
      const token = tokenObj.token;
      const gcalCfg = loadGCalConfig();
      const calendarIds = { ...(gcalCfg.calendarIds || {}) };
      loadAccounts().forEach(a => { if (a.calendarId) calendarIds[a.name] = a.calendarId; });
      const attendees = [];
      if (lead.sales_member && calendarIds[lead.sales_member]) {
        attendees.push({ email: calendarIds[lead.sales_member] });
      }
      const startTime = lead.meeting_time || "09:00";
      const [sh, sm] = startTime.split(":").map(Number);
      const totalMin = sh * 60 + sm + 90;
      const endTime = `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
      try {
        await createMeetingEvent(token, `WEB営1）【${lead.company || ""}様】`, lead.meeting_date, startTime, endTime, attendees);
      } catch (e) {
        if (e.message === '__AUTH_EXPIRED__') { setCalToken(null); throw new Error("認証の期限が切れました。再度お試しください。"); }
        throw e;
      }
      const noGuest = lead.sales_member && !calendarIds[lead.sales_member];
      setCalMsg({
        text: noGuest
          ? `カレンダーに登録しました（${lead.sales_member}のカレンダーIDが未設定のためゲスト追加なし）`
          : `Googleカレンダーに登録しました${lead.sales_member ? `（${lead.sales_member}をゲスト追加）` : ""}`,
        ok: noGuest ? null : true,
      });
    } catch (e) {
      setCalMsg({ text: e.message, ok: false });
    } finally {
      setCalLoading(false);
      setTimeout(() => setCalMsg(null), 6000);
    }
  };

  const sc = getStatusColor(lead.status);
  const nad = lead.next_action_date;
  const overdue = isOverdue(nad);
  const today   = isDueToday(nad);
  const soon    = isDueSoon(nad);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* パネルヘッダー：リード情報 */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2f0e8", background: "#f0faf5", borderRadius: "12px 12px 0 0", position: "sticky", top: 0, zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#174f35", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.company}</div>
            {(lead.contact || lead.email || lead.address) && (
              <div style={{ fontSize: 11, color: "#6a9a7a", marginTop: 2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {lead.contact && <span>{lead.contact}</span>}
                {lead.email && <a href={`mailto:${lead.email}`} style={{ color: "#0ea5e9", textDecoration: "none", display:"flex", alignItems:"center", gap:3 }}><MailIcon size={11} color="#0ea5e9" /> {lead.email}</a>}
                {lead.address && <span style={{ display:"flex", alignItems:"center", gap:3 }}><MapPinIcon size={11} color="#6a9a7a" /> {lead.address}</span>}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, flexWrap: "wrap" }}>
            {!readOnly && <button onClick={onEdit} style={{ background:"none", border:"none", cursor:"pointer", padding:"4px", display:"flex", alignItems:"center" }} title="編集"><PencilIcon size={18} color="#059669" /></button>}
            {!readOnly && (confirmDelete
              ? <>
                  <button onClick={() => { onDelete(); onClose(); }} style={{ background: "#ef4444", border: "none", borderRadius: 6, cursor: "pointer", color: "#fff", fontSize: 12, padding: "2px 8px", lineHeight: 1.4, fontWeight: 700 }}>削除確認</button>
                  <button onClick={() => setConfirmDelete(false)} style={{ background: "none", border: "1px solid #6a9a7a66", borderRadius: 6, cursor: "pointer", color: "#6a9a7a", fontSize: 12, padding: "2px 8px", lineHeight: 1.4 }}>キャンセル</button>
                </>
              : <button onClick={() => setConfirmDelete(true)} style={{ background:"none", border:"none", cursor:"pointer", padding:"4px", display:"flex", alignItems:"center" }} title="削除"><TrashIcon size={18} color="#ef4444" /></button>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6a9a7a", fontSize: 16, flexShrink: 0, lineHeight: 1, padding: 0, marginLeft: 2 }}>✕</button>
          </div>
        </div>
        {/* ステータス・情報チップ */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: sc, background: sc + "15", border: `1px solid ${sc}44`, borderRadius: 8, padding: "2px 8px" }}>{lead.status || "新規"}</span>
          {lead.date && <span style={{ fontSize: 11, color: "#6a9a7a" }}>反響日：{lead.date}</span>}
          {actions[0] && <span style={{ fontSize: 11, color: "#6a9a7a" }}>最終：{actions[0].date}{actions[0].time ? " " + actions[0].time : ""}</span>}
          {lead.source && (() => {
            const srcColor = getSourceColor(lead.source, 0);
            return <span style={{ fontSize: 11, color: srcColor, background: srcColor + "1a", border: `1px solid ${srcColor}33`, borderRadius: 6, padding: "1px 7px", fontWeight: 600, display:"flex", alignItems:"center", gap:3 }}><InboxIcon size={11} color={srcColor} /> {lead.source}{lead.portal_site ? " / " + lead.portal_site : ""}</span>;
          })()}
          {lead.zoho_url && <a href={lead.zoho_url} target="_blank" rel="noopener noreferrer" style={{ ...S.zohoLinkSmall, fontSize: 10, padding: "2px 8px", display:"flex", alignItems:"center", gap:3 }}><ExternalLinkIcon size={10} color="#0284c7" /> Zoho</a>}
          {!readOnly && !editingZohoId && !lead.zoho_lead_id && (
            <button onClick={() => setEditingZohoId(true)}
              style={{ fontSize: 10, padding: "2px 8px", background: "none", border: "1px solid #0284c766", borderRadius: 6, cursor: "pointer", color: "#0284c7", fontWeight: 600 }}>
              + Zoho ID
            </button>
          )}
          {!readOnly && !editingZohoId && lead.zoho_lead_id && (
            <button onClick={() => { setZohoIdInput(lead.zoho_lead_id); setEditingZohoId(true); }}
              style={{ fontSize: 10, padding: "2px 8px", background: "#e0f2fe", border: "1px solid #7dd3fc", borderRadius: 6, cursor: "pointer", color: "#0284c7", fontWeight: 600, display:"flex", alignItems:"center", gap:3 }}>
              <ExternalLinkIcon size={9} color="#0284c7" /> Zoho連携済
            </button>
          )}
          {!readOnly && editingZohoId && (
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <input
                value={zohoIdInput}
                onChange={e => setZohoIdInput(e.target.value.trim())}
                placeholder="Zoho Lead ID（URLの数字）"
                style={{ ...S.inp, fontSize: 11, padding: "2px 6px", width: 160 }}
              />
              <button onClick={() => setEditingZohoId(false)} style={S.btnCancelXs}>✕</button>
              <button onClick={() => {
                if (!zohoIdInput) return;
                const dc = window.__appData?.zohoConfig?.dataCenter || 'jp';
                const domain = dc === 'com' ? 'zoho.com' : 'zoho.jp';
                const zohoUrl = `https://crm.${domain}/crm/tab/Leads/${zohoIdInput}`;
                onUpdate({ zoho_lead_id: zohoIdInput, zoho_url: lead.zoho_url || zohoUrl });
                setEditingZohoId(false);
              }} style={{ ...S.btnDelXs, background: "#0284c7" }}>保存</button>
            </div>
          )}
        </div>
        <DealActionBar lead={lead} calLoading={calLoading} onAddDealToCalendar={addDealToCalendar} readOnly={readOnly} />
        <NextActionSection lead={lead} overdue={overdue} today={today} soon={soon} readOnly={readOnly} onUpdate={onUpdate} currentUser={currentUser} />
      </div>

      {/* カレンダー登録メッセージ */}
      {calMsg && (
        <div style={{ padding: "6px 16px", background: calMsg.ok === true ? "#d1fae5" : calMsg.ok === null ? "#f0f9ff" : "#fef2f2", borderBottom: "1px solid #e2f0e8", fontSize: 12, fontWeight: 700, color: calMsg.ok === true ? "#059669" : calMsg.ok === null ? "#0284c7" : "#dc2626", display:"flex", alignItems:"center", gap:5 }}>
          {calMsg.ok === true ? <CheckCircleIcon size={12} color="#059669" /> : calMsg.ok === null ? <InfoIcon size={12} color="#0284c7" /> : <XCircleIcon size={12} color="#dc2626" />}
          {calMsg.text}
        </div>
      )}
      {/* Zoho操作メッセージ */}
      {zohoMsg && (
        <div style={{ padding: "6px 16px", background: zohoMsg.ok === true ? "#d1fae5" : zohoMsg.ok === null ? "#f0f9ff" : "#fef2f2", borderBottom: "1px solid #e2f0e8", fontSize: 12, fontWeight: 700, color: zohoMsg.ok === true ? "#059669" : zohoMsg.ok === null ? "#0284c7" : "#dc2626", display:"flex", alignItems:"center", gap:5 }}>
          {zohoMsg.ok === true ? <CheckCircleIcon size={12} color="#059669" /> : zohoMsg.ok === null ? <InfoIcon size={12} color="#0284c7" /> : <XCircleIcon size={12} color="#dc2626" />}
          {zohoMsg.text}
        </div>
      )}

      {/* メモ */}
      {lead.memo && (
        <div style={{ padding: "8px 16px", borderBottom: "1px solid #bae6fd", background: "#e0f2fe", display: "flex", alignItems: "flex-start", gap: 6 }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}><FileTextIcon size={13} color="#0369a1" /></span>
          <span style={{ fontSize: 12, color: "#1e3a5f", lineHeight: 1.6, wordBreak: "break-word" }}>{lead.memo}</span>
        </div>
      )}

      {/* アクション履歴本体 */}
      <div style={{ padding: "12px 16px" }}>
        <div style={S.histHeader}>
          <span style={{...S.sectionLabel, display:"flex", alignItems:"center", gap:5}}><ClipboardIcon size={12} color="#6a9a7a" /> アクション履歴（{actions.length}件）</span>
          {!readOnly && (
            <button onClick={() => { setShowAF(v => !v); setEditingAction(null); }} style={S.btnAddAct}>
              {showAF ? "✕ 閉じる" : "＋ 記録する"}
            </button>
          )}
        </div>

        {!readOnly && showAF && (
          <ActionForm
            onSave={a => {
              const actionWithRecorder = { ...a, recorded_by: currentUser?.name || "" };
              const patch = { actions: [actionWithRecorder, ...(lead.actions || [])] };
              if (a.nextDate) { patch.next_action_date = a.nextDate; patch.next_action_time = a.nextTime || ""; patch.next_action = a.next || ""; patch.google_task_registered = false; }
              onUpdate(patch);
              setShowAF(false);
            }}
            onClose={() => setShowAF(false)} />
        )}

        {actions.length === 0 && !showAF
          ? <div style={S.noAct}>まだアクションがありません</div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: showAF ? 12 : 0 }}>
              {[...actions].sort((a, b) => ((b.date || "") + (b.time || "")).localeCompare((a.date || "") + (a.time || ""))).map((a, i) => (
                editingAction?.id === a.id
                  ? <ActionForm key={a.id} initial={a}
                      onSave={updated => { onEditAction(a.id, updated); setEditingAction(null); }}
                      onClose={() => setEditingAction(null)} />
                  : <ActEntry key={a.id || i} a={a} onEdit={() => setEditingAction(a)} onDelete={() => onDeleteAction(a.id)} readOnly={readOnly}
                      onPushZoho={lead.zoho_lead_id && zohoAuthenticated ? () => pushActionToZoho(a) : null}
                      zohoPushing={zohoPushingId === a.id} />
              ))}
            </div>
        }
      </div>
    </div>
  );
}
