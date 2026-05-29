// リード一覧ページ（フィルター・ソート・インポート・アクション履歴パネル）
import { useState, useEffect, useRef } from 'react';
import { S } from '../styles/index.js';
import { Header } from '../components/ui/Layout.jsx';
import { CSVImport } from '../components/leads/CSVImport.jsx';
import { LeadRow } from '../components/leads/LeadRow.jsx';
import { LeadForm } from '../components/leads/LeadForm.jsx';
import { LeadFilterBar } from '../components/leads/LeadFilterBar.jsx';
import { ZohoImportPanel } from '../components/leads/ZohoImportPanel.jsx';
import { InboundAppointmentList } from '../components/leads/InboundAppointmentList.jsx';
import { ActionHistoryPanel } from '../components/actions/ActionHistoryPanel.jsx';
import { TODAY } from '../lib/holidays.js';
import { normalizeDate } from '../lib/date.js';
import { uid } from '../constants/index.js';
import { getStatuses } from '../lib/master.js';
import { ExternalLinkIcon, UploadIcon, InboxIcon, UsersIcon } from '../components/ui/Icons.jsx';
import { updateZohoLeadStatus } from '../lib/zoho.js';
import { Pagination } from '../components/ui/Pagination.jsx';
import { Toast } from '../components/ui/Toast.jsx';

