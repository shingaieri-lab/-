import React, { useState } from 'react';
import { MQL_OPTIONS } from '../lib/constants.js';
import { getStatuses, getStatusColor } from '../lib/master.js';
import { S } from './styles.js';
import { uid } from '../lib/constants.js';

const CSV_COLUMNS = {
  "会社名":               "company",
  "担当者名":             "contact",
  "反響日":               "date",
  "流入元":               "source",
  "ポータルサイト名":     "portal_site",
  "ポータル種別":         "portal_type",
  "課金対象外申請済":     "charge_applied",
  "ステータス":           "status",
  "IS担当":               "is_member",
  "商談日":               "meeting_date",
  "商談時刻":             "meeting_time",
  "担当営業":             "sales_member",
  "Zoho CRM URL":         "zoho_url",
  "HP URL":               "hp_url",
  "IS確度":               "is_accuracy",
  "ネクストアクション日": "next_action_date",
  "ネクストアクション時刻":"next_action_time",
  "ネクストアクションメモ":"next_action",
  "MQL判定":              "mql",
};

function parseCSVLine(line) {
  const fields = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === "," && !inQ) { fields.push(cur.trim()); cur = ""; }
    else { cur += c; }
  }
  fields.push(cur.trim());
  return fields;
}

// 日付を YYYY-MM-DD に正規化
// 対応フォーマット: "YYYY-MM-DD"（そのまま）、"YYYY/M/D" or "YYYY-M-D"（ゼロ埋め変換）
// CSVインポート（parseCSV）・リード編集・ダッシュボード（toYM）すべてでこの関数を経由するため
// 保存データの日付フォーマットは常に YYYY-MM-DD に統一される
export function normalizeDate(s) {
  if (!s) return "";
  s = s.trim();
  // 既に YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // YYYY/M/D or YYYY-M-D（月・日が1桁でもOK）
  const m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  return s;
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g,"\n").replace(/\r/g,"\n").split("\n").filter(l=>l.trim());
  if (lines.length < 1) return { leads:[], errors:["データがありません"] };

  let headerIdx = lines.findIndex(l => l.includes("会社名"));

  const FIXED_COLS = ["company","contact","date","source","portal_site","portal_type",
    "charge_applied","status","is_member","mql","meeting_date","meeting_time",
    "sales_member","zoho_url","next_action_date","next_action_time","next_action"];

  const leads = []; const errors = [];

  if (headerIdx < 0) {
    for (let i = 0; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      if (!vals[0] || vals[0].includes("フォーマット") || vals[0].startsWith("★") || vals[0].startsWith("会社名")) continue;
      const row = {};
      FIXED_COLS.forEach((k,j) => { row[k] = (vals[j]||"").trim(); });
      if (!row.company) continue;
      row.id = uid(); row.actions = []; row.created_at = Date.now();
      row.charge_applied = row.charge_applied === "TRUE" || row.charge_applied === "true";
      if (!getStatuses().includes(row.status)) row.status = getStatuses()[0] || "新規";
      if (!MQL_OPTIONS.includes(row.mql)) row.mql = "非MQL";
      row.date = normalizeDate(row.date);
      row.next_action_date = normalizeDate(row.next_action_date);
      row.meeting_date = normalizeDate(row.meeting_date);
      leads.push(row);
    }
    if (leads.length === 0) return { leads:[], errors:["データ行が見つかりません。フォーマットのヘッダー行（会社名・担当者名…）が必要です"] };
    return { leads, errors };
  }

  const headers = parseCSVLine(lines[headerIdx]).map(h => h.replace(" ★",""));
  for (let i = headerIdx+1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h,j) => { const key = CSV_COLUMNS[h]; if (key) row[key] = (vals[j]||"").trim(); });
    if (!row.company) { errors.push(`${i+1}行目: 会社名が空のためスキップ`); continue; }
    row.id = uid(); row.actions = []; row.created_at = Date.now();
    row.charge_applied = row.charge_applied === "TRUE" || row.charge_applied === "true";
    if (!getStatuses().includes(row.status)) row.status = getStatuses()[0] || "新規";
    if (!MQL_OPTIONS.includes(row.mql)) row.mql = "非MQL";
    row.date = normalizeDate(row.date);
    row.next_action_date = normalizeDate(row.next_action_date);
    row.meeting_date = normalizeDate(row.meeting_date);
    leads.push(row);
  }
  return { leads, errors };
}

