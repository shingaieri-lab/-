// ダッシュボードページ（月次・流入元別レポート）
import { useState, useMemo, useEffect } from 'react';
import { S } from '../styles/index.js';
import { SourceIconSVG } from '../components/ui/SourceIconSVG.jsx';
import { TODAY, THIS_MONTH } from '../lib/holidays.js';
import { InboxIcon, CalendarNavIcon, BookIcon, FlameIcon, SparkleIcon, CheckCircleIcon, DashboardIcon } from '../components/ui/Icons.jsx';
import {
  getSources, getStatuses, getStatusColor, getSourceColor, getSourceIcon,
  getPortalSites, getPortalPrice,
} from '../lib/master.js';
import { parseAppointPrice } from '../lib/outboundApi.js';
import { InboundApoPanel } from '../components/dashboard/InboundApoPanel.jsx';
import { AccuracyCrossPanel } from '../components/dashboard/AccuracyCrossPanel.jsx';
import { DealStagePanel } from '../components/dashboard/DealStagePanel.jsx';
import { DASHBOARD_CARD } from '../components/dashboard/cardStyle.js';

const RANK_ITEMS = [
  { rank: 'A', color: '#ef4444' },
  { rank: 'B', color: '#f97316' },
  { rank: 'C', color: '#f59e0b' },
  { rank: 'D', color: '#94a3b8' },
];

const APPOINT_TYPE_ITEMS = [
  { type: '決裁者アポ', color: '#8b5cf6' },
  { type: '担当者アポ', color: '#06b6d4' },
  { type: '対象外',     color: '#9ca3af' },
];

function HBar({ value, max, color, showPct = false, total }) {
  const pct = max > 0 ? (value / max * 100) : 0;
  const pctOfTotal = total > 0 ? Math.round(value / total * 100) : 0;
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 10, background: '#f0f4f2', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 6, transition: 'width 0.8s ease' }} />
      </div>
      {showPct && <span style={{ fontSize: 13, color: '#9ab8a4', minWidth: 30, textAlign: 'right' }}>{pctOfTotal}%</span>}
    </div>
  );
}

function DonutChart({ data, total, size = 120 }) {
  let cum = 0;
  const parts = data.filter(d => d.count > 0).map(d => {
    const start = cum;
    const end = cum + (d.count / total * 100);
    cum = end;
    return `${d.color} ${start}% ${end}%`;
  });
  const gradient = parts.length > 0
    ? `conic-gradient(${parts.join(', ')})`
    : 'conic-gradient(#e2f0e8 0% 100%)';
  const hole = size * 0.58;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: gradient, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: hole, height: hole, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: size * 0.2, fontWeight: 900, color: '#174f35', lineHeight: 1 }}>{total}</div>
        <div style={{ fontSize: size * 0.11, color: '#6a9a7a' }}>件</div>
      </div>
    </div>
  );
}

