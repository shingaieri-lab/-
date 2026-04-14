// グローバルCSS（アニメーション・スクロールバー・レスポンシブ対応）
export const CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width:6px; }
  ::-webkit-scrollbar-track { background:#f0f5f2; }
  ::-webkit-scrollbar-thumb { background:#c0dece; border-radius:3px; }
  button { transition: filter 0.15s; }
  button:hover { filter: brightness(1.08); }
  button:focus-visible { outline: 2px solid #10b981; outline-offset: 2px; }

  @media (max-width: 768px) {
    .kpi-grid { grid-template-columns: 1fr 1fr !important; }
    .two-col { grid-template-columns: 1fr !important; height: auto !important; min-height: 0 !important; flex: none !important; }
    .three-col { grid-template-columns: 1fr 1fr !important; }
    .four-col { grid-template-columns: 1fr 1fr !important; }
    .dash-container { height: auto !important; overflow: auto !important; min-height: calc(100vh - 130px); padding: 10px 12px !important; }
    .page-pad { padding-left: 12px !important; padding-right: 12px !important; }
    .filter-bar { flex-wrap: wrap !important; }
    .filter-bar > * { flex-shrink: 1 !important; min-width: 0 !important; }
    .filter-bar input { min-width: 140px !important; width: auto !important; }
    .filter-bar select { min-width: 100px !important; max-width: none !important; }
    .email-grid { grid-template-columns: 1fr !important; }
    .email-main-grid { grid-template-columns: 1fr !important; height: auto !important; }
    .ai-layout { flex-direction: column !important; height: auto !important; min-height: 0 !important; overflow: auto !important; }
    .ai-left-panel { width: 100% !important; border-right: none !important; border-bottom: 1px solid #c0dece !important; max-height: none !important; overflow: visible !important; }
    .ai-header { padding: 12px 14px !important; }
    .ai-header-sub { display: none !important; }
    .cal-page { width: 100% !important; max-width: 100% !important; padding: 14px 12px !important; }
    .settings-page { width: 100% !important; max-width: 100% !important; padding: 14px 12px !important; }
    .settings-tabs { flex-wrap: wrap !important; gap: 4px !important; }
    .settings-tabs button { margin-right: 0 !important; font-size: 11px !important; padding: 6px 10px !important; }
    .resp-stack { flex-direction: column !important; }
    .resp-full-w { width: 100% !important; max-width: 100% !important; }
    .lead-list-container { padding-left: 12px !important; padding-right: 12px !important; height: auto !important; min-height: calc(100vh - 130px); }
    .lead-list-container .page-pad { margin-left: -12px !important; margin-right: -12px !important; }
    .lead-list-inner { overflow: visible !important; flex: none !important; }
    .lead-header-actions { flex-wrap: wrap !important; gap: 6px !important; }
    .lead-header-actions button { font-size: 12px !important; padding: 7px 10px !important; }
    .trend-charts { grid-template-columns: 1fr !important; }
    .header-wrap { flex-wrap: wrap !important; gap: 8px !important; }
  }
  @media (max-width: 480px) {
    .kpi-grid { grid-template-columns: 1fr 1fr !important; }
    .two-col { grid-template-columns: 1fr !important; }
    .filter-bar input, .filter-bar select { font-size: 12px !important; padding: 6px 8px !important; }
    .kpi-card-value { font-size: 20px !important; }
    .lead-list-container { padding-left: 8px !important; padding-right: 8px !important; }
    .lead-list-container .page-pad { margin-left: -8px !important; margin-right: -8px !important; }
  }
`;
