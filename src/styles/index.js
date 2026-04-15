// アプリ共通のインラインスタイルオブジェクト
// コンポーネント内で style={S.card} のように使う

export const S = {
  root:       { display:"flex",height:"100vh",background:"#f0f5f2",fontFamily:"'BIZ UDPGothic','Meiryo','Hiragino Kaku Gothic ProN',sans-serif",color:"#1f5c40",overflow:"hidden" },
  main:       { flex:1,overflow:"auto",background:"#f0f5f2" },
  page:       { padding:"24px 28px",minHeight:"100vh" },
  nav:        { width:120,background:"#134e3a",display:"flex",flexDirection:"column",padding:"0",flexShrink:0 },
  navLogo:    { display:"flex",gap:10,alignItems:"center",padding:"20px 16px 24px",borderBottom:"1px solid #e2f0e8" },
  navIconBox: { width:36,height:36,background:"linear-gradient(135deg,#10b981,#059669)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 },
  navTitle:   { fontSize:13,fontWeight:700,color:"#174f35" },
  navSub:     { fontSize:11,color:"#3d7a5e" },
  navBtn:     { display:"flex",gap:10,alignItems:"center",padding:"11px 16px",background:"none",border:"none",color:"#6a9a7a",fontSize:13.5,cursor:"pointer",fontFamily:"inherit",textAlign:"left" },
  navActive:  { background:"#10b98122",color:"#6ee7b7",borderLeft:"3px solid #10b981" },
  navFoot:    { marginTop:"auto",padding:"12px 8px",borderTop:"1px solid #ffffff22",fontSize:11,color:"#6ee7b766",textAlign:"center" },
  kpiRow:     { display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16 },
  kpiCard:    { background:"#ffffff",border:"1px solid #e2f0e8",borderRadius:14,padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start",boxShadow:"0 2px 10px #0569690a" },
  card:       { background:"#ffffff",border:"1px solid #e2f0e8",borderRadius:14,padding:"18px 20px",marginBottom:14,boxShadow:"0 2px 10px #0569690a" },
  cardTitle:  { fontSize:12,fontWeight:700,color:"#6a9a7a",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10 },
  table:      { width:"100%",borderCollapse:"collapse" },
  th:         { fontSize:12,color:"#3d7a5e",padding:"8px 12px",textAlign:"left",borderBottom:"1px solid #e2f0e8",background:"#f8fbf9",fontWeight:700 },
  td:         { padding:"10px 12px",fontSize:13.5,color:"#2d6b4a" },
  tdn:        { padding:"10px 12px",fontSize:14,color:"#1f5c40",fontWeight:600,textAlign:"center" },
  portalBox:  { flex:1,minWidth:130,background:"#ffffff",border:"1px solid #c0dece",borderRadius:8,padding:"12px 14px" },
  portalLabel:{ fontSize:11,color:"#174f35",fontWeight:600,marginBottom:4 },
  portalCount:{ fontSize:22,fontWeight:800,color:"#f59e0b" },
  portalUnit: { fontSize:13,fontWeight:400,marginLeft:2 },
  portalAmt:  { fontSize:13,color:"#2d6b4a",marginTop:2 },
  portalRate: { fontSize:11,color:"#3d7a5e",marginTop:1 },
  leadCard:   { background:"#ffffff",border:"1px solid #e2f0e8",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 6px #0569690a",marginBottom:0 },
  leadHead:   { display:"flex",gap:8,alignItems:"center",padding:"10px 12px" },
  leadCo:     { fontSize:14,fontWeight:700,color:"#174f35" },
  leadMeta:   { fontSize:12,color:"#3d7a5e",marginTop:2 },
  leadBody:   { padding:"12px 16px",borderTop:"1px solid #e2f0e8",background:"#f0f5f2" },
  priTag:     { borderRadius:5,padding:"2px 8px",fontSize:12,fontWeight:700,flexShrink:0 },
  actCount:   { fontSize:11,color:"#3d7a5e",background:"#d8ede1",borderRadius:10,padding:"2px 8px" },
  histSection:{ marginTop:12,borderTop:"1px solid #e2f0e8",paddingTop:12 },
  histHeader: { display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 },
  sectionLabel:{ fontSize:12,fontWeight:700,color:"#6a9a7a",textTransform:"uppercase",letterSpacing:"0.06em" },
  btnAddAct:  { background:"#d1fae5",color:"#10b981",border:"1px solid #10b98144",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit" },
  noAct:      { color:"#c0dece",fontSize:13,textAlign:"center",padding:"10px 0" },
  actForm:    { background:"#f0f5f2",border:"1px solid #10b98144",borderRadius:9,padding:"14px 16px",marginBottom:4 },
  actEntry:   { display:"flex",gap:10,alignItems:"flex-start",background:"#ffffff",borderRadius:7,padding:"9px 12px" },
  zohoLink:   { background:"#e0f2fe",color:"#0284c7",border:"1px solid #7dd3fc",borderRadius:6,padding:"4px 12px",fontSize:12,textDecoration:"none",display:"inline-block" },
  nextAct:    { fontSize:13,color:"#059669",fontWeight:600,background:"#ecfdf5",border:"1px solid #10b98144",borderRadius:6,padding:"8px 12px" },
  timingBox:  { background:"#d1fae5",borderRadius:8,padding:"12px 16px",border:"1px solid #10b98144" },
  timeBox:    { fontSize:13,color:"#a78bfa",background:"#2e106522",borderRadius:6,padding:"8px 12px",border:"1px solid #4c1d9566" },
  emptyCenter:{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#3d7a5e",gap:12,fontSize:14 },
  spin:       { width:40,height:40,border:"3px solid #1e293b",borderTop:"3px solid #3b82f6",borderRadius:"50%",animation:"spin 0.8s linear infinite" },
  overlay:    { position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center" },
  modal:      { background:"#ffffff",border:"1px solid #e2f0e8",borderRadius:14,width:"90%",maxWidth:520,maxHeight:"90vh",display:"flex",flexDirection:"column" },
  modalHead:  { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid #e2f0e8" },
  modalBody:  { flex:1,overflow:"auto",padding:"18px 20px" },
  modalFoot:  { display:"flex",justifyContent:"flex-end",gap:10,padding:"12px 20px",borderTop:"1px solid #e2f0e8" },
  closeX:     { background:"none",border:"none",color:"#6a9a7a",fontSize:18,cursor:"pointer",fontFamily:"inherit" },
  tab:        { padding:"11px 16px",background:"none",border:"none",borderBottom:"2px solid transparent",color:"#6a9a7a",fontSize:13,cursor:"pointer",fontFamily:"inherit" },
  tabA:       { borderBottom:"2px solid #3b82f6",color:"#10b981",fontWeight:700 },
  sel:        { background:"#f8fffe",border:"1px solid #99e6d8",borderRadius:8,padding:"8px 12px",color:"#1f5c40",fontSize:13,fontFamily:"inherit",outline:"none",cursor:"pointer" },
  selSm:      { background:"#d8ede1",border:"1px solid #c0dece",borderRadius:6,padding:"3px 6px",fontSize:11,fontFamily:"inherit",outline:"none",cursor:"pointer",maxWidth:110 },
  lbl:        { display:"block",fontSize:11,color:"#6a9a7a",marginBottom:4,fontWeight:600 },
  inp:        { width:"100%",background:"#f8fffe",border:"1px solid #99e6d8",borderRadius:7,padding:"9px 12px",color:"#1f5c40",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box" },
  btnP:       { background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontSize:13.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit" },
  btnSec:     { background:"#d8ede1",color:"#2d6b4a",border:"1px solid #c0dece",borderRadius:8,padding:"9px 16px",fontSize:13,cursor:"pointer",fontFamily:"inherit" },
  btnDel:     { background:"#450a0a22",color:"#ef4444",border:"1px solid #ef444433",borderRadius:8,padding:"9px 16px",fontSize:13,cursor:"pointer",fontFamily:"inherit" },
  btnDelSm:   { background:"transparent",color:"#3d7a5e",border:"1px solid #c0dece",borderRadius:5,padding:"2px 6px",fontSize:12,cursor:"pointer",fontFamily:"inherit",lineHeight:1,flexShrink:0 },
  btnIconSm:  { background:"#f0fdf4",border:"1px solid #86efac",borderRadius:5,padding:"3px 6px",fontSize:12,cursor:"pointer",fontFamily:"inherit",lineHeight:1,flexShrink:0,color:"#059669",display:"flex",alignItems:"center",gap:3 },
  confirmRow: { display:"flex",gap:6,alignItems:"center",background:"#fef2f2",border:"1px solid #ef444444",borderRadius:7,padding:"4px 8px" },
  btnDelXs:   { background:"#ef4444",color:"#fff",border:"none",borderRadius:5,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit" },
  btnCancelXs:{ background:"#d8ede1",color:"#2d6b4a",border:"1px solid #c0dece",borderRadius:5,padding:"3px 8px",fontSize:11,cursor:"pointer",fontFamily:"inherit" },
  empty:      { textAlign:"center",color:"#3d7a5e",padding:"40px",fontSize:14 },
  importPanel:{ background:"#ffffff",border:"1px solid #e2f0e8",borderRadius:12,padding:"16px 20px",marginBottom:16 },
  selectedLeadChip: { display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:6,padding:"6px 10px",background:"#d8ede1",borderRadius:7,border:"1px solid #c0dece" },
  meetingBar: { display:"flex",alignItems:"center",gap:10,padding:"5px 16px 6px",background:"transparent",borderTop:"1px solid #e8f5ee",flexWrap:"wrap" },
  btnEditAct: { background:"#f0fdf4",border:"1px solid #86efac",borderRadius:5,cursor:"pointer",fontSize:13,padding:"3px 5px",lineHeight:1,marginLeft:2,color:"#059669",display:"flex",alignItems:"center" },
  leadQuick:  { display:"flex",alignItems:"center",gap:10,padding:"5px 16px 7px",background:"transparent",borderTop:"1px solid #e8f5ee",flexWrap:"wrap" },
  nextActInline: { display:"flex",alignItems:"center",fontSize:12.5,color:"#059669",fontWeight:600,flex:1,minWidth:0,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis" },
  zohoLinkSmall: { background:"#e0f2fe",color:"#0284c7",border:"1px solid #7dd3fc",borderRadius:5,padding:"3px 10px",fontSize:12,textDecoration:"none",whiteSpace:"nowrap",flexShrink:0 },
};

// グローバル CSS（アニメーション・スクロールバー・レスポンシブ対応）
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
