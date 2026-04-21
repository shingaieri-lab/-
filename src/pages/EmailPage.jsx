// メールテンプレートページ（差し込み変数・Gmail下書き保存・候補日スロット連携）
import { useState, useEffect } from 'react';
import { PencilIcon, TrashIcon, MailIcon, FileTextIcon, SendIcon, ClipboardIcon, CheckIcon, CheckCircleIcon } from '../components/ui/Icons.jsx';
import { getMaster } from '../lib/master.js';
import { getEffectiveAiConfig } from '../lib/accounts.js';
import { EmailVariableForm } from '../components/email/EmailVariableForm.jsx';
import { acquireGmailToken, buildGmailDraftRaw, postGmailDraft } from '../lib/oauth.js';
import { apiPost } from '../lib/api.js';
import { TemplateEditor } from '../components/email/TemplateEditor.jsx';

const DEFAULT_EMAIL_TEMPLATES = [
  { id:"t1", name:"初回フォロー", useSlots:false, subject:"【{{送信者会社名}}】資料のご確認のお願い", body:"{{担当者名}} 様\n\nお世話になっております。\n{{送信者会社名}}の{{送信者名}}でございます。\n\n先日はお電話にてご対応いただきありがとうございました。\nご案内した資料をご確認いただけましたでしょうか？\n\n何かご不明な点がございましたら、お気軽にご連絡ください。\n\nよろしくお願いいたします。" },
  { id:"t2", name:"商談日程調整", useSlots:true, subject:"【{{送信者会社名}}{{送信者名}}】ご説明日程候補日をお送りします", body:"{{担当者名}} 様\n\nお世話になっております。\n{{送信者会社名}}の{{送信者名}}でございます。\n\n下記日程のご都合は、いかがでしょうか。\n\n============================\n【日程候補】\n{{候補日時}}\n============================\n\nご都合のよろしい日程をご返信いただけますと幸いです。\nよろしくお願いいたします。" },
  { id:"t3", name:"ナーチャリング", useSlots:false, subject:"【{{送信者会社名}}】事例のご紹介", body:"{{担当者名}} 様\n\nお世話になっております。\n{{送信者会社名}}の{{送信者名}}でございます。\n\n以前お話しさせていただいた件で、成果が出た事例をご紹介します。" },
];

const loadTpls = () => window.__appData.emailTpls || DEFAULT_EMAIL_TEMPLATES;
const saveTpls = (t) => { window.__appData.emailTpls = t; apiPost('/api/email-tpls', t); };
const applyVars = (body, vars) => Object.entries(vars).reduce((s,[k,v])=>s.replaceAll("{{"+k+"}}",v||("{{"+k+"}}")),body);

