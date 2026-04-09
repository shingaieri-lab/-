import React from 'react';
import { DEFAULT_SOURCES, DEFAULT_STATUSES_WITH_COLORS, LEAD_SOURCE_ICONS, PALETTE } from '../lib/constants.js';
import { loadLeads, saveLeads } from '../lib/api.js';
import { getMaster, saveMasterSettings, getStatuses, getSalesMembers } from '../lib/master.js';
import { loadGCalConfig } from '../lib/gcal.js';
import { PencilIcon, TrashIcon } from './icons.jsx';
import { SourceIconSVG } from './SourceIconSVG.jsx';
import { AccountManager } from './AccountManager.jsx';

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

export function SettingsPage({ aiConfig, onSave, currentUser, onUpdateProfile, initialTab, onLeadsChange, onMasterSave, onOpenWizard }) {
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
