// アウトバウンドリスト切替・インポート・削除・進捗サマリー
import { useState, useRef } from 'react';
import { S } from '../../styles/index.js';
import { InboxIcon, FolderOpenIcon, AlertIcon } from '../ui/Icons.jsx';
import { parseOutboundCSV, parseOutboundExcel } from '../../lib/outboundApi.js';

const STATUS_GROUPS = {
  未架電:  { color: '#6a9a7a', bg: '#f0f5f2' },
  アポ獲得: { color: '#059669', bg: '#d1fae5' },
  お断り:  { color: '#ef4444', bg: '#fef2f2' },
  対応中:  { color: '#f59e0b', bg: '#fef9ec' },
};

function getSummary(leads) {
  const counts = { 未架電: 0, アポ獲得: 0, お断り: 0, 対応中: 0 };
  for (const l of leads) {
    if (l.status === '未架電') counts['未架電']++;
    else if (l.status === 'アポ獲得') counts['アポ獲得']++;
    else if (l.status === 'お断り') counts['お断り']++;
    else counts['対応中']++;
  }
  return counts;
}

export function OutboundListHeader({ lists, currentListId, leads, currentUser, onSelectList, onCreateList, onDeleteList, filterStatus, onFilterStatus, searchQuery = '', onSearchChange }) {
  const isIS = currentUser?.role === 'admin' || currentUser?.role === 'member';
  const [showImport, setShowImport] = useState(false);
  const [listName, setListName] = useState('');
  const [preview, setPreview] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);
  const [encoding, setEncoding] = useState('');
  const [importing, setImporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef(null);

  const currentList = lists.find(l => l.id === currentListId);
  const summary = getSummary(leads);

  const handleFile = (file) => {
    if (!file) return;
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async e => {
        const { leads: parsed, errors } = await parseOutboundExcel(e.target.result);
        setPreview(parsed);
        setParseErrors(errors);
        setEncoding('Excel');
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // CSV: 文字コード判定してパース
    const binReader = new FileReader();
    binReader.onload = e => {
      const bytes = new Uint8Array(e.target.result);
      const isUTF8BOM = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
      let sjisScore = 0;
      for (let i = 0; i < Math.min(bytes.length - 1, 499); i++) {
        const b = bytes[i];
        const isLead = (b >= 0x81 && b <= 0x9F) || (b >= 0xE0 && b <= 0xFC);
        if (isLead) {
          const next = bytes[i + 1];
          const isTrail = (next >= 0x40 && next <= 0x7E) || (next >= 0x80 && next <= 0xFC);
          if (isTrail) { sjisScore++; i++; }
        }
      }
      const enc = isUTF8BOM ? 'UTF-8' : sjisScore > 3 ? 'Shift-JIS' : 'UTF-8';
      setEncoding(enc);
      const txtReader = new FileReader();
      txtReader.onload = ev => {
        const { leads: parsed, errors } = parseOutboundCSV(ev.target.result);
        setPreview(parsed);
        setParseErrors(errors);
      };
      txtReader.readAsText(file, enc);
    };
    binReader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!listName.trim()) { alert('リスト名を入力してください'); return; }
    if (!preview?.length) return;
    setImporting(true);
    try {
      await onCreateList(listName.trim(), preview);
      setShowImport(false);
      setListName('');
      setPreview(null);
      setParseErrors([]);
    } catch (e) {
      alert(e.message);
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentListId) return;
    try {
      await onDeleteList(currentListId);
      setConfirmDelete(false);
    } catch (e) {
      alert(e.message);
    }
  };

  const downloadTemplate = () => {
    const header = '会社名,担当者名,電話番号,携帯番号,メールアドレス,業種,役職,住所,メモ';
    const example = '株式会社サンプル,田中 太郎,03-XXXX-XXXX,090-XXXX-XXXX,tanaka@example.com,IT・通信,部長,大阪府大阪市〇〇区,';
    const csv = '﻿# 1行目がヘッダー行です（変更しないでください）\n' + header + '\n' + example;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'outbound_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {/* リスト切替バー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <select
          value={currentListId || ''}
          onChange={e => onSelectList(e.target.value)}
          style={{ ...S.sel, width: 500, fontWeight: 700 }}
        >
          {lists.map(l => (
            <option key={l.id} value={l.id}>{l.name}（{l.leadCount}件）</option>
          ))}
        </select>

        {isIS && (
          <>
            <button onClick={() => setShowImport(true)}
              style={{ ...S.btnP, fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <InboxIcon size={13} color="#fff" /> インポート
            </button>
            {currentListId && !confirmDelete && (
              <button onClick={() => setConfirmDelete(true)} style={{ ...S.btnDel, fontSize: 12, padding: '7px 14px' }}>
                リスト削除
              </button>
            )}
            {confirmDelete && (
              <div style={S.confirmRow}>
                <span style={{ fontSize: 12, color: '#ef4444' }}>「{currentList?.name}」を削除しますか？</span>
                <button onClick={handleDelete} style={S.btnDelXs}>削除</button>
                <button onClick={() => setConfirmDelete(false)} style={S.btnCancelXs}>キャンセル</button>
              </div>
            )}
          </>
        )}
        {currentListId && onSearchChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="会社名・氏名で検索..."
              style={{ border: '1px solid #c0dece', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontFamily: 'inherit', color: '#174f35', background: '#fff', outline: 'none', width: 220 }}
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')} style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>✕</button>
            )}
          </div>
        )}
      </div>

      {/* 進捗サマリー */}
      {currentListId && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {Object.entries(summary).map(([label, count]) => {
            const active = filterStatus === label;
            return (
              <div
                key={label}
                onClick={() => onFilterStatus?.(label)}
                style={{
                  background: STATUS_GROUPS[label]?.bg,
                  border: active ? `2px solid ${STATUS_GROUPS[label]?.color}` : `1px solid ${STATUS_GROUPS[label]?.color}44`,
                  borderRadius: 8,
                  padding: active ? '4px 11px' : '5px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                  userSelect: 'none',
                  boxShadow: active ? `0 0 0 2px ${STATUS_GROUPS[label]?.color}22` : 'none',
                  transition: 'border 0.1s, box-shadow 0.1s',
                }}
              >
                <span style={{ color: STATUS_GROUPS[label]?.color, fontWeight: 700 }}>{label}</span>
                <span style={{ color: '#2d6b4a', marginLeft: 6, fontWeight: 700 }}>{count}件</span>
              </div>
            );
          })}
          <div
            onClick={() => onFilterStatus?.(null)}
            style={{
              background: '#f8fbf9',
              border: !filterStatus ? '2px solid #059669' : '1px solid #c0dece',
              borderRadius: 8,
              padding: !filterStatus ? '4px 11px' : '5px 12px',
              fontSize: 12,
              color: '#6a9a7a',
              cursor: 'pointer',
              userSelect: 'none',
              boxShadow: !filterStatus ? '0 0 0 2px #05966922' : 'none',
              transition: 'border 0.1s, box-shadow 0.1s',
            }}
          >
            合計 <span style={{ fontWeight: 700, color: '#174f35' }}>{leads.length}件</span>
          </div>
        </div>
      )}

      {/* インポートパネル */}
      {showImport && (
        <div style={{ ...S.overlay }}>
          <div style={{ ...S.modal, maxWidth: 540 }}>
            <div style={S.modalHead}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#174f35', display: 'flex', alignItems: 'center', gap: 6 }}>
                <InboxIcon size={15} color="#174f35" /> 架電リストをインポート
              </span>
              <button onClick={() => { setShowImport(false); setPreview(null); setListName(''); }} style={S.closeX}>✕</button>
            </div>
            <div style={S.modalBody}>
              <div style={{ marginBottom: 14 }}>
                <label style={S.lbl}>リスト名（必須）</label>
                <input value={listName} onChange={e => setListName(e.target.value)} placeholder="例: 5月Aリスト" style={S.inp} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <button onClick={downloadTemplate} style={{ ...S.btnSec, fontSize: 11, padding: '5px 12px' }}>
                  テンプレートDL
                </button>
              </div>

              {!preview && (
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                  onClick={() => fileRef.current?.click()}
                  style={{ border: '2px dashed #c0dece', borderRadius: 10, padding: '28px', textAlign: 'center', cursor: 'pointer' }}>
                  <FolderOpenIcon size={32} color="#6a9a7a" />
                  <div style={{ fontSize: 13, color: '#2d6b4a', marginTop: 8 }}>CSV / Excel をドロップ、またはクリックして選択</div>
                  <div style={{ fontSize: 11, color: '#6a9a7a', marginTop: 4 }}>列: 会社名, 担当者名, 電話番号, 携帯番号, メール, 業種, 役職, メモ</div>
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                </div>
              )}

              {encoding && (
                <div style={{ fontSize: 11, color: encoding === 'Shift-JIS' ? '#f59e0b' : '#10b981', marginTop: 6 }}>
                  {encoding === 'Shift-JIS' ? '⚠ Shift-JIS形式を自動変換しました' : '✓ UTF-8で読み込みました'}
                </div>
              )}

              {parseErrors.length > 0 && (
                <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #ef444433', borderRadius: 7, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertIcon size={12} color="#ef4444" /> 警告（スキップされた行）
                  </div>
                  {parseErrors.map((e, i) => <div key={i} style={{ fontSize: 11, color: '#f87171' }}>{e}</div>)}
                </div>
              )}

              {preview && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, color: '#2d6b4a', marginBottom: 8 }}>
                    <strong style={{ color: '#10b981' }}>{preview.length}件</strong> を検出しました
                  </div>
                  <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #e2f0e8', borderRadius: 8 }}>
                    <table style={{ ...S.table, fontSize: 12 }}>
                      <thead>
                        <tr>
                          {['会社名', '担当者', '役職', '電話番号', '携帯番号', '業種', '住所'].map(h =>
                            <th key={h} style={{ ...S.th, fontSize: 11 }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 20).map((l, i) => (
                          <tr key={i}>
                            <td style={S.td}>{l.company}</td>
                            <td style={S.td}>{l.contact  || '—'}</td>
                            <td style={S.td}>{l.position || '—'}</td>
                            <td style={S.td}>{l.phone    || '—'}</td>
                            <td style={S.td}>{l.mobile   || '—'}</td>
                            <td style={S.td}>{l.industry || '—'}</td>
                            <td style={S.td}>{l.address  || '—'}</td>
                          </tr>
                        ))}
                        {preview.length > 20 && (
                          <tr><td colSpan={4} style={{ ...S.td, color: '#6a9a7a', fontSize: 11 }}>他 {preview.length - 20}件...</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setPreview(null); setParseErrors([]); setEncoding(''); }} style={S.btnSec}>やり直す</button>
                  </div>
                </div>
              )}
            </div>
            <div style={S.modalFoot}>
              <button onClick={() => { setShowImport(false); setPreview(null); setListName(''); }} style={S.btnSec}>キャンセル</button>
              <button onClick={handleImport} disabled={!preview?.length || importing || !listName.trim()} style={{ ...S.btnP, opacity: (!preview?.length || importing || !listName.trim()) ? 0.5 : 1 }}>
                {importing ? '処理中...' : `${preview?.length || 0}件をインポート`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