export function EmailPage({ leads, onUpdate, currentUser, candidateSlots = [], isMobile, initialLeadId = "" }) {
  const [tpls, setTpls] = useState(loadTpls);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [selTpl, setSelTpl] = useState(() => {
    if (candidateSlots.length > 0) {
      const slotsTpl = loadTpls().find(t => t.useSlots);
      if (slotsTpl) return slotsTpl.id;
    }
    return loadTpls()[0]?.id || "";
  });
  const [selLead, setSelLead] = useState(initialLeadId);
  const [vars, setVars] = useState({担当者名:"",担当者苗字:"",会社名:"",送信者名:"",送信者会社名:getMaster().companyName||"",候補日時:"",商談月:"",商談日:"",商談曜日:"",商談時:"",商談分:"",商談担当:"",宛先メール:""});
  const [previewSubj, setPreviewSubj] = useState("");
  const [previewBody, setPreviewBody] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editTpl, setEditTpl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedSlotIdxs, setSelectedSlotIdxs] = useState([]);
  const tpl = tpls.find(t=>t.id===selTpl)||tpls[0];
  const lead = leads.find(l=>l.id===selLead);

  // リード選択時に担当者名・担当者苗字・会社名・宛先メールアドレスを自動入力
  // 商談確定リードの場合は商談日時・担当者も自動反映
  useEffect(()=>{
    if(lead){
      const contact=lead.contact||lead.company||"";
      const surname=contact.split(/[ \u3000]/)[0]||contact;
      const meetingVars = {};
      if(lead.meeting_date){
        const [,mm,dd] = lead.meeting_date.split("-");
        meetingVars.商談月 = String(parseInt(mm));
        meetingVars.商談日 = String(parseInt(dd));
      }
      if(lead.meeting_time){
        const [hh,min] = lead.meeting_time.split(":");
        meetingVars.商談時 = String(parseInt(hh));
        meetingVars.商談分 = min||"00";
      }
      if(lead.sales_member) meetingVars.商談担当 = lead.sales_member;
      setVars(v=>({...v,担当者名:contact,担当者苗字:surname,会社名:lead.company||"",宛先メール:lead.email||"",...meetingVars}));
    }
  },[selLead]);

  // ログインユーザーの名前を送信者名に自動入力
  useEffect(()=>{ if(currentUser?.name) setVars(v=>({...v,送信者名:currentUser.name})); },[currentUser?.name]);

  // 商談月・商談日から商談曜日を自動計算
  useEffect(()=>{
    if(vars.商談月 && vars.商談日){
      const today = new Date();
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      let year = today.getFullYear();
      const m = parseInt(vars.商談月), d = parseInt(vars.商談日);
      let dt = new Date(year, m-1, d);
      if(dt < todayMidnight){ year++; dt = new Date(year, m-1, d); }
      setVars(v=>({...v, 商談曜日:["日","月","火","水","木","金","土"][dt.getDay()]}));
    } else {
      setVars(v=>({...v, 商談曜日:""}));
    }
  },[vars.商談月, vars.商談日]);

  // 候補日スロットのフォーマット
  const formatSlot = (slot) => {
    const d = new Date(slot.date + "T00:00:00");
    const dow = ["日","月","火","水","木","金","土"][d.getDay()];
    const [y,m,day] = slot.date.split("-");
    return `${parseInt(y)}年${parseInt(m)}月${parseInt(day)}日（${dow}）${slot.start}〜${slot.end}`;
  };

  // スロット選択切り替え（最大3つ）
  const toggleSlot = (idx) => {
    setSelectedSlotIdxs(prev => {
      if (prev.includes(idx)) {
        const next = prev.filter(i=>i!==idx);
        setVars(v=>({...v,候補日時:next.map(i=>formatSlot(candidateSlots[i])).join("\n")}));
        return next;
      } else if (prev.length < 3) {
        const next = [...prev, idx];
        setVars(v=>({...v,候補日時:next.map(i=>formatSlot(candidateSlots[i])).join("\n")}));
        return next;
      }
      return prev;
    });
  };

  // 候補日ツールのスロットが変わったら最大3つ自動選択
  useEffect(()=>{
    const idxs = candidateSlots.slice(0,3).map((_,i)=>i);
    setSelectedSlotIdxs(idxs);
    setVars(v=>({...v,候補日時:idxs.map(i=>formatSlot(candidateSlots[i])).join("\n")}));
  },[candidateSlots]);

  const signature = currentUser?.signature||"";
  const body=tpl?(applyVars(tpl.body,vars)+(signature?"\n\n"+signature:"")):"", subj=tpl?applyVars(tpl.subject,vars):"";
  const showSlots = tpl ? (tpl.useSlots !== undefined ? tpl.useSlots : tpl.body.includes("{{候補日時}}")) : false;
  const showMeeting = tpl ? (tpl.useMeeting !== undefined ? tpl.useMeeting : false) : false;
  // プレビューを変数・テンプレート変更に追従
  useEffect(()=>{ setPreviewSubj(subj); setPreviewBody(body); },[body,subj]);
  const [gmailToken, setGmailToken] = useState(null);
  const [gmailSaving, setGmailSaving] = useState(false);
  const [gmailSaved, setGmailSaved] = useState(false);

  const copy=(txt)=>{ navigator.clipboard?.writeText(txt); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  const saveGmailDraft = async () => {
    const cfg = getEffectiveAiConfig(currentUser);
    const clientId = cfg.gmailClientId;
    if (!clientId) { alert(currentUser?.role === "admin" ? "設定 > APIキー設定 で Gmail Client ID を入力してください" : "管理者にGmail OAuth Client IDの設定を依頼してください"); return; }
    setGmailSaving(true);
    try {
      const tokenObj = await acquireGmailToken(clientId, gmailToken);
      setGmailToken(tokenObj);
      const raw = buildGmailDraftRaw(vars.宛先メール||'', previewSubj, previewBody);
      await postGmailDraft(tokenObj.token, raw);
      setGmailSaved(true);
      setTimeout(() => setGmailSaved(false), 3000);
      // 商談確定テンプレート（useMeeting）の場合、リード管理のステータスと商談情報を更新
      if (showMeeting && selLead) {
        const patch = { status: "商談確定" };
        if (vars.商談月 && vars.商談日) {
          const today = new Date();
          const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          let year = today.getFullYear();
          const m = parseInt(vars.商談月), d = parseInt(vars.商談日);
          let dt = new Date(year, m-1, d);
          if (dt < todayMidnight) { year++; dt = new Date(year, m-1, d); }
          patch.meeting_date = `${year}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        }
        if (vars.商談時 && vars.商談分 !== undefined && vars.商談分 !== "") {
          patch.meeting_time = `${String(vars.商談時).padStart(2,"0")}:${vars.商談分}`;
        }
        if (vars.商談担当) patch.sales_member = vars.商談担当;
        onUpdate(selLead, patch);
      }
    } catch(e) {
      if (e.isUnauthenticated) setGmailToken(null);
      alert('Gmail下書き保存エラー: ' + e.message);
    } finally {
      setGmailSaving(false);
    }
  };

  const saveEdit=()=>{ const u=tpls.map(t=>t.id===editTpl.id?editTpl:t); setTpls(u); saveTpls(u); setEditMode(false); };
  const deleteTpl=(id)=>{ if(!window.confirm("削除しますか？")) return; const u=tpls.filter(t=>t.id!==id); setTpls(u); saveTpls(u); if(selTpl===id) setSelTpl(u[0]?.id||""); };
  const addTpl=()=>{ const n={id:"t"+Date.now(),name:"新テンプレート",useSlots:false,useMeeting:false,subject:"件名",body:"本文"}; const u=[...tpls,n]; setTpls(u); saveTpls(u); setSelTpl(n.id); setEditTpl(n); setEditMode(true); };
  const handleDrop=(toIdx)=>{ if(dragIdx===null||dragIdx===toIdx) return; const r=[...tpls]; const [moved]=r.splice(dragIdx,1); r.splice(toIdx,0,moved); setTpls(r); saveTpls(r); setDragIdx(null); setOverIdx(null); };
  return (
    <div className="page-pad" style={{padding:"24px 28px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:17,fontWeight:900,color:"#174f35",display:"flex",alignItems:"center",gap:7}}><MailIcon size={18} color="#174f35" /> メールテンプレート</div>
        <button onClick={addTpl} style={{padding:"7px 16px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>＋ テンプレート追加</button>
      </div>
      <div className="email-grid" style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:16}}>
        <div style={{background:"#fff",borderRadius:12,border:"1px solid #e2f0e8",padding:"12px",height:"fit-content"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6a9a7a",marginBottom:8}}>テンプレート一覧</div>
          {tpls.map((t,i)=>(
            <div key={t.id}
              draggable
              onDragStart={()=>setDragIdx(i)}
              onDragOver={e=>{e.preventDefault();setOverIdx(i);}}
              onDrop={()=>handleDrop(i)}
              onDragEnd={()=>{setDragIdx(null);setOverIdx(null);}}
              onClick={()=>{setSelTpl(t.id);setEditMode(false);}}
              style={{padding:"8px 10px",borderRadius:8,cursor:"pointer",marginBottom:4,background:selTpl===t.id?"#d1fae5":"transparent",border:selTpl===t.id?"1px solid #10b981":"1px solid transparent",display:"flex",justifyContent:"space-between",alignItems:"center",opacity:dragIdx===i?0.4:1,borderTop:overIdx===i&&dragIdx!==i?"2px solid #10b981":undefined}}>
              <span style={{display:"flex",alignItems:"center",gap:4,minWidth:0,overflow:"hidden"}}>
                <span style={{cursor:"grab",color:"#aaa",fontSize:13,lineHeight:1,flexShrink:0}} onMouseDown={e=>e.stopPropagation()}>⠿</span>
                <span style={{fontSize:12,fontWeight:selTpl===t.id?700:400,color:"#174f35",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</span>
              </span>
              <div style={{display:"flex",gap:3}}>
                <button onClick={e=>{e.stopPropagation();setSelTpl(t.id);setEditTpl({...t});setEditMode(true);}} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}} title="編集"><PencilIcon size={18} color="#059669"/></button>
                <button onClick={e=>{e.stopPropagation();deleteTpl(t.id);}} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}} title="削除"><TrashIcon size={18} color="#ef4444"/></button>
              </div>
            </div>
          ))}
        </div>
        <div>
          {editMode&&editTpl ? (
            <TemplateEditor
              tpl={editTpl}
              onChange={setEditTpl}
              onSave={saveEdit}
              onCancel={() => setEditMode(false)}
            />
          ) : (
            <div className="email-main-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"start",minHeight:"calc(100vh - 180px)"}}>
              <EmailVariableForm
                leads={leads} selLead={selLead} onLeadChange={setSelLead}
                vars={vars} setVars={setVars}
                showSlots={showSlots} showMeeting={showMeeting}
                candidateSlots={candidateSlots}
              />
              {tpl&&(
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #e2f0e8",padding:"14px",display:"flex",flexDirection:"column",height:"calc(100vh - 180px)",boxSizing:"border-box",position:"sticky",top:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#174f35",display:"flex",alignItems:"center",gap:5}}><FileTextIcon size={13} color="#174f35" /> メール本文（直接編集可）</div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{setPreviewSubj(subj);setPreviewBody(body);}} style={{padding:"5px 12px",borderRadius:7,border:"1px solid #c0dece",background:"#f0f5f2",color:"#3d7a5e",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>↩ リセット</button>
                      <button onClick={saveGmailDraft} disabled={gmailSaving} style={{padding:"5px 14px",borderRadius:7,border:"none",background:gmailSaved?"#2563eb":gmailSaving?"#93c5fd":"linear-gradient(135deg,#3b82f6,#2563eb)",color:"#fff",fontSize:12,fontWeight:700,cursor:gmailSaving?"not-allowed":"pointer",fontFamily:"inherit",opacity:gmailSaving?0.7:1,display:"flex",alignItems:"center",gap:5}}>
                        {gmailSaving ? "保存中..." : gmailSaved ? <><CheckCircleIcon size={12} color="#fff" /> 下書き保存済</> : <><SendIcon size={12} color="#fff" /> Gmailに下書き保存</>}
                      </button>
                      <button onClick={()=>copy(previewSubj+"\n\n"+previewBody)} style={{padding:"5px 14px",borderRadius:7,border:"none",background:copied?"#059669":"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                        {copied ? <><CheckIcon size={12} color="#fff" /> コピー済み</> : <><ClipboardIcon size={12} color="#fff" /> 全文コピー</>}
                      </button>
                    </div>
                  </div>
                  <div style={{marginBottom:8}}>
                    <label style={{fontSize:11,color:"#6a9a7a",display:"block",marginBottom:3}}>件名</label>
                    <input value={previewSubj} onChange={e=>setPreviewSubj(e.target.value)} style={{width:"100%",padding:"7px 10px",borderRadius:7,border:"1px solid #c0dece",fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#f8fffe",color:"#174f35"}} />
                  </div>
                  <div style={{flex:1,display:"flex",flexDirection:"column"}}>
                    <label style={{fontSize:11,color:"#6a9a7a",display:"block",marginBottom:3}}>本文</label>
                    <textarea value={previewBody} onChange={e=>setPreviewBody(e.target.value)} style={{flex:1,width:"100%",minHeight:200,padding:"10px 12px",borderRadius:7,border:"1px solid #c0dece",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",lineHeight:1.7,color:"#174f35",background:"#f8fffe"}} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