export function LeadsPage({ leads, onAdd, onUpdate, onDelete, onAddAction, onBulkAdd, onReplaceFromServer, initialFilter, onFilterConsumed, initialOpenId, onOpenIdConsumed, currentUser, readOnly, isMobile, onGoToZohoSettings }) {
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showZohoImport, setShowZohoImport] = useState(false);
  const [fStatuses, setFStatuses] = useState(() => new Set(getStatuses()));
  const [fSource, setFSrc] = useState("");
  const [fPortal, setFPortal] = useState("");
  const [fMonth, setFMonth] = useState("");
  const [fNextAction, setFNextAction] = useState("");
  const [fIS, setFIS] = useState("");
  const [fQ, setFQ] = useState("");
  const [fHasPortal, setFHasPortal] = useState(false);
  const [fMql, setFMql] = useState(false);
  const [sort, setSort] = useState("fixed");
  const [sortDir, setSortDir] = useState("asc");
  const [openId, setOpenId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  // タブ：'all' = 全リスト / 'appointments' = アポ一覧（status===商談確定のみ）
  // role==='outbound' のユーザーには「アポ一覧」タブは表示しない
  const [view, setView] = useState('all');
  const canSeeAppointments = currentUser?.role !== 'outbound';

  const showToast = (message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const handleDeleteLead = (id) => {
    onDelete(id);
    showToast('リードを削除しました');
  };

  useEffect(() => {
    if (!initialFilter) return;
    if (initialFilter.month)          setFMonth(initialFilter.month);
    if (initialFilter.source)         setFSrc(initialFilter.source);
    if (initialFilter.statuses)       setFStatuses(new Set(initialFilter.statuses));
    if (initialFilter.nextActionDate) setFNextAction("today");
    if (initialFilter.hasPortal)      setFHasPortal(true);
    onFilterConsumed && onFilterConsumed();
  }, [initialFilter]);

  useEffect(() => {
    if (!initialOpenId) return;
    setOpenId(initialOpenId);
    onOpenIdConsumed && onOpenIdConsumed();
  }, [initialOpenId]);

  // フィルター・ソート変更時はページ1に戻す
  useEffect(() => { setPage(1); }, [fStatuses, fSource, fPortal, fMonth, fNextAction, fIS, fQ, fHasPortal, fMql, sort, sortDir]);

  const STATUS_ORDER_FIXED = Object.fromEntries(getStatuses().map((s, i) => [s, i]));

  const list = leads
    .filter(l => fStatuses.has(l.status))
    .filter(l => {
      if (!fMonth) return true;
      const s = l.date||""; let ym = s.slice(0,7);
      if (!/^\d{4}-\d{2}$/.test(ym)) { const m = s.match(/^(\d{4})[\/-](\d{1,2})/); ym = m ? m[1]+"-"+m[2].padStart(2,"0") : ""; }
      return ym === fMonth;
    })
    .filter(l => !fNextAction || (fNextAction==="today" ? (l.next_action_date && l.next_action_date<=TODAY) : l.next_action_date&&l.next_action_date<TODAY))
    .filter(l => !fSource || l.source === fSource)
    .filter(l => !fHasPortal || !!l.portal_site)
    .filter(l => !fPortal || l.portal_site === fPortal)
    .filter(l => !fIS || l.is_member === fIS)
    .filter(l => !fMql || (l.mql||"").trim() === "MQL")
    .filter(l => !fQ || [l.company, l.contact].join(" ").includes(fQ))
    .sort((a, b) => {
      if (sort === "date") {
        const da = normalizeDate(a.date), db = normalizeDate(b.date);
        return sortDir === "asc" ? (da > db ? 1 : -1) : (da < db ? 1 : -1);
      }
      if (sort === "nextAction") {
        const da = a.next_action_date||"9999", db = b.next_action_date||"9999";
        return sortDir === "asc" ? (da > db ? 1 : -1) : (da < db ? 1 : -1);
      }
      const toDay = ts => ts ? new Date(ts).toLocaleDateString('sv',{timeZone:'Asia/Tokyo'}) : null;
      const aIsNew = toDay(a.created_at) === TODAY && (!a.actions || a.actions.length === 0);
      const bIsNew = toDay(b.created_at) === TODAY && (!b.actions || b.actions.length === 0);
      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;
      const da = a.next_action_date||"", db = b.next_action_date||"";
      if (da && !db) return -1;
      if (!da && db) return 1;
      if (da !== db) return da < db ? -1 : 1;
      const sa = STATUS_ORDER_FIXED[a.status]??99, sb = STATUS_ORDER_FIXED[b.status]??99;
      if (sa !== sb) return sa - sb;
      const ra = normalizeDate(a.date)||"9999", rb = normalizeDate(b.date)||"9999";
      return ra < rb ? -1 : ra > rb ? 1 : 0;
    });

  const totalPages = Math.ceil(list.length / pageSize);
  const paged = list.slice((page - 1) * pageSize, page * pageSize);

  // アポ一覧（status==='商談確定'）のリードのみ
  const appointmentLeads = leads.filter(l => l.status === '商談確定');

  const selectedLead = openId ? leads.find(l => l.id === openId) : null;

  const handleEditAction = (lead, aid, updated) => {
    const newActions = (lead.actions||[]).map(a => a.id === aid ? { ...a, ...updated } : a);
    const patch = { actions: newActions };
    if (updated.nextDate) { patch.next_action_date = updated.nextDate; patch.next_action_time = updated.nextTime||""; patch.next_action = updated.next||""; patch.google_task_registered = false; }
    onUpdate(lead.id, patch);
  };

  const handleDeleteAction = (lead, aid) => {
    const remaining = (lead.actions||[]).filter(a => a.id !== aid);
    const patch = { actions: remaining };
    if (remaining.length === 0) { patch.next_action = ""; patch.next_action_date = ""; patch.next_action_time = ""; }
    else { const latest = remaining.find(a => a.nextDate); if (!latest) { patch.next_action = ""; patch.next_action_date = ""; patch.next_action_time = ""; } }
    onUpdate(lead.id, patch);
  };

  const exportCSV = () => {
    const headers = ["会社名","担当者名","反響日","流入元","ポータルサイト名","ポータル種別","課金対象外申請済","ステータス","IS担当","MQL判定","商談日","商談時刻","担当営業","Zoho CRM URL","HP URL","IS確度","ネクストアクション日","ネクストアクション時刻","ネクストアクションメモ"];
    const rows = leads.map(l => [l.company,l.contact,l.date,l.source,l.portal_site||"",l.portal_type||"",l.charge_applied?"TRUE":"FALSE",l.status,l.is_member||"",l.mql||"非MQL",l.meeting_date||"",l.meeting_time||"",l.sales_member||"",l.zoho_url||"",l.hp_url||"",l.is_accuracy||"",l.next_action_date||"",l.next_action_time||"",l.next_action||""].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
    const csv = "﻿" + headers.join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="is_leads_"+TODAY+".csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="lead-list-container" style={{paddingLeft:28, paddingRight:28, height: isMobile ? "auto" : "100%", overflow: isMobile ? "visible" : "hidden", display:"flex", flexDirection:"column", minHeight: isMobile ? "calc(100vh - 130px)" : undefined}}>
      <div className="page-pad" style={{flexShrink:0, background:"#f0f5f2", paddingTop:24, paddingBottom:8, marginLeft:-28, marginRight:-28, paddingLeft:28, paddingRight:28, borderBottom:"1px solid #d8ede1"}}>
        <Header
          title={
            <span style={{display:"flex",alignItems:"center",gap:7}}>
              <UsersIcon size={20} color="#174f35" /> {view === 'appointments' ? 'アポ一覧' : 'リード一覧'}
            </span>
          }
          sub={
            view === 'appointments'
              ? `商談確定 ${appointmentLeads.length}件`
              : `全 ${leads.length}件 / フィルター後 ${list.length}件`
          }
        >
          {view === 'all' && (
            <div className="lead-header-actions" style={{display:"flex", gap:8}}>
              <button onClick={exportCSV} style={{...S.btnSec, display:"flex", alignItems:"center", gap:4}}><UploadIcon size={12} color="#6a9a7a" /> CSVエクスポート</button>
              {!readOnly && <button onClick={() => { setShowImport(v=>!v); setImportResult(null); }} style={{...S.btnSec, display:"flex", alignItems:"center", gap:4}}><InboxIcon size={12} color="#6a9a7a" /> CSVインポート</button>}
              {!readOnly && window.__appData?.zohoAuthenticated && (
                <button onClick={() => setShowZohoImport(v=>!v)} style={{...S.btnSec, display:"flex", alignItems:"center", gap:4}}><ExternalLinkIcon size={12} color="#6a9a7a" /> Zohoから取込</button>
              )}
              {!readOnly && <button onClick={() => { setEditing(null); setShowForm(true); }} style={{...S.btnP, background:"linear-gradient(135deg,#f97316,#ea580c)"}}>＋ 新規追加</button>}
            </div>
          )}
        </Header>

        {/* タブ切替：role==='outbound' は非表示 */}
        {canSeeAppointments && (
          <div style={{ display: 'flex', gap: 4, marginTop: 12, borderBottom: '2px solid #e2f0e8' }}>
            {[
              { key: 'all',          label: '全リスト' },
              { key: 'appointments', label: 'アポ一覧' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setView(key); setOpenId(null); }}
                style={{
                  padding: '8px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  cursor: 'pointer', border: 'none', background: 'none',
                  borderBottom: view === key ? '2px solid #059669' : '2px solid transparent',
                  color: view === key ? '#059669' : '#6a9a7a',
                  marginBottom: -2, transition: 'color 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Zoho未認証バナー */}
        {!readOnly && window.__appData?.zohoConfig?.clientId && !window.__appData?.zohoAuthenticated && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8, padding:"6px 10px", background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:6, fontSize:12 }}>
            <span style={{ color:"#c2410c", fontWeight:700 }}>⚠ Zoho再認証が必要です</span>
            {currentUser?.role === "admin" && (
              <button onClick={onGoToZohoSettings} style={{ fontSize:11, padding:"2px 10px", background:"#ea580c", border:"none", borderRadius:5, color:"#fff", fontWeight:700, cursor:"pointer" }}>
                設定へ
              </button>
            )}
          </div>
        )}

        {/* Zoho手動取込パネル */}
        {showZohoImport && !readOnly && (
          <ZohoImportPanel onAdd={lead => { onAdd(lead); showToast(`「${lead.company || lead.contact}」を取込みました`); setEditing(lead); setShowForm(true); }} onClose={() => setShowZohoImport(false)} />
        )}

        {/* フィルターバー：全リストタブのみ表示（アポ一覧タブは独自フィルターを持つ） */}
        {view === 'all' && (
          <LeadFilterBar
            fQ={fQ} setFQ={setFQ} fSource={fSource} setFSrc={setFSrc}
            fPortal={fPortal} setFPortal={setFPortal} fMonth={fMonth} setFMonth={setFMonth}
            fNextAction={fNextAction} setFNextAction={setFNextAction}
            fIS={fIS} setFIS={setFIS} fHasPortal={fHasPortal} setFHasPortal={setFHasPortal}
            fMql={fMql} setFMql={setFMql} fStatuses={fStatuses} setFStatuses={setFStatuses}
            sort={sort} setSort={setSort} sortDir={sortDir} setSortDir={setSortDir}
            leads={leads} isMobile={isMobile}
          />
        )}
      </div>

      {showImport && (
        <CSVImport
          onImport={newLeads => { onBulkAdd(newLeads); setImportResult({ count: newLeads.length }); showToast(`${newLeads.length}件のリードを取込みました`); }}
          onClose={() => setShowImport(false)}
          result={importResult}
        />
      )}

      <div style={{display:"flex", gap:12, marginTop:16, flex:1, minHeight:0, overflow: isMobile ? "visible" : "hidden"}}>
        {/* 左側：リード一覧 or アポ一覧 */}
        <div style={{
          flex: isMobile ? "none" : (view === 'appointments' && !selectedLead ? "1 1 100%" : "0 0 50%"),
          width: isMobile ? "100%" : (view === 'appointments' && !selectedLead ? "100%" : "50%"),
          overflowY:"auto",
        }}>
          {view === 'appointments' ? (
            <InboundAppointmentList
              leads={appointmentLeads}
              openId={openId}
              setOpenId={setOpenId}
              isMobile={isMobile}
              onSyncResult={(updatedLeads) => {
                // サーバーから返ってきた更新後のリード配列を親stateに反映
                // （サーバー側で既に保存済みなので、追加の保存処理は不要）
                if (onReplaceFromServer) onReplaceFromServer(updatedLeads);
                showToast('Zoho同期が完了しました');
              }}
            />
          ) : (
            <>
              <div style={{display:"flex", flexDirection:"column", gap:10}}>
                {list.length === 0 && <div style={{...S.empty, padding:"32px"}}>リードがありません</div>}
                {paged.map(lead => (
                  <LeadRow key={lead.id} lead={lead} openId={openId} setOpenId={setOpenId}
                    onEdit={readOnly ? null : () => { setEditing(lead); setShowForm(true); }}
                    onDelete={readOnly ? null : () => handleDeleteLead(lead.id)}
                    readOnly={readOnly}
                    currentUser={currentUser}
                    onStatusChange={s => {
                      const patch = { status: s };
                      if (lead.status === "商談確定" && s !== "商談確定") {
                        patch.meeting_date = ""; patch.meeting_time = ""; patch.sales_member = "";
                      }
                      onUpdate(lead.id, patch);
                      if (lead.zoho_lead_id && window.__appData?.zohoAuthenticated) {
                        updateZohoLeadStatus(lead.zoho_lead_id, s);
                      }
                    }}
                    onUpdate={p => onUpdate(lead.id, p)}
                  />
                ))}
              </div>
              <Pagination
                page={page} totalPages={totalPages} total={list.length} pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={n => { setPageSize(n); setPage(1); }}
              />
            </>
          )}
        </div>

        {/* デスクトップ: 右パネル */}
        {!isMobile && selectedLead && (
          <div style={{flex:1, minWidth:0, background:"#fff", border:"1px solid #e2f0e8", borderRadius:12, boxShadow:"0 2px 12px #0569690a", overflow:"hidden", height:"100%", overflowY:"auto"}}>
            <ActionHistoryPanel key={selectedLead.id} lead={selectedLead}
              onClose={() => setOpenId(null)}
              onUpdate={p => onUpdate(selectedLead.id, p)}
              onEdit={readOnly ? null : () => { setEditing(selectedLead); setShowForm(true); }}
              onDelete={readOnly ? null : () => { handleDeleteLead(selectedLead.id); setOpenId(null); }}
              currentUser={currentUser} readOnly={readOnly}
              onEditAction={(aid, updated) => handleEditAction(selectedLead, aid, updated)}
              onDeleteAction={aid => handleDeleteAction(selectedLead, aid)}
              hideConsultInfo
            />
          </div>
        )}
      </div>

      {/* モバイル: アクション履歴オーバーレイ */}
      {isMobile && selectedLead && (
        <div style={{position:"fixed", inset:0, zIndex:500, background:"#000000bb", display:"flex", flexDirection:"column", justifyContent:"flex-end"}} onClick={() => setOpenId(null)}>
          <div style={{background:"#fff", borderRadius:"16px 16px 0 0", maxHeight:"85vh", display:"flex", flexDirection:"column", overflowY:"auto", paddingBottom:65}} onClick={e => e.stopPropagation()}>
            <ActionHistoryPanel key={selectedLead.id} lead={selectedLead}
              onClose={() => setOpenId(null)}
              onUpdate={p => onUpdate(selectedLead.id, p)}
              onEdit={readOnly ? null : () => { setEditing(selectedLead); setShowForm(true); }}
              onDelete={readOnly ? null : () => { handleDeleteLead(selectedLead.id); setOpenId(null); }}
              currentUser={currentUser} readOnly={readOnly}
              onEditAction={(aid, updated) => handleEditAction(selectedLead, aid, updated)}
              onDeleteAction={aid => handleDeleteAction(selectedLead, aid)}
              hideConsultInfo
            />
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}

      {showForm && (
        <LeadForm initial={editing}
          onSave={d => {
            editing ? onUpdate(editing.id, d) : onAdd({ id: uid(), date: TODAY, actions: [], created_at: Date.now(), ...d });
            if (editing && editing.zoho_lead_id && d.status !== editing.status && window.__appData?.zohoAuthenticated) {
              updateZohoLeadStatus(editing.zoho_lead_id, d.status);
            }
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
