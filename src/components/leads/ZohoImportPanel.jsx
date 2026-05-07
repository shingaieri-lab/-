// Zoho CRM 手動取込パネル
import { useState } from 'react';
import { S } from '../../styles/index.js';
import { ExternalLinkIcon, CheckCircleIcon, AlertIcon } from '../ui/Icons.jsx';
import { importZohoLead } from '../../lib/zoho.js';

export function ZohoImportPanel({ onAdd, onClose }) {
  const [zohoImportId, setZohoImportId] = useState('');
  const [zohoImporting, setZohoImporting] = useState(false);
  const [zohoImportMsg, setZohoImportMsg] = useState(null);

  const handleImport = async () => {
    setZohoImporting(true); setZohoImportMsg(null);
    try {
      const { ok, data } = await importZohoLead(zohoImportId.trim());
      if (!ok) { setZohoImportMsg({ type:'err', text: data.error || '取込に失敗しました' }); }
      else { onAdd(data.lead); setZohoImportId(''); setZohoImportMsg({ type:'ok', text: `「${data.lead.company || data.lead.contact}」を取込みました` }); }
    } catch (e) {
      setZohoImportMsg({ type:'err', text: 'ネットワークエラー: ' + e.message });
    } finally { setZohoImporting(false); }
  };

  return (
    <div style={{background:'#f0f7ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'12px 16px',marginBottom:8,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
      <span style={{fontSize:12,fontWeight:700,color:'#1e40af',flexShrink:0,display:"flex",alignItems:"center",gap:4}}><ExternalLinkIcon size={12} color="#1e40af" /> ZohoリードIDで取込</span>
      <input value={zohoImportId} onChange={e => setZohoImportId(e.target.value)}
        placeholder="Zoho Lead ID（例：1234567890123456789）"
        style={{...S.sel, width:280, flexShrink:0}}
        onKeyDown={e => { if (e.key === 'Enter') handleImport(); }} />
      <button disabled={zohoImporting || !zohoImportId.trim()} onClick={handleImport}
        style={{...S.btnP, opacity: (zohoImporting || !zohoImportId.trim()) ? 0.5 : 1}}>
        {zohoImporting ? '取込中…' : '取込'}
      </button>
      <button onClick={onClose} style={{fontSize:11,padding:"3px 9px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",background:"none",border:"1px solid #bfdbfe",color:"#1e40af"}}>✕ 閉じる</button>
      {zohoImportMsg && (
        <span style={{fontSize:12, fontWeight:700, color: zohoImportMsg.type === 'ok' ? '#059669' : '#dc2626', display:"flex", alignItems:"center", gap:4}}>
          {zohoImportMsg.type === 'ok' ? <CheckCircleIcon size={12} color="#059669" /> : <AlertIcon size={12} color="#dc2626" />}{zohoImportMsg.text}
        </span>
      )}
    </div>
  );
}