export function CSVImport({ onImport, onClose, result }) {
  const [preview, setPreview] = useState(null);
  const [errors,  setErrors]  = useState([]);
  const [dragging,setDragging]= useState(false);
  const [encoding,setEncoding]= useState("");

  const handleFile = (file) => {
    if (!file) return;
    const binReader = new FileReader();
    binReader.onload = e => {
      const buf = e.target.result;
      const bytes = new Uint8Array(buf);
      const isUTF8BOM = bytes[0]===0xEF && bytes[1]===0xBB && bytes[2]===0xBF;
      // SJIS判定: リードバイト（先行バイト）の次のバイトも SJIS トレイルバイト範囲か確認する
      // リードバイトのみで判定すると UTF-8 3バイト文字（E3〜E9）と誤判定する恐れがあるため
      let sjisScore = 0;
      for (let i = 0; i < Math.min(bytes.length - 1, 499); i++) {
        const b = bytes[i];
        const isLeadByte = (b >= 0x81 && b <= 0x9F) || (b >= 0xE0 && b <= 0xFC);
        if (isLeadByte) {
          const next = bytes[i + 1];
          // SJIS トレイルバイト: 0x40〜0x7E または 0x80〜0xFC（0x7F は除外）
          const isTrailByte = (next >= 0x40 && next <= 0x7E) || (next >= 0x80 && next <= 0xFC);
          if (isTrailByte) { sjisScore++; i++; } // トレイルバイトもスキップ
        }
      }
      const enc = isUTF8BOM ? "UTF-8" : sjisScore > 3 ? "Shift-JIS" : "UTF-8";
      const txtReader = new FileReader();
      txtReader.onload = ev => {
        const { leads, errors } = parseCSV(ev.target.result);
        setPreview(leads); setErrors(errors);
        setEncoding(enc);
      };
      txtReader.readAsText(file, enc);
    };
    binReader.readAsArrayBuffer(file);
  };

  return (
    <div style={S.importPanel}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:14,color:"#174f35"}}>📥 CSVインポート</div>
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <button onClick={() => {
            const header = ["会社名","担当者名","反響日","流入元","ポータルサイト名","ポータル種別","課金対象外申請済","ステータス","IS担当","MQL判定","商談日","商談時刻","担当営業","Zoho CRM URL","ネクストアクション日","ネクストアクション時刻","ネクストアクションメモ"].join(",");
            const example = ["株式会社サンプル","田中 太郎","2026-03-01","HP","","","FALSE","新規","新谷","","","","","","",""].join(",");
            const note = "# 流入元: HP / ポータルサイト / 電話  |  ステータス: 新規 / 架電済 / 日程調整中 / 商談確定 / 育成対象外 / ナーチャリング";
            const csv = "\uFEFF" + note + "\n" + header + "\n" + example;
            const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "is_import_template.csv"; a.click();
            URL.revokeObjectURL(url);
          }}
            style={{fontSize:11,padding:"5px 12px",borderRadius:7,border:"1px solid #10b98155", background:"#ecfdf5",color:"#059669",cursor:"pointer",fontFamily:"inherit",fontWeight:600, display:"flex",alignItems:"center", gap:4}}>
            ⬇️ テンプレDL
          </button>
          <button onClick={onClose} style={S.closeX}>✕</button>
        </div>
      </div>

      {!preview && !result && (
        <div
          onDragOver={e=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0]);}}
          style={{border:`2px dashed ${dragging?"#10b981":"#c0dece"}`,borderRadius:10, padding:"32px 20px", textAlign:"center",background: dragging?"#d1fae522":"transparent", cursor:"pointer", transition:"all 0.15s"}}
          onClick={()=>document.getElementById("csv-input").click()}>
          <div style={{fontSize:32,marginBottom:8}}>📂</div>
          <div style={{fontSize:14,color:"#2d6b4a"}}>CSVファイルをドロップ</div>
          <div style={{fontSize:12,color:"#3d7a5e", marginTop:4}}>またはクリックしてファイルを選択</div>
          <input id="csv-input" type="file" accept=".csv" style={{display:"none"}}
            onChange={e=>handleFile(e.target.files[0])} />
        </div>
      )}

      {encoding && (
        <div style={{fontSize:11,color: encoding==="Shift-JIS"?"#f59e0b":"#10b981", marginTop:6}}>
          {encoding==="Shift-JIS" ? "⚠️ Shift-JIS形式を自動変換しました" : "✅ UTF-8形式で読み込みました"}
        </div>
      )}

      {errors.length > 0 && (
        <div style={{marginTop:10,background:"#fef2f2",border:"1px solid #ef444433",borderRadius:7,padding:"10px 12px"}}>
          <div style={{fontSize:12,color:"#ef4444",fontWeight:700,marginBottom:4}}>⚠️ 警告（スキップされた行）</div>
          {errors.map((e,i)=><div key={i} style={{fontSize:12,color:"#f87171"}}>{e}</div>)}
        </div>
      )}

      {preview && !result && (
        <div style={{marginTop:12}}>
          <div style={{fontSize:13,color:"#2d6b4a",marginBottom:8}}>
            <strong style={{color:"#10b981"}}>{preview.length}件</strong> のリードを検出しました。内容を確認してインポートしてください。
          </div>
          <div style={{maxHeight:220, overflow:"auto",border:"1px solid #e2f0e8",borderRadius:8,marginBottom:12}}>
            <table style={{...S.table,fontSize:12}}>
              <thead><tr style={{background:"#ffffff", position:"sticky", top:0}}>
                {["会社名","担当者","反響日","流入元","ステータス","IS担当"].map(h=>
                  <th key={h} style={{...S.th,fontSize:11}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {preview.map((l,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #1e293b22"}}>
                    <td style={{...S.td,fontSize:12}}>{l.company}</td>
                    <td style={{...S.td,fontSize:12}}>{l.contact||"—"}</td>
                    <td style={{...S.td,fontSize:12}}>{l.date||"—"}</td>
                    <td style={{...S.td,fontSize:12}}>{l.source||"—"}</td>
                    <td style={{...S.td,fontSize:12}}>
                      <span style={{color:getStatusColor(l.status),fontWeight:600}}>{l.status}</span>
                    </td>
                    <td style={{...S.td,fontSize:12}}>{l.is_member||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
            <button onClick={()=>{setPreview(null);setErrors([]);}} style={S.btnSec}>やり直す</button>
            <button onClick={()=>onImport(preview)} style={S.btnP}>
              ✅ {preview.length}件をインポートする
            </button>
          </div>
        </div>
      )}

      {result && (
        <div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{fontSize:32,marginBottom:8}}>🎉</div>
          <div style={{fontSize:15,fontWeight:700,color:"#10b981"}}>{result.count}件のインポート完了！</div>
          <button onClick={onClose} style={{...S.btnSec, marginTop:12}}>閉じる</button>
        </div>
      )}
    </div>
  );
}
