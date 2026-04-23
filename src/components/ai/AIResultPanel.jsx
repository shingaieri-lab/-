// AI解析結果パネル（ネクストアクション・フォローメール・トークポイント表示）
import { ACTION_TYPES } from '../../constants/index.js';
import { addBizDays } from '../../lib/holidays.js';
import {
  SparkleIcon, SaveIcon, CheckCircleIcon, CheckIcon,
  PhoneIcon, MailIcon, ChatIcon, FileTextIcon,
  CalendarNavIcon, ClipboardIcon, SendIcon,
} from '../ui/Icons.jsx';

const ACTION_ICON_MAP = {
  call:  PhoneIcon,
  email: MailIcon,
  sms:   ChatIcon,
  other: FileTextIcon,
};

export function AIResultPanel({
  result, actionDate, selLead, lead, saved,
  editEmail, setEditEmail,
  copiedEmail, setCopiedEmail,
  aiGmailSaving, aiGmailSaved,
  aiCalSaving, aiCalSaved,
  onSave, onSaveGmailDraft, onSaveCalTodo,
  onGoCalendar, onGoLeads,
}) {
  const nat = result.next_action_type;
  const isEmailNext = nat === "email";
  const isScheduleNext = nat === "schedule";
  const isCallNext = nat === "call" || nat === "sms";
  const NatIcon = isEmailNext ? MailIcon : isScheduleNext ? CalendarNavIcon : isCallNext ? PhoneIcon : ClipboardIcon;
  const natLabel = isEmailNext ? "メール送信" : isScheduleNext ? "候補日提案" : nat === "call" ? "架電" : nat === "sms" ? "SMS送信" : "その他";
  const natAccent = isEmailNext ? "#2563eb" : isScheduleNext ? "#0891b2" : isCallNext ? "#059669" : "#7c3aed";
  const natBg = isEmailNext ? "#eff6ff" : isScheduleNext ? "#ecfeff" : isCallNext ? "#f0fdf4" : "#faf5ff";
  const natBorder = isEmailNext ? "#bfdbfe" : isScheduleNext ? "#a5f3fc" : isCallNext ? "#bbf7d0" : "#e9d5ff";
  const iLvColor = { "高": "#10b981", "中": "#f59e0b", "低": "#ef4444" };

  const ActionTypeIcon = ACTION_ICON_MAP[result.action_type] || PhoneIcon;
  const actionTypeLabel = ACTION_TYPES.find(t=>t.v===result.action_type)?.label || "電話";

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* ヘッダー：保存ボタン */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px",borderBottom:"1px solid #e2f0e8",background:"#fff",flexShrink:0}}>
        <div>
          <span style={{fontSize:13,fontWeight:700,color:"#059669",display:"flex",alignItems:"center",gap:5}}>
            <SparkleIcon size={14} color="#059669" /> AI解析結果
          </span>
          <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>解析結果をリードの活動履歴に保存できます</div>
        </div>
        {!selLead
          ? <div style={{textAlign:"right"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#d1d5db",display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end"}}>
                <SaveIcon size={13} color="#d1d5db" /> 活動履歴に保存
              </div>
              <div style={{fontSize:10,color:"#d1d5db",marginTop:2}}>← まずリードを選択してください</div>
            </div>
          : saved
            ? <div style={{textAlign:"right"}}>
                <button onClick={onSave} style={{background:"#f0fdf4",color:"#059669",border:"1.5px solid #6ee7b7",borderRadius:8,padding:"6px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                  <CheckCircleIcon size={13} color="#059669" /> 保存済み（再保存する）
                </button>
                <div style={{fontSize:10,color:"#6a9a7a",marginTop:2}}>活動履歴に記録されました</div>
              </div>
            : <div style={{textAlign:"right"}}>
                <button onClick={onSave} style={{background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",borderRadius:8,padding:"7px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                  <SaveIcon size={14} color="#fff" /> アクション履歴に保存
                </button>
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
              <div style={{fontSize:15,fontWeight:700,color:"#374151",display:"flex",alignItems:"center",gap:6}}>
                <ActionTypeIcon size={15} color="#374151" /> {actionTypeLabel}
              </div>
            </div>
            <div style={{padding:"12px 14px",borderRight:"1px solid #f0f5f2"}}>
              <div style={{fontSize:10,color:"#6a9a7a",marginBottom:4}}>結果</div>
              <div style={{fontSize:15,fontWeight:700,color:"#374151"}}>{result.action_result||"その他"}</div>
            </div>
            <div style={{padding:"12px 14px"}}>
              <div style={{fontSize:10,color:"#6a9a7a",marginBottom:4}}>顧客の温度感</div>
              <div style={{fontSize:15,fontWeight:700,color:iLvColor[result.interest_level]||"#64748b"}}>{result.interest_level||"—"}</div>
            </div>
          </div>
        </div>

        {/* ② AIが提案するネクストアクション */}
        <div style={{background:natBg,borderRadius:10,border:`1.5px solid ${natBorder}`,overflow:"hidden"}}>
          <div style={{padding:"10px 16px",borderBottom:`1px solid ${natBorder}`,display:"flex",alignItems:"center",gap:8}}>
            <span style={{background:natAccent,color:"#fff",borderRadius:20,padding:"3px 14px",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
              <NatIcon size={13} color="#fff" /> {natLabel}
            </span>
            <span style={{fontSize:12,color:natAccent,fontWeight:700}}>← AIが推奨するネクストアクション</span>
          </div>
          <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <div style={{background:"#fff",borderRadius:8,padding:"10px 16px",flex:1,minWidth:100}}>
                <div style={{fontSize:11,color:"#6a9a7a",marginBottom:3}}>実施タイミング</div>
                <div style={{fontSize:17,fontWeight:700,color:natAccent}}>{result.next_action_date_offset?`${result.next_action_date_offset}営業日後`:"—"}</div>
                {(result.next_action_date||result.next_action_date_offset)&&<div style={{fontSize:11,color:"#6a9a7a",marginTop:2}}>{result.next_action_date||addBizDays(actionDate,result.next_action_date_offset)}</div>}
              </div>
              <div style={{background:"#fff",borderRadius:8,padding:"10px 16px",flex:1,minWidth:80}}>
                <div style={{fontSize:11,color:"#6a9a7a",marginBottom:3}}>推奨時間</div>
                <div style={{fontSize:17,fontWeight:700,color:"#7c3aed"}}>{result.next_action_time||"—"}</div>
              </div>
            </div>
            {result.next_action_memo&&<div style={{background:"#fff",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#059669",fontWeight:600,lineHeight:1.6}}>{result.next_action_memo}</div>}
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",paddingTop:4}}>
              <button onClick={onSaveCalTodo} disabled={aiCalSaving||!selLead||(!result?.next_action_date&&!result?.next_action_date_offset)}
                style={{background:aiCalSaved?"#7c3aed":aiCalSaving?"#4c1d9566":"#7c3aed22",color:aiCalSaved?"#fff":"#7c3aed",border:"1px solid #c4b5fd",borderRadius:7,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:(aiCalSaving||!selLead||(!result?.next_action_date&&!result?.next_action_date_offset))?"not-allowed":"pointer",fontFamily:"inherit",opacity:(aiCalSaving||!selLead||(!result?.next_action_date&&!result?.next_action_date_offset))?0.5:1,display:"flex",alignItems:"center",gap:5}}>
                {aiCalSaving ? "作成中..." : aiCalSaved
                  ? <><CheckCircleIcon size={13} color="#fff" /> タスク作成済</>
                  : <><CheckIcon size={13} color="#7c3aed" /> GoogleタスクTODO</>}
              </button>
              {isScheduleNext&&<button onClick={onGoCalendar} style={{background:"#0891b2",color:"#fff",border:"none",borderRadius:7,padding:"7px 18px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                <CalendarNavIcon size={13} color="#fff" /> 候補日を探す
              </button>}
              {saved&&isCallNext&&<button onClick={()=>onGoLeads(selLead)} style={{background:natAccent,color:"#fff",border:"none",borderRadius:7,padding:"7px 18px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                <PhoneIcon size={13} color="#fff" /> リード詳細へ
              </button>}
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
              <span style={{fontSize:12,fontWeight:700,color:"#2563eb",display:"flex",alignItems:"center",gap:5}}>
                <MailIcon size={13} color="#2563eb" /> フォローメール
              </span>
              <div style={{display:"flex",gap:8}}>
                <button onClick={onSaveGmailDraft} disabled={aiGmailSaving}
                  style={{background:aiGmailSaved?"#2563eb":aiGmailSaving?"#1e40af66":"linear-gradient(135deg,#3b82f6,#2563eb)",color:"#fff",border:"none",borderRadius:7,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:aiGmailSaving?"not-allowed":"pointer",fontFamily:"inherit",opacity:aiGmailSaving?0.7:1,display:"flex",alignItems:"center",gap:5}}>
                  {aiGmailSaving ? "保存中..." : aiGmailSaved
                    ? <><CheckCircleIcon size={12} color="#fff" /> 下書き保存済</>
                    : <><SendIcon size={12} color="#fff" /> Gmailに下書き保存</>}
                </button>
                <button onClick={()=>{navigator.clipboard?.writeText(`件名: ${editEmail.subject}\n\n${editEmail.body}`);setCopiedEmail(true);setTimeout(()=>setCopiedEmail(false),2000);}}
                  style={{background:copiedEmail?"#dbeafe":"#f0f5f2",color:copiedEmail?"#2563eb":"#6a9a7a",border:"1px solid #bfdbfe",borderRadius:7,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                  {copiedEmail ? <><CheckIcon size={12} color="#2563eb" /> コピー済</> : <><ClipboardIcon size={12} color="#6a9a7a" /> コピー</>}
                </button>
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
}
