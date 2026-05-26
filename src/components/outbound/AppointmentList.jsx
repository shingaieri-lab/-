// アポ獲得一覧（全リストのアポ獲得リードをまとめて表示）
import { useState, useEffect, useCallback } from 'react';
import { fetchOutboundLists, fetchOutboundLeads, saveOutboundLeads } from '../../lib/outboundApi.js';
import { Pagination } from '../ui/Pagination.jsx';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const DEAL_STATUSES    = ['商談確定', '追客中', '契約', '保留/失注', '商談キャンセル'];
const APPOINT_TYPES    = ['決裁者アポ', '担当者アポ', '対象外'];
const APPOINT_PRICE_MAP = { '決裁者アポ': '35,000円', '担当者アポ': '20,000円', '対象外': '0円' };

const DEAL_STATUS_STYLE = {
  '商談確定':     { color: '#059669', bg: '#d1fae5', border: '#10b98155' },
  '追客中':       { color: '#f59e0b', bg: '#fef9ec', border: '#f59e0b55' },
  '契約':         { color: '#0284c7', bg: '#e0f2fe', border: '#0284c755' },
  '保留/失注':    { color: '#ef4444', bg: '#fef2f2', border: '#ef444455' },
  '商談キャンセル': { color: '#6b7280', bg: '#f3f4f6', border: '#6b728055' },
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const weekday = WEEKDAYS[new Date(dateStr + 'T00:00:00').getDay()];
  return `${dateStr}（${weekday}）`;
}

// 今月を YYYY-MM 形式で返す（JST基準）
function currentYearMonth() {
  return new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' }).slice(0, 7);
}

// CSV用フィールドエスケープ（カンマ・改行・ダブルクォートを含む場合はダブルクォートで囲む）
function csvField(v) {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replaceAll('"', '""')}"` : s;
}

