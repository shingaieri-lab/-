import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

import {
  SOURCES, PORTAL_SITES, PORTAL_TYPES, PORTAL_PRICE,
  DEFAULT_SOURCES, DEFAULT_STATUSES_WITH_COLORS,
  SOURCE_COLOR_PALETTE, STATUS_COLOR_PALETTE, LEAD_SOURCE_ICONS,
  MQL_OPTIONS, ACTION_TYPES, ACTION_RESULTS,
  DEFAULT_SALES_MEMBERS, DEFAULT_IS_MEMBERS, DEFAULT_PORTAL_SITES, DEFAULT_PORTAL_TYPES,
  TODAY, THIS_MONTH, uid, PALETTE, NEXT_ACTION_RULES, at,
} from './lib/constants.js';
import { apiPost, loadLeads, saveLeads } from './lib/api.js';
import {
  loadMasterSettings, saveMasterSettings, getMaster,
  getStatuses, getStatusColor,
  getSalesMembers, getPortalSites, getPortalTypes, getPortalPrice,
  getPortalSiteSource, getPortalSitesForSource, sourceHasPortal,
  getSources, getSourcesWithMeta, getSourceIcon, getSourceColor,
  getISMembers, IS_COLORS, syncISColors,
  USER_COLORS, DEFAULT_ACCOUNTS, loadAccounts, saveAccounts, getEffectiveAiConfig,
} from './lib/master.js';
import { JP_HOLIDAYS, isBusinessDay, isOverdue, isDueToday, isDueSoon, addBusinessDays } from './lib/date.js';
import { handleOAuthCallbackError, handleOAuthPopupError, isTokenValid, acquireGmailToken, buildGmailDraftRaw, postGmailDraft } from './lib/gmail.js';
import { loadGCalConfig, saveGCalConfig } from './lib/gcal.js';
import { PencilIcon, TrashIcon } from './components/icons.jsx';
import { Splash, Header, Card, KPI, SrcBadge, Badge, Chip, IF, Note, Row2, Field } from './components/ui.jsx';
import { S, CSS } from './components/styles.js';
import { LoginScreen } from './components/LoginScreen.jsx';
import { Nav } from './components/Nav.jsx';
import { AccountManager } from './components/AccountManager.jsx';
import { SVGBarChart, SVGLineChart, Trend } from './components/Charts.jsx';
import { SourceIconSVG } from './components/SourceIconSVG.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { CSVImport, normalizeDate } from './components/CSVImport.jsx';
import { LeadForm, ActionForm, ActEntry } from './components/LeadForms.jsx';
import { LeadRow, NextActionEditBtn } from './components/LeadRow.jsx';
import { ActionHistoryPanel } from './components/ActionHistoryPanel.jsx';
import { LeadList } from './components/LeadList.jsx';
import { LeadCombobox } from './components/LeadCombobox.jsx';
import { EmailPage } from './components/EmailPage.jsx';
import { AIPage } from './components/AIPage.jsx';

