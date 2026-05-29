// ダッシュボード用「受注・失注集計」パネル
// Zoho の Deal ステージを4分類（受注・失注・保留・商談中）に集計して表示。
import { useMemo } from 'react';
import { STAGE_CATEGORIES, aggregateStages } from '../../lib/salesAnalytics.js';
import { DASHBOARD_CARD } from './cardStyle.js';

const card = { ...DASHBOARD_CARD, display: 'flex', flexDirection: 'column' };

// 表示順（受注を最初に）
const DISPLAY_ORDER = ['won', 'inProgress', 'onHold', 'lost'];

export function DealStagePanel({ filteredLeads }) {
  const stats = useMemo(() => {
    const apos = filteredLeads.filter(l => l.status === '商談確定');
    const agg = aggregateStages(apos);
    const totalWithStage = agg.won.count + agg.inProgress.count + agg.onHold.count + agg.lost.count;
    const wonRate = totalWithStage > 0
      ? Math.round(agg.won.count / totalWithStage * 100)
      : 0;
    return { apos, agg, totalWithStage, wonRate, totalApos: apos.length };
  }, [filteredLeads]);

  const items = DISPLAY_ORDER.map(key => ({
    key,
    label: STAGE_CATEGORIES[key].label,
    color: STAGE_CATEGORIES[key].color,
    count: stats.agg[key].count,
  }));

  return (
    <div style={card}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 4, height: 16, background: '#10b981', borderRadius: 2 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#174f35' }}>受注・失注集計</span>
        </div>
        <span style={{ fontSize: 12, color: '#6a9a7a' }}>
          受注率 <strong style={{ fontSize: 18, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{stats.wonRate}</strong>%
        </span>
      </div>

      {stats.totalApos === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>
          この月のアポはまだありません
        </div>
      ) : stats.totalWithStage === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12, gap: 4 }}>
          <span>ステージ情報がまだありません</span>
          <span style={{ fontSize: 11 }}>Zoho同期後に表示されます</span>
        </div>
      ) : (
        <>
          {/* 4つの分類カード */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
            {items.map(({ key, label, color, count }) => {
              const pct = stats.totalWithStage > 0 ? Math.round(count / stats.totalWithStage * 100) : 0;
              return (
                <div key={key} style={{
                  background: color + '0d',
                  border: `1px solid ${color}33`,
                  borderRadius: 8,
                  padding: '8px 6px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color, lineHeight: 1, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {count}
                  </div>
                  <div style={{ fontSize: 10, color: color + 'aa', marginTop: 3 }}>
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* 積み上げ棒グラフ（割合を視覚化） */}
          <div style={{ display: 'flex', width: '100%', height: 14, borderRadius: 7, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
            {items.map(({ key, color, count }) => {
              if (count === 0) return null;
              const pct = count / stats.totalWithStage * 100;
              return (
                <div key={key} style={{
                  width: pct + '%',
                  background: color,
                  transition: 'width 0.4s',
                }} title={`${STAGE_CATEGORIES[key].label}: ${count}件`} />
              );
            })}
          </div>

          {/* 集計件数 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#9ab8a4' }}>
            <span>集計対象 {stats.totalWithStage} / アポ {stats.totalApos} 件</span>
            {stats.agg.unset.count > 0 && (
              <span>未同期 {stats.agg.unset.count}件</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
