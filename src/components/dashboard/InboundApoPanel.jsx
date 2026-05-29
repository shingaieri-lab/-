// ダッシュボード用「インバウンドアポ実績」パネル（コンパクト版）
// 中段の1列に収まる縦長レイアウト。
//   ① ヘッダー（タイトル + 合計件数）
//   ② IS確度ランク別ミニカード（A/B/C/D を横並び）
//   ③ 流入元別ランク分布（小さい表）
import { useMemo } from 'react';
import { extractAccuracyRank, ACCURACY_COLORS } from '../../lib/salesAnalytics.js';
import { getSources, getSourceColor, getSourceIcon } from '../../lib/master.js';
import { SourceIconSVG } from '../ui/SourceIconSVG.jsx';
import { DASHBOARD_CARD } from './cardStyle.js';

// 共通カードスタイルに「縦に積む」設定を加える
const card = { ...DASHBOARD_CARD, display: 'flex', flexDirection: 'column' };

const RANK_ITEMS = [
  { rank: 'A', color: ACCURACY_COLORS.A },
  { rank: 'B', color: ACCURACY_COLORS.B },
  { rank: 'C', color: ACCURACY_COLORS.C },
  { rank: 'D', color: ACCURACY_COLORS.D },
];

export function InboundApoPanel({ filteredLeads }) {
  const apos = useMemo(
    () => filteredLeads.filter(l => l.status === '商談確定'),
    [filteredLeads],
  );

  const rankData = useMemo(() => RANK_ITEMS.map(({ rank, color }) => ({
    rank, color,
    count: apos.filter(l => extractAccuracyRank(l.is_accuracy) === rank).length,
  })), [apos]);

  const unsetCount = apos.filter(l => !extractAccuracyRank(l.is_accuracy)).length;

  // 流入元別（アポがある流入元のみ・件数順）
  const sourceData = useMemo(() => {
    return getSources()
      .map((src, idx) => {
        const sl = apos.filter(l => l.source === src);
        if (sl.length === 0) return null;
        return {
          src,
          color: getSourceColor(src, idx),
          icon: getSourceIcon(src) || 'document',
          total: sl.length,
          ranks: RANK_ITEMS.map(({ rank }) => sl.filter(l => extractAccuracyRank(l.is_accuracy) === rank).length),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.total - a.total);
  }, [apos]);

  const total = apos.length;

  return (
    <div style={card}>
      {/* ヘッダー：縦バー + アイコン + タイトル */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 4, height: 16, background: '#10b981', borderRadius: 2 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#174f35' }}>インバウンドアポ実績</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#10b981', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{total}</span>
          <span style={{ fontSize: 11, color: '#6a9a7a' }}>件</span>
        </div>
      </div>

      {total === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
          この月のアポはまだありません
        </div>
      ) : (
        <>
          {/* ランク別ミニカード（4等分・横並び） */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
            {rankData.map(({ rank, color, count }) => (
              <div key={rank} style={{
                background: color + '0d',
                border: `1px solid ${color}33`,
                borderRadius: 8,
                padding: '6px 4px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color, lineHeight: 1, marginBottom: 3 }}>{rank}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {count}
                </div>
                <div style={{ fontSize: 10, color: color + 'aa', marginTop: 2, lineHeight: 1 }}>
                  {total > 0 ? Math.round(count / total * 100) : 0}%
                </div>
              </div>
            ))}
          </div>

          {/* 流入元別ランク分布（小さい表） */}
          <div style={{ fontSize: 11, color: '#b0c8ba', fontWeight: 700, marginBottom: 4 }}>流入元別</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, overflow: 'auto' }}>
            {sourceData.slice(0, 4).map(({ src, color, icon, total: srcTotal, ranks }) => (
              <div key={src} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 8,
                alignItems: 'center',
                padding: '4px 6px',
                background: '#f8fbf9',
                borderRadius: 6,
                fontSize: 12,
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <SourceIconSVG iconKey={icon} size={13} />
                  {src}
                </span>
                {/* ランク内訳をミニバッジで */}
                <span style={{ display: 'flex', gap: 3 }}>
                  {ranks.map((cnt, i) => cnt > 0 && (
                    <span key={i} style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: RANK_ITEMS[i].color,
                      background: RANK_ITEMS[i].color + '15',
                      border: `1px solid ${RANK_ITEMS[i].color}33`,
                      borderRadius: 4,
                      padding: '1px 5px',
                      lineHeight: 1.3,
                    }}>{RANK_ITEMS[i].rank}{cnt}</span>
                  ))}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#174f35', minWidth: 22, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {srcTotal}
                </span>
              </div>
            ))}
            {sourceData.length > 4 && (
              <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: 2 }}>
                ほか {sourceData.length - 4} 流入元
              </div>
            )}
            {unsetCount > 0 && (
              <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'right', marginTop: 'auto', paddingTop: 4 }}>
                IS確度未設定 {unsetCount} 件
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
