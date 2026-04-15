// メールテンプレートの差し込み変数入力フォーム
import { LeadCombobox } from '../leads/LeadCombobox.jsx';
import { getSalesMembers } from '../../lib/master.js';

const inpStyle = {width:"100%",padding:"7px 10px",borderRadius:7,border:"1px solid #c0dece",fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#f8fffe"};
const lblStyle = {fontSize:11,color:"#6a9a7a",display:"block",marginBottom:3};

export function EmailVariableForm({ leads, selLead, onLeadChange, vars, setVars, showSlots, showMeeting, candidateSlots }) {
  return (
    <div style={{background:"#fff",borderRadius:12,border:"1px solid #e2f0e8",padding:"14px"}}>
      <div style={{fontSize:12,fontWeight:700,color:"#174f35",marginBottom:10}}>差し込み変数</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
        <div><label style={lblStyle}>リード選択</label>
          <LeadCombobox leads={leads} value={selLead} onChange={onLeadChange} placeholder="会社名・担当者名で検索" inputStyle={inpStyle} darkMode={false} />
        </div>
        <div><label style={lblStyle}>{"{{"+"担当者苗字"+"}}"} <span style={{color:"#10b981",fontSize:10,fontWeight:600}}>苗字のみ自動</span></label>
          <input value={vars.担当者苗字||""} onChange={e=>setVars(v=>({...v,担当者苗字:e.target.value}))} style={inpStyle} placeholder="例：山田" />
        </div>
        <div><label style={lblStyle}>{"{{"+"担当者名"+"}}"}</label>
          <input value={vars.担当者名||""} onChange={e=>setVars(v=>({...v,担当者名:e.target.value}))} style={inpStyle} />
        </div>
        <div><label style={lblStyle}>{"{{"+"会社名"+"}}"}</label>
          <input value={vars.会社名||""} onChange={e=>setVars(v=>({...v,会社名:e.target.value}))} style={inpStyle} />
        </div>
        <div><label style={lblStyle}>{"{{"+"送信者名"+"}}"} <span style={{color:"#10b981",fontSize:10,fontWeight:600}}>自動入力</span></label>
          <input value={vars.送信者名||""} onChange={e=>setVars(v=>({...v,送信者名:e.target.value}))} style={inpStyle} />
        </div>
        <div style={{gridColumn:"1/-1"}}><label style={lblStyle}>宛先メールアドレス <span style={{color:"#9ca3af",fontSize:10}}>（Gmail下書き保存時のTo欄・任意）</span> <span style={{color:"#10b981",fontSize:10,fontWeight:600}}>自動入力</span></label>
          <input value={vars.宛先メール||""} onChange={e=>setVars(v=>({...v,宛先メール:e.target.value}))} style={inpStyle} placeholder="例：yamada@example.com" type="email" />
        </div>
      </div>
      {showMeeting && (
        <div style={{marginTop:4}}>
          <div style={{fontSize:11,fontWeight:700,color:"#174f35",marginBottom:6,borderTop:"1px solid #e2f0e8",paddingTop:8}}>商談日時・担当者</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",gap:6}}>
            <div><label style={lblStyle}>{"{{"+"商談月"+"}}"}</label>
              <select value={vars.商談月||""} onChange={e=>setVars(v=>({...v,商談月:e.target.value}))} style={inpStyle}>
                <option value="">--</option>
                {Array.from({length:12},(_,i)=><option key={i+1} value={String(i+1)}>{i+1}</option>)}
              </select>
            </div>
            <div><label style={lblStyle}>{"{{"+"商談日"+"}}"}</label>
              <select value={vars.商談日||""} onChange={e=>setVars(v=>({...v,商談日:e.target.value}))} style={inpStyle}>
                <option value="">--</option>
                {Array.from({length:31},(_,i)=><option key={i+1} value={String(i+1)}>{i+1}</option>)}
              </select>
            </div>
            <div><label style={lblStyle}>{"{{"+"商談曜日"+"}}"} <span style={{color:"#10b981",fontSize:10,fontWeight:600}}>自動</span></label>
              <input value={vars.商談曜日||""} readOnly style={{...inpStyle,background:"#f0f5f2",color:"#3d7a5e",cursor:"default"}} placeholder="自動" />
            </div>
            <div><label style={lblStyle}>{"{{"+"商談時"+"}}"}</label>
              <select value={vars.商談時||""} onChange={e=>setVars(v=>({...v,商談時:e.target.value}))} style={inpStyle}>
                <option value="">--</option>
                {Array.from({length:24},(_,i)=><option key={i} value={String(i)}>{i}</option>)}
              </select>
            </div>
            <div><label style={lblStyle}>{"{{"+"商談分"+"}}"}</label>
              <select value={vars.商談分||""} onChange={e=>setVars(v=>({...v,商談分:e.target.value}))} style={inpStyle}>
                <option value="">--</option>
                {["00","15","30","45"].map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div><label style={lblStyle}>{"{{"+"商談担当"+"}}"}</label>
              <select value={vars.商談担当||""} onChange={e=>setVars(v=>({...v,商談担当:e.target.value}))} style={inpStyle}>
                <option value="">--</option>
                {getSalesMembers().map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
      {showSlots && (
        <div>
          <label style={lblStyle}>{"{{"+"候補日時"+"}}"} {candidateSlots.length > 0 && <span style={{color:"#10b981",fontSize:10,fontWeight:600}}>📅 候補日ツールから自動入力済</span>}</label>
          <textarea value={vars.候補日時||""} onChange={e=>setVars(v=>({...v,候補日時:e.target.value}))} rows={4} placeholder={"例：2026年3月20日（金）10:00〜11:00"} style={{...inpStyle,resize:"vertical",lineHeight:1.6}} />
        </div>
      )}
    </div>
  );
}
