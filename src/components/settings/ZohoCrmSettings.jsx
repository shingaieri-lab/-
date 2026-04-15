// Zoho CRM連携設定（認証・マッピング・Webhook情報）
import { useState } from 'react';
import { getSalesMembers, getStatuses } from '../../lib/master.js';

export function ZohoCrmSettings() {
  const stored = window.__appData?.zohoConfig || {};
  const [cfg, setCfg] = useState({
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
  const [authenticated, setAuthenticated] = useState(window.__appData?.zohoAuthenticated || false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [newStatusZoho, setNewStatusZoho] = useState('');
  const [newStatusLocal, setNewStatusLocal] = useState('');
  const [newReverseLocal, setNewReverseLocal] = useState('');
  const [newReverseZoho, setNewReverseZoho] = useState('');
  const [newMemberZoho, setNewMemberZoho] = useState('');
  const [newMemberLocal, setNewMemberLocal] = useState('');

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
    <div style={{width:"100%"}}>
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
