// ログイン画面（ログイン / 新規登録 / パスワードリセット）
import { useState } from 'react';
import { S } from '../styles/index.js';
import { PALETTE, USER_COLORS } from '../lib/accounts.js';
import { IS_COLORS } from '../lib/master.js';
import { EyeIcon, EyeOffIcon, CheckCircleIcon, AlertIcon, WrenchIcon } from '../components/ui/Icons.jsx';

export function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [sForm, setSForm] = useState({ id:"", name:"", password:"", password2:"", color:PALETTE[0], email:"", inviteCode:"" });
  const [sErr, setSErr] = useState(""); const [sOk, setSOk] = useState(false); const [showSPw, setShowSPw] = useState(false);
  const [rForm, setRForm] = useState({ id:"", code:"", password:"", confirm:"" });
  const [rErr, setRErr] = useState(""); const [rOk, setROk] = useState(false); const [rLoading, setRLoading] = useState(false);

  const handleSignup = async () => {
    const { id, name, password, password2, color, email, inviteCode } = sForm;
    if (!id.trim() || !name.trim() || !email.trim() || !password.trim() || !password2.trim()) { setSErr("全項目入力してください"); return; }
    if (password !== password2) { setSErr("パスワードが一致しません"); return; }
    const newAccount = { id: id.trim(), name: name.trim(), password, role:"admin", color, email: email.trim(), inviteCode: inviteCode.trim() };
    try {
      const r = await fetch('/api/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(newAccount) });
      if (!r.ok) { const e = await r.json(); setSErr(e.error || "作成に失敗しました"); return; }
      USER_COLORS[newAccount.name] = color;
      IS_COLORS[newAccount.name] = { bg:color, text:color, border:color+"55" };
      setSOk(true); setSErr("");
    } catch { setSErr("サーバーに接続できません"); }
  };

  const handleResetWithCode = async () => {
    if (!rForm.id.trim() || !rForm.password.trim() || !rForm.confirm.trim()) { setRErr("全項目入力してください"); return; }
    if (rForm.password !== rForm.confirm) { setRErr("パスワードが一致しません"); return; }
    setRLoading(true); setRErr("");
    try {
      const r = await fetch('/api/reset-password-direct', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rForm.id.trim(), newPassword: rForm.password })
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setRErr(data.error || "エラーが発生しました");
      } else {
        setROk(true);
      }
    } catch { setRErr("サーバーに接続できません"); }
    setRLoading(false);
  };

  const handleLogin = async () => {
    try {
      const r = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:userId.trim(), password }) });
      if (!r.ok) { setErr("IDまたはパスワードが違います"); return; }
      const { account } = await r.json();
      localStorage.setItem('current_user_id', account.id);
      const dataR = await fetch('/api/data');
      const data = dataR.ok ? await dataR.json() : null;
      if (data) {
        window.__appData = data;
        data.accounts.forEach(a => {
          USER_COLORS[a.name] = a.color;
          IS_COLORS[a.name] = { bg:a.color, text:a.color, border:a.color+"55" };
        });
      }
      onLogin(account, data);
    } catch { setErr("サーバーに接続できません"); }
  };

  const card = { background:"#fff", borderRadius:16, padding:"36px 32px", boxShadow:"0 8px 32px #0569691a", border:"1px solid #e2f0e8", width:360, maxWidth:"90vw" };
  const inp2 = { ...S.inp, marginBottom:0 };

  if (mode === "forgot") return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#f0faf5,#e8f5ee)" }}>
      <div style={card}>
        <div style={{ fontSize:20, fontWeight:900, color:"#174f35", marginBottom:6 }}>パスワードのリセット</div>
        <div style={{ fontSize:12, color:"#6a9a7a", marginBottom:20 }}>ユーザーIDと新しいパスワードを入力してください</div>
        {rOk ? (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:8, display:"flex", justifyContent:"center" }}><CheckCircleIcon size={40} color="#059669" /></div>
            <div style={{ fontWeight:700, color:"#059669", marginBottom:4 }}>パスワードを更新しました</div>
            <div style={{ fontSize:12, color:"#6a9a7a", marginBottom:20 }}>新しいパスワードでログインしてください</div>
            <button onClick={() => { setMode("login"); setROk(false); setRForm({id:"",code:"",password:"",confirm:""}); }} style={{ ...S.btnP, width:"100%" }}>ログインへ</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom:12 }}>
              <label style={{ ...S.lbl, display:"block", marginBottom:2 }}>ユーザーID</label>
              <input value={rForm.id} onChange={e => setRForm(p => ({...p, id:e.target.value}))} placeholder="例：tanaka" style={inp2} />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ ...S.lbl, display:"block", marginBottom:2 }}>新しいパスワード</label>
              <div style={{ fontSize:11, color:"#6a9a7a", marginBottom:3 }}>8文字以上・英字と数字を含む</div>
              <input type="password" value={rForm.password} onChange={e => setRForm(p => ({...p, password:e.target.value}))} style={inp2} />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ ...S.lbl, display:"block", marginBottom:2 }}>新しいパスワード（確認）</label>
              <input type="password" value={rForm.confirm} onChange={e => setRForm(p => ({...p, confirm:e.target.value}))} onKeyDown={e => e.key === "Enter" && handleResetWithCode()} style={inp2} />
            </div>
            {rErr && <div style={{ color:"#ef4444", fontSize:12, marginBottom:10, display:"flex", alignItems:"center", gap:4 }}><AlertIcon size={12} color="#ef4444" /> {rErr}</div>}
            <button onClick={handleResetWithCode} disabled={rLoading} style={{ ...S.btnP, width:"100%", marginBottom:10, opacity:rLoading?0.6:1 }}>{rLoading ? "更新中..." : "パスワードを更新"}</button>
            <button onClick={() => { setMode("login"); setRErr(""); }} style={{ width:"100%", background:"none", border:"none", color:"#6a9a7a", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>← ログインに戻る</button>
          </>
        )}
      </div>
    </div>
  );

  if (mode === "signup") return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#f0faf5,#e8f5ee)" }}>
      <div style={card}>
        <div style={{ fontSize:20, fontWeight:900, color:"#174f35", marginBottom:6 }}>新規アカウント作成</div>
        <div style={{ fontSize:12, color:"#6a9a7a", marginBottom:20 }}>招待コードを受け取った管理者のみ作成できます</div>
        {sOk ? (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:8, display:"flex", justifyContent:"center" }}><CheckCircleIcon size={40} color="#059669" /></div>
            <div style={{ fontWeight:700, color:"#059669", marginBottom:16 }}>アカウントを作成しました</div>
            <button onClick={() => { setMode("login"); setSOk(false); setSForm({id:"",name:"",password:"",password2:"",color:PALETTE[0],email:""}); }} style={{ ...S.btnP, width:"100%" }}>ログインへ</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom:12 }}>
              <label style={{ ...S.lbl, display:"block", marginBottom:2 }}>招待コード<span style={{ color:"#ef4444" }}>*</span></label>
              <input value={sForm.inviteCode} onChange={e => setSForm(p => ({...p, inviteCode:e.target.value}))} placeholder="管理者から受け取ったコードを入力" style={inp2} />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ ...S.lbl, display:"block", marginBottom:2 }}>表示名<span style={{ color:"#ef4444" }}>*</span></label>
              <input value={sForm.name} onChange={e => setSForm(p => ({...p, name:e.target.value}))} style={inp2} />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ ...S.lbl, display:"block", marginBottom:2 }}>メールアドレス<span style={{ color:"#ef4444" }}>*</span></label>
              <input value={sForm.email||""} onChange={e => { const v=e.target.value; const prefix=v.includes("@")?v.split("@")[0]:v; setSForm(p=>({...p,email:v,id:prefix})); }} style={inp2} />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ ...S.lbl, display:"block", marginBottom:2 }}>パスワード<span style={{ color:"#ef4444" }}>*</span></label>
              <div style={{ fontSize:11, color:"#6a9a7a", marginBottom:3 }}>8文字以上・英字と数字を含む</div>
              <div style={{ position:"relative" }}>
                <input type={showSPw?"text":"password"} value={sForm.password} onChange={e => setSForm(p => ({...p, password:e.target.value}))} style={{ ...inp2, paddingRight:36 }} />
                <button onClick={() => setShowSPw(v => !v)} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center" }}>{showSPw ? <EyeOffIcon size={18} color="#6a9a7a" /> : <EyeIcon size={18} color="#6a9a7a" />}</button>
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ ...S.lbl, display:"block", marginBottom:2 }}>パスワード（確認）<span style={{ color:"#ef4444" }}>*</span></label>
              <div style={{ fontSize:11, color:"#6a9a7a", marginBottom:3 }}>パスワード確認の為上記と同じ内容を入力</div>
              <input type={showSPw?"text":"password"} value={sForm.password2} onChange={e => setSForm(p => ({...p, password2:e.target.value}))} style={inp2} />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ ...S.lbl, display:"block", marginBottom:6 }}>アイコン色<span style={{ color:"#ef4444" }}>*</span></label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {PALETTE.map(c => (
                  <button key={c} onClick={() => setSForm(p => ({...p, color:c}))}
                    style={{ width:24, height:24, borderRadius:"50%", background:c, border: sForm.color===c ? "2px solid #174f35" : "2px solid #fff", cursor:"pointer" }} />
                ))}
              </div>
            </div>
            {sErr && <div style={{ color:"#ef4444", fontSize:12, marginBottom:10 }}>{sErr}</div>}
            <button onClick={handleSignup} style={{ ...S.btnP, width:"100%", marginBottom:10 }}>アカウントを作成</button>
            <button onClick={() => setMode("login")} style={{ width:"100%", background:"none", border:"none", color:"#6a9a7a", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>← ログインに戻る</button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#f0faf5,#e8f5ee)" }}>
      <div style={card}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:32, marginBottom:8, display:"flex", justifyContent:"center" }}><WrenchIcon size={36} color="#10b981" /></div>
          <div style={{ fontSize:22, fontWeight:900, color:"#174f35" }}>IS進捗管理</div>
          <div style={{ fontSize:12, color:"#6a9a7a", marginTop:4 }}>IS進捗管理 インサイドセールス</div>
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ ...S.lbl, display:"block", marginBottom:3 }}>ログインID</label>
          <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="例：tanaka" style={inp2} onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ ...S.lbl, display:"block", marginBottom:3 }}>パスワード</label>
          <div style={{ position:"relative" }}>
            <input type={showPw?"text":"password"} value={password} onChange={e => setPassword(e.target.value)} style={{ ...inp2, paddingRight:36 }} onKeyDown={e => e.key === "Enter" && handleLogin()} />
            <button onClick={() => setShowPw(v => !v)} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center" }}>{showPw ? <EyeOffIcon size={18} color="#6a9a7a" /> : <EyeIcon size={18} color="#6a9a7a" />}</button>
          </div>
        </div>
        {err && <div style={{ color:"#ef4444", fontSize:12, marginBottom:12 }}>{err}</div>}
        <button onClick={handleLogin} style={{ ...S.btnP, width:"100%", marginBottom:12 }}>ログイン</button>
        <button onClick={() => { setMode("signup"); setErr(""); }} style={{ width:"100%", background:"none", border:"1px solid #c0dece", borderRadius:8, padding:"8px", color:"#3d7a5e", cursor:"pointer", fontSize:12, fontFamily:"inherit", marginBottom:8 }}>新規アカウントを作成</button>
        <button onClick={() => { setMode("forgot"); setErr(""); }} style={{ width:"100%", background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>パスワードを忘れた方はこちら</button>
      </div>
    </div>
  );
}
