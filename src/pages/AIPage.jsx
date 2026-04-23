// AIアシスタントページ（アクション記録→AI解析→ネクストアクション提案・メール生成）
import { useState, useEffect } from 'react';
import { AIResultPanel } from '../components/ai/AIResultPanel.jsx';
import { AIInputPanel } from '../components/ai/AIInputPanel.jsx';
import { SparkleIcon, CheckCircleIcon, AlertIcon } from '../components/ui/Icons.jsx';
import { JP_HOLIDAYS, addBizDays } from '../lib/holidays.js';
import { ACTION_RESULTS } from '../lib/constants.js';
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

  // 1日あたりのネクストアクション登録上限（これを超える日は翌営業日へずらす）
  const NEXT_ACTION_DAILY_LIMIT = 4;

  // 上限に達していない最も近い営業日を返す（最大60営業日先まで探す）
  const findAvailableNextDate = (proposedDate) => {
    let date = proposedDate;
    for (let i = 0; i < 60; i++) {
      const count = leads.filter(l => l.next_action_date === date).length;
      if (count < NEXT_ACTION_DAILY_LIMIT) return date;
      date = addBizDays(date, 1);
    }
    return proposedDate;
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
    if(!geminiConfigured){setError("APIキーが未設定です。設定画面の「APIキー設定」タブから入力してください。");return;}
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
      // action_result を選択肢の6値に正規化（AIが独自表現で返した場合のフォールバック）
      if(parsed.action_result && !ACTION_RESULTS.includes(parsed.action_result)){
        const r = parsed.action_result;
        if(/繋がった|取り次|取次|接続|出た|担当者と話/.test(r)) parsed.action_result="取次";
        else if(/不在|留守|いない|外出/.test(r)) parsed.action_result="不在";
        else if(/不通|繋がらない|出ない|呼び出し|話し中|電源|圏外/.test(r)) parsed.action_result="不通";
        else if(/折電|折り返し|コールバック/.test(r)) parsed.action_result="折電";
        else if(/送信|送付|メール|SMS/.test(r)) parsed.action_result="送信済";
        else parsed.action_result="その他";
      }
      // next_action_timeを営業時間（9〜18時、12〜13時除外）に補正
      if(parsed.next_action_time) parsed.next_action_time=clampToBusinessTime(parsed.next_action_time);
      // 1日上限（4件）を超える日はずらして確定日を next_action_date に格納
      if(parsed.next_action_date_offset!=null){
        const proposed=addBizDays(actionDate,parsed.next_action_date_offset);
        parsed.next_action_date=findAvailableNextDate(proposed);
      }
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
    const nextDate=result.next_action_date||(result.next_action_date_offset?addBizDays(actionDate,result.next_action_date_offset):"");
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
        const followUpDate = result.next_action_date || (result.next_action_date_offset ? addBizDays(actionDate, result.next_action_date_offset) : "");
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
    const nextDate = result?.next_action_date || (result?.next_action_date_offset ? addBizDays(actionDate, result.next_action_date_offset) : "");
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
        <div style={{width:38,height:38,background:"#ffffff33",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><SparkleIcon size={22} color="#fff" /></div>
        <div style={{minWidth:0, flex:1}}>
          <div style={{fontSize:17,fontWeight:700,color:"#fff"}}>AIアシスタント</div>
          <div className="ai-header-sub" style={{fontSize:11,color:"#d1fae5",marginTop:2}}>アクション記録 → 自動解析 → 履歴登録・ネクストアクション提案</div>
        </div>
        <div style={{marginLeft:"auto"}}>
          {geminiConfigured
            ? <div style={{background:"#ffffff33",border:"1px solid #ffffff66",borderRadius:8,padding:"6px 14px",fontSize:12,color:"#fff",display:"flex",alignItems:"center",gap:5}}><CheckCircleIcon size={13} color="#fff" /> APIキー設定済み</div>
            : <div style={{background:"#ffffff22",border:"1px solid #fca5a5",borderRadius:8,padding:"6px 14px",fontSize:12,color:"#fff",display:"flex",alignItems:"center",gap:5}}><AlertIcon size={13} color="#fca5a5" /> APIキー未設定</div>}
        </div>
      </div>
      <div className="ai-layout" style={{display:"flex",height: isMobile ? "auto" : "calc(100vh - 77px)"}}>
        <AIInputPanel
          leads={leads} selLead={selLead}
          onLeadChange={(id)=>{setSelLead(id);setResult(null);setSaved(false);}}
          lead={lead}
          actionDate={actionDate} onDateChange={setActionDate}
          actionTime={actionTime} onTimeChange={setActionTime}
          manualType={manualType} onTypeChange={setManualType}
          manualResult={manualResult} onResultChange={setManualResult}
          memo={memo} onMemoChange={setMemo}
          error={error} loading={loading}
          onAnalyze={analyze} onReset={resetAiPage}
        />
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {!result&&!loading&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#334155",gap:14}}>
              <SparkleIcon size={52} color="#94a3b8" />
              <div style={{fontSize:15,fontWeight:600,color:"#475569"}}>アクションメモを入力して解析</div>
              <div style={{fontSize:13,color:"#334155",textAlign:"center",lineHeight:1.8}}>アクション履歴に自動登録<br/>ネクストアクションを自動設定<br/>フォローメールを自動生成</div>
            </div>
          )}
          {loading&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
              <div style={{width:48,height:48,border:"3px solid #c0dece",borderTop:"3px solid #3b82f6",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
              <div style={{fontSize:14,color:"#64748b"}}>解析中...</div>
            </div>
          )}
          {result&&(
            <AIResultPanel
              result={result} actionDate={actionDate} selLead={selLead} lead={lead} saved={saved}
              editEmail={editEmail} setEditEmail={setEditEmail}
              copiedEmail={copiedEmail} setCopiedEmail={setCopiedEmail}
              aiGmailSaving={aiGmailSaving} aiGmailSaved={aiGmailSaved}
              aiCalSaving={aiCalSaving} aiCalSaved={aiCalSaved}
              onSave={saveToLead} onSaveGmailDraft={saveAiGmailDraft} onSaveCalTodo={saveAiCalTodo}
              onGoCalendar={goCalendar} onGoLeads={goLeads}
            />
          )}
        </div>
      </div>
    </div>
  );
}