// ── Zoho CRM 設定コンポーネント ──────────────────────────────────────
function ZohoCrmSettings() {
  const stored = window.__appData?.zohoConfig || {};
  const [cfg, setCfg] = React.useState({
    clientId: stored.clientId || '',
    clientSecret: '',   // セキュリティのためサーバーから返さないので空
    dataCenter: stored.dataCenter || 'jp',
    redirectUri: stored.redirectUri || (window.location.origin + '/api/zoho/callback'),
    isFieldApiName: stored.isFieldApiName || 'Main_IS_Member',
    meetingDateFieldApiName: stored.meetingDateFieldApiName || '',
    closingDateFieldApiName: stored.closingDateFieldApiName || '',
    statusMap: stored.statusMap || {},        // Zoho → 本ツール
    reverseStatusMap: stored.reverseStatusMap || {}, // 本ツール → Zoho
    isMemberMap: stored.isMemberMap || {},
  });
  const [authenticated, setAuthenticated] = React.useState(window.__appData?.zohoAuthenticated || false);
  const [msg, setMsg] = React.useState('');
  const [err, setErr] = React.useState('');
  const [newStatusZoho, setNewStatusZoho] = React.useState('');
  const [newStatusLocal, setNewStatusLocal] = React.useState('');
  const [newReverseLocal, setNewReverseLocal] = React.useState('');
  const [newReverseZoho, setNewReverseZoho] = React.useState('');
  const [newMemberZoho, setNewMemberZoho] = React.useState('');
  const [newMemberLocal, setNewMemberLocal] = React.useState('');

  const inp = { width:'100%', padding:'7px 10px', borderRadius:7, border:'1px solid #c0dece', fontSize:12, outline:'none', boxSizing:'border-box', fontFamily:'inherit', background:'#fff', color:'#174f35' };
  const lbl = { fontSize:11, fontWeight:700, color:'#6a9a7a', display:'block', marginBottom:4, marginTop:12 };
  const btnP = { padding:'7px 18px', borderRadius:7, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' };
  const btnS = { padding:'7px 14px', borderRadius:7, border:'1px solid #c0dece', background:'#fff', color:'#6a9a7a', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' };

  const showMsg = (m) => { setMsg(m); setErr(''); setTimeout(() => setMsg(''), 3000); };
  const showErr = (m) => { setErr(m); setMsg(''); };

  // 設定を保存（Client Secretは変更時のみ送信。空欄の場合はサーバー側で既存値を保持）
  const save = async () => {
    if (!cfg.clientId.trim()) { showErr('Client IDを入力してください'); return; }
    // 初回設定時（既存設定がない）はClient Secretも必須
    const isFirstTime = !window.__appData?.zohoConfig?.clientId;
    if (isFirstTime && !cfg.clientSecret.trim()) { showErr('初回設定時はClient Secretの入力が必要です'); return; }
    const res = await fetch('/api/zoho-config', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(cfg),
    });
    if (res.ok) {
      window.__appData.zohoConfig = { ...cfg, clientSecret: undefined };
      showMsg('設定を保存しました ✓');
    } else {
      const d = await res.json().catch(() => ({}));
      showErr('保存失敗: ' + (d.error || res.status));
    }
  };

  // Zoho OAuth認証を別ウィンドウで開始
  const startAuth = () => {
    const w = window.open('/api/zoho/auth', 'zoho_auth', 'width=600,height=700');
    const handler = (e) => {
      if (e.origin === window.location.origin && e.data === 'zoho_auth_success') {
        window.removeEventListener('message', handler);
        setAuthenticated(true);
        window.__appData.zohoAuthenticated = true;
        showMsg('Zoho認証が完了しました ✓');
        if (w && !w.closed) w.close();
      }
    };
    window.addEventListener('message', handler);
  };

  // ステータスマッピング追加
  const addStatusMap = () => {
    if (!newStatusZoho.trim() || !newStatusLocal.trim()) return;
    const next = { ...cfg.statusMap, [newStatusZoho.trim()]: newStatusLocal.trim() };
    setCfg(c => ({ ...c, statusMap: next }));
    setNewStatusZoho(''); setNewStatusLocal('');
  };
  const removeStatusMap = (k) => {
    const next = { ...cfg.statusMap }; delete next[k];
    setCfg(c => ({ ...c, statusMap: next }));
  };

  // 逆ステータスマッピング操作（本ツール → Zoho）
  const addReverseMap = () => {
    if (!newReverseLocal.trim() || !newReverseZoho.trim()) return;
    setCfg(c => ({ ...c, reverseStatusMap: { ...c.reverseStatusMap, [newReverseLocal.trim()]: newReverseZoho.trim() } }));
    setNewReverseLocal(''); setNewReverseZoho('');
  };
  const removeReverseMap = (k) => {
    const next = { ...cfg.reverseStatusMap }; delete next[k];
    setCfg(c => ({ ...c, reverseStatusMap: next }));
  };

  // IS担当マッピング操作
  const addMemberMap = () => {
    if (!newMemberZoho.trim() || !newMemberLocal.trim()) return;
    const next = { ...cfg.isMemberMap, [newMemberZoho.trim()]: newMemberLocal.trim() };
    setCfg(c => ({ ...c, isMemberMap: next }));
    setNewMemberZoho(''); setNewMemberLocal('');
  };
  const removeMemberMap = (k) => {
    const next = { ...cfg.isMemberMap }; delete next[k];
    setCfg(c => ({ ...c, isMemberMap: next }));
  };

  return (
    <div style={{maxWidth:600}}>
      <div style={{fontSize:14,fontWeight:700,color:'#174f35',marginBottom:4}}>🔗 Zoho CRM 連携設定</div>
      <div style={{fontSize:11,color:'#6a9a7a',marginBottom:16}}>Zoho CRMとのAPI連携に必要な情報を設定します。設定後「保存」→「Zoho認証」の順に実行してください。</div>

      {msg && <div style={{background:'#d1fae5',color:'#059669',border:'1px solid #6ee7b7',borderRadius:8,padding:'8px 14px',marginBottom:12,fontSize:12,fontWeight:700}}>{msg}</div>}
      {err && <div style={{background:'#fef2f2',color:'#dc2626',border:'1px solid #fca5a5',borderRadius:8,padding:'8px 14px',marginBottom:12,fontSize:12,fontWeight:700}}>{err}</div>}

      {/* 認証状態 */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,padding:'10px 14px',background:'#f8fbf9',border:'1px solid #e2f0e8',borderRadius:8}}>
        <span style={{fontSize:13,fontWeight:700,color: authenticated ? '#059669' : '#d97706'}}>
          {authenticated ? '✅ Zoho認証済み' : '⚠️ 未認証'}
        </span>
        <button onClick={startAuth} style={{...btnP, padding:'5px 14px', fontSize:11}}>
          {authenticated ? '再認証' : 'Zoho認証を開始'}
        </button>
      </div>

      {/* 基本設定 */}
      <div style={{background:'#f8fbf9',border:'1px solid #e2f0e8',borderRadius:8,padding:'14px',marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:'#174f35',marginBottom:8}}>基本設定</div>
        <label style={lbl}>データセンター</label>
        <select value={cfg.dataCenter} onChange={e=>setCfg(c=>({...c,dataCenter:e.target.value}))} style={{...inp,width:'auto'}}>
          <option value="jp">日本（zoho.jp）</option>
          <option value="com">グローバル（zoho.com）</option>
        </select>
        <label style={lbl}>Client ID</label>
        <input value={cfg.clientId} onChange={e=>setCfg(c=>({...c,clientId:e.target.value}))} placeholder="Zoho API ConsoleのClient ID" style={inp} />
        <label style={lbl}>Client Secret <span style={{color:'#dc2626'}}>*</span><span style={{fontSize:10,color:'#9ca3af',fontWeight:400}}>（変更する場合のみ入力）</span></label>
        <input type="password" value={cfg.clientSecret} onChange={e=>setCfg(c=>({...c,clientSecret:e.target.value}))} placeholder="Zoho API ConsoleのClient Secret" style={inp} />
        <label style={lbl}>Redirect URI</label>
        <input value={window.location.origin + '/api/zoho/callback'} readOnly style={{...inp, background:'#f3f4f6', color:'#6b7280', cursor:'default'}} />
        <div style={{fontSize:10,color:'#9ca3af',marginTop:4}}>Redirect URIはサーバー側で自動設定されます。Zoho API Consoleに上記と同じ値を登録してください。</div>
      </div>

      {/* フィールドマッピング */}
      <div style={{background:'#f8fbf9',border:'1px solid #e2f0e8',borderRadius:8,padding:'14px',marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:'#174f35',marginBottom:8}}>フィールドマッピング</div>
        <label style={lbl}>「メインIS担当」フィールドのAPI名</label>
        <input value={cfg.isFieldApiName} onChange={e=>setCfg(c=>({...c,isFieldApiName:e.target.value}))} placeholder="例: Main_IS_Member" style={inp} />
        <div style={{fontSize:10,color:'#9ca3af',marginTop:4}}>Zoho管理画面 → カスタマイズ → リード → フィールド で確認できます</div>
        <label style={lbl}>「商談実施日」フィールドのAPI名</label>
        <input value={cfg.meetingDateFieldApiName} onChange={e=>setCfg(c=>({...c,meetingDateFieldApiName:e.target.value}))} placeholder="例: Shodan_Jisshi_Bi" style={inp} />
        <div style={{fontSize:10,color:'#9ca3af',marginTop:4}}>Zoho管理画面 → カスタマイズ → 商談 → フィールド で確認できます（空欄の場合は連携しません）</div>
        <label style={lbl}>「完了予定日」フィールドのAPI名</label>
        <input value={cfg.closingDateFieldApiName} onChange={e=>setCfg(c=>({...c,closingDateFieldApiName:e.target.value}))} placeholder="例: Kanryo_Yotei_Bi" style={inp} />
        <div style={{fontSize:10,color:'#9ca3af',marginTop:4}}>Zoho管理画面 → カスタマイズ → 商談 → フィールド で確認できます（空欄の場合は連携しません）</div>
      </div>

      {/* IS担当マッピング */}
      <div style={{background:'#f8fbf9',border:'1px solid #e2f0e8',borderRadius:8,padding:'14px',marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:'#174f35',marginBottom:4}}>IS担当マッピング</div>
        <div style={{fontSize:11,color:'#6a9a7a',marginBottom:10}}>ZohoのメインIS担当フィールドの値と、本ツールのメンバー名を対応付けます<br/>（例：Zoho側が「yamada_t」→ 本ツールの「山田太郎」）</div>
        {Object.entries(cfg.isMemberMap).length > 0 && (
          <div style={{marginBottom:10}}>
            {Object.entries(cfg.isMemberMap).map(([zohoVal, localMember]) => (
              <div key={zohoVal} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,fontSize:12}}>
                <span style={{flex:1,padding:'4px 8px',background:'#fff',border:'1px solid #e2f0e8',borderRadius:5,color:'#6a9a7a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>Zoho: {zohoVal}</span>
                <span style={{color:'#9ca3af',flexShrink:0}}>→</span>
                <span style={{flex:1,padding:'4px 8px',background:'#fff',border:'1px solid #e2f0e8',borderRadius:5,color:'#174f35',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>本ツール: {localMember}</span>
                <button onClick={()=>removeMemberMap(zohoVal)} style={{...btnS,padding:'3px 8px',color:'#ef4444',borderColor:'#fca5a5',fontSize:11,flexShrink:0}}>削除</button>
              </div>
            ))}
          </div>
        )}
        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
          <input value={newMemberZoho} onChange={e=>setNewMemberZoho(e.target.value)} placeholder="Zohoの値（例: yamada_t）" style={{...inp,flex:1,minWidth:130}} onKeyDown={e=>e.key==='Enter'&&addMemberMap()} />
          <span style={{color:'#9ca3af',fontSize:14,flexShrink:0}}>→</span>
          <select value={newMemberLocal} onChange={e=>setNewMemberLocal(e.target.value)} style={{...inp,flex:1,minWidth:130}}>
            <option value="">本ツールのメンバー選択</option>
            {getSalesMembers().map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={addMemberMap} style={{...btnP,padding:'7px 12px',fontSize:11,flexShrink:0}}>追加</button>
        </div>
        <div style={{fontSize:10,color:'#9ca3af',marginTop:6}}>※ マッピングが未設定の場合、Zohoの値をそのまま使用します</div>
      </div>

      {/* ステータスマッピング（双方向） */}
      <div style={{background:'#f8fbf9',border:'1px solid #e2f0e8',borderRadius:8,padding:'14px',marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:'#174f35',marginBottom:4}}>ステータスマッピング（双方向）</div>
        <div style={{fontSize:11,color:'#6a9a7a',marginBottom:12}}>取込時と更新時でそれぞれ変換ルールを設定します。同じ名称の場合は設定不要です。</div>

        {/* Zoho → 本ツール（取込時） */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:'#6a9a7a',marginBottom:6}}>📥 Zoho → 本ツール（リード取込・Webhook受信時）</div>
          {Object.entries(cfg.statusMap).length > 0 && (
            <div style={{marginBottom:8}}>
              {Object.entries(cfg.statusMap).map(([zohoSt, localSt]) => (
                <div key={zohoSt} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,fontSize:12}}>
                  <span style={{flex:1,padding:'3px 8px',background:'#fff',border:'1px solid #e2f0e8',borderRadius:5,color:'#6a9a7a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>Zoho: {zohoSt}</span>
                  <span style={{color:'#9ca3af',flexShrink:0}}>→</span>
                  <span style={{flex:1,padding:'3px 8px',background:'#fff',border:'1px solid #e2f0e8',borderRadius:5,color:'#174f35',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>本ツール: {localSt}</span>
                  <button onClick={()=>removeStatusMap(zohoSt)} style={{...btnS,padding:'2px 8px',color:'#ef4444',borderColor:'#fca5a5',fontSize:11,flexShrink:0}}>削除</button>
                </div>
              ))}
            </div>
          )}
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
            <input value={newStatusZoho} onChange={e=>setNewStatusZoho(e.target.value)} placeholder="Zohoのステータス名" style={{...inp,flex:1,minWidth:110}} onKeyDown={e=>e.key==='Enter'&&addStatusMap()} />
            <span style={{color:'#9ca3af',fontSize:13,flexShrink:0}}>→</span>
            <select value={newStatusLocal} onChange={e=>setNewStatusLocal(e.target.value)} style={{...inp,flex:1,minWidth:110}}>
              <option value="">本ツールのステータス選択</option>
              {getStatuses().map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={addStatusMap} style={{...btnP,padding:'6px 10px',fontSize:11,flexShrink:0}}>追加</button>
          </div>
        </div>

        <div style={{borderTop:'1px solid #e2f0e8',paddingTop:12}}>
          <div style={{fontSize:11,fontWeight:700,color:'#6a9a7a',marginBottom:6}}>📤 本ツール → Zoho（ステータス変更時に自動反映）</div>
          {Object.entries(cfg.reverseStatusMap).length > 0 && (
            <div style={{marginBottom:8}}>
              {Object.entries(cfg.reverseStatusMap).map(([localSt, zohoSt]) => (
                <div key={localSt} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,fontSize:12}}>
                  <span style={{flex:1,padding:'3px 8px',background:'#fff',border:'1px solid #e2f0e8',borderRadius:5,color:'#174f35',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>本ツール: {localSt}</span>
                  <span style={{color:'#9ca3af',flexShrink:0}}>→</span>
                  <span style={{flex:1,padding:'3px 8px',background:'#fff',border:'1px solid #e2f0e8',borderRadius:5,color:'#6a9a7a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>Zoho: {zohoSt}</span>
                  <button onClick={()=>removeReverseMap(localSt)} style={{...btnS,padding:'2px 8px',color:'#ef4444',borderColor:'#fca5a5',fontSize:11,flexShrink:0}}>削除</button>
                </div>
              ))}
            </div>
          )}
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
            <select value={newReverseLocal} onChange={e=>setNewReverseLocal(e.target.value)} style={{...inp,flex:1,minWidth:110}}>
              <option value="">本ツールのステータス選択</option>
              {getStatuses().map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <span style={{color:'#9ca3af',fontSize:13,flexShrink:0}}>→</span>
            <input value={newReverseZoho} onChange={e=>setNewReverseZoho(e.target.value)} placeholder="Zohoのステータス名" style={{...inp,flex:1,minWidth:110}} onKeyDown={e=>e.key==='Enter'&&addReverseMap()} />
            <button onClick={addReverseMap} style={{...btnP,padding:'6px 10px',fontSize:11,flexShrink:0}}>追加</button>
          </div>
          <div style={{fontSize:10,color:'#9ca3af',marginTop:6}}>※ マッピング未設定のステータスはそのままZohoに送信します</div>
        </div>
      </div>

      <div style={{display:'flex',gap:8}}>
        <button onClick={save} style={btnP}>設定を保存</button>
      </div>

      {/* Webhook情報 */}
      <div style={{marginTop:16,padding:'12px 14px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8}}>
        <div style={{fontSize:12,fontWeight:700,color:'#92400e',marginBottom:6}}>📌 Zoho Webhook設定（オプション）</div>
        <div style={{fontSize:11,color:'#92400e',lineHeight:1.7}}>
          ZohoからリアルタイムでリードをPushする場合、<br/>
          Zoho CRM → 設定 → ワークフロー → Webhook に以下のURLを登録してください：<br/>
          <code style={{background:'#fef9c3',padding:'2px 6px',borderRadius:4,fontFamily:'monospace',fontSize:11}}>{window.location.origin}/api/zoho/webhook</code>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({ aiConfig, onSave, currentUser, onUpdateProfile, initialTab, onLeadsChange, onMasterSave, onOpenWizard }) {
  const [master, setMaster] = React.useState(() => getMaster());
  const [tab, setTab] = React.useState(initialTab || (currentUser?.role === "admin" ? "leadmgmt" : "apikey"));
  const [msg, setMsg] = React.useState("");
  const [profileForm, setProfileForm] = React.useState({ name: currentUser?.name||"", password: currentUser?.password||"", email: currentUser?.email||"", color: currentUser?.color||PALETTE[0], id: currentUser?.id||"", signature: currentUser?.signature||"", geminiKey: currentUser?.geminiKey||"", gmailClientId: currentUser?.gmailClientId||"", calendarId: currentUser?.calendarId||"" });
  const [profileMsg, setProfileMsg] = React.useState("");
  const saveProfile = () => {
    if (!profileForm.name.trim()) return;
    onUpdateProfile(profileForm);
    // 管理者の場合、gmailClientId を共有設定にも保存する
    // → これにより全メンバーが自動的にこのClient IDを使えるようになる
    if (currentUser?.role === "admin" && profileForm.gmailClientId !== undefined) {
      onSave({ ...aiConfig, gmailClientId: profileForm.gmailClientId });
    }
    setProfileMsg("保存しました ✓");
    setTimeout(() => setProfileMsg(""), 2000);
  };

  const save = (next) => { setMaster(next); saveMasterSettings(next); onMasterSave?.(); setMsg("保存しました ✓"); setTimeout(()=>setMsg(""),2000); };

  // ポータルサイト
  const [newSite, setNewSite] = React.useState("");
  const [editSite, setEditSite] = React.useState(null);
  const [editSiteName, setEditSiteName] = React.useState("");
  const addSite = () => {
    const s = newSite.trim(); if (!s) return;
    if (master.portalSites.includes(s)) { alert("既に存在します"); return; }
    const pt = { ...master.portalTypes, [s]: [{ label:"一括請求", price:10000 }] };
    const ps = { ...(master.portalSiteSource||{}), [s]: "" };
    save({ ...master, portalSites: [...master.portalSites, s], portalTypes: pt, portalSiteSource: ps });
    setNewSite("");
  };
  const removeSite = (s) => {
    if (!window.confirm(`「${s}」を削除しますか？`)) return;
    const sites = master.portalSites.filter(x=>x!==s);
    const pt = { ...master.portalTypes }; delete pt[s];
    const ps = { ...(master.portalSiteSource||{}) }; delete ps[s];
    save({ ...master, portalSites: sites, portalTypes: pt, portalSiteSource: ps });
  };
  const renameSite = (oldName) => {
    const newName = editSiteName.trim(); if (!newName) return;
    if (newName !== oldName && master.portalSites.includes(newName)) { alert("既に存在します"); return; }
    const sites = master.portalSites.map(s => s === oldName ? newName : s);
    const pt = {}; Object.keys(master.portalTypes).forEach(k => { pt[k === oldName ? newName : k] = master.portalTypes[k]; });
    const ps = {}; Object.keys(master.portalSiteSource||{}).forEach(k => { ps[k === oldName ? newName : k] = (master.portalSiteSource||{})[k]; });
    save({ ...master, portalSites: sites, portalTypes: pt, portalSiteSource: ps });
    setEditSite(null); setEditSiteName("");
  };
  const moveSite = (site, dir) => {
    const idx = master.portalSites.indexOf(site); const sites = [...master.portalSites];
    if (dir==="up" && idx>0) { [sites[idx-1],sites[idx]]=[sites[idx],sites[idx-1]]; }
    else if (dir==="down" && idx<sites.length-1) { [sites[idx+1],sites[idx]]=[sites[idx],sites[idx+1]]; }
    else return; save({ ...master, portalSites: sites });
  };
  const [selSite, setSelSite] = React.useState(master.portalSites[0]||"");
  const [newPlan, setNewPlan] = React.useState({ label:"", price:"" });
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

  // 営業担当
  const [newSales, setNewSales] = React.useState("");
  const [editSalesIdx, setEditSalesIdx] = React.useState(null);
  const [editSalesName, setEditSalesName] = React.useState("");
  const addSales = () => {
    const s = newSales.trim(); if (!s) return;
    if (master.salesMembers.includes(s)) { alert("既に存在します"); return; }
    save({ ...master, salesMembers: [...master.salesMembers, s] });
    setNewSales("");
  };
  const removeSales = (m) => { save({ ...master, salesMembers: master.salesMembers.filter(x=>x!==m) }); };
  const renameSales = (idx) => {
    const newName = editSalesName.trim(); if (!newName) return;
    if (master.salesMembers.some((m,i) => m===newName && i!==idx)) { alert("既に存在します"); return; }
    save({ ...master, salesMembers: master.salesMembers.map((m,i) => i===idx ? newName : m) });
    setEditSalesIdx(null); setEditSalesName("");
  };

  // リード管理（ステータス）
  const getStatusData = () => master.statuses || DEFAULT_STATUSES_WITH_COLORS;
  const [editStatusIdx, setEditStatusIdx] = React.useState(null);
  const [editStatusForm, setEditStatusForm] = React.useState({ label:"", color:"" });
  const [newStatusForm, setNewStatusForm] = React.useState({ label:"", color:"#0ea5e9" });
  const [dragStatusIdx, setDragStatusIdx] = React.useState(null);
  const [dragOverStatusIdx, setDragOverStatusIdx] = React.useState(null);
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

  // リード管理（流入元）
  const [newSource, setNewSource] = React.useState("");
  const [newSourceIcon, setNewSourceIcon] = React.useState("home");
  const [editSourceIdx, setEditSourceIdx] = React.useState(null);
  const [editSourceVal, setEditSourceVal] = React.useState("");
  const [editSourceIcon, setEditSourceIcon] = React.useState(null);
  const [showIconPicker, setShowIconPicker] = React.useState(null); // null | "new" | idx number
  const [dragSrcIdx, setDragSrcIdx] = React.useState(null);
  const [dragOverSrcIdx, setDragOverSrcIdx] = React.useState(null);
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
    // 既存リードの流入元も一括更新
    if (newVal !== oldVal) {
      const leads = await loadLeads();
      const updated = leads.map(l => l.source === oldVal ? { ...l, source: newVal } : l);
      await saveLeads(updated);
      if (onLeadsChange) onLeadsChange(updated);
    }
    setEditSourceIdx(null);
  };

  const tabBtn = (key, label) => (
    <button onClick={()=>setTab(key)} style={{padding:"7px 18px",borderRadius:"8px 8px 0 0",border:"1px solid #d8ede1",borderBottom: tab===key ? "1px solid #fff" : "1px solid #d8ede1", background: tab===key ? "#fff" : "#f0f5f2", color: tab===key ? "#174f35" : "#6a9a7a", fontWeight: tab===key ? 700 : 400, fontSize:12, cursor:"pointer", fontFamily:"inherit", marginRight:4, marginBottom:-1}}>
      {label}
    </button>
  );
  const inp = { width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid #c0dece", fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit", background:"#fff", color:"#174f35" };
  const addRow = { display:"flex", gap:8, marginBottom:12 };

  return (
    <div className="settings-page" style={{padding:"24px 28px", width:"60vw", maxWidth:"100%"}}>
      <div style={{fontSize:17,fontWeight:900,color:"#174f35",marginBottom:4}}>⚙️ 設定</div>
      <div style={{fontSize:12,color:"#6a9a7a",marginBottom:20}}>{currentUser?.role === "admin" ? "リード管理・ポータルサイト・営業担当・API設定・アカウントを管理できます。" : "API設定・アカウントを管理できます。"}</div>
      {msg && <div style={{background:"#d1fae5",color:"#059669",border:"1px solid #6ee7b7",borderRadius:8,padding:"8px 16px",marginBottom:16,fontSize:12,fontWeight:700}}>{msg}</div>}
      <div className="settings-tabs" style={{display:"flex", flexWrap:"wrap", gap:0, marginBottom:0}}>
        {currentUser?.role==="admin" && tabBtn("leadmgmt","📋 リード管理")}
        {currentUser?.role==="admin" && tabBtn("portal","🏢 ポータルサイト")}
        {currentUser?.role==="admin" && tabBtn("sales","👤 営業担当")}
        {tabBtn("apikey","🔑 API設定")}
        {currentUser?.role==="admin" && tabBtn("zoho","🔗 Zoho CRM連携")}
        {currentUser?.role==="admin" && tabBtn("accounts","👥 アカウント管理（管理者）")}
        {tabBtn("myaccount","👤 アカウント管理")}
      </div>
      <div style={{background:"#fff",borderRadius:"0 8px 8px 8px",border:"1px solid #d8ede1",padding:"20px"}}>
        {tab === "portal" && (
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#174f35",marginBottom:8}}>ポータルサイト一覧</div>
            <div style={addRow}>
              <input value={newSite} onChange={e=>setNewSite(e.target.value)} placeholder="新しいポータルサイト名" style={{...inp, flex:1}} onKeyDown={e=>e.key==="Enter"&&addSite()} />
              <button onClick={addSite} style={{padding:"7px 16px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>追加</button>
            </div>
            {master.portalSites.map((site, siteIdx) => (
              <div key={site} style={{background:"#f8fbf9",borderRadius:10,border:"1px solid #e2f0e8",marginBottom:12,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,padding:"10px 14px",background:"#f0f5f2",borderBottom:"1px solid #e2f0e8"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
                    <button onClick={()=>moveSite(site,"up")} disabled={siteIdx===0} style={{fontSize:9,padding:"1px 5px",borderRadius:3,border:"1px solid #c0dece",background:siteIdx===0?"#f5f5f5":"#fff",color:siteIdx===0?"#ccc":"#6a9a7a",cursor:siteIdx===0?"default":"pointer",lineHeight:1.2,fontFamily:"inherit"}}>▲</button>
                    <button onClick={()=>moveSite(site,"down")} disabled={siteIdx===master.portalSites.length-1} style={{fontSize:9,padding:"1px 5px",borderRadius:3,border:"1px solid #c0dece",background:siteIdx===master.portalSites.length-1?"#f5f5f5":"#fff",color:siteIdx===master.portalSites.length-1?"#ccc":"#6a9a7a",cursor:siteIdx===master.portalSites.length-1?"default":"pointer",lineHeight:1.2,fontFamily:"inherit"}}>▼</button>
                  </div>
                  {editSite===site ? (
                    <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
                      <input value={editSiteName} onChange={e=>setEditSiteName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&renameSite(site)} style={{...inp,flex:1,padding:"4px 8px"}} autoFocus />
                      <button onClick={()=>renameSite(site)} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"none",background:"#10b981",color:"#fff",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>保存</button>
                      <button onClick={()=>setEditSite(null)} style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:"1px solid #c0dece",background:"#fff",color:"#6a9a7a",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>✕</button>
                    </div>
                  ) : (
                    <>
                      <span style={{fontWeight:700,color:"#174f35",fontSize:13,flex:1}}>🏢 {site}</span>
                      <button onClick={()=>{setEditSite(site);setEditSiteName(site)}} style={{padding:"3px 6px",borderRadius:6,background:"#f0fdf4",color:"#059669",border:"1px solid #86efac",cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center"}} title="編集"><PencilIcon color="#059669"/></button>
                      <button onClick={()=>removeSite(site)} style={{padding:"3px 6px",borderRadius:6,background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center"}} title="削除"><TrashIcon color="#dc2626"/></button>
                    </>
                  )}
                </div>
                <div style={{padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"#6a9a7a",marginBottom:6,fontWeight:600}}>流入元設定</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <select
                      value={(master.portalSiteSource||{})[site]||""}
                      onChange={e=>{
                        const ps = { ...(master.portalSiteSource||{}), [site]: e.target.value };
                        save({ ...master, portalSiteSource: ps });
                      }}
                      style={{flex:1,padding:"5px 8px",borderRadius:7,border:"1px solid #c0dece",fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#fff",color:"#174f35"}}>
                      <option value="">（未設定）</option>
                      {(master.sources||[]).map(srcObj=>{
                        const lbl = typeof srcObj==="string"?srcObj:srcObj.label;
                        return <option key={lbl} value={lbl}>{lbl}</option>;
                      })}
                    </select>
                    <span style={{fontSize:11,color:"#6a9a7a",flexShrink:0}}>に連結</span>
                  </div>
                  <div style={{fontSize:11,color:"#6a9a7a",marginBottom:8,fontWeight:600}}>プラン・金額</div>
                  {(master.portalTypes[site]||[]).map((plan,idx)=>(
                    <div key={idx} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <input value={plan.label} onChange={e=>updatePlanLabel(site,idx,e.target.value)} style={{...inp,flex:1,padding:"4px 8px"}} />
                      <span style={{fontSize:11,color:"#6a9a7a"}}>¥</span>
                      <input type="number" value={plan.price} onChange={e=>updatePlanPrice(site,idx,e.target.value)} style={{...inp,width:100,padding:"4px 8px"}} />
                      <button onClick={()=>removePlan(site,idx)} style={{padding:"3px 6px",borderRadius:5,background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center"}} title="削除"><TrashIcon color="#dc2626"/></button>
                    </div>
                  ))}
                  <div style={{display:"flex",gap:6,marginTop:8}} onClick={()=>setSelSite(site)}>
                    <input value={selSite===site?newPlan.label:""} onFocus={()=>setSelSite(site)} onChange={e=>setNewPlan(p=>({...p,label:e.target.value}))} placeholder="プラン名" style={{...inp,flex:1,padding:"5px 8px"}} />
                    <input type="number" value={selSite===site?newPlan.price:""} onFocus={()=>setSelSite(site)} onChange={e=>setNewPlan(p=>({...p,price:e.target.value}))} placeholder="金額" style={{...inp,width:90,padding:"5px 8px"}} />
                    <button onClick={addPlan} style={{padding:"5px 12px",borderRadius:6,border:"none",background:"#10b981",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>追加</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "sales" && (
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#174f35",marginBottom:8}}>{currentUser?.role==="admin" ? "営業担当一覧" : "営業設定"}</div>
            <div style={addRow}>
              <input value={newSales} onChange={e=>setNewSales(e.target.value)} placeholder="担当者名" style={{...inp,flex:1}} onKeyDown={e=>e.key==="Enter"&&addSales()} />
              <button onClick={addSales} style={{padding:"7px 16px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>追加</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {master.salesMembers.map((m, idx)=>(
                <div key={m} style={{display:"flex",alignItems:"center",gap:6,background:"#f0f5f2",border:"1px solid #d8ede1",borderRadius:8,padding:"6px 10px"}}>
                  {editSalesIdx===idx ? (
                    <>
                      <input value={editSalesName} onChange={e=>setEditSalesName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&renameSales(idx)} style={{...inp,flex:1,padding:"4px 8px"}} autoFocus />
                      <button onClick={()=>renameSales(idx)} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"none",background:"#10b981",color:"#fff",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>保存</button>
                      <button onClick={()=>setEditSalesIdx(null)} style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:"1px solid #c0dece",background:"#fff",color:"#6a9a7a",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>✕</button>
                    </>
                  ) : (
                    <>
                      <span style={{fontSize:12,color:"#174f35",fontWeight:600,flex:1}}>{m}</span>
                      <button onClick={()=>{setEditSalesIdx(idx);setEditSalesName(m)}} style={{padding:"3px 6px",borderRadius:6,background:"#f0fdf4",color:"#059669",border:"1px solid #86efac",cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center"}} title="編集"><PencilIcon color="#059669"/></button>
                      <button onClick={()=>removeSales(m)} style={{padding:"3px 6px",borderRadius:5,background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center"}} title="削除"><TrashIcon color="#dc2626"/></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "apikey" && (
          <div>
            <div>
              {/* ウィザードバナー */}
              {(() => {
                const gcalCfg = loadGCalConfig();
                const geminiOk = !!(currentUser?.geminiConfigured);
                const gmailOk = !!(currentUser?.gmailClientId || window.__appData?.aiConfig?.gmailClientId);
                const calendarOk = !!(gcalCfg.apiKey && Object.keys(gcalCfg.calendarIds||{}).length > 0);
                const allOk = geminiOk && gmailOk && calendarOk;
                return (
                  <div style={{background: allOk ? "#f0fdf4" : "#fffbeb", border:`1px solid ${allOk?"#86efac":"#fde68a"}`, borderRadius:10, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12}}>
                    <div style={{fontSize:22, flexShrink:0}}>{allOk ? "✅" : "🚀"}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12, fontWeight:700, color: allOk ? "#166534" : "#92400e"}}>
                        {allOk ? "すべての設定が完了しています" : "ウィザードを使うと簡単に設定できます"}
                      </div>
                      <div style={{fontSize:11, color: allOk ? "#166534" : "#d97706", marginTop:2}}>
                        {[
                          geminiOk ? null : "AIアシスタント未設定",
                          gmailOk  ? null : "Gmail未設定",
                          calendarOk ? null : "カレンダー未設定",
                        ].filter(Boolean).join("　")||"全機能が利用可能です"}
                      </div>
                    </div>
                    {!allOk && onOpenWizard && (
                      <button onClick={onOpenWizard} style={{padding:"7px 14px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0}}>
                        ウィザードで設定 →
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* 役割別の説明バナー */}
              {currentUser?.role === "admin" ? (
                <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#1e40af",lineHeight:1.8}}>
                  <b>👑 管理者の設定内容</b><br />
                  ① <b>Gemini APIキー</b>：ご自身のAIアシスタント用に取得・入力してください。<br />
                  ② <b>Gmail OAuth Client ID</b>：Google Cloud Console で1回だけ作成し、入力してください。設定後は全メンバーがGmail・GoogleタスクTODO機能を使えるようになります（各メンバーは初回に「許可」を押すだけでOKです）。
                </div>
              ) : (
                <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#166534",lineHeight:1.8}}>
                  <b>👤 メンバーの設定内容</b><br />
                  ① <b>Gemini APIキー</b>：AIアシスタントを使うために、ご自身のキーを取得・入力してください。<br />
                  ② <b>Gmail・GoogleタスクTODO</b>：管理者が設定済みであれば、初回利用時にGoogleのポップアップで「許可」を押すだけで使えます。
                </div>
              )}

              {/* ── 全員共通：Gemini APIキー ── */}
              <div style={{fontSize:12,fontWeight:700,color:"#174f35",marginBottom:8,marginTop:4}}>🔑 AIアシスタント用 Gemini APIキー（各自が取得・入力）</div>
              <div style={{marginBottom:12}}>
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a"}}>Gemini APIキー</label>
                  <div style={{display:"flex", alignItems:"center", gap:8}}>
                    {currentUser?.geminiConfigured
                      ? <span style={{fontSize:10,background:"#d1fae5",color:"#059669",borderRadius:20,padding:"1px 8px",fontWeight:700}}>✅ 設定済み</span>
                      : <span style={{fontSize:10,background:"#fef3c7",color:"#d97706",borderRadius:20,padding:"1px 8px",fontWeight:700}}>⚠️ 未設定</span>
                    }
                    {onOpenWizard && <button onClick={()=>onOpenWizard()} style={{fontSize:10,padding:"2px 8px",borderRadius:6,border:"1px solid #c0dece",background:"#f0f5f2",color:"#059669",cursor:"pointer",fontFamily:"inherit"}}>？ ウィザードで設定</button>}
                  </div>
                </div>
                <input type="password" value={profileForm.geminiKey||""} onChange={e=>setProfileForm(p=>({...p,geminiKey:e.target.value}))}
                  placeholder="AIzaSy..."
                  style={{...inp, fontFamily:"monospace"}} />
                <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>AIアシスタント機能に使用します。<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{color:"#2563eb"}}>Google AI Studio</a>で無料取得できます。</div>
              </div>
              <div style={{background:"#f0f5f2",borderRadius:8,padding:"14px 16px",fontSize:12,color:"#3d7a5e",lineHeight:2,marginBottom:24}}>
                <div style={{fontWeight:700,marginBottom:6,fontSize:13}}>📋 Gemini APIキー 取得手順</div>
                <div><b>① Googleアカウントでサインイン</b></div>
                <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{color:"#2563eb"}}>Google AI Studio（aistudio.google.com）</a> にアクセスし、Googleアカウントでログインします。
                </div>
                <div><b>② 「APIキーを作成」をクリック</b></div>
                <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
                  左メニューまたは画面上部の <b>「Get API key」→「Create API key」</b> をクリックします。
                </div>
                <div><b>③ プロジェクトを選択または作成</b></div>
                <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
                  既存のGoogle Cloudプロジェクトを選択するか、「新しいプロジェクトでAPIキーを作成」を選びます。
                </div>
                <div><b>④ APIキーをコピーして上の欄に貼り付け、「保存」をクリック</b></div>
                <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6}}>
                  発行された <code style={{background:"#d8ede1",padding:"1px 5px",borderRadius:3,fontFamily:"monospace"}}>AIzaSy...</code> で始まるキーをコピーし、入力欄にペーストして保存します。
                </div>
              </div>

              {/* ── Gmail OAuth Client ID ── 管理者とメンバーで完全に分ける */}
              <div style={{borderTop:"1px solid #d8ede1",paddingTop:20,marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#174f35",marginBottom:12}}>
                  📨 Gmail・GoogleタスクTODO 連携設定
                </div>

                {currentUser?.role === "admin" ? (
                  /* ── 管理者向け：Client ID入力 ＋ Google Cloud Console 設定手順 ── */
                  <div>
                    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4}}>
                      <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a"}}>Gmail OAuth Client ID</label>
                      <div style={{display:"flex", alignItems:"center", gap:8}}>
                        {profileForm.gmailClientId
                          ? <span style={{fontSize:10,background:"#d1fae5",color:"#059669",borderRadius:20,padding:"1px 8px",fontWeight:700}}>✅ 設定済み</span>
                          : <span style={{fontSize:10,background:"#fef3c7",color:"#d97706",borderRadius:20,padding:"1px 8px",fontWeight:700}}>⚠️ 未設定</span>
                        }
                        {onOpenWizard && <button onClick={()=>onOpenWizard()} style={{fontSize:10,padding:"2px 8px",borderRadius:6,border:"1px solid #c0dece",background:"#f0f5f2",color:"#059669",cursor:"pointer",fontFamily:"inherit"}}>？ ウィザードで設定</button>}
                      </div>
                    </div>
                    <input type="text" value={profileForm.gmailClientId||""} onChange={e=>setProfileForm(p=>({...p,gmailClientId:e.target.value}))}
                      placeholder="xxxxxxxxxx.apps.googleusercontent.com"
                      style={{...inp, fontFamily:"monospace"}} />
                    <div style={{fontSize:11,color:"#9ca3af",marginTop:4,marginBottom:12}}>
                      <b>管理者が1回だけ</b>設定すると、全メンバーがGmail・GoogleタスクTODO機能を使えるようになります。<a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{color:"#2563eb"}}>Google Cloud Console</a> で取得できます。
                    </div>
                    <div style={{background:"#f0f5f2",borderRadius:8,padding:"14px 16px",fontSize:12,color:"#3d7a5e",lineHeight:2,marginBottom:12}}>
                      <div style={{fontWeight:700,marginBottom:6,fontSize:13}}>📋 Gmail OAuth Client ID 取得手順（管理者が実施）</div>
                      <div><b>① Google Cloud Console でプロジェクトを準備</b></div>
                      <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
                        <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{color:"#2563eb"}}>Google Cloud Console</a> にアクセスし、Googleアカウントでログイン。画面上部のプロジェクト選択から既存のプロジェクトを選ぶか「新しいプロジェクト」を作成します。
                      </div>
                      <div><b>② Gmail API を有効化</b></div>
                      <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
                        左メニュー「APIとサービス」→「ライブラリ」→ 検索欄に <b>「Gmail API」</b> と入力 → 「Gmail API」を選択 →「有効にする」をクリック。
                      </div>
                      <div><b>③ OAuth 同意画面を設定</b></div>
                      <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
                        「APIとサービス」→「OAuth 同意画面」→ ユーザーの種類は <b>「内部」</b> を選択 →「作成」。アプリ名・サポートメールを入力し「保存して次へ」を繰り返して完了します。（Google Workspace 組織の場合。個人アカウントの場合は「外部」を選択してください）
                      </div>
                      <div><b>④ OAuth クライアント ID を作成</b></div>
                      <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
                        「APIとサービス」→「<a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{color:"#2563eb"}}>認証情報</a>」→「認証情報を作成」→「OAuth クライアント ID」をクリック。アプリケーションの種類は <b>「ウェブ アプリケーション」</b> を選択します。
                      </div>
                      <div><b>⑤ 承認済みJavaScript オリジンにURLを追加</b></div>
                      <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
                        「承認済みの JavaScript 生成元」の <b>「URIを追加」</b> をクリックし、このアプリのURL（<code style={{background:"#d8ede1",padding:"1px 5px",borderRadius:3,fontFamily:"monospace"}}>{window.location.origin}</code>）を入力してください。
                      </div>
                      <div><b>⑥ 承認済みリダイレクト URI にURLを追加</b></div>
                      <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
                        同様に「承認済みのリダイレクト URI」にも同じURLを追加し、「作成」をクリック。
                      </div>
                      <div><b>⑦ クライアント ID をコピーして上の欄に貼り付け、「保存」をクリック</b></div>
                      <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6}}>
                        作成完了画面に表示される <code style={{background:"#d8ede1",padding:"1px 5px",borderRadius:3,fontFamily:"monospace"}}>xxxxxxxxxx.apps.googleusercontent.com</code> 形式のクライアント ID をコピーし、入力欄に貼り付けて保存します。
                      </div>
                    </div>
                    <div style={{background:"#eff6ff",borderRadius:8,padding:"14px 16px",fontSize:12,color:"#1e40af",lineHeight:2,marginBottom:12,border:"1px solid #bfdbfe"}}>
                      <div style={{fontWeight:700,marginBottom:6,fontSize:13}}>✅ GoogleタスクTODO登録・カレンダー登録 — 追加設定（管理者が実施）</div>
                      <div style={{fontSize:11,color:"#3b82f6",marginBottom:10}}>上記の Gmail OAuth Client ID をそのまま使います。以下の追加設定が必要です。</div>
                      <div><b>① Google Tasks API を有効化</b></div>
                      <div style={{paddingLeft:16,color:"#1d4ed8",lineHeight:1.6,marginBottom:4}}>
                        <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{color:"#2563eb"}}>Google Cloud Console</a> →「APIとサービス」→「ライブラリ」→ <b>「Google Tasks API」</b> を検索 → 選択 →「<b>有効にする</b>」をクリック。
                      </div>
                      <div><b>② OAuth 同意画面にスコープを追加</b></div>
                      <div style={{paddingLeft:16,color:"#1d4ed8",lineHeight:1.6,marginBottom:4}}>
                        「OAuth 同意画面」→「<b>スコープを追加または削除</b>」→ <code style={{background:"#dbeafe",padding:"1px 5px",borderRadius:3,fontFamily:"monospace"}}>tasks</code> で検索 → <b><code style={{background:"#dbeafe",padding:"1px 5px",borderRadius:3,fontFamily:"monospace"}}>.../auth/tasks</code></b> にチェック →「更新」→「保存して次へ」。
                      </div>
                      <div style={{marginTop:6,padding:"6px 10px",background:"#dbeafe",borderRadius:6,color:"#1e40af"}}>
                        💡 設定後は各メンバーが初回のみGoogleの認証ポップアップで「許可」を押すだけです。個別の追加設定は不要です。
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── メンバー向け：管理者設定状況の表示 ＋ 初回ポップアップ説明のみ ── */
                  <div>
                    {(() => {
                      const sharedClientId = window.__appData?.aiConfig?.gmailClientId || "";
                      return sharedClientId ? (
                        <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"12px 14px",marginBottom:16,fontSize:12,color:"#166534",display:"flex",alignItems:"center",gap:10}}>
                          <div style={{fontSize:20}}>✅</div>
                          <div>
                            <div style={{fontWeight:700}}>Gmail・TODOの連携設定は管理者が完了しています</div>
                            <div style={{fontSize:11,color:"#15803d",marginTop:2}}>初回利用時にGoogleのポップアップが表示されます。「許可」を押すだけで使えるようになります。</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{background:"#fff7ed",border:"1px solid #fde68a",borderRadius:8,padding:"12px 14px",marginBottom:16,fontSize:12,color:"#92400e",display:"flex",alignItems:"center",gap:10}}>
                          <div style={{fontSize:20}}>⚠️</div>
                          <div>
                            <div style={{fontWeight:700}}>管理者がまだGmailの設定を完了していません</div>
                            <div style={{fontSize:11,color:"#b45309",marginTop:2}}>管理者に「API設定」画面でGmail OAuth Client IDを設定してもらってください。</div>
                          </div>
                        </div>
                      );
                    })()}
                    <div style={{background:"#f0fdf4",borderRadius:8,padding:"14px 16px",fontSize:12,color:"#166534",lineHeight:2,marginBottom:12,border:"1px solid #86efac"}}>
                      <div style={{fontWeight:700,marginBottom:6,fontSize:13}}>📋 メンバーがやること（初回のみ）</div>
                      <div><b>① Gmail送信またはTODOボタンを押す</b></div>
                      <div style={{paddingLeft:16,color:"#15803d",lineHeight:1.6,marginBottom:4}}>
                        AIページや営業メールページの「Gmail下書き保存」「GoogleタスクにTODO作成」ボタンをクリックします。
                      </div>
                      <div><b>② Googleのポップアップで「許可」をクリック</b></div>
                      <div style={{paddingLeft:16,color:"#15803d",lineHeight:1.6,marginBottom:4}}>
                        Googleアカウントの選択画面が表示されます。使用するアカウントを選び、「<b>許可</b>」をクリックしてください。
                      </div>
                      <div><b>③ 完了！以降はポップアップは表示されません</b></div>
                      <div style={{paddingLeft:16,color:"#15803d",lineHeight:1.6}}>
                        同じブラウザセッション中は自動でログイン状態が保持されます。ページを再読込した場合は再度ポップアップが表示されることがあります。
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {profileMsg && <div style={{fontSize:12,color:"#059669",fontWeight:700,marginBottom:10}}>{profileMsg}</div>}
              <button onClick={saveProfile}
                style={{padding:"8px 28px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                保存
              </button>
            </div>
          </div>
        )}
        {tab === "leadmgmt" && currentUser?.role==="admin" && (
          <div>
            {/* 流入元 */}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:13,fontWeight:700,color:"#174f35",marginBottom:8}}>流入元</div>
              {/* 新規追加行 */}
              <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
                {/* アイコン選択ボタン */}
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
                          {/* アイコン選択 (編集中) */}
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
                          <button onClick={()=>startEditSource(idx)} style={{padding:"3px 6px",borderRadius:6,background:"#f0fdf4",color:"#059669",border:"1px solid #86efac",cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center"}} title="編集"><PencilIcon color="#059669"/></button>
                          <button onClick={()=>removeSource(sLabel)} style={{padding:"3px 6px",borderRadius:5,background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center"}} title="削除"><TrashIcon color="#dc2626"/></button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* ステータス */}
            <div style={{fontSize:13,fontWeight:700,color:"#174f35",marginBottom:12}}>ステータス管理</div>
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
                      <button onClick={()=>startEditStatus(idx)} style={{padding:"3px 6px",borderRadius:6,background:"#f0fdf4",color:"#059669",border:"1px solid #86efac",cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center"}} title="編集"><PencilIcon color="#059669"/></button>
                      <button onClick={()=>removeStatus(idx)} style={{padding:"3px 6px",borderRadius:5,background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center"}} title="削除"><TrashIcon color="#dc2626"/></button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div style={{background:"#f0f5f2",borderRadius:10,padding:"14px 16px",border:"1px solid #d8ede1"}}>
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
          </div>
        )}
        {tab === "zoho" && currentUser?.role==="admin" && (
          <ZohoCrmSettings />
        )}
        {tab === "accounts" && currentUser?.role==="admin" && (
          <AccountManager currentUser={currentUser} onClose={null} inline={true} onUpdateProfile={onUpdateProfile} />
        )}
        {tab === "myaccount" && (
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#174f35",marginBottom:16}}>👤 アカウント管理</div>
            <div style={{maxWidth:520}}>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:4}}>ID</label>
                <input type="text" value={profileForm.id||""} readOnly
                  style={{width:"100%",padding:"10px 14px",borderRadius:7,border:"1px solid #c0dece",fontSize:13,color:"#3d7a5e",outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#f0f5f2",cursor:"not-allowed"}} />
              </div>
              {[["パスワード","password","password"],["表示名","name","text"],["メールアドレス","email","email"]].map(([lbl,key,type])=>(
                <div key={key} style={{marginBottom:16}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:4}}>{lbl}</label>
                  <input type={type} value={profileForm[key]||""} onChange={e=>{ const v=e.target.value; if(key==="email"){ const prefix=v.includes("@")?v.split("@")[0]:v; setProfileForm(p=>({...p,email:v,id:prefix})); } else { setProfileForm(p=>({...p,[key]:v})); } }}
                    style={{width:"100%",padding:"10px 14px",borderRadius:7,border:"1px solid #c0dece",fontSize:13,color:"#174f35",outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#fff"}} />
                </div>
              ))}
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:6}}>🎨 アイコン色</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {PALETTE.map(c => (
                    <button key={c} onClick={()=>setProfileForm(p=>({...p,color:c}))}
                      style={{width:26,height:26,borderRadius:"50%",background:c, border: profileForm.color===c ? "3px solid #174f35" : "2px solid #fff", cursor:"pointer", boxShadow: profileForm.color===c ? "0 0 0 2px "+c : "0 1px 3px #0002", flexShrink:0}} />
                  ))}
                </div>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:4}}>✍️ メール署名</label>
                <textarea value={profileForm.signature||""} onChange={e=>setProfileForm(p=>({...p,signature:e.target.value}))}
                  placeholder={"例：\n---\n田中 太郎\n〇〇株式会社\nTEL: 03-xxxx-xxxx"}
                  style={{width:"100%",padding:"10px 14px",borderRadius:7,border:"1px solid #c0dece",fontSize:13,color:"#174f35",outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#fff",resize:"vertical",minHeight:100,lineHeight:1.5}} />
              </div>
              {profileMsg && <div style={{fontSize:12,color:"#059669",fontWeight:700,marginBottom:10}}>{profileMsg}</div>}
              <button onClick={saveProfile}
                style={{padding:"8px 28px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function useIsMobile(bp=768) {
  const [m, setM] = useState(typeof window !== 'undefined' && window.innerWidth < bp);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [bp]);
  return m;
}

// ── ウィザード共通部品（SetupWizard の外で定義することで再マウントを防ぐ） ──
function WizardOverlay({ children, onDismiss }) {
  // onDismiss: overview では「完全クローズ」、途中ステップでは「overview に戻る」
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") dismissRef.current?.(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []); // マウント時1回だけ登録。ref経由で最新のonDismissを参照する
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) dismissRef.current?.(); }}>
      {children}
    </div>
  );
}

function WizardStepBar({ current, labels }) {
  const total = labels.length;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 24 }}>
      {labels.map((label, i) => (
        <React.Fragment key={i}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 0 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: i <= current ? "#10b981" : "#e5e7eb", color: i <= current ? "#fff" : "#9ca3af", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {i < current ? "✓" : i + 1}
            </div>
            <div style={{ fontSize: 10, color: i === current ? "#174f35" : "#9ca3af", fontWeight: i === current ? 700 : 400, whiteSpace: "nowrap", textAlign: "center" }}>{label}</div>
          </div>
          {i < total - 1 && <div style={{ flex: 1, height: 2, background: i < current ? "#10b981" : "#e5e7eb", margin: "12px 3px 0" }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function WizardStatusBadge({ ok }) {
  return ok
    ? <span style={{ fontSize: 11, background: "#d1fae5", color: "#059669", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>✅ 設定済み</span>
    : <span style={{ fontSize: 11, background: "#fef3c7", color: "#d97706", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>⚠️ 未設定</span>;
}

// ── セットアップウィザード ──────────────────────────────────────────
function SetupWizard({ currentUser, onUpdateProfile, onSave, aiConfig, onClose }) {
  const [section, setSection] = useState("overview");
  const [step, setStep] = useState(0);
  const [geminiKey, setGeminiKey] = useState(currentUser?.geminiKey || "");
  const [gmailClientId, setGmailClientId] = useState(currentUser?.gmailClientId || "");
  const gcal0 = loadGCalConfig();
  const [calApiKey, setCalApiKey] = useState(gcal0.apiKey || "");
  const [calIds, setCalIds] = useState(gcal0.calendarIds || {});
  const [geminiTest, setGeminiTest] = useState(null); // null | "testing" | "ok" | "error"
  const members = getSalesMembers();

  const geminiOk = !!(currentUser?.geminiConfigured);
  const gmailOk = !!(currentUser?.gmailClientId || window.__appData?.aiConfig?.gmailClientId);
  const calendarOk = !!(gcal0.apiKey && Object.keys(gcal0.calendarIds || {}).length > 0);

  const go = (sec, st = 0) => { setSection(sec); setStep(st); };
  // overview では完全クローズ、途中ステップでは overview に戻るだけ
  const dismiss = section === "overview" ? onClose : () => go("overview");

  const testGemini = async (key) => {
    if (!key.trim()) return;
    setGeminiTest("testing");
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      setGeminiTest(r.ok ? "ok" : "error");
    } catch { setGeminiTest("error"); }
  };

  const cardStyle = { background: "#fff", borderRadius: 12, padding: "28px 32px", maxWidth: 520, width: "100%", boxShadow: "0 8px 32px #0002", maxHeight: "90vh", overflowY: "auto" };
  const btnP = { padding: "10px 28px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  const btnS = { padding: "10px 20px", borderRadius: 8, border: "1px solid #c0dece", background: "#fff", color: "#6a9a7a", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
  const inp = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #c0dece", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "monospace", background: "#fff", color: "#174f35" };

  // ── OVERVIEW ──
  if (section === "overview") return (
    <WizardOverlay onDismiss={dismiss}>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#174f35" }}>🚀 初期設定ウィザード</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: "#6a9a7a", marginBottom: 20 }}>設定したい機能を選んでください。不要な機能はスキップできます。</div>
        {[
          { icon: "🤖", title: "AIアシスタント", desc: "商談メモの分析・要約・次アクション提案", ok: geminiOk, sec: "gemini" },
          { icon: "📧", title: "Gmail連携", desc: "メール下書き自動作成・GoogleタスクTODO登録", ok: gmailOk, sec: "gmail" },
          { icon: "📅", title: "Googleカレンダー", desc: "空き時間の自動検索・商談予定の登録", ok: calendarOk, sec: "calendar" },
        ].map(item => (
          <div key={item.sec} onClick={() => go(item.sec)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: "1px solid #e2f0e8", borderRadius: 10, marginBottom: 8, cursor: "pointer", background: "#f8fbf9", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#eef8f2"} onMouseLeave={e => e.currentTarget.style.background = "#f8fbf9"}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#174f35" }}>{item.title}</div>
              <div style={{ fontSize: 11, color: "#6a9a7a" }}>{item.desc}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <WizardStatusBadge ok={item.ok} />
              <span style={{ color: "#9ca3af", fontSize: 14 }}>›</span>
            </div>
          </div>
        ))}
        <div style={{ textAlign: "right", marginTop: 16 }}>
          <button onClick={onClose} style={btnS}>閉じる</button>
        </div>
      </div>
    </WizardOverlay>
  );

  // ── GEMINI WIZARD ──
  if (section === "gemini") {
    const labels = ["はじめに", "キー取得", "確認"];
    if (step === 0) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={0} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>🤖 AIアシスタントの設定</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 1.9, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>設定すると使えること</div>
            <div>✅ 商談メモをAIが自動で分析・要約</div>
            <div>✅ 架電後の次アクションを自動提案</div>
            <div>✅ 顧客の温度感をスコアリング</div>
          </div>
          <div style={{ fontSize: 12, color: "#6a9a7a", marginBottom: 20 }}>
            使うもの：<b>Google AI Studio</b>（無料・Googleアカウントで今すぐ使えます）<br />所要時間：約5分
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => go("overview")} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(1)} style={btnP}>はじめる →</button>
          </div>
        </div>
      </WizardOverlay>
    );
    if (step === 1) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={1} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>🔑 APIキーを取得する</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 2, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>手順</div>
            <div>1. 下のボタンをクリック → Google AI Studio が開きます</div>
            <div>2. 画面左上 <b>「APIキーを作成」</b> をクリック</div>
            <div>3. <b>「新しいプロジェクトでAPIキーを作成」</b> を選択</div>
            <div>4. <code style={{ background: "#d8ede1", padding: "1px 5px", borderRadius: 3 }}>AIzaSy...</code> で始まる文字列が表示される</div>
            <div>5. <b>「コピー」</b>ボタンを押す</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "8px 16px", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 600, border: "1px solid #bfdbfe", textDecoration: "none" }}>🔗 Google AI Studio を開く（別タブ）</a>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#6a9a7a", display: "block", marginBottom: 4 }}>コピーしたAPIキーを貼り付け</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={geminiKey} onChange={e => { setGeminiKey(e.target.value); setGeminiTest(null); }} placeholder="AIzaSy..." style={{ ...inp, flex: 1 }} />
              <button onClick={() => testGemini(geminiKey.trim())} disabled={!geminiKey.trim() || geminiTest === "testing"}
                style={{ ...btnP, padding: "9px 12px", fontSize: 11, flexShrink: 0, opacity: (!geminiKey.trim() || geminiTest === "testing") ? 0.5 : 1 }}>
                {geminiTest === "testing" ? "確認中…" : "接続テスト"}
              </button>
            </div>
            {geminiTest === "ok" && <div style={{ fontSize: 11, color: "#059669", marginTop: 4, fontWeight: 700 }}>✅ 接続成功！</div>}
            {geminiTest === "error" && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4, fontWeight: 700 }}>❌ 接続失敗。キーを確認してください。</div>}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 20 }}>
            <button onClick={() => { setStep(0); setGeminiTest(null); }} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(2)} disabled={!geminiKey.trim()} style={{ ...btnP, opacity: geminiKey.trim() ? 1 : 0.5 }}>次へ →</button>
          </div>
        </div>
      </WizardOverlay>
    );
    return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={2} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>✅ AIアシスタントの設定完了！</div>
          <div style={{ background: "#d1fae5", borderRadius: 8, padding: "16px", marginBottom: 16, fontSize: 12, color: "#059669" }}>
            <div style={{ fontWeight: 700 }}>✅ 以下のAPIキーを保存します</div>
            <div style={{ fontSize: 11, marginTop: 4, color: "#3d7a5e", fontFamily: "monospace", wordBreak: "break-all" }}>{geminiKey.trim()}</div>
          </div>
          <div style={{ fontSize: 12, color: "#6a9a7a", marginBottom: 20 }}>「保存して完了」を押すと設定が保存されます。<br />「AIページ」でメモの分析が使えるようになります。</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => setStep(1)} style={btnS}>← 戻る</button>
            <button onClick={() => { onUpdateProfile({ ...currentUser, geminiKey: geminiKey.trim() }); go("overview"); }} style={btnP}>保存して完了</button>
          </div>
        </div>
      </WizardOverlay>
    );
  }

  // ── GMAIL WIZARD ──
  if (section === "gmail") {
    const labels = ["はじめに", "API有効化", "同意画面", "ID取得", "完了"];
    if (step === 0) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={0} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>📧 Gmail連携の設定</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 1.9, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>設定すると使えること</div>
            <div>✅ 商談後のお礼メールをワンクリックで下書き作成</div>
            <div>✅ テンプレートに会社名・担当者名を自動差し込み</div>
            <div>✅ GoogleタスクにTODOを自動登録</div>
          </div>
          <div style={{ background: "#fff7ed", borderRadius: 8, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "#92400e", border: "1px solid #fde68a", lineHeight: 1.8 }}>
            <b>👤 管理者のみ設定が必要です。</b><br />
            設定後、各メンバーは初回利用時にポップアップで「許可」を押すだけでOKです。<br />所要時間：約15〜20分
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => go("overview")} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(1)} style={btnP}>はじめる →</button>
          </div>
        </div>
      </WizardOverlay>
    );
    if (step === 1) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={1} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>🔧 APIを有効にする</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 2, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>手順</div>
            <div>1. 下のボタンをクリック → Google Cloud Console が開きます</div>
            <div>2. プロジェクトを選択（なければ新規作成）</div>
            <div>3. 「APIとサービス」→「ライブラリ」を開く</div>
            <div>4. <b>「Gmail API」</b>を検索 → 「有効にする」</div>
            <div>5. <b>「Google Tasks API」</b>も同様に有効にする</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "8px 16px", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 600, border: "1px solid #bfdbfe", textDecoration: "none" }}>🔗 Google Cloud Console を開く（別タブ）</a>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => setStep(0)} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(2)} style={btnP}>完了 → 次へ</button>
          </div>
        </div>
      </WizardOverlay>
    );
    if (step === 2) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={2} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>📋 OAuth同意画面を設定する</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 2, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>手順</div>
            <div>1. 「APIとサービス」→「OAuth同意画面」を開く</div>
            <div>2. ユーザーの種類：<b>「内部」</b>を選択 → 「作成」</div>
            <div>3. アプリ名に「営業ツール」など入力</div>
            <div>4. サポートメールに自分のアドレスを入力</div>
            <div>5. 「スコープを追加」→ <b>Gmail</b> と <b>Tasks</b> を追加</div>
            <div>6. 「保存して次へ」を繰り返して完了</div>
          </div>
          <div style={{ background: "#fef3c7", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#92400e", marginBottom: 16, border: "1px solid #fde68a" }}>
            ⚠️ 「外部」を選ぶと審査が必要になります。社内利用は必ず「内部」を選んでください。
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => setStep(1)} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(3)} style={btnP}>完了 → 次へ</button>
          </div>
        </div>
      </WizardOverlay>
    );
    if (step === 3) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={3} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>🔑 クライアントIDを取得する</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 2, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>手順</div>
            <div>1. 「認証情報」→「認証情報を作成」→「OAuthクライアントID」</div>
            <div>2. アプリの種類：<b>「ウェブアプリケーション」</b>を選択</div>
            <div>3. 「承認済みJavaScriptオリジン」に追加：</div>
            <div style={{ paddingLeft: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <code style={{ background: "#d8ede1", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>{window.location.origin}</code>
              <button onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.origin).catch(() => {
                    prompt("以下のURLをコピーしてください：", window.location.origin);
                  });
                } else {
                  prompt("以下のURLをコピーしてください：", window.location.origin);
                }
              }} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "1px solid #c0dece", background: "#fff", color: "#059669", cursor: "pointer", fontFamily: "inherit" }}>📋 コピー</button>
            </div>
            <div>4. 「作成」→ クライアントIDをコピー</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#6a9a7a", display: "block", marginBottom: 4 }}>コピーしたクライアントIDを貼り付け</label>
            <input value={gmailClientId} onChange={e => setGmailClientId(e.target.value)} placeholder="xxxxxxxxxx.apps.googleusercontent.com" style={inp} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 20 }}>
            <button onClick={() => setStep(2)} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(4)} disabled={!gmailClientId.trim()} style={{ ...btnP, opacity: gmailClientId.trim() ? 1 : 0.5 }}>次へ →</button>
          </div>
        </div>
      </WizardOverlay>
    );
    return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={4} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>✅ Gmail連携の設定完了！</div>
          <div style={{ background: "#d1fae5", borderRadius: 8, padding: "16px", marginBottom: 14, fontSize: 12, color: "#059669" }}>
            <div style={{ fontWeight: 700 }}>✅ 以下のクライアントIDを保存します</div>
            <div style={{ fontSize: 11, marginTop: 4, color: "#3d7a5e", fontFamily: "monospace", wordBreak: "break-all" }}>{gmailClientId.trim()}</div>
          </div>
          <div style={{ background: "#eff6ff", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#1e40af", marginBottom: 20, border: "1px solid #bfdbfe" }}>
            💡 各メンバーは初めてメール送信するとき、Googleのポップアップが出ます。「許可」を押すだけでOKです。
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => setStep(3)} style={btnS}>← 戻る</button>
            <button onClick={() => { onUpdateProfile({ ...currentUser, gmailClientId: gmailClientId.trim() }); if (onSave) onSave({ ...(aiConfig||{}), gmailClientId: gmailClientId.trim() }); go("overview"); }} style={btnP}>保存して完了</button>
          </div>
        </div>
      </WizardOverlay>
    );
  }

  // ── CALENDAR WIZARD ──
  if (section === "calendar") {
    const labels = ["はじめに", "プロジェクト", "APIキー", "カレンダーID", "完了"];
    if (step === 0) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={0} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>📅 Googleカレンダーの設定</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 1.9, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>設定すると使えること</div>
            <div>✅ チームの空き時間を自動で検索</div>
            <div>✅ 商談候補日をワンクリックでカレンダーに登録</div>
          </div>
          <div style={{ fontSize: 12, color: "#6a9a7a", marginBottom: 20 }}>必要なもの：各メンバーのGoogleカレンダーID<br />所要時間：約15〜30分　👤 管理者が1回だけ実施すればOK</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => go("overview")} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(1)} style={btnP}>はじめる →</button>
          </div>
        </div>
      </WizardOverlay>
    );
    if (step === 1) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={1} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>🔧 Google Cloudを準備する</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 2, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>手順</div>
            <div>1. 下のボタンをクリック → Google Cloud Console が開きます</div>
            <div>2. 画面上部「プロジェクトを選択」をクリック</div>
            <div>3. 「新しいプロジェクト」→ 名前を入力 → 「作成」</div>
            <div>4. 「APIとサービス」→「ライブラリ」を開く</div>
            <div>5. <b>「Google Calendar API」</b>を検索 → 「有効にする」</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "8px 16px", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 600, border: "1px solid #bfdbfe", textDecoration: "none" }}>🔗 Google Cloud Console を開く（別タブ）</a>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => setStep(0)} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(2)} style={btnP}>完了 → 次へ</button>
          </div>
        </div>
      </WizardOverlay>
    );
    if (step === 2) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={2} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>🔑 APIキーを取得する</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 2, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>手順</div>
            <div>1. Cloud Console の「認証情報」を開く</div>
            <div>2. 「認証情報を作成」→「APIキー」をクリック</div>
            <div>3. <code style={{ background: "#d8ede1", padding: "1px 5px", borderRadius: 3 }}>AIzaSy...</code> で始まる文字列をコピー</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#6a9a7a", display: "block", marginBottom: 4 }}>APIキーを貼り付け</label>
            <input value={calApiKey} onChange={e => setCalApiKey(e.target.value)} placeholder="AIzaSy..." style={inp} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 20 }}>
            <button onClick={() => setStep(1)} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(3)} disabled={!calApiKey.trim()} style={{ ...btnP, opacity: calApiKey.trim() ? 1 : 0.5 }}>次へ →</button>
          </div>
        </div>
      </WizardOverlay>
    );
    if (step === 3) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={{ ...cardStyle, maxWidth: 560 }}>
          <WizardStepBar current={3} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>👥 メンバーのカレンダーIDを入力する</div>
          <div style={{ background: "#fff7ed", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#92400e", marginBottom: 14, border: "1px solid #fde68a", lineHeight: 1.8 }}>
            <b>📌 カレンダーIDの確認方法（各メンバーが自分で確認）</b><br />
            Googleカレンダー → 左の自分の名前「⋮」→「設定と共有」→「カレンダーのID」をコピー<br />
            <b>⚠️ 「予定の詳細を表示」を「全員」に共有設定を変更してください</b>
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 12 }}>
            {members.map(m => (
              <div key={m} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#174f35", minWidth: 64, flexShrink: 0 }}>{m}</span>
                <input value={(calIds || {})[m] || ""} onChange={e => setCalIds(p => ({ ...p, [m]: e.target.value }))} placeholder="例：tanaka@gmail.com" style={{ ...inp, fontSize: 12 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => setStep(2)} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(4)} disabled={members.length > 0 && Object.values(calIds).filter(v => v.trim()).length === 0} style={{ ...btnP, opacity: (members.length === 0 || Object.values(calIds).filter(v => v.trim()).length > 0) ? 1 : 0.5 }}>次へ →</button>
          </div>
        </div>
      </WizardOverlay>
    );
    const filledIds = Object.entries(calIds).filter(([, v]) => v.trim());
    return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={4} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>✅ カレンダー設定完了！</div>
          <div style={{ background: "#d1fae5", borderRadius: 8, padding: "16px", marginBottom: 16, fontSize: 12, color: "#059669" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>保存する内容</div>
            <div>✅ APIキー：設定済み</div>
            {filledIds.map(([name, id]) => <div key={name}>✅ {name}：{id}</div>)}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => setStep(3)} style={btnS}>← 戻る</button>
            <button onClick={() => {
              const filteredIds = Object.fromEntries(Object.entries(calIds).filter(([, v]) => v.trim()));
              saveGCalConfig({ apiKey: calApiKey.trim(), calendarIds: filteredIds });
              go("overview");
            }} style={btnP}>保存して完了</button>
          </div>
        </div>
      </WizardOverlay>
    );
  }

  return null;
}

function App() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(() => sessionStorage.getItem('current_page') || "dashboard");
  const navigate = (p) => { sessionStorage.setItem('current_page', p); setPage(p); };
  const [settingsTab, setSettingsTab] = useState(null);
  const [dashFilter, setDashFilter] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [masterVer, setMasterVer] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [aiConfig, setAiConfig] = useState({});
  const selectUser = (account, data) => {
    setCurrentUser(account);
    USER_COLORS[account.name] = account.color;
    localStorage.setItem("current_user_id", account.id);
    if (data) {
      const l = data.leads || [];
      const migrated = l.map(lead => lead.portal_type === "請求" ? { ...lead, portal_type: "一括請求" } : lead);
      // React 18 では非同期コールバック内の複数 setState も自動バッチ処理されるため
      // setLeads → setAiConfig → setMasterVer の順で呼んでも中間レンダリングは発生しない
      setLeads(migrated);
      setAiConfig(data.aiConfig || {});
      setMasterVer(v => v + 1);
    }
  };
  const logout = () => {
    apiPost('/api/logout', {});
    localStorage.removeItem('current_user_id');
    window.__appData = { accounts: [], leads: [], masterSettings: null, aiConfig: {}, gcalConfig: {}, emailTpls: null, zohoConfig: null, zohoAuthenticated: false };
    setCurrentUser(null);
    setLeads([]);
    setAiConfig({});
  };
  const updateMyProfile = (profile) => {
    const originalId = currentUser.id;
    const accounts = loadAccounts();
    const newAccounts = accounts.map(a => a.id === originalId ? { ...a, ...profile } : a);
    saveAccounts(newAccounts);
    const updated = newAccounts.find(a => a.id === (profile.id || originalId)) || { ...currentUser, ...profile };
    setCurrentUser(updated);
    USER_COLORS[updated.name] = updated.color;
    IS_COLORS[updated.name] = { bg: updated.color, text: updated.color, border: updated.color + "55" };
    localStorage.setItem("current_user_id", updated.id);
  };
  const [candidateSlots, setCandidateSlots] = useState([]);
  const [calendarLeadId, setCalendarLeadId] = useState("");
  const [aiOpenLeadId, setAiOpenLeadId] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  // geminiConfiguredの優先順位: 個人設定 > グローバル設定（APIキー自体はサーバー側のみ保持）
  // ※ aiConfig は React state（saveAiConfig で更新）、window.__appData.aiConfig と常に同期している
  const effectiveAiConfig = useMemo(() => ({
    ...aiConfig,
    geminiConfigured: !!(currentUser?.geminiConfigured || aiConfig.geminiConfigured),
    gmailClientId: currentUser?.gmailClientId || aiConfig.gmailClientId || ""
  }), [currentUser, aiConfig]);
  const saveAiConfig = (cfg) => {
    setAiConfig(cfg);
    window.__appData.aiConfig = cfg;
    apiPost('/api/ai-config', cfg);
  };

  useEffect(() => {
    async function init() {
      // セッションCookieが有効なら自動的に認証される（localStorageのトークン不要）
      const savedId = localStorage.getItem('current_user_id');
      try {
        const r = await fetch('/api/data');
        if (r.ok) {
          const data = await r.json();
          window.__appData = data;
          data.accounts.forEach(a => {
            USER_COLORS[a.name] = a.color;
            IS_COLORS[a.name] = { bg: a.color, text: a.color, border: a.color + "55" };
          });
          const user = data.accounts.find(a => a.id === savedId);
          if (user) {
            setCurrentUser(user);
            USER_COLORS[user.name] = user.color;
          } else {
            localStorage.removeItem('current_user_id');
          }
          setAiConfig(data.aiConfig || {});
          setMasterVer(v => v + 1);
        } else if (r.status === 401) {
          localStorage.removeItem('current_user_id');
        }
      } catch {}
      const l = await loadLeads();
      const migrated = l.map(lead => lead.portal_type === "請求" ? { ...lead, portal_type: "一括請求" } : lead);
      setLeads(migrated);
      setLoaded(true);
      if (migrated.some((lead,i) => lead.portal_type !== l[i].portal_type)) saveLeads(migrated);
    }
    init();
  }, []);

  const mut = (next) => { setLeads(next); saveLeads(next); };
  const addLead    = (l)       => mut([l, ...leads]);
  const updateLead = (id, p)   => mut(leads.map(l => l.id === id ? { ...l, ...p } : l));
  const deleteLead = (id)      => mut(leads.filter(l => l.id !== id));
  const addAction  = (id, act) => mut(leads.map(l => l.id === id
    ? { ...l, actions: [{ ...act, recorded_by: currentUser?.name || "" }, ...(l.actions || [])] } : l));

  if (!loaded) return <Splash />;
  if (!currentUser) return <LoginScreen onLogin={selectUser} />;

  return (
    <div style={{...S.root, flexDirection: isMobile ? "column" : "row"}}>
      <style>{CSS}</style>
      <Nav page={page} setPage={navigate} setSettingsTab={setSettingsTab} count={leads.length} currentUser={currentUser} onLogout={logout} onUpdateProfile={updateMyProfile} isMobile={isMobile} />
      {showWizard && <SetupWizard currentUser={currentUser} onUpdateProfile={updateMyProfile} onSave={saveAiConfig} aiConfig={effectiveAiConfig} onClose={() => setShowWizard(false)} />}
      <main style={{...S.main, paddingBottom: isMobile ? 65 : 0}}>
        {page === "dashboard" && <Dashboard leads={leads} currentUser={currentUser} onNavigate={(f)=>{ setDashFilter(f); navigate("leads"); }} masterVer={masterVer} isMobile={isMobile} />}
        {page === "trend"     && <Trend leads={leads} />}
        {page === "leads"     && <LeadList leads={leads} initialFilter={dashFilter} onFilterConsumed={()=>setDashFilter(null)} initialOpenId={aiOpenLeadId} onOpenIdConsumed={()=>setAiOpenLeadId(null)} onAdd={addLead} onUpdate={updateLead} onDelete={deleteLead} onAddAction={addAction} currentUser={currentUser} isMobile={isMobile} readOnly={false}
          onBulkAdd={newLeads => { const next = [...newLeads, ...leads]; setLeads(next); saveLeads(next); }} />}
        {page === "ai"        && <AIPage leads={leads} onAdd={addLead} onUpdate={updateLead} onAddAction={addAction} goLeads={(leadId) => { setAiOpenLeadId(leadId||null); navigate("leads"); }} goCalendar={() => navigate("calendar")} aiConfig={effectiveAiConfig} currentUser={currentUser} isMobile={isMobile} />}
        {page === "calendar"  && <CalendarPage candidateSlots={candidateSlots} onSlotsChange={setCandidateSlots} onGoEmail={(leadId)=>{ setCalendarLeadId(leadId); navigate("email"); }} currentUser={currentUser} leads={leads} />}
        {page === "settings"  && <SettingsPage aiConfig={effectiveAiConfig} onSave={saveAiConfig} currentUser={currentUser} onUpdateProfile={updateMyProfile} initialTab={settingsTab} onLeadsChange={setLeads} onMasterSave={() => setMasterVer(v => v + 1)} onOpenWizard={() => setShowWizard(true)} />}
        {page === "email"     && <EmailPage leads={leads} onUpdate={updateLead} currentUser={currentUser} candidateSlots={candidateSlots} initialLeadId={calendarLeadId} isMobile={isMobile} />}
      </main>
    </div>
  );
}

// ─── Google Calendar 設定 ───────────────────────────────

function CalendarPage({ candidateSlots = [], onSlotsChange = ()=>{}, onGoEmail = ()=>{}, currentUser, leads = [] }) {
  const [cfg, setCfg] = useState(() => loadGCalConfig());
  const [showSetup, setShowSetup] = useState(false);
  const [editCfg, setEditCfg] = useState(() => loadGCalConfig());
  const accountCalendarIds = useMemo(() => {
    const accounts = loadAccounts();
    const ids = {};
    accounts.forEach(a => { if (a.calendarId) ids[a.name] = a.calendarId; });
    return ids;
  }, []);
  const mergedCalendarIds = useMemo(() => ({
    ...(cfg.calendarIds||{}),
    ...accountCalendarIds
  }), [cfg, accountCalendarIds]);

  // 検索条件
  const [selectedMembers, setSelectedMembers] = useState(["北原"]);
  const [dateFrom, setDateFrom] = useState(TODAY);
  const [dateTo, setDateTo]     = useState(() => {
    const d = new Date(TODAY + "T00:00:00"); d.setDate(d.getDate()+14);
    return d.toISOString().split("T")[0];
  });
  const [duration, setDuration] = useState(60);
  const [timeStart, setTimeStart] = useState("09:00");
  const [timeEnd,   setTimeEnd]   = useState("18:00");
  const [bufferBefore, setBufferBefore] = useState(30);
  const [bufferAfter,  setBufferAfter]  = useState(30);
  const [activeDays, setActiveDays] = useState([1,2,3,4,5]);
  const [includeHolidays, setIncludeHolidays] = useState(false);
  const [excludeTimes, setExcludeTimes] = useState([{from:"12:00",to:"13:00"}]);

  // 結果
  const [slots, setSlots]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [searched, setSearched] = useState(false);

  // カレンダー登録モーダル用
  const [showCalReg, setShowCalReg] = useState(false);
  const [calRegLeadId, setCalRegLeadId] = useState("");
  const [calRegCompany, setCalRegCompany] = useState("");
  const [calRegTitleTpl, setCalRegTitleTpl] = useState("仮WEB営1）【{{会社名}}様】");
  const [calRegLoading, setCalRegLoading] = useState(false);
  const [calRegToken, setCalRegToken] = useState(null);
  const [calRegResults, setCalRegResults] = useState([]);
  const [emailLeadId, setEmailLeadId] = useState("");

  const isConfigured = cfg.apiKey && Object.keys(mergedCalendarIds).length > 0;

  // Google Calendar freebusy APIを叩く
  const search = async () => {
    if (!isConfigured) { setShowSetup(true); return; }
    setLoading(true); setError(""); setSlots([]); setSearched(false);

    try {
      const timeMin = dateFrom + "T00:00:00+09:00";
      const timeMax = dateTo   + "T23:59:59+09:00";

      // 対象メンバーのカレンダーIDを収集
      const items = selectedMembers
        .map(m => mergedCalendarIds[m])
        .filter(Boolean)
        .map(id => ({ id }));

      if (items.length === 0) { setError("選択したメンバーのカレンダーIDが設定されていません"); setLoading(false); return; }

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/freeBusy?key=${cfg.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeMin, timeMax, items })
        }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error?.message || "APIエラー");
      }
      const data = await res.json();

      // 各メンバーの busy 時間帯を収集
      const busyByMember = {};
      selectedMembers.forEach(m => {
        const calId = mergedCalendarIds[m];
        if (!calId) return;
        busyByMember[m] = (data.calendars[calId]?.busy || []).map(b => ({
          start: new Date(b.start), end: new Date(b.end)
        }));
      });

      // 空き時間スロットを生成
      const found = [];
      const from = new Date(dateFrom + "T00:00:00+09:00");
      const to   = new Date(dateTo   + "T23:59:59+09:00");
      const [sh, sm] = timeStart.split(":").map(Number);
      const [eh, em] = timeEnd.split(":").map(Number);
      const bufBefore = bufferBefore * 60000; // ms
      const bufAfter  = bufferAfter  * 60000; // ms

      let cur = new Date(from);
      while (cur <= to) {
        const jstDate = new Date(cur.getTime() + 9*60*60000);
        const dow = jstDate.getUTCDay();
        const ds  = jstDate.toISOString().split("T")[0];
        if (activeDays.includes(dow) && (!JP_HOLIDAYS.has(ds) || includeHolidays)) {
          // この日の稼働時間内でスロットを探す
          let slotStart = new Date(cur);
          slotStart.setHours(sh, sm, 0, 0);
          const dayEnd = new Date(cur);
          dayEnd.setHours(eh, em, 0, 0);

          while (slotStart.getTime() + duration * 60000 <= dayEnd.getTime()) {
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            // バッファ込みの占有時間帯
            const checkStart = new Date(slotStart.getTime() - bufBefore);
            const checkEnd   = new Date(slotEnd.getTime()   + bufAfter);
            // 除外時間帯チェック
            const inExclude = excludeTimes.some(ex => {
              const [exSh,exSm]=ex.from.split(":").map(Number);
              const [exEh,exEm]=ex.to.split(":").map(Number);
              const exS=new Date(slotStart);exS.setHours(exSh,exSm,0,0);
              const exE=new Date(slotStart);exE.setHours(exEh,exEm,0,0);
              return slotStart<exE&&slotEnd>exS;
            });
            // OR検索：空いているメンバーを列挙
            const freeMembers = inExclude ? [] : selectedMembers.filter(m => {
              const busy = busyByMember[m] || [];
              return !busy.some(b => checkStart < b.end && checkEnd > b.start);
            });
            if (freeMembers.length > 0) {
              found.push({ date: ds, start: slotStart.toTimeString().slice(0,5), end: slotEnd.toTimeString().slice(0,5), members: freeMembers });
              // 次スロットは商談終了＋後バッファ後から
              slotStart = new Date(slotEnd.getTime() + bufAfter);
            } else {
              slotStart = new Date(slotStart.getTime() + 30 * 60000);
            }
          }
        }
        cur.setDate(cur.getDate() + 1);
      }

      setSlots(found);
      setSearched(true);
    } catch(e) {
      setError("エラー: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const copySlot = (slot) => {
    const txt = `${slot.date} ${slot.start}〜${slot.end}（${slot.members.join("・")}）`;
    navigator.clipboard?.writeText(txt).catch(()=>{});
    alert("コピーしました：\n" + txt);
  };
  const isSlotSelected = (slot) => candidateSlots.some(s=>s.date===slot.date&&s.start===slot.start&&s.end===slot.end);
  const toggleCandidateSlot = (slot) => {
    if (isSlotSelected(slot)) {
      onSlotsChange(candidateSlots.filter(s=>!(s.date===slot.date&&s.start===slot.start&&s.end===slot.end)));
    } else if (candidateSlots.length < 3) {
      onSlotsChange([...candidateSlots, slot]);
    }
  };

  const resolvedCalTitle = calRegTitleTpl.replace(/\{\{会社名\}\}/g, calRegCompany);

  const openCalReg = () => {
    setCalRegTitleTpl("仮WEB営1）【{{会社名}}様】");
    const preselectedLead = leads.find(l => l.id === emailLeadId);
    setCalRegLeadId(emailLeadId);
    setCalRegCompany(preselectedLead?.company || "");
    setCalRegResults([]);
    setShowCalReg(true);
  };

  const registerToCalendar = async () => {
    const aiCfg = window.__appData?.aiConfig || {};
    const clientId = currentUser?.gmailClientId || aiCfg.gmailClientId || "";
    if (!clientId) { alert(currentUser?.role === "admin" ? "設定 > APIキー設定 で Gmail Client ID を入力してください" : "管理者にGmail OAuth Client IDの設定を依頼してください"); return; }
    if (candidateSlots.length === 0) return;
    setCalRegLoading(true); setCalRegResults([]);
    try {
      // 有効期限内のトークンがあれば再利用、期限切れなら再取得する
      let tokenObj = calRegToken;
      if (!isTokenValid(tokenObj)) {
        if (!window.google?.accounts?.oauth2) {
          await new Promise((res, rej) => {
            // 既にスクリプトがDOMにあれば重複追加しない
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
            scope: 'https://www.googleapis.com/auth/calendar.events',
            callback: (resp) => {
              if (resp.error) { handleOAuthCallbackError(resp, rej); }
              else { res(resp.access_token); }
            },
            error_callback: (err) => handleOAuthPopupError(err, rej)
          });
          client.requestAccessToken();
        });
        tokenObj = { token: rawToken, expiresAt: Date.now() + 55 * 60 * 1000 };
        setCalRegToken(tokenObj);
      }
      const token = tokenObj.token;
      const title = resolvedCalTitle;
      const results = [];
      for (const slot of candidateSlots) {
        const slotMembers = slot.members?.length > 0 ? slot.members : selectedMembers;
        const missingMembers = slotMembers.filter(m => !mergedCalendarIds[m]);
        missingMembers.forEach(member => results.push({ slot, member, success: false, error: "カレンダーIDなし" }));
        const attendees = slotMembers
          .filter(m => mergedCalendarIds[m])
          .map(m => ({ email: mergedCalendarIds[m] }));
        try {
          const startDT = `${slot.date}T${slot.start}:00+09:00`;
          const endDT = `${slot.date}T${slot.end}:00+09:00`;
          const resp = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none`,
            { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ summary: title, start: { dateTime: startDT, timeZone: "Asia/Tokyo" }, end: { dateTime: endDT, timeZone: "Asia/Tokyo" }, attendees }) }
          );
          if (!resp.ok) {
            const err = await resp.json();
            if (err.error?.code === 401) { setCalRegToken(null); throw new Error('認証の期限が切れました。再度お試しください。'); }
            slotMembers.forEach(member => results.push({ slot, member, success: false, error: err.error?.message || "登録失敗" }));
          } else {
            slotMembers.forEach(member => results.push({ slot, member, success: true }));
          }
        } catch(e) { slotMembers.forEach(member => results.push({ slot, member, success: false, error: e.message })); }
      }
      setCalRegResults(results);
    } catch(e) {
      setCalRegToken(null);
      alert("エラー：" + e.message);
    } finally {
      setCalRegLoading(false);
    }
  };

  const members = getSalesMembers();
  const inp2 = { ...S.inp, marginBottom:0 };

  return (
    <div className="cal-page" style={{...S.page, width:"60vw", maxWidth:"100%"}}>
      <Header title="📅 商談候補日検索" sub="Google Calendarの空き時間を自動検索します">
        <button onClick={()=>{ setEditCfg(loadGCalConfig()); setShowSetup(v=>!v); }}
          style={{...S.btnSec, fontSize:12}}>⚙️ カレンダー設定</button>
      </Header>

      {/* 設定パネル */}
      {showSetup && (
        <div style={{...S.card, marginBottom:16, border:"1px solid #fde68a", background:"#fffbeb"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#d97706",marginBottom:12}}>⚙️ Google Calendar API 設定</div>

          {/* 設定手順 */}
          <div style={{background:"#fff",border:"1px solid #fde68a",borderRadius:8,padding:"12px 14px",marginBottom:14,fontSize:12,color:"#92400e",lineHeight:1.8}}>
            <div style={{fontWeight:700,marginBottom:6}}>📋 設定手順</div>
            <div>① <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{color:"#0284c7"}}>Google Cloud Console</a> でプロジェクトを作成</div>
            <div>② 「APIとサービス」→「ライブラリ」→ <b>Google Calendar API</b> を有効化</div>
            <div>③ 「認証情報」→「APIキーを作成」→ APIキーをコピー</div>
            <div>④ 各担当者のGoogleカレンダーを開き「設定」→「カレンダーのID」をコピー<br/>　　（例：<code style={{background:"#fef9c3",padding:"1px 4px",borderRadius:3}}>abcdef@gmail.com</code> または <code style={{background:"#fef9c3",padding:"1px 4px",borderRadius:3}}>xxx@group.calendar.google.com</code>）</div>
            <div>⑤ カレンダーの「共有設定」で <b>「一般公開して誰でも閲覧できるようにする」</b> をON（または「予定の詳細を表示」を許可）</div>
          </div>

          {/* カレンダー登録機能の追加設定 */}
          <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"12px 14px",marginBottom:14,fontSize:12,color:"#1e40af",lineHeight:1.9}}>
            <div style={{fontWeight:700,marginBottom:6}}>📅 「カレンダーに登録」機能を使う場合の追加設定（管理者が1回だけ実施）</div>
            <div>⑥ 「認証情報」→「OAuthクライアントID」を作成（種類：<b>ウェブアプリケーション</b>）</div>
            <div>　　→ 「承認済みJavaScriptオリジン」に <code style={{background:"#dbeafe",padding:"1px 4px",borderRadius:3}}>{window.location.origin}</code> を追加</div>
            <div>⑦ 「OAuthの同意画面」でスコープに <code style={{background:"#dbeafe",padding:"1px 4px",borderRadius:3}}>https://www.googleapis.com/auth/calendar.events</code> を追加</div>
            <div>⑧ 作成した <b>クライアントID</b> を ⚙️設定 &gt; APIキー設定 の「Gmail Client ID」欄に入力すれば全員が使用可能になります</div>
            <div style={{marginTop:8,padding:"6px 10px",background:"#dbeafe",borderRadius:6,color:"#1e40af"}}>
              💡 各営業は初回のみGoogleの認証ポップアップで「許可」を押すだけです。個別の設定は不要です。
            </div>
            <div style={{marginTop:6,color:"#1d4ed8",fontWeight:600}}>※ 空き時間の検索（freeBusy）は APIキーのみで動作します。カレンダーへの予定登録にはOAuth認証（Client ID）が必要です。</div>
          </div>

          <div style={{marginBottom:10}}>
            <label style={{...S.lbl}}>Google Calendar APIキー</label>
            <input value={editCfg.apiKey||""} onChange={e=>setEditCfg(p=>({...p,apiKey:e.target.value}))}
              placeholder="AIzaSy..." style={inp2} />
          </div>

          <div style={{marginBottom:4}}>
            <label style={{...S.lbl}}>担当者ごとのカレンダーID</label>
          </div>
          {members.map(m => (
            <div key={m} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:12,fontWeight:600,color:"#174f35",minWidth:70}}>{m}</span>
              <input value={(editCfg.calendarIds||{})[m]||""}
                onChange={e=>setEditCfg(p=>({...p,calendarIds:{...(p.calendarIds||{}),[m]:e.target.value}}))}
                placeholder="例：tanaka@gmail.com"
                style={{...inp2,flex:1}} />
            </div>
          ))}

          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
            <button onClick={()=>setShowSetup(false)} style={S.btnSec}>閉じる</button>
            <button onClick={()=>{ saveGCalConfig(editCfg); setCfg(editCfg); setShowSetup(false); }} style={S.btnP}>保存</button>
          </div>
        </div>
      )}

      {!isConfigured && !showSetup && (
        <div style={{...S.card,textAlign:"center",padding:"32px",marginBottom:16}}>
          <div style={{fontSize:32,marginBottom:10}}>⚙️</div>
          <div style={{fontSize:14,color:"#2d6b4a",marginBottom:8}}>まずカレンダーAPIの設定が必要です</div>
          <button onClick={()=>setShowSetup(true)} style={S.btnP}>設定を開く</button>
        </div>
      )}

      {/* 検索フォーム */}
      {isConfigured && (
        <div style={S.card}>
          <div style={{fontSize:13,fontWeight:700,color:"#174f35",marginBottom:12}}>🔍 空き時間を検索</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <label style={S.lbl}>期間（開始）</label>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={S.inp} />
            </div>
            <div>
              <label style={S.lbl}>期間（終了）</label>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={S.inp} />
            </div>
            <div>
              <label style={S.lbl}>時間帯（開始）</label>
              <select value={timeStart} onChange={e=>setTimeStart(e.target.value)} style={S.inp}>
                {Array.from({length:24},(_,i)=>`${String(i).padStart(2,"0")}:00`).map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={S.lbl}>時間帯（終了）</label>
              <select value={timeEnd} onChange={e=>setTimeEnd(e.target.value)} style={S.inp}>
                {Array.from({length:24},(_,i)=>`${String(i).padStart(2,"0")}:00`).map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={S.lbl}>商談時間</label>
              <select value={duration} onChange={e=>setDuration(Number(e.target.value))} style={S.inp}>
                <option value={30}>30分</option>
                <option value={60}>1時間</option>
                <option value={90}>1時間30分</option>
                <option value={120}>2時間</option>
              </select>
            </div>
            <div>
              <label style={S.lbl}>前後バッファ（移動・準備時間）</label>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <select value={bufferBefore} onChange={e=>setBufferBefore(Number(e.target.value))} style={{...S.inp,flex:1}}>
                  <option value={0}>前：なし</option>
                  <option value={15}>前：15分</option>
                  <option value={30}>前：30分</option>
                  <option value={60}>前：60分</option>
                </select>
                <select value={bufferAfter} onChange={e=>setBufferAfter(Number(e.target.value))} style={{...S.inp,flex:1}}>
                  <option value={0}>後：なし</option>
                  <option value={15}>後：15分</option>
                  <option value={30}>後：30分</option>
                  <option value={60}>後：60分</option>
                </select>
              </div>
            </div>
          </div>
          {(bufferBefore > 0 || bufferAfter > 0) && (
            <div style={{fontSize:11,color:"#6a9a7a",marginBottom:10,background:"#f0f5f2",borderRadius:6,padding:"6px 10px"}}>
              💡 前後バッファON：既存予定の前{bufferBefore}分・後{bufferAfter}分も空きとして確保します（移動・準備時間）
            </div>
          )}

          {/* 曜日選択 */}
          <div style={{marginBottom:12}}>
            <label style={S.lbl}>対象曜日</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              {[["日",0,"#ef4444"],["月",1,"#3b82f6"],["火",2,"#3b82f6"],["水",3,"#3b82f6"],["木",4,"#3b82f6"],["金",5,"#3b82f6"],["土",6,"#8b5cf6"]].map(([label,val,col])=>{
                const active=activeDays.includes(val);
                return <button key={val} onClick={()=>setActiveDays(prev=>active?prev.filter(d=>d!==val):[...prev,val].sort())} style={{width:40,height:40,borderRadius:20,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:active?col:"#f0f5f2",color:active?"#fff":col,transition:"all 0.15s"}}>
                  {label}
                </button>;
              })}
              <button onClick={()=>setIncludeHolidays(v=>!v)} style={{height:40,padding:"0 12px",borderRadius:20,border:includeHolidays?"none":"1.5px dashed #f59e0b",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:includeHolidays?"#f59e0b":"#f0f5f2",color:includeHolidays?"#fff":"#f59e0b",transition:"all 0.15s",whiteSpace:"nowrap"}}>
                祝日
              </button>
            </div>
            {activeDays.length===0&&<div style={{fontSize:11,color:"#ef4444",marginTop:4}}>⚠️ 曜日を1つ以上選択</div>}
          </div>
          {/* 対象外時間帯 */}
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <label style={{...S.lbl,marginBottom:0}}>🚫 対象外時間帯</label>
              <button onClick={()=>setExcludeTimes(prev=>[...prev,{from:"12:00",to:"13:00"}])} style={{fontSize:11,padding:"4px 10px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>＋ 追加</button>
            </div>
            {excludeTimes.length===0&&<div style={{fontSize:11,color:"#9ca3af",padding:"6px 10px",background:"#f9fafb",borderRadius:6,border:"1px dashed #d1d5db"}}>対象外時間帯なし</div>}
            {excludeTimes.map((ex,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:"#fff8f0",border:"1px solid #fde68a",borderRadius:8,padding:"8px 12px"}}>
                <input type="time" value={ex.from} onChange={e=>setExcludeTimes(prev=>prev.map((t,j)=>j===i?{...t,from:e.target.value}:t))} style={{...S.inp,marginBottom:0,padding:"4px 8px",width:90,fontSize:12}}/>
                <span style={{fontSize:12,color:"#6b7280"}}>〜</span>
                <input type="time" value={ex.to} onChange={e=>setExcludeTimes(prev=>prev.map((t,j)=>j===i?{...t,to:e.target.value}:t))} style={{...S.inp,marginBottom:0,padding:"4px 8px",width:90,fontSize:12}}/>
                <span style={{fontSize:11,color:"#6b7280"}}>は除外</span>
                <button onClick={()=>setExcludeTimes(prev=>prev.filter((_,j)=>j!==i))} style={{marginLeft:"auto",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:5,cursor:"pointer",padding:"3px 6px",display:"flex",alignItems:"center"}} title="削除"><TrashIcon color="#dc2626"/></button>
              </div>
            ))}
          </div>
          <div style={{marginBottom:12}}>
            <label style={S.lbl}>対象メンバー（複数選択可）</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {members.map(m => {
                const active = selectedMembers.includes(m);
                const hasId = !!mergedCalendarIds[m];
                return (
                  <button key={m} onClick={()=>setSelectedMembers(prev=>
                    active ? prev.filter(x=>x!==m) : [...prev,m]
                  )} style={{fontSize:12,padding:"5px 12px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",
                    background: active ? "#10b98133" : "transparent",
                    color: active ? "#059669" : "#6a9a7a",
                    border: `1px solid ${active ? "#10b98166" : "#c0dece"}`,
                    fontWeight: active ? 700 : 400,
                    opacity: hasId ? 1 : 0.5,
                  }}>
                    {m}{!hasId && " ⚠️"}
                  </button>
                );
              })}
            </div>
            {selectedMembers.some(m=>!mergedCalendarIds[m]) && (
              <div style={{fontSize:11,color:"#f59e0b",marginTop:4}}>⚠️ カレンダーID未設定のメンバーは除外されます</div>
            )}
          </div>

          <button onClick={search} disabled={loading}
            style={{...S.btnP, width:"100%", opacity:loading?0.6:1}}>
            {loading ? "🔍 検索中..." : "🔍 空き時間を検索"}
          </button>
          {error && <div style={{color:"#ef4444",fontSize:12,marginTop:8}}>{error}</div>}
        </div>
      )}

      {/* 検索結果 */}
      {searched && (
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
              <button onClick={openCalReg} disabled={candidateSlots.length===0}
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
              {/* 日付でグループ化 */}
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
      )}

      {/* カレンダー登録モーダル */}
      {showCalReg && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}
          onClick={e=>{if(e.target===e.currentTarget){setShowCalReg(false);setCalRegLeadId("");}}}>
          <div style={{background:"#fff",borderRadius:16,padding:28,width:500,maxWidth:"95vw",boxShadow:"0 8px 40px rgba(0,0,0,0.2)",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{fontSize:16,fontWeight:800,color:"#174f35",marginBottom:18}}>📅 Googleカレンダーに登録</div>

            <div style={{marginBottom:12}}>
              <label style={{...S.lbl}}>会社名<span style={{fontWeight:400,color:"#6b7280",fontSize:11,marginLeft:6}}>（{"{{会社名}}"} に代入されます）</span></label>
              {leads.length > 0 && (
                <div style={{marginBottom:6}}>
                  <LeadCombobox
                    leads={leads}
                    value={calRegLeadId}
                    onChange={id => {
                      setCalRegLeadId(id);
                      const lead = leads.find(l => l.id === id);
                      if (lead) setCalRegCompany(lead.company || "");
                    }}
                    placeholder="リードから検索・選択"
                    inputStyle={S.inp}
                    darkMode={false}
                  />
                </div>
              )}
              <input value={calRegCompany} onChange={e=>setCalRegCompany(e.target.value)}
                placeholder="例：株式会社〇〇" style={S.inp} />
            </div>

            <div style={{marginBottom:16}}>
              <label style={{...S.lbl}}>タイトルテンプレート</label>
              <input value={calRegTitleTpl} onChange={e=>setCalRegTitleTpl(e.target.value)} style={S.inp} />
              <div style={{fontSize:11,color:"#6b7280",marginTop:4,background:"#f0f5f2",borderRadius:6,padding:"5px 10px"}}>
                プレビュー：<span style={{fontWeight:700,color:"#174f35"}}>{resolvedCalTitle || "（タイトル未入力）"}</span>
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{...S.lbl}}>登録する候補日（{candidateSlots.length}件）</label>
              {candidateSlots.map((slot,i)=>(
                <div key={i} style={{fontSize:12,background:"#ecfdf5",border:"1px solid #10b98144",borderRadius:8,padding:"7px 12px",marginBottom:6,color:"#174f35",display:"flex",alignItems:"center",gap:8}}>
                  <span>📅 {slot.date}（{["日","月","火","水","木","金","土"][new Date(slot.date+"T00:00:00").getDay()]}）{slot.start}〜{slot.end}</span>
                  {slot.members?.length > 0 && <span style={{color:"#6a9a7a",fontSize:11}}>担当：{slot.members.join("・")}</span>}
                </div>
              ))}
            </div>

            {calRegResults.length > 0 && (
              <div style={{marginBottom:16}}>
                <label style={{...S.lbl}}>登録結果</label>
                {calRegResults.map((r,i)=>(
                  <div key={i} style={{fontSize:12,borderRadius:8,padding:"5px 10px",marginBottom:4,
                    background:r.success?"#ecfdf5":"#fef2f2",
                    border:`1px solid ${r.success?"#10b98144":"#fca5a544"}`,
                    color:r.success?"#065f46":"#b91c1c"}}>
                    {r.success ? "✅" : "❌"} {r.slot.date} {r.slot.start}〜{r.slot.end}
                    {r.member && <span style={{marginLeft:6,fontWeight:600}}>{r.member}</span>}
                    ：{r.success ? "登録完了" : r.error}
                  </div>
                ))}
              </div>
            )}

            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
              <button onClick={()=>{setShowCalReg(false);setCalRegLeadId("");}} style={S.btnSec}>閉じる</button>
              <button onClick={registerToCalendar}
                disabled={calRegLoading || !resolvedCalTitle.trim()}
                style={{...S.btnP,opacity:(calRegLoading||!resolvedCalTitle.trim())?0.6:1,
                  cursor:(calRegLoading||!resolvedCalTitle.trim())?"not-allowed":"pointer"}}>
                {calRegLoading ? "⏳ 登録中..." : calRegResults.length > 0 && calRegResults.every(r=>r.success) ? "✅ 登録済み（再登録）" : "📅 カレンダーに登録する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



    class ErrorBoundary extends React.Component {
      constructor(props){super(props);this.state={hasError:false,error:null};}
      static getDerivedStateFromError(e){return{hasError:true,error:e};}
      render(){
        if(this.state.hasError){
          return <div style={{padding:40,textAlign:"center",fontFamily:"'Noto Sans JP',sans-serif"}}>
            <div style={{fontSize:40,marginBottom:16}}>⚠️</div>
            <div style={{fontSize:18,fontWeight:700,color:"#dc2626",marginBottom:8}}>エラーが発生しました</div>
            <div style={{fontSize:13,color:"#6b7280",marginBottom:24,maxWidth:400,margin:"0 auto 24px"}}>{String(this.state.error?.message||"予期しないエラーが発生しました")}</div>
            <button onClick={()=>this.setState({hasError:false,error:null})} style={{padding:"8px 24px",borderRadius:8,background:"#059669",color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer"}}>再試行</button>
          </div>;
        }
        return this.props.children;
      }
    }
    const root=ReactDOM.createRoot(document.getElementById('root'));
    root.render(<ErrorBoundary><App/></ErrorBoundary>);
