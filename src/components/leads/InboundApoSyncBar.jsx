// アポ一覧の上部に表示するZoho同期バー
// - 手動同期ボタン
// - 自動同期（マウント時に30分クールダウン付きで1回だけ実行）
// - 最終同期日時の表示
// - 結果/エラーメッセージの表示
import { useState, useEffect, useMemo, useRef } from 'react';
import { syncZohoDeals } from '../../lib/zoho.js';
import { SpinnerIcon, ExternalLinkIcon } from '../ui/Icons.jsx';

// 自動同期のクールダウン：最終同期から30分以内なら自動同期スキップ
// 過剰なZoho API呼び出しを防ぐため
const AUTO_SYNC_COOLDOWN_MS = 30 * 60 * 1000;

export function InboundApoSyncBar({ apoLeads, onSyncResult }) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [syncErr, setSyncErr] = useState('');
  // 個別エラー：[{ leadId, company, contact, error }] の配列。診断用に展開して表示する
  const [syncErrors, setSyncErrors] = useState([]);
  const [errorsOpen, setErrorsOpen] = useState(false);

  // 最終同期日時：全リードの sales_synced_at の最大値
  const lastSyncedAt = useMemo(() => {
    const dates = apoLeads
      .map(l => l.sales_synced_at)
      .filter(Boolean)
      .sort();
    return dates.length > 0 ? dates[dates.length - 1] : null;
  }, [apoLeads]);

  // 手動同期 / 自動同期の共通ロジック
  // silent=true のときは結果/エラーメッセージをUIに出さない（自動同期向け）
  const handleSync = async (silent = false) => {
    setSyncing(true);
    if (!silent) { setSyncMsg(''); setSyncErr(''); setSyncErrors([]); setErrorsOpen(false); }
    try {
      const result = await syncZohoDeals();
      if (!silent) {
        setSyncMsg(`✓ ${result.synced}件を同期しました（対象 ${result.total}件${result.skipped > 0 ? ` / Zoho未連携 ${result.skipped}件はスキップ` : ''}）`);
        // 個別エラーがある場合は会社名と組み合わせて表示用に整形
        if (Array.isArray(result.errors) && result.errors.length > 0) {
          const errorDetails = result.errors.map(e => {
            const lead = apoLeads.find(l => l.id === e.leadId);
            return {
              leadId: e.leadId,
              company: lead?.company || '（不明）',
              contact: lead?.contact || '',
              error: e.error,
            };
          });
          setSyncErrors(errorDetails);
        }
        // 成功メッセージは10秒で消す（エラー詳細は明示的に閉じるまで残す）
        setTimeout(() => setSyncMsg(''), 10000);
      }
      if (onSyncResult && result.leads) onSyncResult(result.leads);
    } catch (e) {
      if (!silent) {
        setSyncErr('同期失敗: ' + e.message);
        setTimeout(() => setSyncErr(''), 8000);
      } else {
        // 自動同期失敗時はコンソールにのみ出す（ユーザーに不意に表示しない）
        console.warn('[Auto-sync] Zoho同期失敗:', e.message);
      }
    }
    setSyncing(false);
  };

  // タブ表示時の自動同期（1セッション1回・30分クールダウン）
  const autoSyncTriggered = useRef(false);
  useEffect(() => {
    if (!window.__appData?.zohoAuthenticated) return;
    if (autoSyncTriggered.current) return;
    if (!apoLeads.some(l => l.zoho_lead_id)) return;
    if (lastSyncedAt) {
      const elapsed = Date.now() - new Date(lastSyncedAt).getTime();
      if (elapsed < AUTO_SYNC_COOLDOWN_MS) return;
    }
    autoSyncTriggered.current = true;
    handleSync(true);
    // マウント時に1度だけ評価したいので依存配列は空。多重実行はuseRefで防止済み。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zoho未認証なら何も表示しない
  if (!window.__appData?.zohoAuthenticated) return null;

  return (
    // 外側コンテナは余計な背景・枠なしのプレーン flex 列。サマリーカード列の右側に並べる際にスッキリ見えるように
    // ボタン自体が minHeight: 44 を持つので、件数カード（高さ約44px）と揃って見える
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* 左側：最終同期日時・結果メッセージ・エラートグル（ボタンより前に配置） */}
        {lastSyncedAt && (
          <span style={{ fontSize: 11, color: '#0369a1' }}>
            最終同期：{new Date(lastSyncedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {syncMsg && <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>{syncMsg}</span>}
        {syncErr && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>{syncErr}</span>}
        {/* 個別エラー件数のサマリー＋詳細トグル */}
        {syncErrors.length > 0 && (
          <button
            type="button"
            onClick={() => setErrorsOpen(v => !v)}
            style={{
              fontSize: 11, fontWeight: 700, color: '#dc2626',
              background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6,
              padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ⚠ {syncErrors.length}件失敗 {errorsOpen ? '▲' : '▼'}
          </button>
        )}
        {/* 右側：同期ボタン（最後に配置することで row 内の右端に並ぶ） */}
        <button
          onClick={() => handleSync(false)}
          disabled={syncing}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '10px 18px',          // タッチターゲット44pxを満たすパディング
            minHeight: 44,                  // WCAG推奨の44×44pxを確保（件数カードと同じ高さ）
            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 12, fontWeight: 700, cursor: syncing ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            opacity: syncing ? 0.75 : 1,    // 0.7以上を維持（UX_RULES準拠）
          }}
        >
          {syncing
            ? <><SpinnerIcon size={12} color="#fff" /> 同期中…</>
            : <><ExternalLinkIcon size={12} color="#fff" /> Zohoから営業確度・ステージを同期</>
          }
        </button>
      </div>
      {/* 個別エラーの詳細リスト：失敗したリードごとに会社名とエラー内容を表示 */}
      {syncErrors.length > 0 && errorsOpen && (
        <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', maxHeight: 200, overflowY: 'auto' }}>
          {syncErrors.map((e, i) => (
            <div key={e.leadId} style={{
              fontSize: 11, color: '#7f1d1d', padding: '4px 0',
              borderBottom: i < syncErrors.length - 1 ? '1px solid #fef2f2' : 'none',
            }}>
              <span style={{ fontWeight: 700 }}>{e.company}</span>
              {e.contact && <span style={{ color: '#9ca3af', marginLeft: 6 }}>（{e.contact}）</span>}
              <span style={{ marginLeft: 8, color: '#dc2626' }}>→ {e.error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
