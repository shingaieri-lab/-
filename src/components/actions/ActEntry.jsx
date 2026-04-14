// アクション履歴の1件表示コンポーネント
import { S } from '../../styles/index.js';
import { PencilIcon, TrashIcon } from '../ui/Icons.jsx';
import { at } from '../../constants/index.js';
import { USER_COLORS } from '../../lib/accounts.js';

export function ActEntry({ a, onEdit, onDelete, onPushZoho, readOnly, zohoPushing }) {
  const t = at(a.type);
  return (
    <div style={{ ...S.actEntry, borderLeft: `3px solid ${t.color}` }}>
      <span style={{ fontSize:15, flexShrink:0 }}>{t.icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", marginBottom:2 }}>
          <span style={{ fontSize:11, fontWeight:700, color:t.color }}>{t.label}</span>
          <span style={{ fontSize:10, background:t.color+"22", color:t.color, borderRadius:4, padding:"1px 6px" }}>{a.result}</span>
          <span style={{ fontSize:10, color:"#3d7a5e", marginLeft:"auto" }}>{a.date}{a.time ? " " + a.time : ""}</span>
          {a.recorded_by && (() => {
            const uc = USER_COLORS[a.recorded_by] || "#059669";
            return <span style={{ fontSize:10, color:uc, fontWeight:600 }}>記録者：{a.recorded_by}</span>;
          })()}
          {!readOnly && onPushZoho && (
            <button onClick={onPushZoho} disabled={zohoPushing} title="Zohoに同期"
              style={{ ...S.btnEditAct, background: zohoPushing ? "#f0f9ff" : "#e0f2fe", border:"1px solid #7dd3fc", color:"#0284c7", fontSize:10, padding:"1px 6px", borderRadius:4, cursor: zohoPushing ? "default" : "pointer" }}>
              {zohoPushing ? "同期中" : "🔗"}
            </button>
          )}
          {!readOnly && <button onClick={onEdit} style={S.btnEditAct} title="編集"><PencilIcon color="#059669"/></button>}
          {!readOnly && (
            <button onClick={onDelete} style={{ ...S.btnEditAct, background:"#fef2f2", border:"1px solid #fca5a5" }} title="削除">
              <TrashIcon color="#ef4444"/>
            </button>
          )}
        </div>
        <p style={{ margin:0, fontSize:12, color:"#174f35", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{a.summary}</p>
        {(a.nextDate || a.next) && (
          <div style={{ fontSize:11, color:"#059669", marginTop:3 }}>
            → 次回：{a.nextDate || ""}{a.nextTime ? " " + a.nextTime : ""}{a.next ? " " + a.next : ""}
          </div>
        )}
        {a.talkPoints?.length > 0 && (
          <div style={{ marginTop:5, background:"#f0f9f5", borderRadius:6, padding:"6px 10px" }}>
            <div style={{ fontSize:10, color:"#059669", fontWeight:700, marginBottom:4 }}>📞 次回架電トークポイント</div>
            {a.talkPoints.map((p, i) => (
              <div key={i} style={{ display:"flex", gap:6, alignItems:"flex-start", marginBottom:3 }}>
                <span style={{ background:"#059669", color:"#fff", borderRadius:3, padding:"0px 5px", fontSize:10, fontWeight:700, flexShrink:0, lineHeight:"16px" }}>{i+1}</span>
                <span style={{ fontSize:11, color:"#174f35", lineHeight:1.5 }}>{p}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
