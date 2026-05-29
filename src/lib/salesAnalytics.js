// 営業確度・商談ステージに関する共通ロジック
// Zoho の Deal モジュールから取得する値の形式を扱う。

// IS確度／営業確度のランク色
export const ACCURACY_COLORS = {
  A: '#ef4444',
  B: '#f97316',
  C: '#f59e0b',
  D: '#94a3b8',
  E: '#6b7280', // 営業確度のみ存在（0%）
};

// 営業確度の選択肢（Zoho と同じ形式）
export const SALES_ACCURACY_OPTIONS = [
  { rank: 'A', label: 'A（80％）', probability: 80 },
  { rank: 'B', label: 'B（60％）', probability: 60 },
  { rank: 'C', label: 'C（40％）', probability: 40 },
  { rank: 'D', label: 'D（20％）', probability: 20 },
  { rank: 'E', label: 'E（0％）',  probability: 0  },
];

// 文字列から先頭のランク文字（A〜E）を抽出
// 例：「A（80％）」→「A」、「B」→「B」、null→null
export function extractAccuracyRank(value) {
  if (!value) return null;
  const m = String(value).match(/^([A-E])/);
  return m ? m[1] : null;
}

// 商談ステージの分類（受注までを追う設計）
// Zoho のステージ名と一致させる。
export const STAGE_CATEGORIES = {
  won:        { label: '受注',   color: '#10b981' },
  lost:       { label: '失注',   color: '#ef4444' },
  onHold:     { label: '保留',   color: '#f59e0b' },
  inProgress: { label: '商談中', color: '#3b82f6' },
  excluded:   { label: '対象外', color: '#9ca3af' },
};

// ステージ名→分類キーのマッピング
// 受注扱い：受注・事務処理および受注後の進行ステージ
// 商談中：商談確定〜契約合意までの進行段階
// 除外：コントラクション（業務上不明・追跡対象外）
const STAGE_TO_CATEGORY = {
  // 受注グループ
  '受注':                  'won',
  '事務処理':              'won',
  '事前説明会（OB）':      'won',
  '社内説明会':            'won',
  '業者説明会':            'won',
  '業務完了報告書回収':    'won',
  'アフター（OB）':        'won',
  'アフター':              'won',
  // 失注
  '失注':                  'lost',
  // 保留
  '保留':                  'onHold',
  '育成対象外':            'onHold',
  // 商談中
  '商談確定':              'inProgress',
  '商談の見極め':          'inProgress',
  '課題の特定':            'inProgress',
  'メリットの訴求':        'inProgress',
  '意志決定者の賛同':      'inProgress',
  'リスクの排除':          'inProgress',
  '契約合意':              'inProgress',
  // 除外
  'コントラクション':      'excluded',
};

// ステージ名から分類キーを取得（未知のステージは inProgress 扱い）
export function categorizeStage(stage) {
  if (!stage) return null;
  return STAGE_TO_CATEGORY[stage] || 'inProgress';
}

// リード配列を受注・失注・保留・商談中の4分類で集計
export function aggregateStages(leads) {
  const result = {
    won:        { count: 0, leads: [] },
    lost:       { count: 0, leads: [] },
    onHold:     { count: 0, leads: [] },
    inProgress: { count: 0, leads: [] },
    excluded:   { count: 0, leads: [] },
    unset:      { count: 0, leads: [] }, // deal_stage 未取得
  };
  leads.forEach(l => {
    const cat = categorizeStage(l.deal_stage);
    if (!cat) result.unset.count++, result.unset.leads.push(l);
    else      result[cat].count++,  result[cat].leads.push(l);
  });
  return result;
}
