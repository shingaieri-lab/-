// 月別推移レポートコンポーネント
// leads データを月別に集計してグラフ＋テーブルで表示する

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

  // 選択年の全12ヶ月を生成
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

  // テーブルの最大高：流入元数+合計行 × 4ヶ月分 × 行高 + thead
  const rowH = 38;
  const rowsPerMonth = sources.length + 1;
  const tableMaxH = rowH * rowsPerMonth * 4 + 42;

  return (
    <div className="page-pad" style={{ padding: "24px 28px" }}>

      {/* ヘッダー + 年選択 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
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
      <div className="two-col trend-charts" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #e2f0e8" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#174f35", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
            <InboxIcon size={14} color="#174f35" /> 反響数・商談数
          </div>
          <SVGBarChart data={data} keys={["反響数", "商談数"]} colors={{ "反響数": "#10b981", "商談数": "#f59e0b" }} height={200} />
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #e2f0e8" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#174f35", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
            <TrendIcon size={14} color="#174f35" /> 流入元別推移
          </div>
          <SVGLineChart data={data} keys={sources} colors={srcColors} height={200} />
        </div>
      </div>

      {/* 月別詳細テーブル（高さ固定・縦スクロール） */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2f0e8", overflowX: "auto" }}>
        <div style={{ padding: "18px 20px 12px", fontSize: 13, fontWeight: 700, color: "#174f35", display: "flex", alignItems: "center", gap: 5 }}>
          <ClipboardIcon size={14} color="#174f35" /> 月別詳細データ（{selectedYear}年）
        </div>
        <div style={{ overflowY: "auto", maxHeight: tableMaxH }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f0f5f2", position: "sticky", top: 0, zIndex: 1 }}>
                {["月", "流入元", "反響数", "有効リード数", "商談数", "商談化率", "MQL数", "MQL率", "前年同月", "前年同月差"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "center", color: "#6a9a7a", fontWeight: 700, borderBottom: "1px solid #e2f0e8", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...months].reverse().flatMap((monthKey, mi) => {
                const d = data[months.indexOf(monthKey)];
                const isCurrentMonth = monthKey === currentYM && selectedYear === currentYear;
                const monthLeads = leads.filter(l => normYM(l.date) === monthKey);
                const srcList = sources.map(src => ({ key: src, label: src, color: srcColors[src] }));
                const bgMonth = isCurrentMonth ? "#f0fdf4" : mi % 2 === 0 ? "#fff" : "#f8fbf9";

                const totalCnt   = monthLeads.length;
                const totalValid = monthLeads.filter(l => l.status !== "育成対象外").length;
                const totalDeals = monthLeads.filter(l => ["日程調整中", "商談確定"].includes(l.status)).length;
                const totalMql   = monthLeads.filter(l => l.mql === "MQL").length;

                // 前年同月
                const prevYM     = `${prevYear}-${monthKey.slice(5)}`;
                const prevLeads  = leads.filter(l => normYM(l.date) === prevYM);
                const prevCnt    = prevLeads.length;
                const diff       = totalCnt - prevCnt;
                const hasPrevData = prevCnt > 0 || totalCnt > 0;

                const srcRows = srcList.map((src, si) => {
                  const fl        = monthLeads.filter(l => l.source === src.key);
                  const cnt       = fl.length;
                  const validCnt  = fl.filter(l => l.status !== "育成対象外").length;
                  const deals     = fl.filter(l => ["日程調整中", "商談確定"].includes(l.status)).length;
                  const mql       = fl.filter(l => l.mql === "MQL").length;
                  const prevSrcCnt = prevLeads.filter(l => l.source === src.key).length;
                  const srcDiff    = cnt - prevSrcCnt;
                  const hasSrcPrev = prevSrcCnt > 0 || cnt > 0;
                  return (
                    <tr key={`${mi}-${si}`} style={{ borderBottom: "1px solid #f0f5f2", background: bgMonth }}>
                      {si === 0 && (
                        <td rowSpan={srcList.length + 1} style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#174f35", borderRight: "1px solid #e2f0e8", verticalAlign: "middle" }}>
                          {d.month}
                          {isCurrentMonth && <span style={{ fontSize: 9, marginLeft: 4, background: "#10b981", color: "#fff", borderRadius: 3, padding: "1px 4px" }}>今月</span>}
                        </td>
                      )}
                      <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: src.color }}>{src.label}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", color: src.color, fontWeight: 700 }}>{cnt}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", color: "#15803d", fontWeight: 700 }}>{validCnt}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", color: "#f59e0b", fontWeight: 700 }}>{deals}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", color: "#d97706" }}>{validCnt ? (deals / validCnt * 100).toFixed(1) : 0}%</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", color: "#f472b6", fontWeight: 700 }}>{mql}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", color: "#f472b6" }}>{cnt ? (mql / cnt * 100).toFixed(1) : 0}%</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", color: "#6b7280" }}>{hasSrcPrev ? prevSrcCnt : "—"}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: srcDiff > 0 ? "#10b981" : srcDiff < 0 ? "#ef4444" : "#9ca3af" }}>
                        {hasSrcPrev ? (srcDiff > 0 ? `+${srcDiff}` : String(srcDiff)) : "—"}
                      </td>
                    </tr>
                  );
                });

                const totalRow = (
                  <tr key={`${mi}-total`} style={{ borderBottom: "2px solid #e2f0e8", background: isCurrentMonth ? "#d1fae5" : "#f0f5f2" }}>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#174f35" }}>合計</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#174f35" }}>{totalCnt}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#15803d" }}>{totalValid}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#f59e0b" }}>{totalDeals}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#d97706" }}>{totalValid ? (totalDeals / totalValid * 100).toFixed(1) : 0}%</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#f472b6" }}>{totalMql}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#f472b6" }}>{totalCnt ? (totalMql / totalCnt * 100).toFixed(1) : 0}%</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", color: "#6b7280", fontWeight: 600 }}>
                      {hasPrevData ? prevCnt : "—"}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: diff > 0 ? "#10b981" : diff < 0 ? "#ef4444" : "#9ca3af" }}>
                      {hasPrevData ? (diff > 0 ? `+${diff}` : String(diff)) : "—"}
                    </td>
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
