// 折れ線グラフコンポーネント
// data: [{ month, ...keys }], keys: string[], colors: { [key]: string }

import { useState } from 'react';

export function SVGLineChart({ data, keys, colors, height = 200 }) {
  const [tooltip, setTooltip] = useState(null);
  if (!data.length) return null;

  const maxVal = Math.max(...data.flatMap(d => keys.map(k => d[k] || 0)), 1);
  const padL = 36, padR = 12, padT = 16, padB = 28, W = 700, H = height;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW;
  const px = i => padL + (data.length > 1 ? i * xStep : chartW / 2);
  const py = v => padT + chartH - (v / maxVal) * chartH;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => Math.round(maxVal * r));

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
        {yTicks.map((v, i) => {
          const y = py(v);
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y} y2={y}
                stroke={i === 0 ? "#c0dece" : "#e8f5ee"}
                strokeWidth={i === 0 ? 1.5 : 1}
                strokeDasharray={i === 0 ? "" : "4 3"} />
              <text x={padL - 5} y={y + 4} textAnchor="end" fontSize={11} fill="#9ca3af">{v}</text>
            </g>
          );
        })}
        {keys.map(k => {
          const pts = data.map((d, i) => `${px(i)},${py(d[k] || 0)}`).join(" ");
          return (
            <g key={k}>
              <polyline points={pts} fill="none" stroke={colors[k]} strokeWidth={2.5}
                strokeLinejoin="round" strokeLinecap="round" />
              {data.map((d, i) => {
                const val = d[k] || 0;
                const cx = px(i), cy = py(val);
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r={4} fill={colors[k]} stroke="#fff" strokeWidth={1.5}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, label: d.month, key: k, val })}
                      onMouseLeave={() => setTooltip(null)} />
                    {val > 0 && (
                      <text x={cx} y={Math.max(cy - 8, padT + 8)}
                        textAnchor="middle" fontSize={11} fill={colors[k]} fontWeight={700}>{val}</text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
        {data.map((d, i) => (
          <text key={i} x={px(i)} y={H - padB + 14} textAnchor="middle" fontSize={13} fill="#6a9a7a">{d.month}</text>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6, paddingLeft: padL }}>
        {keys.map(k => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6a9a7a" }}>
            <span style={{ width: 18, height: 3, background: colors[k], display: "inline-block", borderRadius: 2 }} />
            {k}
          </div>
        ))}
      </div>
      {tooltip && (
        <div style={{ position: "fixed", left: tooltip.x + 12, top: tooltip.y - 30, background: "#fff", border: "1px solid #e2f0e8", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#174f35", pointerEvents: "none", zIndex: 9999, boxShadow: "0 4px 12px #0002" }}>
          <b>{tooltip.label}</b> / {tooltip.key}: <b>{tooltip.val}</b>
        </div>
      )}
    </div>
  );
}
