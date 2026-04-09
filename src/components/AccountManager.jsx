import React from 'react';
import { PALETTE } from '../lib/constants.js';
import { loadAccounts, saveAccounts } from '../lib/master.js';
import { PencilIcon, TrashIcon } from './icons.jsx';

export function AccountManager({ currentUser, onClose, inline, onUpdateProfile }) {
  const [accounts, setAccounts] = React.useState(loadAccounts);
  const [form, setForm] = React.useState({ id:"", name:"", password:"", role:"member", color:PALETTE[0], email:"", signature:"", isStaff:false });
  const [editingId, setEditingId] = React.useState(null);
  const [err, setErr] = React.useState("");
  const [lockedAccounts, setLockedAccounts] = React.useState({});
  const [inviteCode, setInviteCode] = React.useState(null);
  const [inviteLoading, setInviteLoading] = React.useState(false);

  React.useEffect(() => {
    // ロック中アカウントを取得
    fetch('/api/login-locks')
      .then(r => r.ok ? r.json() : {})
      .then(setLockedAccounts)
      .catch(err => console.error('ロック情報取得失敗:', err));
  }, []);

  const handleUnlock = async (id) => {
    await fetch('/api/login-lock/' + id, { method:'DELETE' });
    setLockedAccounts(prev => { const n = {...prev}; delete n[id]; return n; });
  };

  const handleGenerateInvite = async () => {
    setInviteLoading(true);
    try {
      const r = await fetch('/api/invite', { method:'POST', headers:{ 'Content-Type':'application/json' } });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || `エラーコード ${r.status}`);
      }
      const data = await r.json();
      setInviteCode(data.code);
    } catch (e) { alert("招待コードの発行に失敗しました: " + e.message); }
    setInviteLoading(false);
  };

  const save = (updated, editedId) => {
    setAccounts(updated);
    saveAccounts(updated);
    if (onUpdateProfile && editedId && editedId === currentUser?.id) {
      const updatedAccount = updated.find(a => a.id === editedId);
      if (updatedAccount) onUpdateProfile(updatedAccount);
    }
  };
  const handleSubmit = () => {
    if (!form.id.trim() || !form.name.trim()) { setErr("全項目入力してください"); return; }
    if (!editingId && !form.password.trim()) { setErr("パスワードを入力してください"); return; }
    if (form.password.trim()) {
      if (form.password.length < 8) { setErr("パスワードは8文字以上で入力してください"); return; }
      if (!/[a-zA-Z]/.test(form.password)) { setErr("パスワードに英字を含めてください"); return; }
      if (!/[0-9]/.test(form.password)) { setErr("パスワードに数字を含めてください"); return; }
    }
    if (accounts.some(a => a.id === form.id.trim() && a.id !== editingId)) { setErr("このIDは既に使われています"); return; }
    const updated = editingId !== null
      ? accounts.map(a => a.id === editingId ? { ...form, id: form.id.trim() } : a)
      : [...accounts, { ...form, id: form.id.trim() }];
    save(updated, editingId);
    setForm({ id:"", name:"", password:"", role:"member", color:PALETTE[0], email:"", signature:"", isStaff:false });
    setEditingId(null); setErr("");
  };
  const startEdit = (a) => {
    setForm({ ...a, password: "" });
    setEditingId(a.id); setErr("");
  };
  const cancelEdit = () => { setForm({ id:"", name:"", password:"", role:"member", color:PALETTE[0], email:"", signature:"", isStaff:false }); setEditingId(null); setErr(""); };
  const deleteAccount = (id) => {
    if (id === currentUser.id) { alert("自分のアカウントは削除できません"); return; }
    if (!window.confirm("削除しますか？")) return;
    save(accounts.filter(a => a.id !== id), null);
  };

  const content = (
    <>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:16,fontWeight:800,color:"#174f35"}}>👥 アカウント管理</div>
          {!inline && <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#6a9a7a"}}>✕</button>}
        </div>
        <div style={{marginBottom:16,padding:"12px 14px",background:"#f0faf5",borderRadius:9,border:"1px solid #c0dece"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#174f35",marginBottom:8}}>🔗 招待コード発行</div>
          <div style={{fontSize:11,color:"#6a9a7a",marginBottom:8}}>コードは24時間有効・1回限り使用可能です</div>
          <button onClick={handleGenerateInvite} disabled={inviteLoading} style={{padding:"6px 14px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:inviteLoading?0.6:1}}>
            {inviteLoading ? "発行中..." : "招待コードを発行"}
          </button>
          {inviteCode && (
            <div style={{marginTop:10,padding:"8px 12px",background:"#fff",borderRadius:7,border:"1px solid #10b981",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:"#059669",letterSpacing:2}}>{inviteCode}</span>
              <button onClick={()=>{navigator.clipboard.writeText(inviteCode); alert("コピーしました");}} style={{fontSize:11,padding:"3px 8px",borderRadius:5,border:"1px solid #c0dece",background:"#f0faf5",color:"#6a9a7a",cursor:"pointer",fontFamily:"inherit"}}>コピー</button>
              <button onClick={()=>setInviteCode(null)} style={{fontSize:11,padding:"3px 8px",borderRadius:5,border:"none",background:"none",color:"#9ca3af",cursor:"pointer"}}>✕</button>
            </div>
          )}
        </div>
        <div style={{marginBottom:20}}>
          {accounts.map(a => (
            <div key={a.id} style={{borderRadius:9,border:"1px solid #d8ede1",marginBottom:6,overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#f0f5f2"}}>
                <span style={{width:28,height:28,borderRadius:"50%",background:a.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,flexShrink:0}}>{a.name[0]}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#174f35",display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                    {a.name}
                    <span style={{fontSize:10,color:"#6a9a7a"}}>@{a.id}</span>
                    {a.role==="admin" && <span style={{fontSize:10,background:"#f3f4f6",color:"#6b7280",borderRadius:4,padding:"1px 6px",fontWeight:700}}>管理者</span>}
                    {a.isStaff && <span style={{fontSize:10,background:"#dcfce7",color:"#15803d",borderRadius:4,padding:"1px 6px",fontWeight:700}}>IS担当</span>}
                  </div>
                  {a.email && <div style={{fontSize:11,color:"#6a9a7a",marginTop:2}}>✉️ {a.email}</div>}
                </div>
                {lockedAccounts[a.id] && <button onClick={()=>handleUnlock(a.id)} title="ログインロックを解除" style={{fontSize:12,padding:"3px 10px",borderRadius:6,background:"#fef3c7",color:"#d97706",border:"1px solid #fcd34d",cursor:"pointer",fontFamily:"inherit"}}>🔓 解除</button>}
                <button onClick={()=>startEdit(a)} style={{padding:"3px 6px",borderRadius:6,background:"#f0fdf4",color:"#059669",border:"1px solid #86efac",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center"}} title="編集"><PencilIcon color="#059669"/></button>
                <button onClick={()=>deleteAccount(a.id)} style={{padding:"3px 6px",borderRadius:6,background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center"}} title="削除"><TrashIcon color="#dc2626"/></button>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:"#f0f5f2",borderRadius:10,padding:"16px",border:"1px solid #d8ede1"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#174f35",marginBottom:12}}>{editingId ? "✏️ アカウント編集" : "＋ アカウント追加"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            {[["ユーザーID","id","例：tanaka"],["表示名","name","例：田中"],["パスワード","password","パスワード"],["メールアドレス","email","例：tanaka@example.com"]].map(([lbl,key,ph])=>(
              <div key={key}>
                <label style={{fontSize:11,color:"#6a9a7a",display:"block",marginBottom:3}}>{lbl}{key==="password"&&editingId&&<span style={{fontWeight:400,color:"#9ca3af",marginLeft:4}}>（空欄のままにすると変更なし）</span>}</label>
                <input value={form[key]||""} onChange={e=>{ const v=e.target.value; if(key==="email"){ const prefix=v.includes("@")?v.split("@")[0]:v; setForm(p=>({...p,email:v,id:prefix})); } else if(key!=="id"){ setForm(p=>({...p,[key]:v})); } }}
                  placeholder={key==="password"&&editingId?"新しいパスワードを入力":ph} type={key==="email"?"email":"text"}
                  readOnly={key==="id"}
                  style={{width:"100%",padding:"7px 10px",borderRadius:7,border:"1px solid #c0dece",background:key==="id"?"#f0f5f2":"#fff",fontSize:12,color:key==="id"?"#6a9a7a":"#174f35",outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:key==="id"?"not-allowed":"text"}} />
              </div>
            ))}
            <div>
              <label style={{fontSize:11,color:"#6a9a7a",display:"block",marginBottom:3}}>権限</label>
              <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}
                style={{width:"100%",padding:"7px 10px",borderRadius:7,border:"1px solid #c0dece",background:"#fff",fontSize:12,color:"#174f35",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
                <option value="member">メンバー</option>
                <option value="admin">管理者</option>
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:18}}>
              <input type="checkbox" id="isStaffCheck" checked={!!form.isStaff} onChange={e=>setForm(p=>({...p,isStaff:e.target.checked}))}
                style={{width:16,height:16,accentColor:"#10b981",cursor:"pointer"}} />
              <label htmlFor="isStaffCheck" style={{fontSize:12,color:"#174f35",cursor:"pointer",userSelect:"none"}}>
                IS担当の選択肢に表示する
              </label>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:11,color:"#6a9a7a",display:"block",marginBottom:3}}>✍️ メール署名</label>
            <textarea value={form.signature||""} onChange={e=>setForm(p=>({...p,signature:e.target.value}))}
              placeholder={"例：\n---\n田中 太郎\n〇〇株式会社\nTEL: 03-xxxx-xxxx"}
              style={{width:"100%",padding:"7px 10px",borderRadius:7,border:"1px solid #c0dece",background:"#fff",fontSize:12,color:"#174f35",outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",minHeight:72,lineHeight:1.5}} />
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:"#6a9a7a",display:"block",marginBottom:5}}>アイコン色</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {PALETTE.map(c => (
                <button key={c} onClick={()=>setForm(p=>({...p,color:c}))}
                  style={{width:24,height:24,borderRadius:"50%",background:c,border:form.color===c?"3px solid #174f35":"2px solid #fff",cursor:"pointer",boxShadow:form.color===c?"0 0 0 2px "+c:"none"}} />
              ))}
            </div>
          </div>
          {err && <div style={{fontSize:12,color:"#dc2626",marginBottom:8}}>⚠️ {err}</div>}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            {editingId && <button onClick={cancelEdit} style={{padding:"7px 16px",borderRadius:7,border:"1px solid #c0dece",background:"#fff",color:"#6a9a7a",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>キャンセル</button>}
            <button onClick={handleSubmit} style={{padding:"7px 20px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {editingId ? "更新" : "追加"}
            </button>
          </div>
        </div>
    </>
  );
  if (inline) return <div>{content}</div>;
  return (
    <div style={{position:"fixed", inset:0,background:"#0005", display:"flex",alignItems:"center", justifyContent:"center", zIndex:1000}}>
      <div style={{background:"#fff",borderRadius:16,padding:"28px 32px", width:"min(560px,95vw)", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 8px 40px #0003",border:"1px solid #d8ede1"}}>
        {content}
      </div>
    </div>
  );
}