function exportToCSV(rows, filterMonth) {
  const headers = ['会社名', '役職', '担当者名', '商談担当', 'ランク', '商談ステータス',
    'アポ獲得日', '商談開始日', '商談開始時刻', '前確認', '案内メール送信済み',
    'アポ種別', 'アポ単価', 'リスト名'];

  const dataRows = rows.map(({ lead, listName }) => {
    const ai = lead.appointmentInfo || {};
    return [
      lead.company,
      lead.position,
      lead.contact,
      ai.salesPerson,
      ai.rank,
      ai.dealStatus || '商談確定',
      ai.confirmedDate,
      ai.meetingDate,
      ai.meetingTime,
      ai.preConfirm ? '済' : '',
      ai.gmailDraftedAt ? '済' : '',
      ai.appointType,
      ai.appointPrice,
      listName,
    ].map(csvField).join(',');
  });

  const csv = '﻿' + [headers.join(','), ...dataRows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const label = filterMonth ? filterMonth.replace('-', '年') + '月' : '全期間';
  a.href = url;
  a.download = `アポ一覧_${label}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AppointmentList({ currentUser }) {
  const [rows,        setRows]        = useState([]); // { lead, listId, listName, leadsCache }
  const [loading,     setLoading]     = useState(true);
  const [filterMonth, setFilterMonth] = useState(''); // '' = すべて
  const [page,        setPage]        = useState(1);
  const [pageSize,    setPageSize]    = useState(30);

  const isIS       = currentUser?.role === 'admin' || currentUser?.role === 'member';
  const isOutbound = currentUser?.role === 'outbound';

  // 全リストのアポ獲得リードをロード
  useEffect(() => {
    (async () => {
      try {
        const lists = await fetchOutboundLists();
        const all = [];
        await Promise.all(lists.map(async list => {
          const leads = await fetchOutboundLeads(list.id);
          leads
            .filter(l => l.status === 'アポ獲得')
            .forEach(lead => all.push({ lead, listId: list.id, listName: list.name, leads }));
        }));
        // アポ獲得日の新しい順にソート
        all.sort((a, b) => {
          const da = a.lead.appointmentInfo?.confirmedDate || '';
          const db = b.lead.appointmentInfo?.confirmedDate || '';
          return db.localeCompare(da);
        });
        setRows(all);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // リード更新（楽観的更新 + 保存）
  const handleUpdate = useCallback(async (listId, updatedLead, allLeads) => {
    const newLeads = allLeads.map(l => l.id === updatedLead.id ? updatedLead : l);
    // ローカル状態を更新
    setRows(prev => prev.map(r =>
      r.listId === listId && r.lead.id === updatedLead.id
        ? { ...r, lead: updatedLead, leads: newLeads }
        : r.listId === listId
          ? { ...r, leads: newLeads }
          : r
    ));
    await saveOutboundLeads(listId, newLeads);
  }, []);

  if (loading) return <div style={{ fontSize: 13, color: '#6a9a7a', padding: '40px 0', textAlign: 'center' }}>読み込み中...</div>;
  if (rows.length === 0) return <div style={{ fontSize: 13, color: '#6a9a7a', padding: '40px 0', textAlign: 'center' }}>アポ獲得のデータがありません。</div>;

  // 商談開始日のある月一覧（降順）をデータから生成
  const months = [...new Set(
    rows
      .map(r => r.lead.appointmentInfo?.meetingDate?.slice(0, 7))
      .filter(Boolean)
  )].sort((a, b) => b.localeCompare(a));

  // 絞り込み・ページネーション計算
  const filtered    = filterMonth
    ? rows.filter(r => (r.lead.appointmentInfo?.meetingDate || '').startsWith(filterMonth))
    : rows;
  const totalPages  = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage    = Math.min(page, totalPages);
  const pagedRows   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const paginationBar = filtered.length > 0 && (
    <Pagination
      page={safePage}
      totalPages={totalPages}
      total={filtered.length}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={n => { setPageSize(n); setPage(1); }}
    />
  );

  return (
    <div>
      {/* 月絞り込みバー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#6a9a7a', whiteSpace: 'nowrap' }}>商談開始月：</span>
        <select
          value={filterMonth}
          onChange={e => { setFilterMonth(e.target.value); setPage(1); }}
          style={{ border: '1px solid #c0dece', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontFamily: 'inherit', color: '#174f35', background: '#fff', cursor: 'pointer', outline: 'none' }}
        >
          <option value="">すべて</option>
          {months.map(m => (
            <option key={m} value={m}>{m.replace('-', '年')}月</option>
          ))}
        </select>
        <button
          onClick={() => exportToCSV(filtered, filterMonth)}
          disabled={filtered.length === 0}
          style={{ background: '#f0f5f2', color: '#3d7a5e', border: '1px solid #c0dece', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: filtered.length === 0 ? 0.5 : 1, whiteSpace: 'nowrap' }}
        >
          ⬇ CSV書き出し
        </button>
      </div>

      <div style={{ fontSize: 12, color: '#6a9a7a', marginBottom: 12 }}>
        {filterMonth ? `${filterMonth.replace('-', '年')}月の商談` : '全期間'}
        <span style={{ fontWeight: 700, color: '#174f35', marginLeft: 4 }}>{filtered.length}件</span>
        {filterMonth && rows.length !== filtered.length && (
          <span style={{ marginLeft: 6, color: '#9ca3af' }}>（全{rows.length}件中）</span>
        )}
      </div>

      {/* ページネーション（上） */}
      {paginationBar}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f0f5f2', borderBottom: '2px solid #c0dece' }}>
              {[
                { label: '会社名' }, { label: '役職 / 名前' }, { label: '商談担当' }, { label: 'ランク' },
                { label: 'ステータス' }, { label: 'アポ獲得日' }, { label: '商談開始日' },
                { label: '前確認', center: true }, { label: '案内メール', center: true },
                { label: 'アポ種別' }, { label: 'アポ単価' }, { label: 'リスト' },
              ].map(({ label, center }) => (
                <th key={label} style={{ padding: '9px 12px', textAlign: center ? 'center' : 'left', fontSize: 11, fontWeight: 700, color: '#3d7a5e', whiteSpace: 'nowrap' }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map(({ lead, listId, listName, leads }) => {
              const ai = lead.appointmentInfo || {};
              const ds = ai.dealStatus || '商談確定';
              const dsStyle = DEAL_STATUS_STYLE[ds] || DEAL_STATUS_STYLE['商談確定'];

              return (
                <tr key={lead.id} style={{ borderBottom: '1px solid #e2f0e8' }}>

                  {/* 会社名 */}
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#174f35', minWidth: 140 }}>
                    {lead.company}
                  </td>

                  {/* 役職 / 名前 */}
                  <td style={{ padding: '10px 12px', color: '#3d7a5e', whiteSpace: 'nowrap' }}>
                    {[lead.position, lead.contact].filter(Boolean).join(' / ') || '—'}
                  </td>

                  {/* 商談担当 */}
                  <td style={{ padding: '10px 12px', color: '#3d7a5e', whiteSpace: 'nowrap' }}>
                    {ai.salesPerson || '—'}
                  </td>

                  {/* ランク */}
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {ai.rank
                      ? <span style={{ fontWeight: 800, color: '#174f35', fontSize: 14 }}>{ai.rank}</span>
                      : <span style={{ color: '#c0dece' }}>—</span>}
                  </td>

                  {/* 商談ステータス（ISのみ編集） */}
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    {isIS ? (
                      <select
                        value={ds}
                        onChange={e => handleUpdate(listId, {
                          ...lead,
                          appointmentInfo: { ...ai, dealStatus: e.target.value },
                        }, leads)}
                        style={{ background: dsStyle.bg, color: dsStyle.color, border: `1px solid ${dsStyle.border}`, borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
                      >
                        {DEAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span style={{ background: dsStyle.bg, color: dsStyle.color, border: `1px solid ${dsStyle.border}`, borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 700 }}>
                        {ds}
                      </span>
                    )}
                  </td>

                  {/* アポ獲得日 */}
                  <td style={{ padding: '10px 8px', color: '#3d7a5e', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {formatDate(ai.confirmedDate)}
                  </td>

                  {/* 商談開始日 */}
                  <td style={{ padding: '10px 8px', color: '#3d7a5e', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {ai.meetingDate ? `${formatDate(ai.meetingDate)}${ai.meetingTime ? ' ' + ai.meetingTime : ''}` : '—'}
                  </td>

                  {/* 前確認（業務委託のみ編集） */}
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {isOutbound ? (
                        <input
                          type="checkbox"
                          checked={!!ai.preConfirm}
                          onChange={e => handleUpdate(listId, {
                            ...lead,
                            appointmentInfo: { ...ai, preConfirm: e.target.checked },
                          }, leads)}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#059669' }}
                        />
                      ) : (
                        <span style={{ fontSize: 16, color: ai.preConfirm ? '#059669' : '#d1d5db' }}>
                          {ai.preConfirm ? '✓' : '—'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 案内メール（Gmail下書き済みなら✓） */}
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span style={{ fontSize: 16, color: ai.gmailDraftedAt ? '#059669' : '#d1d5db' }} title={ai.gmailDraftedAt ? `${ai.gmailDraftedAt.slice(0, 10)} 送信済み` : '未送信'}>
                        {ai.gmailDraftedAt ? '✓' : '—'}
                      </span>
                    </div>
                  </td>

                  {/* アポ種別（ISのみ編集）→ 変更時にアポ単価を自動セット */}
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    {isIS ? (
                      <select
                        value={ai.appointType || ''}
                        onChange={e => {
                          const newType = e.target.value;
                          handleUpdate(listId, {
                            ...lead,
                            appointmentInfo: {
                              ...ai,
                              appointType:  newType,
                              appointPrice: APPOINT_PRICE_MAP[newType] || '',
                            },
                          }, leads);
                        }}
                        style={{ border: '1px solid #c0dece', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', background: '#fff', color: '#174f35' }}
                      >
                        <option value="">—</option>
                        {APPOINT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 12, color: '#3d7a5e' }}>{ai.appointType || '—'}</span>
                    )}
                  </td>

                  {/* アポ単価（アポ種別から自動算出・編集不可） */}
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: 12, color: '#3d7a5e', fontWeight: 600 }}>
                    {APPOINT_PRICE_MAP[ai.appointType] || '—'}
                  </td>

                  {/* リスト名 */}
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#6a9a7a', minWidth: 200 }}>
                    {listName}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ページネーション（下） */}
      {paginationBar}
    </div>
  );
}
