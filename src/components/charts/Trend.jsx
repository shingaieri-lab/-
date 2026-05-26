import { useState } from 'react';
import { SVGBarChart } from './SVGBarChart.jsx';
import { SVGLineChart } from './SVGLineChart.jsx';
import { TrendIcon, InboxIcon, ClipboardIcon } from '../ui/Icons.jsx';
import { getSources, getSourceColor } from '../../lib/master.js';
import { parseAppointPrice } from '../../lib/outboundApi.js';

function normYM(s) {
  if (!s) return "";
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const m = s.match(/^(\d{4})[\/-](\d{1,2})/);
  return m ? m[1] + "-" + m[2].padStart(2, "0") : "";
}

function DiffBadge({ diff, hasPrev, suffix = "" }) {
  if (!hasPrev) return null;
  const n = parseFloat(diff);
  if (isNaN(n)) return null;
  const color = n > 0 ? "#10b981" : n < 0 ? "#ef4444" : "#9ca3af";
  const val   = n > 0 ? `+${diff}${suffix}` : `${diff}${suffix}`;
  return <div style={{ fontSize: 10, color, marginTop: 2, fontWeight: 500, whiteSpace: "nowrap" }}>前年比：{val}</div>;
}

export function Trend({ leads, apoLeads = [] }) {
  const currentYear = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' }).slice(0, 4);
  const currentYM   = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' }).slice(0, 7);

  const dataYears      = [...new Set(leads.map(l => normYM(l.date).slice(0, 4)).filter(Boolean))].sort();
  const availableYears = [...new Set([...dataYears, currentYear])].sort();

  const [selectedYear, setSelectedYear]   = useState(() => availableYears[availableYears.length - 1]);
  const [expandedMonths, setExpandedMonths] = useState(new Set());

  const toggleMonth = (ym) => setExpandedMonths(prev => {
    const next = new Set(prev);
    next.has(ym) ? next.delete(ym) : next.add(ym);
    return next;
  });

  const sources   = getSources();
  const srcColors = Object.fromEntries(sources.map((src, i) => [src, getSourceColor(src, i)]));
  const prevYear  = String(Number(selectedYear) - 1);
  const months    = Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, '0')}`);

  const buildData = (ym) => {
    const fl = leads.filter(l => normYM(l.date) === ym);
    const apoMonth = apoLeads.filter(l => l.appointmentInfo?.meetingDate?.slice(0, 7) === ym);
    return {
      month: ym.slice(5) + "月",
      反響数: fl.length,
      有効リード数: fl.filter(l => l.status !== "育成対象外").length,
      商談数: fl.filter(l => ["日程調整中", "商談確定"].includes(l.status)).length,
      MQL数: fl.filter(l => l.mql === "MQL").length,
      アポ獲得数: apoMonth.length,
      アポ単価合計: apoMonth.reduce((s, l) => s + parseAppointPrice(l.appointmentInfo?.appointPrice), 0),
      ...Object.fromEntries(sources.map(src => [src, fl.filter(l => l.source === src).length])),
    };
  };

  const data = months.map(buildData);

  if (leads.length === 0) return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#174f35", letterSpacing: "-0.02em", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <TrendIcon size={20} color="#174f35" /> 月別推移レポート
      </div>
      <div style={{ textAlign: "center", padding: 60, color: "#6a9a7a", background: "#fff", borderRadius: 14, border: "1px solid #e2f0e8" }}>
        <div style={{ fontSize: 36, marginBottom: 12, display: "flex", justifyContent: "center" }}><TrendIcon size={40} color="#6a9a7a" /></div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>まだデータがありません</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>リードを登録すると月別推移が表示されます</div>
      </div>
    </div>
  );

  const yearIdx = availableYears.indexOf(selectedYear);
  const canPrev = yearIdx > 0;
  const canNext = yearIdx < availableYears.length - 1;

  const navBtn = (enabled) => ({
    background: "none", border: "1px solid #c0dece", borderRadius: 6,
    padding: "3px 10px", fontSize: 13, fontWeight: 700,
    color: enabled ? "#059669" : "#c0dece",
    cursor: enabled ? "pointer" : "default",
  });

  const thS = {
    padding: "11px 14px", textAlign: "center", fontWeight: 700,
    background: "#174f35", color: "#fff", fontSize: 12,
    whiteSpace: "nowrap", borderRight: "1px solid #1e6645",
  };

  const thApo = {
    ...thS, background: "#4c1d95", borderRight: "1px solid #5b21b6",
  };

  const thGroup = {
    padding: "6px 14px", textAlign: "center", fontWeight: 700,
    fontSize: 12, whiteSpace: "nowrap", letterSpacing: "0.05em",
  };

  const tdC = { padding: "10px 14px", textAlign: "center", verticalAlign: "middle" };

  const sortedMonths = (() => {
    const reversed = [...months].reverse();
    if (selectedYear === currentYear) {
      const idx = reversed.findIndex(m => m === currentYM);
      return idx >= 0 ? reversed.slice(idx) : reversed;
    }
    return reversed;
  })();

  const rows = sortedMonths.flatMap((monthKey, mi) => {
    const d           = data[months.indexOf(monthKey)];
    const isCurrent   = monthKey === currentYM && selectedYear === currentYear;
    const monthLeads  = leads.filter(l => normYM(l.date) === monthKey);
    const prevLeads   = leads.filter(l => normYM(l.date) === `${prevYear}-${monthKey.slice(5)}`);

    const monthApos    = apoLeads.filter(l => l.appointmentInfo?.meetingDate?.slice(0, 7) === monthKey);
    const apoMonthCount = monthApos.length;
    const apoMonthPrice = monthApos.reduce((s, l) => s + parseAppointPrice(l.appointmentInfo?.appointPrice), 0);

    const totalCnt   = monthLeads.length;
    const totalValid = monthLeads.filter(l => l.status !== "育成対象外").length;
    const totalDeals = monthLeads.filter(l => ["日程調整中", "商談確定"].includes(l.status)).length;
    const totalMql   = monthLeads.filter(l => l.mql === "MQL").length;
    const totalDR    = totalValid ? (totalDeals / totalValid * 100).toFixed(1) : "0.0";
    const totalMR    = totalCnt   ? (totalMql   / totalCnt   * 100).toFixed(1) : "0.0";

    const prevCnt    = prevLeads.length;
    const prevValid  = prevLeads.filter(l => l.status !== "育成対象外").length;
    const prevDeals  = prevLeads.filter(l => ["日程調整中", "商談確定"].includes(l.status)).length;
    const prevDR     = prevValid ? (prevDeals / prevValid * 100).toFixed(1) : "0.0";

    const diffCnt    = totalCnt   - prevCnt;
    const diffValid  = totalValid - prevValid;
    const diffDeals  = totalDeals - prevDeals;
    const diffDR     = (parseFloat(totalDR) - parseFloat(prevDR)).toFixed(1);
    const hasPrev    = prevCnt > 0 || totalCnt > 0;

    const rowBg      = isCurrent ? "#f0fdf4" : mi % 2 === 0 ? "#fff" : "#f8fbf9";
    const isExpanded = expandedMonths.has(monthKey);

    const totalRow = (
      <tr key={`${monthKey}-tot`} style={{ borderBottom: "1px solid #e2f0e8", background: rowBg }}>
        {/* 月 + 展開ボタン */}
        <td style={{ ...tdC, fontWeight: 700, color: "#174f35", borderRight: "1px solid #e2f0e8", width: 96, padding: "10px 10px 10px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => toggleMonth(monthKey)}
              style={{
                background: isExpanded ? "#e2f0e8" : "transparent",
                border: "1px solid #d8ede1", borderRadius: 5,
                padding: "2px 6px", cursor: "pointer",
                fontSize: 10, color: "#6a9a7a", fontFamily: "inherit", flexShrink: 0,
              }}
            >
              {isExpanded ? "▲" : "▼"}
            </button>
            <div>
              <div style={{ fontSize: 14 }}>{d.month}</div>
              {isCurrent && <span style={{ fontSize: 9, background: "#10b981", color: "#fff", borderRadius: 3, padding: "1px 5px", marginTop: 3, display: "inline-block" }}>今月</span>}
            </div>
          </div>
        </td>
        {/* 反響数 */}
        <td style={{ ...tdC, borderRight: "1px solid #f0f5f2" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#059669" }}>{totalCnt}</div>
          <DiffBadge diff={diffCnt} hasPrev={hasPrev} />
        </td>
        {/* 有効リード数 */}
        <td style={{ ...tdC, borderRight: "1px solid #f0f5f2" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#15803d" }}>{totalValid}</div>
          <DiffBadge diff={diffValid} hasPrev={hasPrev} />
        </td>
        {/* 商談数 */}
        <td style={{ ...tdC, borderRight: "1px solid #f0f5f2" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#f59e0b" }}>{totalDeals}</div>
          <DiffBadge diff={diffDeals} hasPrev={hasPrev} />
        </td>
        {/* 商談化率 */}
        <td style={{ ...tdC, borderRight: "1px solid #f0f5f2" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#d97706" }}>{totalDR}%</div>
          <DiffBadge diff={diffDR} hasPrev={hasPrev} suffix="pt" />
        </td>
        {/* MQL率 */}
        <td style={{ ...tdC, borderRight: "1px solid #f0f5f2" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#7c3aed" }}>{totalMR}%</div>
          <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{totalMql}件</div>
        </td>
        {/* アポ獲得数 */}
        <td style={{ ...tdC, borderRight: "1px solid #f0f5f2" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#8b5cf6" }}>{apoMonthCount}</div>
        </td>
        {/* アポ単価合計 */}
        <td style={{ ...tdC }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#059669" }}>
            {apoMonthPrice > 0 ? "¥" + apoMonthPrice.toLocaleString() : "—"}
          </div>
        </td>
      </tr>
    );

    const srcRows = isExpanded ? sources.map((src) => {
      const fl      = monthLeads.filter(l => l.source === src);
      const cnt     = fl.length;
      const pfl     = prevLeads.filter(l => l.source === src);
      const pCnt    = pfl.length;
      if (cnt === 0 && pCnt === 0) return null;
      const valid   = fl.filter(l => l.status !== "育成対象外").length;
      const deals   = fl.filter(l => ["日程調整中", "商談確定"].includes(l.status)).length;
      const mql     = fl.filter(l => l.mql === "MQL").length;
      const dr      = valid ? (deals / valid * 100).toFixed(1) : "0.0";
      const mr      = cnt   ? (mql   / cnt   * 100).toFixed(1) : "0.0";

      const pValid  = pfl.filter(l => l.status !== "育成対象外").length;
      const pDeals  = pfl.filter(l => ["日程調整中", "商談確定"].includes(l.status)).length;
      const pDR     = pValid ? (pDeals / pValid * 100).toFixed(1) : "0.0";
      const hasSP   = cnt > 0 || pCnt > 0;
      const dCnt    = cnt   - pCnt;
      const dValid  = valid - pValid;
      const dDeals  = deals - pDeals;
      const dDR     = (parseFloat(dr) - parseFloat(pDR)).toFixed(1);

      const color   = srcColors[src];
      const srcBg   = isCurrent ? "#e8faf2" : mi % 2 === 0 ? "#f5f9f7" : "#edf3ef";
      return (
        <tr key={`${monthKey}-${src}`} style={{ background: srcBg, borderBottom: "1px solid #eef5f0" }}>
          <td style={{ ...tdC, borderRight: "1px solid #e2f0e8", paddingLeft: 24, textAlign: "left", width: 96 }}>
            <span style={{ fontSize: 11, color, fontWeight: 700, whiteSpace: "pre-line" }}>
              {src.length > 4 ? src.slice(0, 4) + '\n' + src.slice(4) : src}
            </span>
          </td>
          <td style={{ ...tdC }}>
            <div style={{ fontSize: 13, fontWeight: 700, color }}>{cnt}</div>
            <DiffBadge diff={dCnt} hasPrev={hasSP} />
          </td>
          <td style={{ ...tdC }}>
            <div style={{ fontSize: 13, color: "#4a8060" }}>{valid}</div>
            <DiffBadge diff={dValid} hasPrev={hasSP} />
          </td>
          <td style={{ ...tdC }}>
            <div style={{ fontSize: 13, color: "#d97706" }}>{deals}</div>
            <DiffBadge diff={dDeals} hasPrev={hasSP} />
          </td>
          <td style={{ ...tdC }}>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{dr}%</div>
            <DiffBadge diff={dDR} hasPrev={hasSP} suffix="pt" />
          </td>
          <td style={{ ...tdC, borderRight: "1px solid #f0f5f2" }}>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{mr}%</div>
            <div style={{ fontSize: 10, color: "#c0ccc6" }}>{mql}件</div>
          </td>
          <td style={{ ...tdC, borderRight: "1px solid #f0f5f2" }}><span style={{ color: "#d1d5db", fontSize: 12 }}>—</span></td>
          <td style={{ ...tdC }}><span style={{ color: "#d1d5db", fontSize: 12 }}>—</span></td>
        </tr>
      );
    }).filter(Boolean) : [];

    return [totalRow, ...srcRows];
  });

  return (
    <div className="page-pad" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", padding: "24px 28px", boxSizing: "border-box" }}>

      {/* ヘッダー + 年選択 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#174f35", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
          <TrendIcon size={20} color="#174f35" /> 月別推移レポート
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={navBtn(canPrev)} disabled={!canPrev} onClick={() => canPrev && setSelectedYear(availableYears[yearIdx - 1])}>◀</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#174f35", minWidth: 68, textAlign: "center" }}>{selectedYear}年</span>
          <button style={navBtn(canNext)} disabled={!canNext} onClick={() => canNext && setSelectedYear(availableYears[yearIdx + 1])}>▶</button>
        </div>
      </div>

      {/* グラフ2列 */}
      <div className="two-col trend-charts" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20, flexShrink: 0 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #e2f0e8" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#174f35", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
            <InboxIcon size={14} color="#174f35" /> 反響数・商談数・アポ獲得数
          </div>
          <SVGBarChart data={data} keys={["反響数", "有効リード数", "商談数", "アポ獲得数"]} colors={{ "反響数": "#10b981", "有効リード数": "#6ee7b7", "商談数": "#f59e0b", "アポ獲得数": "#8b5cf6" }} height={230} />
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #e2f0e8" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#174f35", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
            <TrendIcon size={14} color="#174f35" /> 流入元別推移
          </div>
          <SVGLineChart data={data} keys={sources} colors={srcColors} height={230} />
        </div>
      </div>

      {/* 月別詳細テーブル */}
      <div style={{ flex: 1, minHeight: 0, background: "#fff", borderRadius: 14, border: "1px solid #e2f0e8", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 20px 10px", fontSize: 13, fontWeight: 700, color: "#174f35", display: "flex", alignItems: "center", gap: 5, flexShrink: 0, borderBottom: "1px solid #e2f0e8" }}>
          <ClipboardIcon size={14} color="#174f35" /> 月別詳細データ（{selectedYear}年）
          <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 6 }}>▼ で流入元内訳を展開</span>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
              {/* グループ行 */}
              <tr>
                <th rowSpan={2} style={{ ...thS, textAlign: "left", paddingLeft: 16, width: 96, verticalAlign: "middle" }}>月</th>
                <th colSpan={5} style={{ ...thGroup, background: "#1a6640", color: "#a7f3d0", borderRight: "1px solid #1e6645", borderBottom: "1px solid #1e6645" }}>インバウンド</th>
                <th colSpan={2} style={{ ...thGroup, background: "#3b0764", color: "#e9d5ff", borderRight: "none", borderBottom: "1px solid #5b21b6" }}>アウトバウンド</th>
              </tr>
              {/* 列名行 */}
              <tr>
                <th style={thS}>反響数</th>
                <th style={thS}>有効リード数</th>
                <th style={thS}>商談数</th>
                <th style={thS}>商談化率</th>
                <th style={thS}>MQL率</th>
                <th style={thApo}>アポ獲得数</th>
                <th style={{ ...thApo, borderRight: "none" }}>アポ単価合計</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