export function DashboardPage({ leads, currentUser, onNavigate, masterVer, isMobile, apoLeads = [], isDemo = false }) {
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
  const isAppt = l => ["日程調整中","商談確定"].includes(l.status);
  const rate = (a, b) => b ? (a/b*100).toFixed(1)+"%" : "—";
  const validLeads = fl.filter(l => l.status !== "育成対象外");
  const portal = fl.filter(l => !!l.portal_site);
  const isCharged = l => !l.charge_applied;
  const cost = portal.filter(isCharged).reduce((s, l) => s + getPortalPrice(l.portal_site, l.portal_type), 0);
  const applied = portal.filter(l => l.charge_applied);
  const todayActions = leads.filter(l => l.next_action_date === TODAY && l.is_member === currentUser?.name);
  const overdueActions = leads.filter(l => l.next_action_date && l.next_action_date < TODAY && l.is_member === currentUser?.name);
  const apptCount = fl.filter(isAppt).length;
  const apptRate = validLeads.length ? (apptCount / validLeads.length * 100).toFixed(1) : '0';
  const mqlCount = fl.filter(l => l.mql === "MQL").length;

  const monthApos = apoLeads.filter(l => l.appointmentInfo?.meetingDate?.slice(0, 7) === month);
  const totalApoCount = monthApos.length;
  const totalApoPrice = monthApos.reduce((s, l) => s + parseAppointPrice(l.appointmentInfo?.appointPrice), 0);
  const rankData = RANK_ITEMS.map(({ rank, color }) => ({
    rank, color,
    count: monthApos.filter(l => l.appointmentInfo?.rank === rank).length,
    price: monthApos.filter(l => l.appointmentInfo?.rank === rank).reduce((s, l) => s + parseAppointPrice(l.appointmentInfo?.appointPrice), 0),
  }));
  const typeData = APPOINT_TYPE_ITEMS.map(({ type, color }) => ({
    type, color,
    count: monthApos.filter(l => l.appointmentInfo?.appointType === type).length,
    price: monthApos.filter(l => l.appointmentInfo?.appointType === type).reduce((s, l) => s + parseAppointPrice(l.appointmentInfo?.appointPrice), 0),
  }));

  const statusData = getStatuses().map(s => ({
    label: s,
    color: getStatusColor(s),
    count: fl.filter(l => l.status === s).length,
  }));

  const sourceData = getSources().map((src, idx) => {
    const arr = fl.filter(l => l.source === src);
    const valid = arr.filter(l => l.status !== "育成対象外");
    const appt = arr.filter(isAppt).length;
    return {
      src, color: getSourceColor(src, idx), icon: getSourceIcon(src) || "document",
      total: arr.length, valid: valid.length, appt,
      mql: arr.filter(l => l.mql === "MQL").length,
    };
  });
  const maxAppt = Math.max(...sourceData.map(s => s.appt), 1);

  const kpiItems = [
    { label: "総反響数",   value: fl.length + "件",       color: "#10b981", sub: `有効リード ${validLeads.length}件`,       filter: { month } },
    { label: "商談設定数", value: apptCount + "件",        color: "#f59e0b", sub: `商談化率 ${apptRate}%`,                  filter: { month, statuses: ["日程調整中","商談確定"] } },
    { label: "MQL",        value: mqlCount + "件",         color: "#06b6d4", sub: rate(mqlCount, fl.length) + " / 全体",    filter: { month } },
    { label: "課金見込み", value: "¥" + cost.toLocaleString(), color: "#8b5cf6", sub: `対象外申請済 ${applied.length}件`,   filter: { month, hasPortal: true } },
    { label: "本日追客",   value: todayActions.length + "件", color: "#0ea5e9", sub: `期限切れ ${overdueActions.length}件`, filter: { nextActionDate: TODAY } },
  ];

  // パネル共通スタイル（cardStyle.js から取得）
  const card = DASHBOARD_CARD;

  return (
    <div style={{ padding: '16px 20px', height: isMobile ? 'auto' : 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>

      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DashboardIcon size={18} color="#174f35" />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#174f35', letterSpacing: '-0.02em' }}>ダッシュボード</span>
          <span style={{ fontSize: 12, color: '#6a9a7a', marginLeft: 4 }}>月次レポート</span>
        </div>
        <select value={month} onChange={e => setMonth(e.target.value)} style={{ ...S.sel, fontSize: 14, padding: '6px 10px' }}>
          {months.length === 0 && <option value={THIS_MONTH}>{THIS_MONTH.slice(0,4)}年{parseInt(THIS_MONTH.slice(5))}月</option>}
          {months.map(m => <option key={m} value={m}>{m.slice(0,4)}年{parseInt(m.slice(5))}月</option>)}
        </select>
      </div>

      {/* KPIカード行（スリム版） */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, flexShrink: 0 }}>
        {kpiItems.map((k, i) => (
          <div key={i} onClick={() => onNavigate && onNavigate(k.filter)}
            style={{ ...card, cursor: 'pointer', padding: '12px 14px', transition: 'transform 0.1s, box-shadow 0.1s', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${k.color}33`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 8px #0569690a'; }}>
            {/* 左の縦アクセントバー */}
            <span style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, background: k.color, borderRadius: 2 }} />
            <div style={{ fontSize: 12, color: '#6a9a7a', fontWeight: 600, marginBottom: 4, paddingLeft: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color, lineHeight: 1, marginBottom: 4, paddingLeft: 6, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
            <div style={{ fontSize: 12, color: '#9ab8a4', paddingLeft: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 段2：流入元別 + ステータス分布（流入分析） */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 10, flexShrink: 0 }}>

        {/* 流入元別 */}
        <div style={{ ...card, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 4, height: 16, background: '#10b981', borderRadius: 2 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#174f35' }}>流入元別 商談化実績</span>
            </div>
            <span style={{ fontSize: 11, color: '#b0c8ba' }}>棒＝商談設定数</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 44px 52px', gap: '2px 8px', alignItems: 'center', marginBottom: 4, fontSize: 11, color: '#b0c8ba', fontWeight: 600 }}>
            <span>流入元</span>
            <span></span>
            <span style={{ textAlign: 'right' }}>件数</span>
            <span style={{ textAlign: 'right' }}>商談化率</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sourceData.map(({ src, color, icon, total, valid, appt, mql }) => (
              <div key={src}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 44px 52px', gap: '0 8px', alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <SourceIconSVG iconKey={icon} size={13} />{src}
                  </span>
                  <HBar value={appt} max={maxAppt} color={color} />
                  <span style={{ fontSize: 13, fontWeight: 700, color, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{appt}</span>
                  <span style={{ fontSize: 12, color: '#6a9a7a', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{rate(appt, valid)}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, paddingLeft: 105, marginTop: 1, fontSize: 11, color: '#b0c8ba' }}>
                  <span>反響 {total}</span>
                  <span>有効 {valid}</span>
                  <span style={{ color: '#06b6d4' }}>MQL {mql}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ステータス分布 */}
        <div style={{ ...card, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ width: 4, height: 16, background: '#8b5cf6', borderRadius: 2 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#174f35' }}>ステータス分布</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <DonutChart data={statusData} total={fl.length} size={110} />
            <div style={{ display: 'grid', gridTemplateColumns: '10px auto 1fr auto', gap: '4px 8px', alignItems: 'center', flex: 1 }}>
              {statusData.filter(s => s.count > 0).flatMap(s => [
                <span key={s.label+'-dot'} style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />,
                <span key={s.label+'-label'} style={{ fontSize: 12, color: '#174f35', whiteSpace: 'nowrap' }}>{s.label}</span>,
                <span key={s.label+'-count'} style={{ fontSize: 13, fontWeight: 700, color: s.color, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.count}</span>,
                <span key={s.label+'-pct'} style={{ fontSize: 11, color: '#b0c8ba', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fl.length ? Math.round(s.count/fl.length*100) : 0}%</span>,
              ])}
            </div>
          </div>
        </div>

      </div>

      {/* 段3：アポ品質分析（インバウンドアポ実績 + IS確度 vs 営業確度クロス集計） */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flexShrink: 0 }}>
        <InboundApoPanel filteredLeads={fl} />
        <AccuracyCrossPanel filteredLeads={fl} />
      </div>

      {/* 段4：結果・コスト（受注失注 + アウトバウンドアポ + ポータル課金） */}
      {/* デモモードはアウトバウンド非表示なので 2列、それ以外は 3列 */}
      <div style={{ display: 'grid', gridTemplateColumns: isDemo ? '1fr 1.5fr' : '1fr 1fr 1.4fr', gap: 10, flexShrink: 0 }}>

        {/* 受注・失注集計 */}
        <DealStagePanel filteredLeads={fl} />

        {/* アウトバウンドアポ実績 */}
        {!isDemo && <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 4, height: 16, background: '#8b5cf6', borderRadius: 2 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#174f35' }}>アウトバウンドアポ実績</span>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
              <span style={{ fontSize: 12, color: '#6a9a7a' }}>獲得 <strong style={{ fontSize: 18, color: '#8b5cf6', fontVariantNumeric: 'tabular-nums' }}>{totalApoCount}</strong>件</span>
              <span style={{ fontSize: 12, color: '#6a9a7a' }}>計 <strong style={{ fontSize: 15, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>¥{totalApoPrice.toLocaleString()}</strong></span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* ランク別 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b0c8ba', marginBottom: 6 }}>ランク別（件数 / 金額）</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {rankData.map(({ rank, color, count, price }) => (
                  <div key={rank} style={{ background: color + '0d', border: `1px solid ${color}33`, borderRadius: 8, padding: '6px 8px' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color, marginBottom: 2 }}>ランク {rank}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{count}<span style={{ fontSize: 11, fontWeight: 600, marginLeft: 2 }}>件</span></div>
                    <div style={{ fontSize: 11, color: color + 'aa', marginTop: 2 }}>{price > 0 ? '¥' + price.toLocaleString() : '—'}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* アポ種別 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b0c8ba', marginBottom: 6 }}>アポ種別（件数 / 金額）</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {typeData.map(({ type, color, count, price }) => (
                  <div key={type} style={{ background: color + '0d', border: `1px solid ${color}33`, borderRadius: 8, padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>{type}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{count}<span style={{ fontSize: 11, fontWeight: 600, marginLeft: 2 }}>件</span></div>
                      <div style={{ fontSize: 11, color: color + 'aa', marginTop: 1 }}>{price > 0 ? '¥' + price.toLocaleString() : '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>}

        {/* ポータル課金 */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 4, height: 16, background: '#f59e0b', borderRadius: 2 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#174f35' }}>ポータルサイト 課金管理</span>
            </div>
            <span style={{ fontSize: 12, color: '#6a9a7a' }}>合計 <strong style={{ fontSize: 18, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>¥{cost.toLocaleString()}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: 6, flex: 1 }}>
            {getPortalSites().map(site => {
              const sl = portal.filter(l => l.portal_site === site);
              const sc = sl.filter(isCharged).reduce((s, l) => s + getPortalPrice(l.portal_site, l.portal_type), 0);
              const ap = sl.filter(isAppt).length;
              const unit = ap > 0 ? '¥' + (sc/ap).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—';
              const charged = sl.filter(isCharged).length;
              const free = sl.filter(l => l.charge_applied).length;
              return (
                <div key={site} style={{ background: '#f8fbf9', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2f0e8', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#174f35' }}>{site}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#174f35', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{sl.length}<span style={{ fontSize: 11, color: '#6a9a7a', marginLeft: 2 }}>件</span></div>
                  <div style={{ fontSize: 11, color: '#b0c8ba' }}>課金{charged} / 対象外{free}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>¥{sc.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#b0c8ba' }}>単価 {unit}</div>
                </div>
              );
            })}
            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', border: '1px solid #a7f3d0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircleIcon size={12} color="#059669" /> 対象外申請済
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#059669', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{applied.length}<span style={{ fontSize: 11, marginLeft: 2 }}>件</span></div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>
                節約 ¥{applied.reduce((s, l) => s + getPortalPrice(l.portal_site, l.portal_type), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
