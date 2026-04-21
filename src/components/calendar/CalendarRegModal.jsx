// Googleカレンダー登録モーダル（候補日の一括登録）
import { useState, useEffect } from 'react';
import { LeadCombobox } from '../leads/LeadCombobox.jsx';
import { acquireCalendarToken, isTokenValid } from '../../lib/oauth.js';
import { loadGCalConfig } from '../../lib/gcal.js';

const lbl  = { display:"block", fontSize:11, color:"#6a9a7a", marginBottom:4, fontWeight:600 };
const inp  = { width:"100%", background:"#f8fffe", border:"1px solid #99e6d8", borderRadius:7, padding:"9px 12px", color:"#1f5c40", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", marginBottom:8 };
const btnP = { background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", border:"none", borderRadius:8, padding:"10px 18px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" };
const btnSec = { background:"#d8ede1", color:"#2d6b4a", border:"1px solid #c0dece", borderRadius:8, padding:"9px 16px", fontSize:13, cursor:"pointer", fontFamily:"inherit" };

export function CalendarRegModal({ show, onClose, initialLeadId, candidateSlots, leads, selectedMembers, currentUser, mergedCalendarIds, oauthToken, setOauthToken }) {
  const [calRegLeadId, setCalRegLeadId] = useState("");
  const [calRegCompany, setCalRegCompany] = useState("");
  const [calRegTitleTpl, setCalRegTitleTpl] = useState(() => loadGCalConfig().calRegTitleTpl || "仮WEB営1）【{{会社名}}様】");
  const [calRegLoading, setCalRegLoading] = useState(false);
  const [calRegResults, setCalRegResults] = useState([]);

  useEffect(() => {
    if (show) {
      setCalRegTitleTpl(loadGCalConfig().calRegTitleTpl || "仮WEB営1）【{{会社名}}様】");
      setCalRegResults([]);
      setCalRegLeadId(initialLeadId || "");
      const lead = leads.find(l => l.id === initialLeadId);
      setCalRegCompany(lead?.company || "");
    }
  }, [show, initialLeadId]);

  if (!show) return null;

  const resolvedCalTitle = calRegTitleTpl.replace(/\{\{会社名\}\}/g, calRegCompany);

  const registerToCalendar = async () => {
    const aiCfg = window.__appData?.aiConfig || {};
    const clientId = currentUser?.gmailClientId || aiCfg.gmailClientId || "";
    if (!clientId) { alert(currentUser?.role === "admin" ? "設定 > APIキー設定 で Gmail Client ID を入力してください" : "管理者にGmail OAuth Client IDの設定を依頼してください"); return; }
    if (candidateSlots.length === 0) return;
    setCalRegLoading(true); setCalRegResults([]);
    try {
      // 検索時に取得済みのトークンを使い回す。期限切れなら再取得する
      const tokenObj = await acquireCalendarToken(clientId, oauthToken);
      if (setOauthToken) setOauthToken(tokenObj);
      const token = tokenObj.token;
      const title = resolvedCalTitle;
      const results = [];
      for (const slot of candidateSlots) {
        const slotMembers = slot.members?.length > 0 ? slot.members : selectedMembers;
        const missingMembers = slotMembers.filter(m => !mergedCalendarIds[m]);
        missingMembers.forEach(member => results.push({ slot, member, success: false, error: "カレンダーIDなし" }));
        const attendees = slotMembers
          .filter(m => mergedCalendarIds[m])
          .map(m => ({ email: mergedCalendarIds[m] }));
        try {
          const startDT = `${slot.date}T${slot.start}:00+09:00`;
          const endDT   = `${slot.date}T${slot.end}:00+09:00`;
          const resp = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none`,
            { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ summary: title, start: { dateTime: startDT, timeZone: "Asia/Tokyo" }, end: { dateTime: endDT, timeZone: "Asia/Tokyo" }, attendees }) }
          );
          if (!resp.ok) {
            const err = await resp.json();
            if (err.error?.code === 401) { if (setOauthToken) setOauthToken(null); throw new Error('認証の期限が切れました。再度お試しください。'); }
            slotMembers.forEach(member => results.push({ slot, member, success: false, error: err.error?.message || "登録失敗" }));
          } else {
            slotMembers.forEach(member => results.push({ slot, member, success: true }));
          }
        } catch(e) { slotMembers.forEach(member => results.push({ slot, member, success: false, error: e.message })); }
      }
      setCalRegResults(results);
    } catch(e) {
      if (setOauthToken) setOauthToken(null);
      alert("エラー：" + e.message);
    } finally {
      setCalRegLoading(false);
    }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{background:"#fff",borderRadius:16,padding:28,width:500,maxWidth:"95vw",boxShadow:"0 8px 40px rgba(0,0,0,0.2)",maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{fontSize:16,fontWeight:800,color:"#174f35",marginBottom:18}}>📅 Googleカレンダーに登録</div>

        <div style={{marginBottom:12}}>
          <label style={lbl}>会社名<span style={{fontWeight:400,color:"#6b7280",fontSize:11,marginLeft:6}}>（{"{{会社名}}"} に代入されます）</span></label>
          {leads.length > 0 && (
            <div style={{marginBottom:6}}>
              <LeadCombobox leads={leads} value={calRegLeadId}
                onChange={id => { setCalRegLeadId(id); const lead = leads.find(l=>l.id===id); if (lead) setCalRegCompany(lead.company||""); }}
                placeholder="リードから検索・選択" inputStyle={inp} darkMode={false} />
            </div>
          )}
          <input value={calRegCompany} onChange={e=>setCalRegCompany(e.target.value)} placeholder="例：株式会社〇〇" style={inp} />
        </div>

        <div style={{marginBottom:16}}>
          <label style={lbl}>タイトルテンプレート</label>
          <input value={calRegTitleTpl} onChange={e=>setCalRegTitleTpl(e.target.value)} style={inp} />
          <div style={{fontSize:11,color:"#6b7280",marginTop:4,background:"#f0f5f2",borderRadius:6,padding:"5px 10px"}}>
            プレビュー：<span style={{fontWeight:700,color:"#174f35"}}>{resolvedCalTitle || "（タイトル未入力）"}</span>
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <label style={lbl}>登録する候補日（{candidateSlots.length}件）</label>
          {candidateSlots.map((slot,i) => (
            <div key={i} style={{fontSize:12,background:"#ecfdf5",border:"1px solid #10b98144",borderRadius:8,padding:"7px 12px",marginBottom:6,color:"#174f35",display:"flex",alignItems:"center",gap:8}}>
              <span>📅 {slot.date}（{["日","月","火","水","木","金","土"][new Date(slot.date+"T00:00:00").getDay()]}）{slot.start}〜{slot.end}</span>
              {slot.members?.length > 0 && <span style={{color:"#6a9a7a",fontSize:11}}>担当：{slot.members.join("・")}</span>}
            </div>
          ))}
        </div>

        {calRegResults.length > 0 && (
          <div style={{marginBottom:16}}>
            <label style={lbl}>登録結果</label>
            {calRegResults.map((r,i) => (
              <div key={i} style={{fontSize:12,borderRadius:8,padding:"5px 10px",marginBottom:4,
                background:r.success?"#ecfdf5":"#fef2f2", border:`1px solid ${r.success?"#10b98144":"#fca5a544"}`,
                color:r.success?"#065f46":"#b91c1c"}}>
                {r.success ? "✅" : "❌"} {r.slot.date} {r.slot.start}〜{r.slot.end}
                {r.member && <span style={{marginLeft:6,fontWeight:600}}>{r.member}</span>}
                ：{r.success ? "登録完了" : r.error}
              </div>
            ))}
          </div>
        )}

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
          <button onClick={onClose} style={btnSec}>閉じる</button>
          <button onClick={registerToCalendar} disabled={calRegLoading || !resolvedCalTitle.trim()}
            style={{...btnP, opacity:(calRegLoading||!resolvedCalTitle.trim())?0.6:1, cursor:(calRegLoading||!resolvedCalTitle.trim())?"not-allowed":"pointer"}}>
            {calRegLoading ? "⏳ 登録中..." : calRegResults.length > 0 && calRegResults.every(r=>r.success) ? "✅ 登録済み（再登録）" : "📅 カレンダーに登録する"}
          </button>
        </div>
      </div>
    </div>
  );
}
