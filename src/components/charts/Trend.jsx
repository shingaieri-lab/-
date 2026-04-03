// 月別推移レポートコンポーネント
// leads データを月別に集計してグラフ＋テーブルで表示する

import { SVGBarChart } from './SVGBarChart.jsx';
import { SVGLineChart } from './SVGLineChart.jsx';
import { getSources, getSourceColor } from '../../lib/master.js';

// 日付文字列を YYYY-MM 形式に正規化する
function normYM(s) {
  if (!s) return "";
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const m = s.match(/^(\d{4})[\/-](\d{1,2})/);
  return m ? m[1] + "-" + m[2].padStart(2, "0") : "";
}

export function Trend({ leads }) {
  const sources = getSources();
  const srcColors = Object.fromEntries(sources.map((src, i) => [src, getSourceColor(src, i)]));
  const months = [...new Set(leads.map(l => normYM(l.date)).filter(Boolean))].sort();

  const data = months.map(m => {
    const fl = leads.filter(l => normYM(l.date) === m);
    const srcCounts = Object.fromEntries(sources.map(src => [src, fl.filter(l => l.source === src).length]));
    const validCount = fl.filter(l => l.status !== "育成対象外").length;
    return {
      month: m.slice(5) + "月",
      反響数: fl.length,
      有効リード数: validCount,
      商談数: fl.filter(l => ["日程調整中", "商談確定"].includes(l.status)).length,
      MQL数: fl.filter(l => l.mql === "MQL").length,
      ...srcCounts,
    };
  });

  if (data.length === 0) return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ fontSize: 17, fontWeight: 900, color: "#174f35", marginBottom: 16 }}>📈 月別推移レポート</div>
      <div style={{ textAlign: "center", padding: 60, color: "#6a9a7a", background: "#fff", borderRadius: 14, border: "1px solid #e2f0e8" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>まだデータがありません</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>リードを登録すると月別推移が表示されます</div>
      </div>
    </div>
  );

  const latest = data[data.length - 1];
  const prev = data[data.length - 2];
  const diffBadge = (key) => {
    if (!prev) return null;
    const d = latest[key] - prev[key];
    return <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 6, color: d > 0 ? "#10b981" : d < 0 ? "#ef4444" : "#9ca3af" }}>{d > 0 ? "+" : ""}{d}件</span>;
  };

  return (
    <div className="page-pad" style={{ padding: "24px 28px" }}>
      <div style={{ fontSize: 17, fontWeight: 900, color: "#174f35", marginBottom: 20 }}>📈 月別推移レポート</div>
      <div className="two-col trend-charts" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #e2f0e8" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#174f35", marginBottom: 12 }}>📊 反響数・商談数・MQL数</div>
          <SVGBarChart data={data} keys={["反響数", "商談数", "MQL数"]} colors={{ "反響数": "#10b981", "商談数": "#6366f1", "MQL数": "#ec4899" }} height={200} />
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #e2f0e8" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#174f35", marginBottom: 12 }}>📉 流入元別推移</div>
          <SVGLineChart data={data} keys={sources} colors={srcColors} height={200} />
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #e2f0e8", overflowX: "auto" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#174f35", marginBottom: 12 }}>📋 月別詳細データ</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f0f5f2" }}>
              {["月", "流入元", "反響数", "有効リード数", "商談数", "商談化率", "MQL数", "MQL率"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "center", color: "#6a9a7a", fontWeight: 700, borderBottom: "1px solid #e2f0e8", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().flatMap((d, mi) => {
              const isLatest = mi === 0;
              const monthKey = months[months.length - 1 - mi];
              const monthLeads = leads.filter(l => normYM(l.date) === monthKey);
              const srcList = sources.map(src => ({ key: src, label: src, color: srcColors[src] }));
              const bgMonth = isLatest ? "#f0fdf4" : mi % 2 === 0 ? "#fff" : "#f8fbf9";
              const totalCnt = monthLeads.length;
              const totalValid = monthLeads.filter(l => l.status !== "育成対象外").length;
              const totalDeals = monthLeads.filter(l => ["日程調整中", "商談確定"].includes(l.status)).length;
              const totalMql = monthLeads.filter(l => l.mql === "MQL").length;

              const srcRows = srcList.map((src, si) => {
                const fl = monthLeads.filter(l => l.source === src.key);
                const cnt = fl.length;
                const validCnt = fl.filter(l => l.status !== "育成対象外").length;
                const deals = fl.filter(l => ["日程調整中", "商談確定"].includes(l.status)).length;
                const mql = fl.filter(l => l.mql === "MQL").length;
                const isFirst = si === 0;
                return (
                  <tr key={`${mi}-${si}`} style={{ borderBottom: "1px solid #f0f5f2", background: bgMonth }}>
                    {isFirst && (
                      <td rowSpan={srcList.length + 1} style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#174f35", borderRight: "1px solid #e2f0e8", verticalAlign: "middle" }}>
                        {d.month}
                        {isLatest && <span style={{ fontSize: 9, marginLeft: 4, background: "#10b981", color: "#fff", borderRadius: 3, padding: "1px 4px" }}>最新</span>}
                      </td>
                    )}
                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: src.color }}>{src.label}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", color: src.color, fontWeight: 700 }}>{cnt}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", color: "#15803d", fontWeight: 700 }}>{validCnt}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", color: "#f59e0b", fontWeight: 700 }}>{deals}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", color: "#d97706" }}>{validCnt ? (deals / validCnt * 100).toFixed(1) : 0}%</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", color: "#8b5cf6", fontWeight: 700 }}>{mql}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", color: "#7c3aed" }}>{cnt ? (mql / cnt * 100).toFixed(1) : 0}%</td>
                  </tr>
                );
              });

              const totalRow = (
                <tr key={`${mi}-total`} style={{ borderBottom: "2px solid #e2f0e8", background: isLatest ? "#d1fae5" : "#f0f5f2" }}>
                  <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#174f35" }}>合計</td>
                  <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#174f35" }}>{totalCnt}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#15803d" }}>{totalValid}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#f59e0b" }}>{totalDeals}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#d97706" }}>{totalValid ? (totalDeals / totalValid * 100).toFixed(1) : 0}%</td>
                  <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#8b5cf6" }}>{totalMql}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#7c3aed" }}>{totalCnt ? (totalMql / totalCnt * 100).toFixed(1) : 0}%</td>
                </tr>
              );

              return [...srcRows, totalRow];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
