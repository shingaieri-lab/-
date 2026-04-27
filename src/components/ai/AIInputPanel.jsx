// AIページの入力パネル（リード選択・アクション入力フォーム・解析ボタン）
import { LeadCombobox } from '../leads/LeadCombobox.jsx';
import { ACTION_TYPES, ACTION_RESULTS } from '../../constants/index.js';
import {
  BuildingIcon, RefreshIcon, CalendarNavIcon, ClockIcon,
  ClipboardIcon, PhoneIcon, MailIcon, ChatIcon, FileTextIcon,
  SparkleIcon,
} from '../ui/Icons.jsx';

const ACTION_ICON_MAP = {
  call:  PhoneIcon,
  email: MailIcon,
  sms:   ChatIcon,
  other: FileTextIcon,
};

const LBL = { fontSize:11, fontWeight:700, color:"#6a9a7a", display:"flex", alignItems:"center", gap:5, letterSpacing:"0.06em" };

export function AIInputPanel({
  leads, selLead, onLeadChange, lead,
  actionDate, onDateChange,
  actionTime, onTimeChange,
  manualType, onTypeChange,
  manualResult, onResultChange,
  memo, onMemoChange,
  error, loading,
  onAnalyze, onReset,
}) {
  return (
    <div className="ai-left-panel" style={{width:380,borderRight:"1px solid #c0dece",display:"flex",flexDirection:"column",background:"#f0f5f2",flexShrink:0,overflow:"auto"}}>
      <div style={{flex:1,padding:"18px 20px",display:"flex",flexDirection:"column",gap:14}}>
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <label style={LBL}><BuildingIcon size={13} color="#6a9a7a" /> リード選択</label>
            <button onClick={onReset} style={{fontSize:11,padding:"4px 10px",borderRadius:7,border:"1px solid #c0dece",background:"#fff",color:"#6a9a7a",cursor:"pointer",fontFamily:"inherit",fontWeight:600,lineHeight:1,display:"flex",alignItems:"center",gap:4}}>
              <RefreshIcon size={12} color="#6a9a7a" /> リセット
            </button>
          </div>
          <LeadCombobox leads={leads} value={selLead} onChange={onLeadChange} placeholder="会社名・担当者名で検索" inputStyle={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid #c0dece",background:"#fff",color:"#174f35",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} darkMode={false} />
          {lead&&(lead.actions||[]).length>0&&(
            <div style={{marginTop:8,background:"#fff",borderRadius:8,padding:"10px 12px",border:"1px solid #c0dece"}}>
              <div style={{fontSize:11,color:"#6a9a7a",marginBottom:4}}>直近のアクション</div>
              {[...(lead.actions||[])].filter(a=>a&&typeof a==="object").sort((a,b)=>(String(b.ts||"")).localeCompare(String(a.ts||""))).slice(0,2).map((a,i)=>{
                const TypeIcon = ACTION_ICON_MAP[a.type] || PhoneIcon;
                const t = ACTION_TYPES.find(t=>t.v===a.type);
                return (
                  <div key={a.id||i} style={{fontSize:11,color:"#6a9a7a",borderLeft:"2px solid #c0dece",paddingLeft:8,marginBottom:4,display:"flex",gap:4,alignItems:"center"}}>
                    <TypeIcon size={11} color={t?.color||"#6a9a7a"} />
                    <span>{String(a.date||"")} {String(a.time||"")} {String(a.result||"")} — {String(a.summary||"").slice(0,40)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <label style={{...LBL, marginBottom:6}}><CalendarNavIcon size={13} color="#6a9a7a" /> 日付</label>
            <input type="date" value={actionDate} onChange={e=>onDateChange(e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #c0dece",background:"#fff",color:"#174f35",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{...LBL, marginBottom:6}}><ClockIcon size={13} color="#6a9a7a" /> 時刻</label>
            <select value={actionTime} onChange={e=>onTimeChange(e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #c0dece",background:"#fff",color:"#174f35",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}>
              {Array.from({length:29},(_,i)=>{const h=String(Math.floor(i/2)+7).padStart(2,"0");const m=i%2===0?"00":"30";return <option key={i} value={`${h}:${m}`}>{h}:{m}</option>;})}
            </select>
          </div>
        </div>
        <div>
          <label style={{...LBL, marginBottom:6}}><ClipboardIcon size={13} color="#6a9a7a" /> アクション種別</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {ACTION_TYPES.map(t=>{
              const TypeIcon = ACTION_ICON_MAP[t.v] || PhoneIcon;
              const active = manualType === t.v;
              return (
                <button key={t.v} onClick={()=>onTypeChange(t.v)}
                  style={{padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit",
                    background:active?"linear-gradient(135deg,#2563eb,#1d4ed8)":"#fff",
                    color:active?"#fff":"#6a9a7a",
                    border:active?"1px solid #3b82f6":"1px solid #c0dece",
                    display:"flex",alignItems:"center",gap:5}}>
                  <TypeIcon size={13} color={active?"#fff":"#6a9a7a"} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label style={{...LBL, marginBottom:6}}>アクション結果</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {ACTION_RESULTS.map(r=><button key={r} onClick={()=>onResultChange(r)} style={{padding:"6px 10px",borderRadius:8,fontSize:11,fontWeight:manualResult===r?700:400,cursor:"pointer",fontFamily:"inherit",background:manualResult===r?"linear-gradient(135deg,#0d9488,#059669)":"#fff",color:manualResult===r?"#fff":"#6a9a7a",border:manualResult===r?"1px solid #10b981":"1px solid #c0dece"}}>{r}</button>)}
          </div>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          <label style={{...LBL, textTransform:"uppercase", marginBottom:6}}>アクションメモ</label>
          <textarea value={memo} onChange={e=>onMemoChange(e.target.value)} placeholder={"例：\n田中部長に架電。取次いただき3分ほど話せた。\n現在は紙とLINEで管理、職人10名。\n来月繁忙期で「忙しくなる前に検討したい」とのこと。\n2週間後に再度連絡希望。"} style={{flex:1,minHeight:140,background:"#fff",border:"1px solid #c0dece",borderRadius:10,padding:"12px 14px",color:"#174f35",fontSize:13,lineHeight:1.7,resize:"vertical",outline:"none",fontFamily:"inherit"}}/>
        </div>
        {error&&<div style={{color:"#f87171",fontSize:12,background:"#ef444416",borderRadius:8,padding:"8px 12px",border:"1px solid #ef444433"}}>{error}</div>}
        <button onClick={onAnalyze} disabled={loading||!memo.trim()} style={{background:loading?"#1e40af66":"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",border:"none",borderRadius:10,padding:"13px 0",fontSize:14,fontWeight:700,cursor:loading||!memo.trim()?"not-allowed":"pointer",opacity:!memo.trim()?0.5:1,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
          <SparkleIcon size={16} color="#fff" />
          {loading ? "AIが解析中..." : "AIで解析する"}
        </button>
      </div>
    </div>
  );
}
