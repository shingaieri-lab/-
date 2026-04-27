import { useState } from 'react';
import { SVGBarChart } from './SVGBarChart.jsx';
import { SVGLineChart } from './SVGLineChart.jsx';
import { TrendIcon, InboxIcon, ClipboardIcon } from '../ui/Icons.jsx';
import { getSources, getSourceColor } from '../../lib/master.js';

function normYM(s) {
  if (!s) return "";
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const m = s.match(/^(\d{4})[\/-](\d{1,2})/);
  return m ? m[1] + "-" + m[2].padStart(2, "0") : "";
}

export function Trend({ leads }) {
  const currentYear = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' }).slice(0, 4);
  const currentYM   = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' }).slice(0, 7);

  const dataYears = [...new Set(leads.map(l => normYM(l.date).slice(0, 4)).filter(Boolean))].sort();
  const availableYears = [...new Set([...dataYears, currentYear])].sort();

  const [selectedYear, setSelectedYear] = useState(() => availableYears[availableYears.length - 1]);

  const sources   = getSources();
  const srcColors = Object.fromEntries(sources.map((src, i) => [src, getSourceColor(src, i)]));
  const prevYear  = String(Number(selectedYear) - 1);

  const months = Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, '0')}`);

  const buildData = (ym) => {
    const fl = leads.filter(l => normYM(l.date) === ym);
    const srcCounts = Object.fromEntries(sources.map(src => [src, fl.filter(l => l.source === src).length]));
    return {
      month: ym.slice(5) + "月",
      反響数: fl.length,
      有効リード数: fl.filter(l => l.status !== "育成対象外").length,
      商談数: fl.filter(l => ["日程調整中", "商談確定"].includes(l.status)).length,
      MQL数: fl.filter(l => l.mql === "MQL").length,
      ...srcCounts,
    };
  };

  const data = months.map(buildData);

  if (leads.length === 0) return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ fontSize: 17, fontWeight: 900, color: "#174f35", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
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

  const btnStyle = (enabled) => ({
    background: "none", border: "1px solid #c0dece", borderRadius: 6,
    padding: "3px 10px", fontSize: 13, fontWeight: 700,
    color: enabled ? "#059669" : "#c0dece",
    cursor: enabled ? "pointer" : "default",
  });

  const thC = { padding: "6px 10px", textAlign: "center", color: "#6a9a7a", fontWeight: 700, borderBottom: "1px solid #e2f0e8", whiteSpace: "nowrap", background: "#f0f5f2", fontSize: 11 };
  const thCB = { ...thC, borderBottom: "none", borderRight: "1px solid #e2f0e8" };

  return (
    <div className="page-pad" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", padding: "24px 28px", boxSizing: "border-box" }}>

      {/* ヘッダー + 年選択 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: "#174f35", display: "flex", alignItems: "center", gap: 8 }}>
          <TrendIcon size={20} color="#174f35" /> 月別推移レポート
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={btnStyle(canPrev)} disabled={!canPrev} onClick={() => canPrev && setSelectedYear(availableYears[yearIdx - 1])}>◀</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#174f35", minWidth: 68, textAlign: "center" }}>{selectedYear}年</span>
          <button style={btnStyle(canNext)} disabled={!canNext} onClick={() => canNext && setSelectedYear(availableYears[yearIdx + 1])}>▶</button>
        </div>
      </div>

      {/* グラフ2列 */}
      <div className="two-col trend-charts" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20, flexShrink: 0 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #e2f0e8" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#174f35", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
            <InboxIcon size={14} color="#174f35" /> 反響数・商談数
          </div>
          <SVGBarChart data={data} keys={["反響数", "有効リード数", "商談数"]} colors={{ "反響数": "#10b981", "有効リード数": "#6ee7b7", "商談数": "#f59e0b" }} height={230} />
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #e2f0e8" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#174f35", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
            <TrendIcon size={14} color="#174f35" /> 流入元別推移
          </div>
          <SVGLineChart data={data} keys={sources} colors={srcColors} height={230} />
        </div>
      </div>

      {/* 月別詳細テーブル（flex:1 で残り高さを埋める、縦スクロール） */}
      <div style={{ flex: 1, minHeight: 0, background: "#fff", borderRadius: 14, border: "1px solid #e2f0e8", overflowX: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 20px 12px", fontSize: 13, fontWeight: 700, color: "#174f35", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <ClipboardIcon size={14} color="#174f35" /> 月別詳細データ（{selectedYear}年）
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
              {/* 1行目：グループヘッダー */}
              <tr style={{ background: "#f0f5f2" }}>
                <th rowSpan={2} style={{ ...thC, verticalAlign: "middle", borderRight: "1px solid #e2f0e8" }}>月</th>
                <th rowSpan={2} style={{ ...thC, verticalAlign: "middle", borderRight: "1px solid #e2f0e8" }}>流入元</th>
                {["反響数", "有効リード数", "商談数", "商談化率"].map(h => (
                  <th key={h} colSpan={3} style={{ ...thCB, borderBottom: "1px solid #e2f0e8" }}>{h}</th>
                ))}
                <th rowSpan={2} style={{ ...thC, verticalAlign: "middle" }}>MQL数</th>
                <th rowSpan={2} style={{ ...thC, verticalAlign: "middle" }}>MQL率</th>
              </tr>
              {/* 2行目：今年/前年/差 */}
              <tr style={{ background: "#f0f5f2" }}>
                {["反響数", "有効リード数", "商談数", "商談化率"].flatMap(h => (
                  ["今年", "前年", "差"].map(sub => (
                    <th key={`${h}-${sub}`} style={{ ...thC, color: sub === "差" ? "#9ca3af" : sub === "前年" ? "#9ca3af" : "#6a9a7a", fontSize: 10 }}>{sub}</th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const reversed = [...months].reverse();
                if (selectedYear === currentYear) {
                  const idx = reversed.findIndex(m => m === currentYM);
                  return idx >= 0 ? reversed.slice(idx) : reversed;
                }
                return reversed;
              })().flatMap((monthKey, mi) => {
                const d = data[months.indexOf(monthKey)];
                const isCurrentMonth = monthKey === currentYM && selectedYear === currentYear;
                const monthLeads = leads.filter(l => normYM(l.date) === monthKey);
                const srcList = sources.map(src => ({ key: src, label: src, color: srcColors[src] }));
                const bgMonth = isCurrentMonth ? "#f0fdf4" : mi % 2 === 0 ? "#fff" : "#f8fbf9";

                const totalCnt   = monthLeads.length;
                const totalValid = monthLeads.filter(l => l.status !== "育成対象外").length;
                const totalDeals = monthLeads.filter(l => ["日程調整中", "商談確定"].includes(l.status)).length;
                const totalMql   = monthLeads.filter(l => l.mql === "MQL").length;
                const totalDealRate = totalValid ? (totalDeals / totalValid * 100).toFixed(1) : "0.0";
                const totalMqlRate  = totalCnt   ? (totalMql   / totalCnt   * 100).toFixed(1) : "0.0";

                const prevYM    = `${prevYear}-${monthKey.slice(5)}`;
                const prevLeads = leads.filter(l => normYM(l.date) === prevYM);
                const prevCnt   = prevLeads.length;
                const prevValid = prevLeads.filter(l => l.status !== "育成対象外").length;
                const prevDeals = prevLeads.filter(l => ["日程調整中", "商談確定"].includes(l.status)).length;
                const prevDealRate = prevValid ? (prevDeals / prevValid * 100).toFixed(1) : "0.0";

                const diffCnt   = totalCnt   - prevCnt;
                const diffValid = totalValid - prevValid;
                const diffDeals = totalDeals - prevDeals;
                const diffDealRate = (parseFloat(totalDealRate) - parseFloat(prevDealRate)).toFixed(1);

                const hasPrev = prevCnt > 0 || totalCnt > 0;

                const diffColor = (v) => parseFloat(v) > 0 ? "#10b981" : parseFloat(v) < 0 ? "#ef4444" : "#9ca3af";
                const diffStr  = (v) => hasPrev ? (parseFloat(v) > 0 ? `+${v}` : String(v)) : "—";
                const prevStr  = (v) => hasPrev ? v : "—";

                const srcRows = srcList.map((src, si) => {
                  const fl         = monthLeads.filter(l => l.source === src.key);
                  const cnt        = fl.length;
                  const validCnt   = fl.filter(l => l.status !== "育成対象外").length;
                  const deals      = fl.filter(l => ["日程調整中", "商談確定"].includes(l.status)).length;
                  const mql        = fl.filter(l => l.mql === "MQL").length;
                  const dealRate   = validCnt ? (deals / validCnt * 100).toFixed(1) : "0.0";
                  const mqlRate    = cnt ? (mql / cnt * 100).toFixed(1) : "0.0";

                  const pfl        = prevLeads.filter(l => l.source === src.key);
                  const pCnt       = pfl.length;
                  const pValid     = pfl.filter(l => l.status !== "育成対象外").length;
                  const pDeals     = pfl.filter(l => ["日程調整中", "商談確定"].includes(l.status)).length;
                  const pDealRate  = pValid ? (pDeals / pValid * 100).toFixed(1) : "0.0";
                  const hasSrcPrev = pCnt > 0 || cnt > 0;

                  const sDiffColor = (v) => parseFloat(v) > 0 ? "#10b981" : parseFloat(v) < 0 ? "#ef4444" : "#9ca3af";
                  const sDiffStr   = (v) => hasSrcPrev ? (parseFloat(v) > 0 ? `+${v}` : String(v)) : "—";
                  const sPrevStr   = (v) => hasSrcPrev ? v : "—";

                  const dCnt   = cnt   - pCnt;
                  const dValid = validCnt - pValid;
                  const dDeals = deals - pDeals;
                  const dDealRate = (parseFloat(dealRate) - parseFloat(pDealRate)).toFixed(1);

                  return (
                    <tr key={`${mi}-${si}`} style={{ borderBottom: "1px solid #f0f5f2", background: bgMonth }}>
                      {si === 0 && (
                        <td rowSpan={srcList.length + 1} style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#174f35", borderRight: "1px solid #e2f0e8", verticalAlign: "middle" }}>
                          {d.month}
                          {isCurrentMonth && <span style={{ fontSize: 9, marginLeft: 4, background: "#10b981", color: "#fff", borderRadius: 3, padding: "1px 4px" }}>今月</span>}
                        </td>
                      )}
                      <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: src.color, borderRight: "1px solid #e2f0e8" }}>{src.label}</td>
                      {/* 反響数 */}
                      <td style={{ padding: "6px 8px", textAlign: "center", color: src.color, fontWeight: 700 }}>{cnt}</td>
                      <td style={{ padding: "6px 8px", textAlign: "center", color: "#9ca3af" }}>{sPrevStr(pCnt)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: sDiffColor(dCnt), borderRight: "1px solid #f0f5f2" }}>{sDiffStr(dCnt)}</td>
                      {/* 有効リード数 */}
                      <td style={{ padding: "6px 8px", textAlign: "center", color: "#15803d", fontWeight: 700 }}>{validCnt}</td>
                      <td style={{ padding: "6px 8px", textAlign: "center", color: "#9ca3af" }}>{sPrevStr(pValid)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: sDiffColor(dValid), borderRight: "1px solid #f0f5f2" }}>{sDiffStr(dValid)}</td>
                      {/* 商談数 */}
                      <td style={{ padding: "6px 8px", textAlign: "center", color: "#f59e0b", fontWeight: 700 }}>{deals}</td>
                      <td style={{ padding: "6px 8px", textAlign: "center", color: "#9ca3af" }}>{sPrevStr(pDeals)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: sDiffColor(dDeals), borderRight: "1px solid #f0f5f2" }}>{sDiffStr(dDeals)}</td>
                      {/* 商談化率 */}
                      <td style={{ padding: "6px 8px", textAlign: "center", color: "#d97706" }}>{dealRate}%</td>
                      <td style={{ padding: "6px 8px", textAlign: "center", color: "#9ca3af" }}>{sPrevStr(`${pDealRate}%`)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: sDiffColor(dDealRate), borderRight: "1px solid #f0f5f2" }}>{hasSrcPrev ? (parseFloat(dDealRate) > 0 ? `+${dDealRate}%` : `${dDealRate}%`) : "—"}</td>
                      {/* MQL */}
                      <td style={{ padding: "6px 8px", textAlign: "center", color: "#f472b6", fontWeight: 700 }}>{mql}</td>
                      <td style={{ padding: "6px 8px", textAlign: "center", color: "#f472b6" }}>{cnt ? `${mqlRate}%` : "0%"}</td>
                    </tr>
                  );
                });

                const totalRow = (
                  <tr key={`${mi}-total`} style={{ borderBottom: "2px solid #e2f0e8", background: isCurrentMonth ? "#d1fae5" : "#f0f5f2" }}>
                    <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#174f35", borderRight: "1px solid #e2f0e8" }}>合計</td>
                    {/* 反響数 */}
                    <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "#174f35" }}>{totalCnt}</td>
                    <td style={{ padding: "6px 8px", textAlign: "center", color: "#9ca3af", fontWeight: 600 }}>{prevStr(prevCnt)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: diffColor(diffCnt), borderRight: "1px solid #e2f0e8" }}>{diffStr(diffCnt)}</td>
                    {/* 有効リード数 */}
                    <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "#15803d" }}>{totalValid}</td>
                    <td style={{ padding: "6px 8px", textAlign: "center", color: "#9ca3af", fontWeight: 600 }}>{prevStr(prevValid)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: diffColor(diffValid), borderRight: "1px solid #e2f0e8" }}>{diffStr(diffValid)}</td>
                    {/* 商談数 */}
                    <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "#f59e0b" }}>{totalDeals}</td>
                    <td style={{ padding: "6px 8px", textAlign: "center", color: "#9ca3af", fontWeight: 600 }}>{prevStr(prevDeals)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: diffColor(diffDeals), borderRight: "1px solid #e2f0e8" }}>{diffStr(diffDeals)}</td>
                    {/* 商談化率 */}
                    <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "#d97706" }}>{totalDealRate}%</td>
                    <td style={{ padding: "6px 8px", textAlign: "center", color: "#9ca3af", fontWeight: 600 }}>{prevStr(`${prevDealRate}%`)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: diffColor(diffDealRate), borderRight: "1px solid #e2f0e8" }}>{hasPrev ? (parseFloat(diffDealRate) > 0 ? `+${diffDealRate}%` : `${diffDealRate}%`) : "—"}</td>
                    {/* MQL */}
                    <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "#f472b6" }}>{totalMql}</td>
                    <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "#f472b6" }}>{totalMqlRate}%</td>
                  </tr>
                );

                return [...srcRows, totalRow];
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
