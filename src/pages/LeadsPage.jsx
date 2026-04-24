// リード一覧ページ（フィルター・ソート・インポート・アクション履歴パネル）
import { useState, useEffect, useRef } from 'react';
import { S } from '../styles/index.js';
import { Header } from '../components/ui/Layout.jsx';
import { CSVImport } from '../components/leads/CSVImport.jsx';
import { LeadRow } from '../components/leads/LeadRow.jsx';
import { LeadForm } from '../components/leads/LeadForm.jsx';
import { ZohoImportPanel } from '../components/leads/ZohoImportPanel.jsx';
import { ActionHistoryPanel } from '../components/actions/ActionHistoryPanel.jsx';
import { TODAY } from '../lib/holidays.js';
import { uid } from '../constants/index.js';
import {
  getSources, getStatuses, getStatusColor, getISMembers,
  getPortalSitesForSource, sourceHasPortal,
} from '../lib/master.js';
import { FlameIcon, ExternalLinkIcon, UploadIcon, InboxIcon, BuildingIcon } from '../components/ui/Icons.jsx';

export function LeadsPage({ leads, onAdd, onUpdate, onDelete, onAddAction, onBulkAdd, initialFilter, onFilterConsumed, initialOpenId, onOpenIdConsumed, currentUser, readOnly, isMobile }) {
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showZohoImport, setShowZohoImport] = useState(false);
  const [fStatuses, setFStatuses] = useState(new Set());
  const [fSource, setFSrc] = useState("");
  const [fPortal, setFPortal] = useState("");
  const [fMonth, setFMonth] = useState("");
  const [fNextAction, setFNextAction] = useState("");
  const [fIS, setFIS] = useState("");
  const [fQ, setFQ] = useState("");
  const [fHasPortal, setFHasPortal] = useState(false);
  const [sort, setSort] = useState("fixed");
  const [sortDir, setSortDir] = useState("asc");
  const [openId, setOpenId] = useState(null);

  const zohoIdMigrated = useRef(false);
  useEffect(() => {
    if (zohoIdMigrated.current || leads.length === 0) return;
    zohoIdMigrated.current = true;
    leads.forEach(l => {
      if (!l.zoho_lead_id && l.zoho_url) {
        const id = l.zoho_url.match(/\/(\d+)\/?$/)?.[1];
        if (id) onUpdate(l.id, { zoho_lead_id: id });
      }
    });
  }, [leads.length]);

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

  const STATUS_ORDER_FIXED = Object.fromEntries(getStatuses().map((s, i) => [s, i]));

  const normDate = s => {
    if (!s) return "";
    const m = s.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
    return m ? `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}` : s;
  };

  const list = leads
    .filter(l => fStatuses.size === 0 || fStatuses.has(l.status))
    .filter(l => {
      if (!fMonth) return true;
      const s = l.date||""; let ym = s.slice(0,7);
      if (!/^\d{4}-\d{2}$/.test(ym)) { const m = s.match(/^(\d{4})[\/-](\d{1,2})/); ym = m ? m[1]+"-"+m[2].padStart(2,"0") : ""; }
      return ym === fMonth;
    })
    .filter(l => !fNextAction || (fNextAction==="today" ? l.next_action_date===TODAY : l.next_action_date&&l.next_action_date<TODAY))
    .filter(l => !fSource || l.source === fSource)
    .filter(l => !fHasPortal || !!l.portal_site)
    .filter(l => !fPortal || l.portal_site === fPortal)
    .filter(l => !fIS || l.is_member === fIS)
    .filter(l => !fQ || [l.company, l.contact].join(" ").includes(fQ))
    .sort((a, b) => {
      if (sort === "date") {
        const da = normDate(a.date), db = normDate(b.date);
        return sortDir === "asc" ? (da > db ? 1 : -1) : (da < db ? 1 : -1);
      }
      if (sort === "nextAction") {
        const da = a.next_action_date||"9999", db = b.next_action_date||"9999";
        return sortDir === "asc" ? (da > db ? 1 : -1) : (da < db ? 1 : -1);
      }
      const toDay = ts => ts ? new Date(ts).toISOString().split("T")[0] : null;
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
      const ra = normDate(a.date)||"9999", rb = normDate(b.date)||"9999";
      return ra < rb ? -1 : ra > rb ? 1 : 0;
    });

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
        <Header title="リード一覧" sub={`${leads.length}件 / 表示 ${list.length}件`}>
          <div className="lead-header-actions" style={{display:"flex", gap:8}}>
            <button onClick={exportCSV} style={{...S.btnSec, display:"flex", alignItems:"center", gap:4}}><UploadIcon size={12} color="#6a9a7a" /> CSVエクスポート</button>
            {!readOnly && <button onClick={() => { setShowImport(v=>!v); setImportResult(null); }} style={{...S.btnSec, display:"flex", alignItems:"center", gap:4}}><InboxIcon size={12} color="#6a9a7a" /> CSVインポート</button>}
            {!readOnly && window.__appData?.zohoAuthenticated && (
              <button onClick={() => setShowZohoImport(v=>!v)} style={{...S.btnSec, display:"flex", alignItems:"center", gap:4}}><ExternalLinkIcon size={12} color="#6a9a7a" /> Zohoから取込</button>
            )}
            {!readOnly && <button onClick={() => { setEditing(null); setShowForm(true); }} style={{...S.btnP, background:"linear-gradient(135deg,#f97316,#ea580c)"}}>＋ 新規追加</button>}
          </div>
        </Header>

        {/* Zoho手動取込パネル */}
        {showZohoImport && !readOnly && (
          <ZohoImportPanel onAdd={onAdd} onClose={() => setShowZohoImport(false)} />
        )}

        {/* フィルター 1行目 */}
        <div className="filter-bar" style={{display:"flex", gap:8, marginBottom:6, alignItems:"center"}}>
          <input value={fQ} onChange={e => setFQ(e.target.value)}
            placeholder="会社名・担当者" style={{...S.sel, width:220, flexShrink:0}} />
          <select value={fSource} onChange={e => { setFSrc(e.target.value); setFPortal(""); }} style={{...S.sel, flexShrink:0}}>
            <option value="">全流入元</option>
            {getSources().map(s => <option key={s}>{s}</option>)}
          </select>
          {fHasPortal && (
            <button onClick={() => setFHasPortal(false)} style={{fontSize:11,padding:"3px 9px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",flexShrink:0, background:"#8b5cf633", color:"#7c3aed", border:"1px solid #8b5cf666", fontWeight:700, display:"flex", alignItems:"center", gap:4}}><BuildingIcon size={11} color="#7c3aed" /> ポータル ✕</button>
          )}
          {sourceHasPortal(fSource) && (
            <select value={fPortal} onChange={e => setFPortal(e.target.value)} style={{...S.sel, flexShrink:0}}>
              <option value="">全サイト</option>
              {getPortalSitesForSource(fSource).map(p => <option key={p}>{p}</option>)}
            </select>
          )}
          <select value={fMonth} onChange={e => setFMonth(e.target.value)} style={{...S.sel, flexShrink:0}}>
            <option value="">全期間</option>
            {[...new Set(leads.map(l => {
              const s = l.date||"";
              if (/^\d{4}-\d{2}/.test(s)) return s.slice(0,7);
              const m = s.match(/^(\d{4})[\/-](\d{1,2})/);
              return m ? m[1]+"-"+m[2].padStart(2,"0") : "";
            }).filter(Boolean))].sort().reverse().map(m => <option key={m} value={m}>{m.slice(0,4)}年{parseInt(m.slice(5))}月</option>)}
          </select>
          <select value={fIS} onChange={e => setFIS(e.target.value)} style={{...S.sel, flexShrink:0}}>
            <option value="">全IS担当</option>
            {getISMembers().map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        {/* フィルター 2行目：並び順＋ステータス */}
        <div className="filter-bar" style={{display:"flex", gap:4, alignItems:"center", marginBottom:16, flexWrap: isMobile ? "wrap" : "nowrap"}}>
          <span style={{fontSize:11, color:"#6a9a7a", flexShrink:0}}>並び順:</span>
          {[["fixed","標準"],["date","反響日"],["nextAction","追客日"]].map(([v, label]) => (
            <button key={v} onClick={() => {
              if (sort === v) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
              else { setSort(v); setSortDir("asc"); }
            }} style={{fontSize:11,padding:"4px 10px",borderRadius:8,cursor:"pointer",fontFamily:"inherit", background: sort===v ? "#10b98122" : "transparent", color: sort===v ? "#059669" : "#3d7a5e", border: `1px solid ${sort===v ? "#10b98155" : "#c0dece"}`, fontWeight: sort===v ? 700 : 400}}>
              {label}{sort===v && v!=="fixed" ? (sortDir==="asc" ? " ↑" : " ↓") : ""}
            </button>
          ))}
          <span style={{fontSize:11, color:"#c0dece", flexShrink:0, margin:"0 4px"}}>|</span>
          <button onClick={() => setFNextAction(v => v==="today" ? "" : "today")}
            style={{fontSize:11,padding:"3px 9px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",flexShrink:0, background:fNextAction==="today"?"#ea580c33":"transparent", color:fNextAction==="today"?"#ea580c":"#3d7a5e", border:`1px solid ${fNextAction==="today"?"#ea580c66":"#c0dece"}`, fontWeight:fNextAction==="today"?700:400, display:"flex", alignItems:"center", gap:4}}>
            <FlameIcon size={12} color={fNextAction==="today"?"#ea580c":"#3d7a5e"} /> 本日追客
          </button>
          <span style={{fontSize:11, color:"#c0dece", flexShrink:0, margin:"0 4px"}}>|</span>
          <span style={{fontSize:11, color:"#6a9a7a", flexShrink:0}}>ステータス:</span>
          {getStatuses().map(s => {
            const active = fStatuses.has(s);
            const c = getStatusColor(s);
            return (
              <button key={s} onClick={() => setFStatuses(prev => {
                const n = new Set(prev); active ? n.delete(s) : n.add(s); return n;
              })} style={{fontSize:11,padding:"3px 9px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",flexShrink:0, background: active ? c+"33" : "transparent", color: active ? c : "#3d7a5e", border: `1px solid ${active ? c+"66" : "#c0dece"}`, fontWeight: active ? 700 : 400}}>
                {s}
              </button>
            );
          })}
          {fStatuses.size > 0 && (
            <button onClick={() => setFStatuses(new Set())}
              style={{fontSize:11,color:"#6a9a7a",background:"none",border:"none",cursor:"pointer",padding:"2px 4px",flexShrink:0,whiteSpace:"nowrap"}}>
              ✕ クリア
            </button>
          )}
        </div>
      </div>

      {showImport && (
        <CSVImport
          onImport={newLeads => { onBulkAdd(newLeads); setImportResult({ count: newLeads.length }); }}
          onClose={() => setShowImport(false)}
          result={importResult}
        />
      )}

      <div style={{display:"flex", gap:12, marginTop:16, flex:1, minHeight:0, overflow: isMobile ? "visible" : "hidden"}}>
        {/* 左側：リード一覧 */}
        <div style={{flex: isMobile ? "none" : "0 0 50%", width: isMobile ? "100%" : "50%", overflowY:"auto"}}>
          <div style={{display:"flex", flexDirection:"column", gap:10}}>
            {list.length === 0 && <div style={{...S.empty, padding:"32px"}}>リードがありません</div>}
            {list.map(lead => (
              <LeadRow key={lead.id} lead={lead} openId={openId} setOpenId={setOpenId}
                onEdit={readOnly ? null : () => { setEditing(lead); setShowForm(true); }}
                onDelete={readOnly ? null : () => onDelete(lead.id)}
                readOnly={readOnly}
                currentUser={currentUser}
                onStatusChange={s => {
                  const patch = { status: s };
                  if (lead.status === "商談確定" && s !== "商談確定") {
                    patch.meeting_date = ""; patch.meeting_time = ""; patch.sales_member = "";
                  }
                  onUpdate(lead.id, patch);
                  if (lead.zoho_lead_id && window.__appData?.zohoAuthenticated) {
                    fetch('/api/zoho/update-lead-status', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ zohoLeadId: lead.zoho_lead_id, localStatus: s }) }).catch(() => {});
                  }
                }}
                onUpdate={p => onUpdate(lead.id, p)}
              />
            ))}
          </div>
        </div>

        {/* デスクトップ: 右パネル（アクション履歴） */}
        {!isMobile && selectedLead && (
          <div style={{flex:1, minWidth:0, background:"#fff", border:"1px solid #e2f0e8", borderRadius:12, boxShadow:"0 2px 12px #0569690a", overflow:"hidden", height:"100%", overflowY:"auto"}}>
            <ActionHistoryPanel key={selectedLead.id} lead={selectedLead}
              onClose={() => setOpenId(null)}
              onUpdate={p => onUpdate(selectedLead.id, p)}
              onEdit={readOnly ? null : () => { setEditing(selectedLead); setShowForm(true); }}
              onDelete={readOnly ? null : () => { onDelete(selectedLead.id); setOpenId(null); }}
              currentUser={currentUser} readOnly={readOnly}
              onEditAction={(aid, updated) => handleEditAction(selectedLead, aid, updated)}
              onDeleteAction={aid => handleDeleteAction(selectedLead, aid)}
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
              onDelete={readOnly ? null : () => { onDelete(selectedLead.id); setOpenId(null); }}
              currentUser={currentUser} readOnly={readOnly}
              onEditAction={(aid, updated) => handleEditAction(selectedLead, aid, updated)}
              onDeleteAction={aid => handleDeleteAction(selectedLead, aid)}
            />
          </div>
        </div>
      )}

      {showForm && (
        <LeadForm initial={editing}
          onSave={d => {
            editing ? onUpdate(editing.id, d) : onAdd({ id: uid(), date: TODAY, actions: [], created_at: Date.now(), ...d });
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
