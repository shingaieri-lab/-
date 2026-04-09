import React, { useState } from 'react';
import { TODAY, uid, ACTION_TYPES, ACTION_RESULTS, at } from '../lib/constants.js';
import {
  getSources, sourceHasPortal, getPortalSitesForSource, getPortalTypes, getPortalPrice,
  getISMembers, getSalesMembers, getStatuses, getStatusColor, USER_COLORS,
} from '../lib/master.js';
import { isBusinessDay } from '../lib/date.js';
import { normalizeDate } from './CSVImport.jsx';
import { S } from './styles.js';
import { Row2, Field } from './ui.jsx';
import { PencilIcon, TrashIcon } from './icons.jsx';

function VoiceButton({ onResult, style }) {
  return (
    <button style={{...style, opacity:0.5}} title="音声入力（別モジュール）">🎤</button>
  );
}

export function LeadForm({ initial, onSave, onClose }) {
  const [d, setD] = useState(() => {
    const base = {
      company:"", contact:"", email:"", address:"", source:getSources()[0]||"",
      portal_site:"", portal_type:"", charge_applied:false,
      meeting_date:"", meeting_time:"", sales_member:"",
      is_member:"", mql:"非MQL",
      status:"新規", date:TODAY, zoho_url:"", hp_url:"",
      is_accuracy:"", memo:"",
      ...(initial||{})
    };
    // 日付フィールドをYYYY-MM-DD形式に正規化（input[type=date]対応）
    base.date = normalizeDate(base.date);
    base.meeting_date = normalizeDate(base.meeting_date);
    return base;
  });
  const set = (k,v) => setD(p=>({...p,[k]:v}));

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <div style={S.modalHead}>
          <span style={{fontWeight:700,fontSize:16}}>{initial?"リード編集":"新規リード登録"}</span>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:11,color:"#6a9a7a"}}>＊は必須項目</span>
            <button onClick={onClose} style={S.closeX}>✕</button>
          </div>
        </div>
        <div style={S.modalBody}>
          {/* 必須 */}
          <Row2>
            <Field label="会社名 *" value={d.company} onChange={v=>set("company",v)} />
            <div>
              <Field label="担当者名 *" value={d.contact} onChange={v=>set("contact",v)} />
              <div style={{fontSize:"11px",color:"#666",marginTop:"2px"}}>姓名の間は半角スペースを空けて下さい</div>
            </div>
          </Row2>
          <div style={{marginBottom:10}}>
            <Field label="メールアドレス" type="email" value={d.email||""} onChange={v=>set("email",v)} placeholder="例：yamada@example.com" />
          </div>
          <div style={{marginBottom:10}}>
            <Field label="住所" value={d.address||""} onChange={v=>set("address",v)} placeholder="例：東京都渋谷区〇〇1-2-3" />
          </div>
          <Row2>
            <Field label="反響日 *" type="date" value={d.date} onChange={v=>set("date",v)} />
            <div>
              <label style={S.lbl}>流入元 *</label>
              <select value={d.source} onChange={e=>set("source",e.target.value)} style={S.inp}>
                {getSources().map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </Row2>

          {sourceHasPortal(d.source) && (
            <>
              <Row2>
                <div>
                  <label style={S.lbl}>ポータルサイト名 *</label>
                  <select value={d.portal_site||""} onChange={e=>{set("portal_site",e.target.value);set("portal_type","");}} style={{...S.inp, borderColor: !d.portal_site ? "#ef4444" : "#c0dece"}}>
                    <option value="">選択してください</option>
                    {getPortalSitesForSource(d.source).map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.lbl}>種別</label>
                  <select value={d.portal_type||""} onChange={e=>set("portal_type",e.target.value)} style={{...S.inp, borderColor: d.portal_site && !d.portal_type ? "#ef4444" : "#c0dece"}}
                    disabled={!d.portal_site}>
                    <option value="">選択してください *</option>
                    {(getPortalTypes()[d.portal_site]||[]).map(t=><option key={t.label} value={t.label}>{t.label}</option>)}
                  </select>
                </div>
              </Row2>
              {d.portal_type && (
                <div style={{fontSize:12,color:"#f59e0b",marginBottom:8, marginTop:-4}}>
                  課金額：¥{getPortalPrice(d.portal_site, d.portal_type).toLocaleString()}
                </div>
              )}
              <div style={{display:"flex",alignItems:"center", gap:8,marginBottom:10}}>
                <input type="checkbox" id="ca" checked={d.charge_applied||false}
                  onChange={e=>set("charge_applied",e.target.checked)} />
                <label htmlFor="ca" style={{fontSize:13,color:"#2d6b4a",cursor:"pointer"}}>課金対象外申請済</label>
              </div>
            </>
          )}

          <Row2>
            <div>
              <label style={S.lbl}>IS担当 *</label>
              <select value={d.is_member||""} onChange={e=>set("is_member",e.target.value)} style={{...S.inp, borderColor: !d.is_member ? "#ef4444" : "#c0dece"}}>
                <option value="">選択してください *</option>
                {getISMembers().map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <div />
          </Row2>
          <Row2>
            <div>
              <label style={{...S.lbl, display:"flex", alignItems:"center", gap:8, cursor:"pointer", userSelect:"none"}}>
                <input type="checkbox" checked={(d.mql||"").trim() === "MQL"}
                  onChange={e => set("mql", e.target.checked ? "MQL" : "非MQL")}
                  style={{width:16, height:16, accentColor:"#059669", cursor:"pointer", flexShrink:0}} />
                <span>MQL</span>
                {(d.mql||"").trim() === "MQL" && <span style={{fontSize:11,background:"#d1fae5",color:"#059669",border:"1px solid #6ee7b7",borderRadius:5,padding:"1px 7px",fontWeight:700}}>MQL</span>}
              </label>
            </div>
            <div />
          </Row2>
          <Row2>
            <div>
              <label style={S.lbl}>ステータス *</label>
              <select value={d.status} onChange={e=>set("status",e.target.value)} style={S.inp}>
                {getStatuses().map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div />
          </Row2>

          {(d.status === "商談確定" || d.status === "日程調整中") && (
            <div style={{marginTop:12,padding:"12px 14px",background:"#d1fae522",border:"1px solid #10b98144",borderRadius:8}}>
              <div style={{fontSize:12,fontWeight:700,color:"#10b981",marginBottom:10, textTransform:"uppercase", letterSpacing:"0.06em"}}>🤝 商談情報</div>
              <Row2>
                <Field label="商談日" type="date" value={d.meeting_date||""} onChange={v=>set("meeting_date",v)} />
                <div>
                  <label style={S.lbl}>商談時刻</label>
                  <select value={d.meeting_time||""} onChange={e=>set("meeting_time",e.target.value)} style={S.inp}>
                    <option value="">選択</option>
                    {Array.from({length:28},(_,i)=>{
                      const h=String(Math.floor(i/2)+8).padStart(2,"0");
                      const m=i%2===0?"00":"30";
                      return <option key={i} value={`${h}:${m}`}>{`${h}:${m}`}</option>;
                    })}
                  </select>
                </div>
              </Row2>
              <div>
                <label style={S.lbl}>担当営業</label>
                <select value={d.sales_member||""} onChange={e=>set("sales_member",e.target.value)} style={S.inp}>
                  <option value="">選択してください</option>
                  {getSalesMembers().map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              {d.status === "商談確定" && (
                <div style={{marginTop:8}}>
                  <label style={S.lbl}>IS確度</label>
                  <select value={d.is_accuracy||""} onChange={e=>set("is_accuracy",e.target.value)} style={S.inp}>
                    <option value="">選択してください</option>
                    <option value="D（20％）">D（20％）</option>
                    <option value="C（40％）">C（40％）</option>
                    <option value="B（60％）">B（60％）</option>
                    <option value="A（80％）">A（80％）</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <label style={S.lbl}>Zoho CRM URL</label>
            <input value={d.zoho_url} onChange={e=>set("zoho_url",e.target.value)}
              placeholder="https://crm.zoho.com/crm/..." style={S.inp} />
          </div>

          <div style={{marginTop:10}}>
            <label style={S.lbl}>HP URL</label>
            <input value={d.hp_url||""} onChange={e=>set("hp_url",e.target.value)}
              placeholder="https://example.com/" style={S.inp} />
          </div>

          <div style={{marginTop:10}}>
            <label style={S.lbl}>メモ</label>
            <textarea value={d.memo||""} onChange={e=>set("memo",e.target.value)}
              placeholder="定休日（例：水・木）、連絡可能時間帯など特記事項を入力"
              style={{...S.inp, height:72, resize:"vertical", fontFamily:"inherit", lineHeight:1.5}} />
          </div>
        </div>
        <div style={S.modalFoot}>
          <button onClick={onClose} style={S.btnSec}>キャンセル</button>
          <button onClick={() => {
            if (!d.company.trim()) return alert("会社名は必須です");
            if (!d.contact.trim()) return alert("担当者名は必須です");
            if (!d.date) return alert("反響日は必須です");
            if (!d.source) return alert("流入元は必須です");
            if (!d.status) return alert("ステータスは必須です");
            if (!d.is_member) return alert("IS担当は必須です");
                        if (sourceHasPortal(d.source) && !d.portal_site) return alert("ポータルサイト名は必須です");
            if (sourceHasPortal(d.source) && d.portal_site && !d.portal_type) return alert("種別は必須です");
            onSave(d); }}
            style={S.btnP}>{initial?"更新する":"登録する"}</button>
        </div>
      </div>
    </div>
  );
}

export function ActionForm({ onSave, onClose, initial }) {
  const [type,      setType]      = useState(initial?.type      || "call");
  const [result,    setResult]    = useState(initial?.result    || "繋がった");
  const [summary,   setSummary]   = useState(initial?.summary   || "");
  const [date,      setDate]      = useState(initial?.date      || TODAY);
  const [time,      setTime]      = useState(()=>{ if(initial?.time !== undefined) return initial.time; const n=new Date(); const m=Math.floor(n.getMinutes()/30)*30; return `${String(n.getHours()).padStart(2,"0")}:${String(m).padStart(2,"0")}`; });
  const [nextDate,  setNextDate]  = useState(initial?.nextDate  || "");
  const [nextTime,  setNextTime]  = useState(initial?.nextTime  || "");
  const [nextLabel, setNextLabel] = useState(initial?.next      || "");
  const isEdit = !!initial;
  const timeOptions = Array.from({length:48},(_,i)=>{const h=String(Math.floor(i/2)).padStart(2,"0");const m=i%2===0?"00":"30";return `${h}:${m}`;});

  return (
    <div style={S.actForm}>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8,marginBottom:8}}>
        <div>
          <label style={S.lbl}>方法</label>
          <select value={type} onChange={e=>setType(e.target.value)} style={S.inp}>
            {ACTION_TYPES.map(a=><option key={a.v} value={a.v}>{a.icon} {a.label}</option>)}
          </select>
        </div>
        <div>
          <label style={S.lbl}>結果</label>
          <select value={result} onChange={e=>setResult(e.target.value)} style={S.inp}>
            {ACTION_RESULTS.map(r=><option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={S.lbl}>日付</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>時刻</label>
          <select value={time} onChange={e=>setTime(e.target.value)} style={S.inp}>
            <option value="">指定なし</option>
            {timeOptions.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <label style={{...S.lbl,marginBottom:0}}>一言メモ</label>
          <VoiceButton onResult={t => setSummary(prev => prev ? prev + "　" + t : t)} style={{padding:"3px 8px",fontSize:13}} />
        </div>
        <textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={2}
          placeholder="内容を簡単にメモ… （🎤で音声入力）"
          style={{...S.inp, resize:"none", lineHeight:1.6,fontFamily:"inherit"}} />
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8,marginBottom:10}}>
        <div>
          <label style={S.lbl}>次回追客日</label>
          <input type="date" value={nextDate} onChange={e=>setNextDate(e.target.value)}
            style={{...S.inp, borderColor: nextDate && !isBusinessDay(nextDate) ? "#ef4444" : "#c0dece"}} />
          {nextDate && !isBusinessDay(nextDate) && (
            <div style={{fontSize:11,color:"#ef4444", marginTop:3}}>⚠️ 土日祝です</div>
          )}
        </div>
        <div>
          <label style={S.lbl}>次回時刻</label>
          <select value={nextTime} onChange={e=>setNextTime(e.target.value)} style={S.inp}>
            <option value="">指定なし</option>
            {Array.from({length:28},(_,i)=>{
              const h=String(Math.floor(i/2)+8).padStart(2,"0");
              const m=i%2===0?"00":"30";
              return <option key={i} value={`${h}:${m}`}>{`${h}:${m}`}</option>;
            })}
          </select>
        </div>
        <div>
          <label style={S.lbl}>メモ（任意）</label>
          <input value={nextLabel} onChange={e=>setNextLabel(e.target.value)}
            placeholder="例：午前に架電" style={S.inp} />
        </div>
      </div>
      <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
        <button onClick={onClose} style={S.btnSec}>キャンセル</button>
        <button onClick={() => { if (!summary.trim() && !nextDate) return alert("メモまたは次回追客日を入力してください");
          onSave({ id: initial?.id || uid(), type, result, summary, date, time, next: nextLabel, nextDate, nextTime, ts: initial?.ts || Date.now() }); }}
          style={S.btnP}>{isEdit ? "更新する" : "記録する"}</button>
      </div>
    </div>
  );
}

export function ActEntry({ a, onEdit, onDelete, onPushZoho, readOnly, zohoPushing }) {
  const t = at(a.type);
  return (
    <div style={{...S.actEntry, borderLeft:`3px solid ${t.color}`}}>
      <span style={{fontSize:15,flexShrink:0}}>{t.icon}</span>
      <div style={{flex:1}}>
        <div style={{display:"flex", gap:6, alignItems:"center",flexWrap:"wrap",marginBottom:2}}>
          <span style={{fontSize:11,fontWeight:700,color:t.color}}>{t.label}</span>
          <span style={{fontSize:10,background:t.color+"22",color:t.color,borderRadius:4,padding:"1px 6px"}}>{a.result}</span>
          <span style={{fontSize:10,color:"#3d7a5e", marginLeft:"auto"}}>{a.date}{a.time ? " "+a.time : ""}</span>
          {a.recorded_by && (() => {
            const uc = USER_COLORS[a.recorded_by]||"#059669";
            return <span style={{fontSize:10,color:uc,fontWeight:600}}>記録者：{a.recorded_by}</span>;
          })()}
          {!readOnly && onPushZoho && (
            <button onClick={onPushZoho} disabled={zohoPushing} title="Zohoに同期"
              style={{...S.btnEditAct, background: zohoPushing?"#f0f9ff":"#e0f2fe", border:"1px solid #7dd3fc", color:"#0284c7", fontSize:10, padding:"1px 6px", borderRadius:4, cursor: zohoPushing?"default":"pointer"}}>
              {zohoPushing ? "同期中" : "🔗"}
            </button>
          )}
          {!readOnly && <button onClick={onEdit} style={S.btnEditAct} title="編集"><PencilIcon color="#059669"/></button>}
          {!readOnly && <button onClick={onDelete} style={{...S.btnEditAct,background:"#fef2f2",border:"1px solid #fca5a5"}} title="削除"><TrashIcon color="#ef4444"/></button>}
        </div>
        <p style={{margin:0,fontSize:12,color:"#174f35", lineHeight:1.6, whiteSpace:"pre-wrap"}}>{a.summary}</p>
        {(a.nextDate||a.next) && <div style={{fontSize:11,color:"#059669", marginTop:3}}>→ 次回：{a.nextDate||""}{a.nextTime ? " "+a.nextTime : ""}{a.next ? " "+a.next : ""}</div>}
        {a.talkPoints?.length>0&&<div style={{marginTop:5,background:"#f0f9f5",borderRadius:6,padding:"6px 10px"}}><div style={{fontSize:10,color:"#059669",fontWeight:700,marginBottom:4}}>📞 次回架電トークポイント</div>{a.talkPoints.map((p,i)=><div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:3}}><span style={{background:"#059669",color:"#fff",borderRadius:3,padding:"0px 5px",fontSize:10,fontWeight:700,flexShrink:0,lineHeight:"16px"}}>{i+1}</span><span style={{fontSize:11,color:"#174f35",lineHeight:1.5}}>{p}</span></div>)}</div>}
      </div>
    </div>
  );
}
