// インバウンドアポ一覧（status==='商談確定'のリードを表形式で表示）
import { useState, useMemo } from 'react';
import { S } from '../../styles/index.js';
import { IS_COLORS, getSourceIcon, getSourceColor } from '../../lib/master.js';
import { SourceIconSVG } from '../ui/SourceIconSVG.jsx';
import { ACCURACY_COLORS, extractAccuracyRank, categorizeStage, STAGE_CATEGORIES } from '../../lib/salesAnalytics.js';

// 親コンポーネント（LeadsPage）から status==='商談確定' に絞り込み済みの leads を受け取る
export function InboundAppointmentList({ leads: apoLeads, openId, setOpenId, isMobile }) {
  // フィルター状態
  const [fIS, setFIS]         = useState('');
  const [fSource, setFSource] = useState('');
  const [fRank, setFRank]     = useState('');
  const [fMonth, setFMonth]   = useState('');
  const [fQ, setFQ]           = useState('');
  const [sortDir, setSortDir] = useState('desc'); // 商談日：新しい順

  // フィルター + ソート適用
  const filtered = useMemo(() => {
    return apoLeads
      .filter(l => !fIS     || l.is_member === fIS)
      .filter(l => !fSource || l.source === fSource)
      .filter(l => !fRank   || extractAccuracyRank(l.is_accuracy) === fRank)
      .filter(l => !fMonth  || (l.meeting_date || '').slice(0, 7) === fMonth)
      .filter(l => !fQ      || (l.company || '').includes(fQ) || (l.contact || '').includes(fQ))
      .sort((a, b) => {
        const av = a.meeting_date || '9999';
        const bv = b.meeting_date || '9999';
        return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
      });
  }, [apoLeads, fIS, fSource, fRank, fMonth, fQ, sortDir]);

  // 集計（ランク別件数）
  const stats = useMemo(() => {
    const rankCount = { A: 0, B: 0, C: 0, D: 0, unset: 0 };
    filtered.forEach(l => {
      const r = extractAccuracyRank(l.is_accuracy);
      if (r) rankCount[r]++;
      else rankCount.unset++;
    });
    return { total: filtered.length, ranks: rankCount };
  }, [filtered]);

  // 選択肢の動的生成
  const monthOptions = useMemo(() => {
    const set = new Set(apoLeads.map(l => (l.meeting_date || '').slice(0, 7)).filter(Boolean));
    return [...set].sort().reverse();
  }, [apoLeads]);
  const isMembers = useMemo(
    () => [...new Set(apoLeads.map(l => l.is_member).filter(Boolean))],
    [apoLeads],
  );
  const sources = useMemo(
    () => [...new Set(apoLeads.map(l => l.source).filter(Boolean))],
    [apoLeads],
  );

  // モバイルかどうかで列構成を変える
  // デスクトップ：会社名 / 流入元 / IS担当 / 営業担当 / 商談日 / IS確度 / 営業確度 / ステージ
  // モバイル：    会社名 /              商談日 / IS確度 / 営業確度 / ステージ（流入元・担当者は省略）
  const gridCols = isMobile
    ? '1.7fr 0.9fr 0.5fr 0.5fr 0.9fr'
    : '2.2fr 0.9fr 0.9fr 0.9fr 1.1fr 0.7fr 0.7fr 1.1fr';

  return (
    <div style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* サマリーバー：合計＋ランク別件数 */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, background: '#fff', border: '1px solid #e2f0e8', borderRadius: 10, padding: '10px 16px', boxShadow: '0 1px 6px #0569690a' }}>
          <span style={{ fontSize: 12, color: '#6a9a7a', fontWeight: 700 }}>アポ件数</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: '#059669', lineHeight: 1 }}>{stats.total}</span>
          <span style={{ fontSize: 12, color: '#6a9a7a' }}>件</span>
        </div>
        {['A', 'B', 'C', 'D'].map(r => (
          <div key={r} style={{ display: 'flex', alignItems: 'baseline', gap: 6, background: '#fff', border: `1.5px solid ${ACCURACY_COLORS[r]}44`, borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 6px #0569690a' }}>
            <span style={{ fontSize: 13, color: ACCURACY_COLORS[r], fontWeight: 800 }}>{r}</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: ACCURACY_COLORS[r], lineHeight: 1 }}>{stats.ranks[r]}</span>
            <span style={{ fontSize: 11, color: ACCURACY_COLORS[r] + 'aa' }}>件</span>
          </div>
        ))}
        {stats.ranks.unset > 0 && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, background: '#fff', border: '1.5px solid #d1d5db', borderRadius: 10, padding: '10px 14px' }}>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 800 }}>未設定</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#6b7280' }}>{stats.ranks.unset}</span>
            <span style={{ fontSize: 11, color: '#6b7280aa' }}>件</span>
          </div>
        )}
      </div>

      {/* フィルターバー */}
      <div className="filter-bar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={fQ}
          onChange={e => setFQ(e.target.value)}
          placeholder="🔍 会社名・氏名で検索"
          style={{ ...S.inp, width: 220, flex: 'none' }}
        />
        <select value={fMonth} onChange={e => setFMonth(e.target.value)} style={S.sel}>
          <option value="">商談月：すべて</option>
          {monthOptions.map(m => (
            <option key={m} value={m}>{m.slice(0, 4)}年{parseInt(m.slice(5))}月</option>
          ))}
        </select>
        <select value={fIS} onChange={e => setFIS(e.target.value)} style={S.sel}>
          <option value="">IS担当：すべて</option>
          {isMembers.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={fSource} onChange={e => setFSource(e.target.value)} style={S.sel}>
          <option value="">流入元：すべて</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fRank} onChange={e => setFRank(e.target.value)} style={S.sel}>
          <option value="">IS確度：すべて</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>

      {/* テーブル */}
      <div style={{ background: '#fff', border: '1px solid #e2f0e8', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px #0569690a' }}>
        {/* ヘッダー行 */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 0, fontSize: 11, color: '#6a9a7a', fontWeight: 700, background: '#f8fbf9', padding: '10px 16px', borderBottom: '1px solid #e2f0e8' }}>
          <span>会社名 / 担当者</span>
          {!isMobile && <span>流入元</span>}
          {!isMobile && <span>IS担当</span>}
          {!isMobile && <span>営業担当</span>}
          <span
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            title="商談日でソート"
          >
            商談日 {sortDir === 'asc' ? '↑' : '↓'}
          </span>
          <span style={{ textAlign: 'center' }}>IS確度</span>
          <span style={{ textAlign: 'center' }}>営業確度</span>
          <span style={{ textAlign: 'center' }}>ステージ</span>
        </div>

        {/* データ行 */}
        {filtered.length === 0 ? (
          <div style={{ ...S.empty, padding: 32 }}>該当するアポはありません</div>
        ) : (
          filtered.map(lead => {
            const isOpen = openId === lead.id;
            const rank = extractAccuracyRank(lead.is_accuracy);
            const rankColor = rank ? ACCURACY_COLORS[rank] : '#9ca3af';
            const srcColor = getSourceColor(lead.source, 0);
            const isColor = IS_COLORS[lead.is_member]?.bg || '#3d7a5e';
            const iconKey = getSourceIcon(lead.source) || 'document';
            return (
              <div
                key={lead.id}
                onClick={() => setOpenId(id => id === lead.id ? null : lead.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  gap: 0,
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f5f2',
                  cursor: 'pointer',
                  background: isOpen ? '#f0faf5' : 'transparent',
                  transition: 'background 0.15s',
                  fontSize: 13,
                }}
                onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = '#f8fbf9'; }}
                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* 会社名 / 担当者 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <SourceIconSVG iconKey={iconKey} size={22} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#174f35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.company || '（会社名未設定）'}
                    </div>
                    <div style={{ fontSize: 11, color: '#6a9a7a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.contact || '—'}
                    </div>
                  </div>
                </div>

                {/* 流入元 */}
                {!isMobile && (
                  <span style={{ fontSize: 12, color: srcColor, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lead.source || '—'}
                  </span>
                )}

                {/* IS担当 */}
                {!isMobile && (
                  <span>
                    {lead.is_member ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: isColor, background: isColor + '12', border: `1px solid ${isColor}33`, borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                        {lead.is_member}
                      </span>
                    ) : <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>}
                  </span>
                )}

                {/* 営業担当 */}
                {!isMobile && (
                  <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lead.sales_member || '—'}
                  </span>
                )}

                {/* 商談日 */}
                <span style={{ fontSize: 12, color: '#059669', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {lead.meeting_date || '—'}
                  {lead.meeting_time && <span style={{ marginLeft: 4, color: '#6a9a7a', fontWeight: 400 }}>{lead.meeting_time}</span>}
                </span>

                {/* IS確度 */}
                <span style={{ textAlign: 'center' }}>
                  {rank ? (
                    <span style={{ fontSize: 11, fontWeight: 800, color: rankColor, background: rankColor + '15', border: `1px solid ${rankColor}44`, borderRadius: 6, padding: '3px 10px' }}>
                      {rank}
                    </span>
                  ) : <span style={{ color: '#9ca3af', fontSize: 11 }}>未設定</span>}
                </span>

                {/* 営業確度（Zoho連携で取得した sales_accuracy。未取得は「—」） */}
                {(() => {
                  const salesRank = extractAccuracyRank(lead.sales_accuracy);
                  if (!salesRank) return <span style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>—</span>;
                  const c = ACCURACY_COLORS[salesRank] || '#6b7280';
                  return (
                    <span style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: c, background: c + '15', border: `1px solid ${c}44`, borderRadius: 6, padding: '3px 10px' }}>
                        {salesRank}
                      </span>
                    </span>
                  );
                })()}

                {/* ステージ（Zoho連携で取得した deal_stage。未取得は「—」） */}
                {(() => {
                  const catKey = categorizeStage(lead.deal_stage);
                  if (!catKey) return <span style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>—</span>;
                  const cat = STAGE_CATEGORIES[catKey];
                  return (
                    <span style={{ textAlign: 'center', overflow: 'hidden' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: cat.color,
                        background: cat.color + '15',
                        border: `1px solid ${cat.color}44`,
                        borderRadius: 6,
                        padding: '2px 8px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                        display: 'inline-block',
                      }} title={lead.deal_stage}>
                        {lead.deal_stage}
                      </span>
                    </span>
                  );
                })()}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
