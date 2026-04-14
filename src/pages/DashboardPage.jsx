// ダッシュボードページ（月次・流入元別レポート）
import { useState, useMemo, useEffect } from 'react';
import { S } from '../styles/index.js';
import { SourceIconSVG } from '../components/ui/SourceIconSVG.jsx';
import { TODAY, THIS_MONTH } from '../lib/holidays.js';
import {
  getSources, getStatuses, getStatusColor, getSourceColor, getSourceIcon,
  getPortalSites, getPortalPrice,
} from '../lib/master.js';

export function DashboardPage({ leads, currentUser, onNavigate, masterVer, isMobile }) {
  const toYM = (dateStr) => {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}/.test(dateStr)) return dateStr.slice(0, 7);
    const m = dateStr.match(/^(\d{4})[/-](\d{1,2})/);
    if (m) return m[1] + "-" + String(m[2]).padStart(2, "0");
    return "";
  };

  const [month, setMonth] = useState(THIS_MONTH);
  const months = useMemo(() => {
    const set = new Set(leads.map(l => toYM(l.date)).filter(Boolean));
    return [...set].sort().reverse();
  }, [leads]);

  useEffect(() => {
    if (months.length > 0 && !months.includes(month)) setMonth(months[0]);
  }, [months]);

  const fl = month ? leads.filter(l => toYM(l.date) === month) : leads;

  const bySrc    = s => fl.filter(l => l.source === s);
  const isAppt   = l => ["日程調整中","商談確定"].includes(l.status);
  const isWon    = l => l.status === "商談確定";
  const rate     = (a, b) => b ? (a/b*100).toFixed(1)+"%" : "—";
  const validLeads = fl.filter(l => l.status !== "育成対象外");

  const portal    = fl.filter(l => !!l.portal_site);
  const isCharged = l => !l.charge_applied;
  const cost      = portal.filter(isCharged).reduce((s, l) => s + getPortalPrice(l.portal_site, l.portal_type), 0);
  const applied   = portal.filter(l => l.charge_applied);

  const todayActions   = leads.filter(l => l.next_action_date === TODAY && l.is_member === currentUser?.name);
  const overdueActions = leads.filter(l => l.next_action_date && l.next_action_date < TODAY && l.is_member === currentUser?.name);

  const kpiItems = [
    { icon:"📥", label:"総反響数",   value:fl.length+"件",               color:"#10b981", bg:"linear-gradient(135deg,#0ecf8a,#059669)", sub:`MQL ${fl.filter(l=>l.mql==="MQL").length}件 (${rate(fl.filter(l=>l.mql==="MQL").length, fl.length)}) / 有効リード ${validLeads.length}件`, filter:{ month } },
    { icon:"📅", label:"商談設定数", value:fl.filter(isAppt).length+"件",color:"#f59e0b", bg:"linear-gradient(135deg,#fbbf24,#d97706)", sub:`商談化率 ${rate(fl.filter(isAppt).length, validLeads.length)}（有効リード ${validLeads.length}件）`, filter:{ month, statuses:["日程調整中","商談確定"] } },
    { icon:"📒", label:"課金見込み", value:"¥"+cost.toLocaleString(),    color:"#8b5cf6", bg:"linear-gradient(135deg,#a78bfa,#7c3aed)", sub:`対象外申請済 ${applied.length}件`, filter:{ month, hasPortal: true } },
    { icon:"🔥", label:"本日追客",   value:todayActions.length+"件",     color:"#0ea5e9", bg:"linear-gradient(135deg,#38bdf8,#0369a1)", sub:`期限切れ ${overdueActions.length}件`, filter:{ nextActionDate: TODAY } },
  ];

  return (
    <div className="dash-container" style={{padding:"14px 20px", height: isMobile ? "auto" : "calc(100vh - 60px)", display:"flex", flexDirection:"column", gap:10, overflow: isMobile ? "visible" : "hidden"}}>
      {/* ヘッダー */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0}}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <div style={{fontSize:17, fontWeight:900, color:"#174f35"}}>ダッシュボード</div>
          <div style={{fontSize:11, color:"#6a9a7a"}}>月次・流入元別レポート</div>
        </div>
        <select value={month} onChange={e => setMonth(e.target.value)} style={{...S.sel, fontSize:12}}>
          {months.length === 0 && <option value={THIS_MONTH}>{THIS_MONTH.slice(0,4)}年{parseInt(THIS_MONTH.slice(5))}月</option>}
          {months.map(m => <option key={m} value={m}>{m.slice(0,4)}年{parseInt(m.slice(5))}月</option>)}
        </select>
      </div>

      {/* KPI グラデカード */}
      <div className="kpi-grid" style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, flexShrink:0}}>
        {kpiItems.map((k, i) => (
          <div key={i} onClick={() => onNavigate && onNavigate(k.filter)}
            style={{borderRadius:16, overflow:"hidden", boxShadow:"0 6px 20px "+k.color+"44", position:"relative", cursor:"pointer", transition:"transform 0.1s, box-shadow 0.1s"}}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 10px 28px "+k.color+"66"; }}
            onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 6px 20px "+k.color+"44"; }}>
            <div style={{background:k.bg, padding:"12px 16px 10px", position:"relative"}}>
              <div style={{position:"absolute", top:-16, right:-16, width:72, height:72, borderRadius:"50%", background:"#ffffff18"}} />
              <div style={{position:"absolute", bottom:-10, right:16, width:40, height:40, borderRadius:"50%", background:"#ffffff10"}} />
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10}}>
                <div style={{fontSize:20, lineHeight:1, filter:"drop-shadow(0 2px 4px #0003)"}}>{k.icon}</div>
                <div style={{fontSize:11, color:"#ffffffcc", fontWeight:600, letterSpacing:0.3}}>{k.label}</div>
              </div>
              <div style={{fontSize:24, fontWeight:900, color:"#fff", lineHeight:1, letterSpacing:-0.5, filter:"drop-shadow(0 1px 2px #0002)"}}>
                {k.value}
              </div>
            </div>
            <div style={{background:"#fff", padding:"5px 16px", borderRadius:"0 0 16px 16px", border:"1px solid "+k.color+"22", borderTop:"none"}}>
              <div style={{fontSize:11, color:k.color, fontWeight:700}}>{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 2カラム */}
      <div className="two-col" style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, flex:1, minHeight:0}}>
        {/* 流入元カード */}
        <div style={{background:"#fff", borderRadius:14, padding:"12px 14px", boxShadow:"0 2px 10px #0569690a", border:"1px solid #e2f0e8", overflowY:"auto"}}>
          <div style={{fontSize:13, fontWeight:700, color:"#174f35", marginBottom:4, display:"flex", alignItems:"center", gap:6}}>
            <span style={{width:4, height:16, background:"#10b981", borderRadius:2, display:"inline-block"}} />
            流入元別 商談化実績
          </div>
          <div style={{fontSize:11, color:"#6a9a7a", marginBottom:14}}>
            各流入元ごとの「反響数」と「有効リード（育成対象外を除く）」「商談設定数（日程調整中＋商談確定）」、商談化率（商談数÷有効リード）を表示
          </div>
          {getSources().map((src, srcIdx) => {
            const arr = bySrc(src);
            const validArr = arr.filter(l => l.status !== "育成対象外");
            const ap = arr.filter(isAppt).length;
            const pct = validArr.length ? ap/validArr.length : 0;
            const srcColor = getSourceColor(src, srcIdx);
            const srcIconKey = getSourceIcon(src) || "document";
            return (
              <div key={src} style={{marginBottom:6, background:"#f8fbf9", borderRadius:10, padding:"7px 10px", border:`1px solid ${srcColor}22`}}>
                <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:4}}>
                  <span style={{fontSize:12, fontWeight:700, color:srcColor, flexShrink:0, display:"flex", alignItems:"center", gap:5}}>
                    <SourceIconSVG iconKey={srcIconKey} size={18}/> {src}
                  </span>
                  <div style={{flex:1, display:"flex", gap:6, justifyContent:"flex-end", flexWrap:"wrap"}}>
                    <span style={{fontSize:11, background:"#fff", border:"1px solid #e2f0e8", borderRadius:6, padding:"2px 8px", color:"#6a9a7a"}}>
                      反響 <b style={{color:"#174f35"}}>{arr.length}</b>
                    </span>
                    <span style={{fontSize:11, background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:6, padding:"2px 8px", color:"#15803d", fontWeight:700}}>
                      有効リード <b>{validArr.length}</b>
                    </span>
                    <span style={{fontSize:11, background:"#fff8eb", border:"1px solid #fde68a", borderRadius:6, padding:"2px 8px", color:"#d97706", fontWeight:700}}>
                      📅 商談 {ap}件 ({rate(ap, validArr.length)})
                    </span>
                    <span style={{fontSize:11, background:"#ecfdf5", border:"1px solid #a7f3d0", borderRadius:6, padding:"2px 8px", color:"#059669", fontWeight:700}}>
                      ✨ MQL {arr.filter(l=>l.mql==="MQL").length}件 ({rate(arr.filter(l=>l.mql==="MQL").length, arr.length)})
                    </span>
                  </div>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:8}}>
                  <div style={{flex:1, height:5, background:"#e8f5ee", borderRadius:4, overflow:"hidden"}}>
                    <div style={{height:"100%", width:(pct*100)+"%", background:`linear-gradient(90deg,${srcColor},${srcColor}cc)`, borderRadius:4, transition:"width 0.8s ease"}} />
                  </div>
                  <span style={{fontSize:10, color:"#6a9a7a", flexShrink:0, width:32, textAlign:"right"}}>{Math.round(pct*100)}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ステータス分布カード */}
        <div style={{background:"#fff", borderRadius:14, padding:"12px 14px", boxShadow:"0 2px 10px #0569690a", border:"1px solid #e2f0e8", overflowY:"auto"}}>
          <div style={{fontSize:13, fontWeight:700, color:"#174f35", marginBottom:10, display:"flex", alignItems:"center", gap:6}}>
            <span style={{width:4, height:16, background:"#8b5cf6", borderRadius:2, display:"inline-block"}} />
            ステータス分布
          </div>
          <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
            {getStatuses().map(s => {
              const n = fl.filter(l => l.status === s).length;
              const c = getStatusColor(s);
              const pct = fl.length ? Math.round(n/fl.length*100) : 0;
              return (
                <div key={s} style={{flex:"1 1 calc(50% - 4px)", background:c+"0d", border:`1px solid ${c}33`, borderRadius:10, padding:"7px 10px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <span style={{fontSize:12, color:c, fontWeight:600}}>{s}</span>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:18, fontWeight:900, color:c, lineHeight:1}}>{n}</div>
                    <div style={{fontSize:9, color:c+"aa"}}>{pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ポータル課金カード */}
      <div style={{background:"#fff", borderRadius:14, padding:"10px 14px", boxShadow:"0 2px 10px #0569690a", border:"1px solid #e2f0e8", flexShrink:0}}>
        <div style={{fontSize:13, fontWeight:700, color:"#174f35", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <div style={{display:"flex", alignItems:"center", gap:6}}>
            <span style={{width:4, height:16, background:"#f59e0b", borderRadius:2, display:"inline-block"}} />
            ポータルサイト 課金管理
          </div>
          <div style={{fontSize:13, color:"#174f35"}}>
            合計：<strong style={{fontSize:18, color:"#f59e0b"}}>¥{cost.toLocaleString()}</strong>
          </div>
        </div>
        <div style={{display:"flex", gap:8, flexWrap:"nowrap", marginBottom:0}}>
          {getPortalSites().map(site => {
            const sl = portal.filter(l => l.portal_site === site);
            const sc = sl.filter(isCharged).reduce((s, l) => s + getPortalPrice(l.portal_site, l.portal_type), 0);
            const ap = sl.filter(isAppt).length;
            const unit = ap > 0 ? "¥"+(sc/ap).toLocaleString(undefined, {maximumFractionDigits:0}) : "—";
            const charged = sl.filter(isCharged).length;
            const free    = sl.filter(l => l.charge_applied).length;
            return (
              <div key={site} style={{flex:"1 1 120px", background:"#f8fbf9", borderRadius:10, padding:"8px 10px", border:"1px solid #d8ede1"}}>
                <div style={{fontSize:11, fontWeight:700, color:"#174f35", marginBottom:4}}>{site}</div>
                <div style={{fontSize:16, fontWeight:900, color:"#174f35"}}>{sl.length}<span style={{fontSize:10, color:"#6a9a7a"}}>件</span></div>
                <div style={{fontSize:11, color:"#6a9a7a", marginTop:2}}>課金{charged} / 対象外{free}</div>
                <div style={{fontSize:13, fontWeight:700, color:"#f59e0b", marginTop:4}}>¥{sc.toLocaleString()}</div>
                <div style={{fontSize:10, color:"#6a9a7a", marginTop:2}}>獲得単価 {unit}</div>
              </div>
            );
          })}
          <div style={{flex:"1 1 120px", background:"#ecfdf5", borderRadius:10, padding:"8px 10px", border:"1px solid #a7f3d0"}}>
            <div style={{fontSize:11, fontWeight:700, color:"#059669", marginBottom:6}}>✅ 対象外申請済</div>
            <div style={{fontSize:16, fontWeight:900, color:"#059669"}}>{applied.length}<span style={{fontSize:10}}>件</span></div>
            <div style={{fontSize:13, fontWeight:700, color:"#10b981", marginTop:4}}>
              節約 ¥{applied.reduce((s, l) => s + getPortalPrice(l.portal_site, l.portal_type), 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
