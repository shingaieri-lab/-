// AIアシスタントページ（アクション記録→AI解析→ネクストアクション提案・メール生成）
import { useState, useEffect } from 'react';
import { LeadCombobox } from '../components/leads/LeadCombobox.jsx';
import { ACTION_TYPES, ACTION_RESULTS } from '../constants/index.js';
import { JP_HOLIDAYS } from '../lib/holidays.js';
import { getEffectiveAiConfig } from '../lib/accounts.js';
import { acquireGmailToken, buildGmailDraftRaw, postGmailDraft, isTokenValid, handleOAuthCallbackError, handleOAuthPopupError } from '../lib/oauth.js';

const SS_KEY = "ai_page_state";
const loadSS = () => { try { return JSON.parse(sessionStorage.getItem(SS_KEY)||"{}"); } catch(_){ return {}; } };

export function AIPage({ leads, onAdd, onUpdate, goLeads, goCalendar, aiConfig, currentUser, isMobile }) {
  const geminiConfigured = !!(aiConfig||{}).geminiConfigured;
  const [selLead, setSelLead] = useState(()=>loadSS().selLead||"");
  const [memo, setMemo] = useState(()=>loadSS().memo||"");
  const [actionDate, setActionDate] = useState(()=>loadSS().actionDate||new Date().toISOString().split("T")[0]);
  const [actionTime, setActionTime] = useState(()=>{ const ss=loadSS(); if(ss.actionTime) return ss.actionTime; const n=new Date(); const m=Math.floor(n.getMinutes()/30)*30; return `${String(n.getHours()).padStart(2,"0")}:${String(m).padStart(2,"0")}`; });
  const [manualType, setManualType] = useState(()=>loadSS().manualType||"call");
  const [manualResult, setManualResult] = useState(()=>loadSS().manualResult||"取次");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(()=>{ const ss=loadSS(); return ss.result||null; });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedActId, setSavedActId] = useState(null);
  const [activeTab, setActiveTab] = useState("action");
  const [editEmail, setEditEmail] = useState(()=>{ const ss=loadSS(); return ss.editEmail||{ subject:"", body:"" }; });
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedZoho, setCopiedZoho] = useState(false);
  const [aiGmailToken, setAiGmailToken] = useState(null);
  const [aiGmailSaving, setAiGmailSaving] = useState(false);
  const [aiGmailSaved, setAiGmailSaved] = useState(false);
  const [aiCalToken, setAiCalToken] = useState(null);
  const [aiCalSaving, setAiCalSaving] = useState(false);
  const [aiCalSaved, setAiCalSaved] = useState(false);
  const lead = leads.find(l=>l.id===selLead);

  // 状態変化をsessionStorageに保存してページ遷移後も復元できるようにする
  useEffect(() => {
    try {
      const ss = loadSS();
      sessionStorage.setItem(SS_KEY, JSON.stringify({...ss, selLead, memo, actionDate, actionTime, manualType, manualResult, result, editEmail}));
    } catch(_) {}
  }, [selLead, memo, actionDate, actionTime, manualType, manualResult, result, editEmail]);

  // リードが変更されたら保存状態をリセット（別リードで「保存済み」が残らないように）
  useEffect(() => { setSaved(false); setSavedActId(null); }, [selLead]);

  const resetAiPage = () => {
    const today = new Date().toISOString().split("T")[0];
    const n = new Date(); const m = Math.floor(n.getMinutes()/30)*30;
    const nowTime = `${String(n.getHours()).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
    setSelLead(""); setMemo(""); setActionDate(today); setActionTime(nowTime);
    setManualType("call"); setManualResult("取次"); setResult(null);
    setError(""); setSaved(false); setEditEmail({ subject:"", body:"" });
    sessionStorage.removeItem(SS_KEY);
  };

  const addBizDays=(dateStr,days)=>{
    let d=new Date(dateStr+"T00:00:00"),c=0;
    while(c<days){d.setDate(d.getDate()+1);const s=d.toISOString().split("T")[0];if(d.getDay()!==0&&d.getDay()!==6&&!JP_HOLIDAYS.has(s))c++;}
    return d.toISOString().split("T")[0];
  };

  // AIが提案する時間を営業時間（9〜18時、12〜13時除外）に補正する
  const clampToBusinessTime=(timeStr)=>{
    if(!timeStr) return "10:00";
    const [h,m]=timeStr.split(":").map(Number);
    const mins=(isNaN(h)?10:h)*60+(isNaN(m)?0:m);
    if(mins<9*60) return "09:00";
    if(mins>=18*60) return "17:00";
    if(mins>=12*60&&mins<13*60) return "13:00";
    return timeStr;
  };

  const analyze=async()=>{
    if(!memo.trim()) return;
    if(!geminiConfigured){setError("APIキーが未設定です。設定画面（⚙️）の「APIキー設定」タブから入力してください。");return;}
    setLoading(true);setError("");setResult(null);setSaved(false);
    const senderName=currentUser?.name||"";
    const senderSig=currentUser?.signature||"";
    const ctx=lead?`\n【リード】会社名:${lead.company} / 担当者名:${lead.contact} / ステータス:${lead.status}`:"";
    const recentActions=(lead?.actions||[]).filter(a=>a&&typeof a==="object").sort((a,b)=>(String(b.ts||"")).localeCompare(String(a.ts||""))).slice(0,5);
    const actHistory=recentActions.length>0?"\n\n【過去のアクション履歴（直近5件）】\n"+recentActions.map((a,i)=>{
      const base=`${i+1}. ${a.date||""}${a.time?" "+a.time:""} [${a.type||""}] ${a.result||""} — ${String(a.summary||"").slice(0,100)}`;
      const nextPart=a.next?` ／ 設定済み次アクション:${String(a.next).slice(0,60)}`:"";
      const talkPart=(a.talkPoints&&a.talkPoints.length>0)?` ／ トークポイント:${a.talkPoints.slice(0,2).join("・")}`:"";
      return base+nextPart+talkPart;
    }).join("\n"):"";
    const userCtx=`\n\n【送信者情報】名前:${senderName}`+(senderSig?`\n署名:\n${senderSig}`:"");
    // 今日の日付・曜日をJST基準でAIに渡す（AIが曜日を考慮したネクストアクションを提案できるようにする）
    const WEEKDAYS=["日","月","火","水","木","金","土"];
    const todayJST=new Date().toLocaleDateString('sv',{timeZone:'Asia/Tokyo'});
    const todayWeekday=WEEKDAYS[new Date(todayJST+"T00:00:00").getDay()];
    const actionWeekday=WEEKDAYS[new Date(actionDate+"T00:00:00").getDay()];
    const dateCtx=`\n\n【日付情報】今日:${todayJST}（${todayWeekday}曜日） / アクション実施日:${actionDate}（${actionWeekday}曜日）`;
    try{
      const res=await fetch('/api/ai/analyze',{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:ctx+actHistory+userCtx+dateCtx+"\n\n【メモ】\n"+memo})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||`エラーコード ${res.status}`);
      if(data.error) throw new Error(data.error.message||data.error.status);
      if(!data.candidates||!data.candidates[0]||!data.candidates[0].content){
        const reason=data.candidates?.[0]?.finishReason||data.promptFeedback?.blockReason||"不明";
        throw new Error(`AIレスポンスが空です（終了理由: ${reason}）`);
      }
      const text=(data.candidates[0].content.parts||[]).map(i=>i.text||"").join("");
      if(!text.trim()){
        const reason=data.candidates[0].finishReason||"不明";
        throw new Error(`AIが空のレスポンスを返しました（終了理由: ${reason}）`);
      }
      const cleaned=text.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
      let parsed;
      try{parsed=JSON.parse(cleaned);}catch(_){
        const jsonMatch=cleaned.match(/\{[\s\S]*\}/);
        if(!jsonMatch) throw new Error("レスポンスからJSONを抽出できませんでした。AIの返答: "+cleaned.slice(0,200));
        parsed=JSON.parse(jsonMatch[0]);
      }
      // next_action_timeを営業時間（9〜18時、12〜13時除外）に補正
      if(parsed.next_action_time) parsed.next_action_time=clampToBusinessTime(parsed.next_action_time);
      // AI生成後：リード選択・ログイン情報から会社名・担当者名・署名・送信者名を自動反映
      const leadContact=lead?.contact||lead?.company||"";
      const leadSurname=leadContact.split(/[ \u3000]/)[0]||leadContact;
      let emailBody=parsed.email_body||"";
      emailBody=emailBody.replaceAll("{{担当者名}}",leadContact).replaceAll("{{担当者苗字}}",leadSurname).replaceAll("{{会社名}}",lead?.company||"").replaceAll("{{送信者名}}",senderName);
      // 署名重複チェック: 両端の空白・改行を除去してから比較し、前後の余白差による誤判定を防ぐ
      const sigTrimmed=senderSig.trim();
      if(sigTrimmed&&!emailBody.includes(sigTrimmed)){emailBody=emailBody.trim()+"\n\n"+sigTrimmed;}
      setSaved(false);setResult(parsed);setEditEmail({subject:parsed.email_subject||"",body:emailBody});setActiveTab("action");
    }catch(e){
      if(e.message==="Failed to fetch"){setError("AIサービスへの接続に失敗しました。ネットワーク接続を確認してください。問題が続く場合は管理者にお問い合わせください。");}
      else{setError("解析失敗: "+e.message);}
    }
    setLoading(false);
  };

  const saveToLead=()=>{
    if(!result||!selLead) return;
    const nextDate=result.next_action_date_offset?addBizDays(actionDate,result.next_action_date_offset):"";
    if(savedActId){
      const updatedActs=(lead.actions||[]).map(a=>a.id===savedActId?{...a,type:result.action_type||manualType,result:result.action_result||manualResult,summary:memo,date:actionDate,time:actionTime,nextDate,nextTime:result.next_action_time||"",next:result.next_action_memo||"",talkPoints:(result.followup_talk_points||[]).slice(0,4),ts:new Date().toISOString(),recorded_by:currentUser?.name||""}:a);
      onUpdate(lead.id,{actions:updatedActs,next_action_date:nextDate,next_action_time:result.next_action_time||lead.next_action_time||"",next_action:result.next_action_memo||lead.next_action||""});
    } else {
      const newActId=Date.now().toString(36)+Math.random().toString(36).slice(2,5);
      const newAct={id:newActId,type:result.action_type||manualType,result:result.action_result||manualResult,summary:memo,date:actionDate,time:actionTime,nextDate,nextTime:result.next_action_time||"",next:result.next_action_memo||"",talkPoints:(result.followup_talk_points||[]).slice(0,4),ts:new Date().toISOString(),recorded_by:currentUser?.name||""};
      onUpdate(lead.id,{actions:[...(lead.actions||[]),newAct],next_action_date:nextDate,next_action_time:result.next_action_time||lead.next_action_time||"",next_action:result.next_action_memo||lead.next_action||""});
      setSavedActId(newActId);
    }
    setSaved(true);
  };

  const saveAiGmailDraft = async () => {
    const cfg = getEffectiveAiConfig(currentUser);
    const clientId = cfg.gmailClientId;
    if (!clientId) { alert(currentUser?.role === "admin" ? "設定 > APIキー設定 で Gmail Client ID を入力してください" : "管理者にGmail OAuth Client IDの設定を依頼してください"); return; }
    setAiGmailSaving(true);
    try {
      const tokenObj = await acquireGmailToken(clientId, aiGmailToken);
      setAiGmailToken(tokenObj);
      const raw = buildGmailDraftRaw(lead?.email||'', editEmail.subject, editEmail.body);
      await postGmailDraft(tokenObj.token, raw);
      setAiGmailSaved(true);
      setTimeout(() => setAiGmailSaved(false), 3000);
      // メール送信後の追客をネクストアクションとして自動設定（AIの分析結果を使用）
      if (selLead && lead && result) {
        const followUpDate = result.next_action_date_offset ? addBizDays(actionDate, result.next_action_date_offset) : "";
        if (followUpDate) {
          onUpdate(lead.id, {
            next_action_date: followUpDate,
            next_action_time: result.next_action_time || "",
            next_action: result.next_action_memo || "メール送信後の追客",
          });
        }
      }
    } catch(e) {
      if (e.isUnauthenticated) setAiGmailToken(null);
      alert('Gmail下書き保存エラー: ' + e.message);
    } finally {
      setAiGmailSaving(false);
    }
  };

  const saveAiCalTodo = async () => {
    const cfg = getEffectiveAiConfig(currentUser);
    const clientId = cfg.gmailClientId;
    if (!clientId) { alert(currentUser?.role === "admin" ? "設定 > APIキー設定 で Gmail Client ID を入力してください" : "管理者にGmail OAuth Client IDの設定を依頼してください"); return; }
    if (!selLead || !lead) { alert("リードを選択してください"); return; }
    const nextDate = result?.next_action_date_offset ? addBizDays(actionDate, result.next_action_date_offset) : "";
    const nextTime = result?.next_action_time || "";
    if (!nextDate) { alert("ネクストアクション日が設定されていません"); return; }
    setAiCalSaving(true);
    try {
      // 有効期限内のトークンがあれば再利用、期限切れなら再取得する
      let tokenObj = aiCalToken;
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
        setAiCalToken(tokenObj);
      }
      const token = tokenObj.token;
      const task = {
        title: lead.company || "(会社名未設定)",
        notes: lead.zoho_url || "",
        due: `${nextDate}T00:00:00.000Z`
      };
      const calRes = await fetch("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(task)
      });
      if (!calRes.ok) {
        const err = await calRes.json();
        if ((err.error?.code===401)||(err.error?.status==='UNAUTHENTICATED')) { setAiCalToken(null); throw new Error('認証の期限が切れました。再度お試しください。'); }
        throw new Error(err.error?.message || 'タスク作成に失敗しました');
      }
      setAiCalSaved(true);
      setTimeout(() => setAiCalSaved(false), 3000);
    } catch(e) {
      alert('GoogleタスクTODO作成エラー: ' + e.message);
    } finally {
      setAiCalSaving(false);
    }
  };

  const iLvColor={"高":"#10b981","中":"#f59e0b","低":"#ef4444"};

  return (
    <div style={{minHeight:"100vh",background:"#f0f5f2",fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif",color:"#174f35"}}>
      <div className="ai-header" style={{background:"linear-gradient(135deg,#10b981,#059669)",borderBottom:"1px solid #059669",padding:"18px 28px",display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:38,height:38,background:"#ffffff33",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🤖</div>
        <div style={{minWidth:0, flex:1}}>
          <div style={{fontSize:17,fontWeight:700,color:"#fff"}}>AIアシスタント</div>
          <div className="ai-header-sub" style={{fontSize:11,color:"#d1fae5",marginTop:2}}>アクション記録 → 自動解析 → 履歴登録・ネクストアクション提案</div>
        </div>
        <div style={{marginLeft:"auto"}}>
          {geminiConfigured?<div style={{background:"#ffffff33",border:"1px solid #ffffff66",borderRadius:8,padding:"6px 14px",fontSize:12,color:"#fff"}}>✅ APIキー設定済み</div>:<div style={{background:"#ffffff22",border:"1px solid #fca5a5",borderRadius:8,padding:"6px 14px",fontSize:12,color:"#fff"}}>⚠️ APIキー未設定</div>}
        </div>
      </div>
      <div className="ai-layout" style={{display:"flex",height: isMobile ? "auto" : "calc(100vh - 77px)"}}>
        <div className="ai-left-panel" style={{width:380,borderRight:"1px solid #c0dece",display:"flex",flexDirection:"column",background:"#f0f5f2",flexShrink:0,overflow:"auto"}}>
          <div style={{flex:1,padding:"18px 20px",display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",letterSpacing:"0.06em",textTransform:"uppercase"}}>🏢 リード選択</label>
                <button onClick={resetAiPage} style={{fontSize:11,padding:"4px 10px",borderRadius:7,border:"1px solid #c0dece",background:"#fff",color:"#6a9a7a",cursor:"pointer",fontFamily:"inherit",fontWeight:600,lineHeight:1}}>🔄 リセット</button>
              </div>
              <LeadCombobox leads={leads} value={selLead} onChange={id=>{setSelLead(id);setResult(null);setSaved(false);}} placeholder="会社名・担当者名で検索" inputStyle={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid #c0dece",background:"#fff",color:"#174f35",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} darkMode={false} />
              {lead&&(lead.actions||[]).length>0&&(
                <div style={{marginTop:8,background:"#fff",borderRadius:8,padding:"10px 12px",border:"1px solid #c0dece"}}>
                  <div style={{fontSize:11,color:"#6a9a7a",marginBottom:4}}>直近のアクション</div>
                  {[...(lead.actions||[])].filter(a=>a&&typeof a==="object").sort((a,b)=>(String(b.ts||"")).localeCompare(String(a.ts||""))).slice(0,2).map((a,i)=>(
                    <div key={a.id||i} style={{fontSize:11,color:"#6a9a7a",borderLeft:"2px solid #c0dece",paddingLeft:8,marginBottom:4}}>{String(a.date||"")} {String(a.time||"")} {ACTION_TYPES.find(t=>t.v===a.type)?.icon||"📞"} {String(a.result||"")} — {String(a.summary||"").slice(0,40)}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:6}}>📅 日付</label><input type="date" value={actionDate} onChange={e=>setActionDate(e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #c0dece",background:"#fff",color:"#174f35",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/></div>
              <div><label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:6}}>🕐 時刻</label><select value={actionTime} onChange={e=>setActionTime(e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #c0dece",background:"#fff",color:"#174f35",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}>{Array.from({length:48},(_,i)=>{const h=String(Math.floor(i/2)).padStart(2,"0");const m=i%2===0?"00":"30";return <option key={i} value={`${h}:${m}`}>{h}:{m}</option>;})}</select></div>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:6}}>📋 アクション種別</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {ACTION_TYPES.map(t=><button key={t.v} onClick={()=>setManualType(t.v)} style={{padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:manualType===t.v?700:400,cursor:"pointer",fontFamily:"inherit",background:manualType===t.v?"linear-gradient(135deg,#2563eb,#1d4ed8)":"#fff",color:manualType===t.v?"#fff":"#6a9a7a",border:manualType===t.v?"1px solid #3b82f6":"1px solid #c0dece"}}>{t.icon} {t.label}</button>)}
              </div>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:6}}>📌 アクション結果</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {ACTION_RESULTS.map(r=><button key={r} onClick={()=>setManualResult(r)} style={{padding:"6px 10px",borderRadius:8,fontSize:11,fontWeight:manualResult===r?700:400,cursor:"pointer",fontFamily:"inherit",background:manualResult===r?"linear-gradient(135deg,#0d9488,#059669)":"#fff",color:manualResult===r?"#fff":"#6a9a7a",border:manualResult===r?"1px solid #10b981":"1px solid #c0dece"}}>{r}</button>)}
              </div>
            </div>
            <div style={{flex:1,display:"flex",flexDirection:"column"}}>
              <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:6}}>📝 アクションメモ</label>
              <textarea value={memo} onChange={e=>setMemo(e.target.value)} placeholder={"例：\n田中部長に架電。取次いただき3分ほど話せた。\n現在は紙とLINEで管理、職人10名。\n来月繁忙期で「忙しくなる前に検討したい」とのこと。\n2週間後に再度連絡希望。"} style={{flex:1,minHeight:140,background:"#fff",border:"1px solid #c0dece",borderRadius:10,padding:"12px 14px",color:"#174f35",fontSize:13,lineHeight:1.7,resize:"vertical",outline:"none",fontFamily:"inherit"}}/>
            </div>
            {error&&<div style={{color:"#f87171",fontSize:12,background:"#ef444416",borderRadius:8,padding:"8px 12px",border:"1px solid #ef444433"}}>{error}</div>}
            <button onClick={analyze} disabled={loading||!memo.trim()} style={{background:loading?"#1e40af66":"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",border:"none",borderRadius:10,padding:"13px 0",fontSize:14,fontWeight:700,cursor:loading||!memo.trim()?"not-allowed":"pointer",opacity:!memo.trim()?0.5:1,fontFamily:"inherit"}}>
              {loading?"⏳ AIが解析中...":"✨ AIで解析する"}
            </button>
          </div>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {!result&&!loading&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#334155",gap:14}}>
              <div style={{fontSize:52}}>🤖</div>
              <div style={{fontSize:15,fontWeight:600,color:"#475569"}}>アクションメモを入力して解析</div>
              <div style={{fontSize:13,color:"#334155",textAlign:"center",lineHeight:1.8}}>📋 アクション履歴に自動登録<br/>📅 ネクストアクションを自動設定<br/>✉️ フォローメールを自動生成</div>
            </div>
          )}
          {loading&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
              <div style={{width:48,height:48,border:"3px solid #c0dece",borderTop:"3px solid #3b82f6",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
              <div style={{fontSize:14,color:"#64748b"}}>解析中...</div>
            </div>
          )}
          {result&&(()=>{
            const nat=result.next_action_type;
            const isEmailNext=nat==="email";
            const isScheduleNext=nat==="schedule";
            const isCallNext=nat==="call"||nat==="sms";
            const natIcon=isEmailNext?"✉️":isScheduleNext?"📅":isCallNext?"📞":"📋";
            const natLabel=isEmailNext?"メール送信":isScheduleNext?"候補日提案":nat==="call"?"架電":nat==="sms"?"SMS送信":"その他";
            const natAccent=isEmailNext?"#2563eb":isScheduleNext?"#0891b2":isCallNext?"#059669":"#7c3aed";
            const natBg=isEmailNext?"#eff6ff":isScheduleNext?"#ecfeff":isCallNext?"#f0fdf4":"#faf5ff";
            const natBorder=isEmailNext?"#bfdbfe":isScheduleNext?"#a5f3fc":isCallNext?"#bbf7d0":"#e9d5ff";
            const iLvColorInner={"高":"#10b981","中":"#f59e0b","低":"#ef4444"};
            return(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              {/* ヘッダー：保存ボタン */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px",borderBottom:"1px solid #e2f0e8",background:"#fff",flexShrink:0}}>
                <div>
                  <span style={{fontSize:13,fontWeight:700,color:"#059669"}}>🤖 AI解析結果</span>
                  <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>解析結果をリードの活動履歴に保存できます</div>
                </div>
                {!selLead
                  ? <div style={{textAlign:"right"}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#d1d5db"}}>💾 活動履歴に保存</div>
                      <div style={{fontSize:10,color:"#d1d5db",marginTop:2}}>← まずリードを選択してください</div>
                    </div>
                  : saved
                    ? <div style={{textAlign:"right"}}>
                        <button onClick={saveToLead} style={{background:"#f0fdf4",color:"#059669",border:"1.5px solid #6ee7b7",borderRadius:8,padding:"6px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✅ 保存済み（再保存する）</button>
                        <div style={{fontSize:10,color:"#6a9a7a",marginTop:2}}>活動履歴に記録されました</div>
                      </div>
                    : <div style={{textAlign:"right"}}>
                        <button onClick={saveToLead} style={{background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",borderRadius:8,padding:"7px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>💾 アクション履歴に保存</button>
                        <div style={{fontSize:10,color:"#6a9a7a",marginTop:2}}>この解析結果をリードに紐づけます</div>
                      </div>
                }
              </div>

              {/* 本体：スクロール可能 */}
              <div style={{flex:1,overflow:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>

                {/* ① 今回のアクションサマリー */}
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #e2f0e8",overflow:"hidden"}}>
                  <div style={{padding:"8px 16px",background:"#f0f5f2",borderBottom:"1px solid #e2f0e8",fontSize:11,fontWeight:700,color:"#6a9a7a",letterSpacing:"0.05em"}}>今回のアクション</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:"1px solid #f0f5f2"}}>
                    <div style={{padding:"12px 14px",borderRight:"1px solid #f0f5f2"}}>
                      <div style={{fontSize:10,color:"#6a9a7a",marginBottom:4}}>手段</div>
                      <div style={{fontSize:15,fontWeight:700,color:"#374151"}}>{ACTION_TYPES.find(t=>t.v===result.action_type)?.icon||"📞"} {ACTION_TYPES.find(t=>t.v===result.action_type)?.label||"電話"}</div>
                    </div>
                    <div style={{padding:"12px 14px",borderRight:"1px solid #f0f5f2"}}>
                      <div style={{fontSize:10,color:"#6a9a7a",marginBottom:4}}>結果</div>
                      <div style={{fontSize:15,fontWeight:700,color:"#374151"}}>{result.action_result||"その他"}</div>
                    </div>
                    <div style={{padding:"12px 14px"}}>
                      <div style={{fontSize:10,color:"#6a9a7a",marginBottom:4}}>顧客の温度感</div>
                      <div style={{fontSize:15,fontWeight:700,color:iLvColorInner[result.interest_level]||"#64748b"}}>{result.interest_level||"—"}</div>
                    </div>
                  </div>
                </div>

                {/* ② AIが提案するネクストアクション */}
                <div style={{background:natBg,borderRadius:10,border:`1.5px solid ${natBorder}`,overflow:"hidden"}}>
                  <div style={{padding:"10px 16px",borderBottom:`1px solid ${natBorder}`,display:"flex",alignItems:"center",gap:8}}>
                    <span style={{background:natAccent,color:"#fff",borderRadius:20,padding:"3px 14px",fontSize:12,fontWeight:700}}>{natIcon} {natLabel}</span>
                    <span style={{fontSize:12,color:natAccent,fontWeight:700}}>← AIが推奨するネクストアクション</span>
                  </div>
                  <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                      <div style={{background:"#fff",borderRadius:8,padding:"10px 16px",flex:1,minWidth:100}}>
                        <div style={{fontSize:11,color:"#6a9a7a",marginBottom:3}}>実施タイミング</div>
                        <div style={{fontSize:17,fontWeight:700,color:natAccent}}>{result.next_action_date_offset?`${result.next_action_date_offset}営業日後`:"—"}</div>
                        {result.next_action_date_offset&&<div style={{fontSize:11,color:"#6a9a7a",marginTop:2}}>{addBizDays(actionDate,result.next_action_date_offset)}</div>}
                      </div>
                      <div style={{background:"#fff",borderRadius:8,padding:"10px 16px",flex:1,minWidth:80}}>
                        <div style={{fontSize:11,color:"#6a9a7a",marginBottom:3}}>推奨時間</div>
                        <div style={{fontSize:17,fontWeight:700,color:"#7c3aed"}}>{result.next_action_time||"—"}</div>
                      </div>
                    </div>
                    {result.next_action_memo&&<div style={{background:"#fff",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#059669",fontWeight:600,lineHeight:1.6}}>{result.next_action_memo}</div>}
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",paddingTop:4}}>
                      <button onClick={saveAiCalTodo} disabled={aiCalSaving||!selLead||!result?.next_action_date_offset} style={{background:aiCalSaved?"#7c3aed":aiCalSaving?"#4c1d9566":"#7c3aed22",color:aiCalSaved?"#fff":"#7c3aed",border:"1px solid #c4b5fd",borderRadius:7,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:(aiCalSaving||!selLead||!result?.next_action_date_offset)?"not-allowed":"pointer",fontFamily:"inherit",opacity:(aiCalSaving||!selLead||!result?.next_action_date_offset)?0.5:1}}>{aiCalSaving?"作成中...":aiCalSaved?"✅ タスク作成済":"☑️ GoogleタスクTODO"}</button>
                      {isScheduleNext&&<button onClick={goCalendar} style={{background:"#0891b2",color:"#fff",border:"none",borderRadius:7,padding:"7px 18px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>📅 候補日を探す（カレンダーへ）</button>}
                      {saved&&isCallNext&&<button onClick={()=>goLeads(selLead)} style={{background:natAccent,color:"#fff",border:"none",borderRadius:7,padding:"7px 18px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>📞 リード詳細へ</button>}
                    </div>
                  </div>
                </div>

                {/* ③ 次回架電トークポイント（架電・SMS時のみ） */}
                {isCallNext&&result.followup_talk_points?.length>0&&(
                  <div style={{background:"#fff",borderRadius:10,border:"1px solid #e2f0e8",overflow:"hidden"}}>
                    <div style={{padding:"10px 16px",background:"#f0f5f2",borderBottom:"1px solid #e2f0e8",fontSize:12,fontWeight:700,color:"#6a9a7a"}}>次回架電トークポイント</div>
                    <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                      {result.followup_talk_points.map((p,i)=>(
                        <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",background:"#f8fffe",borderRadius:7,padding:"9px 12px"}}>
                          <span style={{background:"#3b82f6",color:"#fff",borderRadius:4,padding:"1px 7px",fontSize:11,fontWeight:700,flexShrink:0,marginTop:1}}>{i+1}</span>
                          <span style={{fontSize:13,color:"#374151",lineHeight:1.6}}>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ④ フォローメール（メール送信時のみ） */}
                {isEmailNext&&(
                  <div style={{background:"#fff",borderRadius:10,border:"1px solid #bfdbfe",overflow:"hidden"}}>
                    <div style={{padding:"10px 16px",background:"#eff6ff",borderBottom:"1px solid #bfdbfe",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:"#2563eb"}}>✉️ フォローメール</span>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={saveAiGmailDraft} disabled={aiGmailSaving} style={{background:aiGmailSaved?"#2563eb":aiGmailSaving?"#1e40af66":"linear-gradient(135deg,#3b82f6,#2563eb)",color:"#fff",border:"none",borderRadius:7,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:aiGmailSaving?"not-allowed":"pointer",fontFamily:"inherit",opacity:aiGmailSaving?0.7:1}}>{aiGmailSaving?"保存中...":aiGmailSaved?"✅ 下書き保存済":"📨 Gmailに下書き保存"}</button>
                        <button onClick={()=>{navigator.clipboard?.writeText(`件名: ${editEmail.subject}\n\n${editEmail.body}`);setCopiedEmail(true);setTimeout(()=>setCopiedEmail(false),2000);}} style={{background:copiedEmail?"#dbeafe":"#f0f5f2",color:copiedEmail?"#2563eb":"#6a9a7a",border:"1px solid #bfdbfe",borderRadius:7,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{copiedEmail?"✓ コピー済":"📋 コピー"}</button>
                      </div>
                    </div>
                    <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
                      <div><div style={{fontSize:11,color:"#6a9a7a",marginBottom:4}}>件名</div><input value={editEmail.subject} onChange={e=>setEditEmail(p=>({...p,subject:e.target.value}))} style={{width:"100%",background:"#f8faff",border:"1px solid #c0dece",borderRadius:7,padding:"8px 12px",color:"#174f35",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/></div>
                      <div><div style={{fontSize:11,color:"#6a9a7a",marginBottom:4}}>本文（直接編集可）</div><textarea value={editEmail.body} onChange={e=>setEditEmail(p=>({...p,body:e.target.value}))} rows={12} style={{width:"100%",background:"#f8faff",border:"1px solid #c0dece",borderRadius:8,padding:"12px 14px",color:"#174f35",fontSize:13,lineHeight:1.8,fontFamily:"inherit",outline:"none",resize:"vertical",boxSizing:"border-box"}}/></div>
                    </div>
                  </div>
                )}

              </div>
            </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
