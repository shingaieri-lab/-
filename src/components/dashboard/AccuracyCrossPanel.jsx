// ダッシュボード用「IS確度 vs 営業確度 クロス集計」パネル
// 縦軸＝IS確度（A〜D）、横軸＝営業確度（A〜E）の4×5マトリックスで件数を表示。
// 対角線上＝完全一致、隣接＝±1段ズレ、それ以外＝大きくズレ。
import { Fragment, useMemo } from 'react';
import { ACCURACY_COLORS, extractAccuracyRank } from '../../lib/salesAnalytics.js';
import { DASHBOARD_CARD } from './cardStyle.js';

const card = { ...DASHBOARD_CARD, display: 'flex', flexDirection: 'column' };

const IS_RANKS    = ['A', 'B', 'C', 'D'];
const SALES_RANKS = ['A', 'B', 'C', 'D', 'E'];
const RANK_INDEX  = { A: 0, B: 1, C: 2, D: 3, E: 4 };

// ランク間の距離（絶対値）からズレ種別を判定
//   0 = 完全一致 / 1 = ±1段ズレ / 2以上 = 大きくズレ
function getMatchType(isRank, salesRank) {
  const diff = Math.abs(RANK_INDEX[isRank] - RANK_INDEX[salesRank]);
  if (diff === 0) return 'match';
  if (diff === 1) return 'near';
  return 'far';
}

// ズレ種別ごとの色定義
const MATCH_STYLES = {
  match: { bg: 'rgba(16, 185, 129, %op%)',   border: '#10b98144', text: '#065f46', label: '完全一致' },
  near:  { bg: 'rgba(59, 130, 246, %op%)',   border: '#3b82f644', text: '#1e40af', label: '±1段ズレ' },
  far:   { bg: 'rgba(245, 158, 11, %op%)',   border: '#f59e0b44', text: '#9a3412', label: '大きくズレ' },
};

export function AccuracyCrossPanel({ filteredLeads }) {
  // 商談確定リードのうち、IS確度と営業確度が両方入っているものを対象
  const data = useMemo(() => {
    const matrix = {};
    IS_RANKS.forEach(ir => {
      matrix[ir] = {};
      SALES_RANKS.forEach(sr => { matrix[ir][sr] = 0; });
    });

    let pendingSync = 0;     // IS確度はあるが営業確度未取得
    let totalWithBoth = 0;
    let exactCount = 0;      // 完全一致
    let nearCount = 0;       // ±1段ズレ

    filteredLeads
      .filter(l => l.status === '商談確定')
      .forEach(l => {
        const isRank = extractAccuracyRank(l.is_accuracy);
        const salesRank = extractAccuracyRank(l.sales_accuracy);
        if (!isRank) return;
        if (!salesRank) { pendingSync++; return; }
        if (matrix[isRank] && matrix[isRank][salesRank] !== undefined) {
          matrix[isRank][salesRank]++;
          totalWithBoth++;
          const type = getMatchType(isRank, salesRank);
          if (type === 'match') exactCount++;
          else if (type === 'near') nearCount++;
        }
      });

    return { matrix, pendingSync, totalWithBoth, exactCount, nearCount };
  }, [filteredLeads]);

  const exactRate     = data.totalWithBoth > 0 ? Math.round(data.exactCount / data.totalWithBoth * 100) : 0;
  const toleranceRate = data.totalWithBoth > 0 ? Math.round((data.exactCount + data.nearCount) / data.totalWithBoth * 100) : 0;

  // 最大件数（セルの色濃度に使う）
  const maxCount = useMemo(() => {
    let m = 0;
    IS_RANKS.forEach(ir => SALES_RANKS.forEach(sr => { m = Math.max(m, data.matrix[ir][sr]); }));
    return m;
  }, [data.matrix]);

  return (
    <div style={card}>
      {/* ヘッダー：完全一致率＋±1段までの許容一致率を併記 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 4, height: 16, background: '#3b82f6', borderRadius: 2 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#174f35' }}>IS確度 vs 営業確度</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
          <span style={{ fontSize: 12, color: '#6a9a7a' }}>
            完全一致 <strong style={{ fontSize: 18, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{exactRate}</strong>%
          </span>
          <span style={{ fontSize: 12, color: '#6a9a7a' }}>
            ±1段まで <strong style={{ fontSize: 15, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>{toleranceRate}</strong>%
          </span>
          {data.pendingSync > 0 && (
            <span style={{ fontSize: 11, color: '#9ca3af' }}>未同期 {data.pendingSync}件</span>
          )}
        </div>
      </div>

      {data.totalWithBoth === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12, gap: 4 }}>
          <span>営業確度がまだありません</span>
          <span style={{ fontSize: 11 }}>Zoho同期後に表示されます</span>
        </div>
      ) : (
        <>
          {/* マトリックス */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(5, 1fr)', gap: 3 }}>
            {/* 1行目：見出し（左上は空、上は営業ランク） */}
            <span style={{ fontSize: 10, color: '#b0c8ba', textAlign: 'center' }}></span>
            {SALES_RANKS.map(sr => (
              <span key={sr} style={{ fontSize: 11, fontWeight: 800, color: ACCURACY_COLORS[sr], textAlign: 'center', padding: '2px 0' }}>
                {sr}
              </span>
            ))}

            {/* 2〜5行目：各IS確度の行（map内でFragmentを使うのでkey必須） */}
            {IS_RANKS.map(ir => (
              <Fragment key={ir}>
                <span style={{ fontSize: 11, fontWeight: 800, color: ACCURACY_COLORS[ir], textAlign: 'center', padding: '6px 4px' }}>
                  {ir}
                </span>
                {SALES_RANKS.map(sr => {
                  const count = data.matrix[ir][sr];
                  const type = getMatchType(ir, sr);
                  const style = MATCH_STYLES[type];
                  const opacity = maxCount > 0 ? Math.min(0.15 + (count / maxCount) * 0.8, 1) : 0.1;
                  return (
                    <div key={ir + '-' + sr} style={{
                      background: count > 0 ? style.bg.replace('%op%', opacity) : '#f8fbf9',
                      border: count > 0 ? `1.5px solid ${style.border}` : '1px solid #e2f0e8',
                      borderRadius: 6,
                      padding: '6px 4px',
                      textAlign: 'center',
                      fontSize: 13,
                      fontWeight: count > 0 ? 800 : 400,
                      color: count > 0 ? style.text : '#d1d5db',
                      fontVariantNumeric: 'tabular-nums',
                      minHeight: 22,
                    }}>
                      {count > 0 ? count : '·'}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>

          {/* 凡例 */}
          <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 10, color: '#b0c8ba', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {['match', 'near', 'far'].map(t => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 10, height: 10, background: MATCH_STYLES[t].bg.replace('%op%', 0.5), border: `1.5px solid ${MATCH_STYLES[t].border}`, borderRadius: 3 }} />
                {MATCH_STYLES[t].label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
