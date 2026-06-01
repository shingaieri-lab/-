// デモ用ダミーデータ（架空の会社・担当者・アクション履歴）

export const DEMO_ACCOUNTS = [
  { id: 'demo-u1', name: '田中 みなみ', color: '#10b981', role: 'admin',  isStaff: true, email: '', password: '', signature: '' },
  { id: 'demo-u2', name: '山田 けいた', color: '#3b82f6', role: 'member', isStaff: true, email: '', password: '', signature: '' },
  { id: 'demo-u3', name: '佐藤 ゆり',   color: '#f59e0b', role: 'member', isStaff: true, email: '', password: '', signature: '' },
];

export const DEMO_MASTER = {
  statuses: [
    { label: '新規',       color: '#0ea5e9' },
    { label: '架電済',     color: '#8b5cf6' },
    { label: '日程調整中', color: '#0d9488' },
    { label: '商談確定',   color: '#d97706' },
    { label: '育成対象外', color: '#dc2626' },
    { label: 'ナーチャリング', color: '#10b981' },
  ],
  sources: [
    { label: 'HP',          icon: 'home'   },
    { label: 'ポータルサイト', icon: 'search' },
    { label: '電話',        icon: 'phone'  },
  ],
  salesMembers: ['高橋 誠', '中村 あやか'],
  portalSites: ['SUUMO', 'at home', 'LIFULL HOME\'S'],
  portalTypes: {
    'SUUMO':          [{ label: '反響',  price: 30000 }],
    'at home':        [{ label: '反響',  price: 25000 }],
    'LIFULL HOME\'S': [{ label: '反響',  price: 28000 }],
  },
  portalSiteSource: {
    'SUUMO':          'ポータルサイト',
    'at home':        'ポータルサイト',
    'LIFULL HOME\'S': 'ポータルサイト',
  },
  companyName: 'デモ不動産株式会社',
  calRegTitleTpl: '仮WEB営1）【{{会社名}}様】',
};

export const DEMO_LEADS = [
  // ── 商談確定 ──────────────────────────────────────────────────
  {
    id: 'demo-l01', company: '株式会社アーバンホーム', contact: '木村 健一',
    date: '2026-04-03', source: 'HP', status: '商談確定',
    is_member: '田中 みなみ', sales_member: '高橋 誠',
    meeting_date: '2026-05-20', meeting_time: '14:00',
    next_action_date: '2026-05-20', next_action_time: '14:00',
    next_action: '初回商談（オンライン）',
    mql: 'MQL', zoho_url: '', hp_url: '', is_accuracy: 'A（80％）',
    // Zoho同期で取得される想定のダミー値（demo用）：営業も A 評価、ステージは商談中
    sales_accuracy: 'A（80％）', deal_stage: 'メリットの訴求', sales_synced_at: '2026-05-25T10:00:00.000Z',
    created_at: 1743638400000,
    actions: [
      { id: 'a01a', date: '2026-04-03', time: '10:15', type: 'call', result: '取次', summary: 'HP問い合わせ後、即日折り返し架電。担当者に繋いでもらった。', talkPoints: ['予算感：3,000万円台', '希望エリア：都内南部'], next: '翌日再架電', nextDate: '2026-04-04', recorded_by: '田中 みなみ' },
      { id: 'a01b', date: '2026-04-04', time: '15:00', type: 'call', result: 'アポ確定', summary: 'ニーズヒアリング完了。来週オンライン商談をセット。', talkPoints: ['家族構成：夫婦＋子2人', '築浅・駅近希望'], next: '商談準備', nextDate: '2026-04-10', recorded_by: '田中 みなみ' },
      { id: 'a01c', date: '2026-04-10', time: '14:00', type: 'other', result: '資料送付', summary: '第1回商談完了。物件提案3件。2週間後に再商談。', talkPoints: ['A物件が最有力', '駐車場の有無が重要'], next: '再商談', nextDate: '2026-04-24', recorded_by: '田中 みなみ' },
      { id: 'a01d', date: '2026-04-24', time: '14:00', type: 'other', result: 'アポ確定', summary: '契約に前向き。5月に最終商談をセット。', talkPoints: ['ローン仮審査通過済み'], next: '最終商談', nextDate: '2026-05-20', recorded_by: '田中 みなみ' },
    ],
  },
  {
    id: 'demo-l02', company: '東都建設株式会社', contact: '松本 浩二',
    date: '2026-04-15', source: 'HP', status: '商談確定',
    is_member: '佐藤 ゆり', sales_member: '中村 あやか',
    meeting_date: '2026-05-22', meeting_time: '11:00',
    next_action_date: '2026-05-22', next_action_time: '11:00',
    next_action: '第2回商談',
    mql: 'MQL', zoho_url: '', hp_url: '', is_accuracy: 'B（60％）',
    // Zoho同期で取得される想定のダミー値：受注に至ったケース
    sales_accuracy: 'B（60％）', deal_stage: '受注', sales_synced_at: '2026-05-25T10:00:00.000Z',
    created_at: 1744675200000,
    actions: [
      { id: 'a02a', date: '2026-04-15', time: '13:30', type: 'call', result: '取次', summary: 'HP経由問い合わせ。社長自ら対応。事業拡大のため物件探し中。', talkPoints: ['予算：1億円以上', '倉庫・事務所併設希望'], next: '詳細ヒアリング', nextDate: '2026-04-17', recorded_by: '佐藤 ゆり' },
      { id: 'a02b', date: '2026-04-17', time: '15:00', type: 'call', result: 'アポ確定', summary: 'ニーズ確認後、来週商談確定。', talkPoints: ['川沿いNG', '駐車台数10台以上'], next: '商談', nextDate: '2026-04-25', recorded_by: '佐藤 ゆり' },
      { id: 'a02c', date: '2026-04-25', time: '11:00', type: 'other', result: 'アポ確定', summary: '第1回商談。候補3件を提案。5月に再商談予定。', talkPoints: ['B物件が希望に近い'], next: '再商談', nextDate: '2026-05-22', recorded_by: '佐藤 ゆり' },
    ],
  },
  {
    id: 'demo-l03', company: 'ブライトハウス株式会社', contact: '伊藤 真理',
    date: '2026-05-01', source: 'ポータルサイト', portal_site: 'SUUMO', portal_type: '反響',
    status: '商談確定', is_member: '山田 けいた', sales_member: '高橋 誠',
    meeting_date: '2026-05-19', meeting_time: '10:00',
    next_action_date: '2026-05-19', next_action_time: '10:00',
    next_action: '初回商談',
    mql: 'MQL', zoho_url: '', hp_url: '', is_accuracy: 'C（40％）',
    // Zoho同期で取得される想定のダミー値：失注に至ったケース
    sales_accuracy: 'D（20％）', deal_stage: '失注', sales_synced_at: '2026-05-25T10:00:00.000Z',
    created_at: 1746057600000,
    actions: [
      { id: 'a03a', date: '2026-05-01', time: '11:00', type: 'call', result: '折り返し約束', summary: 'SUUMO反響。先方から折り返し希望。14時に再架電予約。', talkPoints: [], next: '再架電', nextDate: '2026-05-01', recorded_by: '山田 けいた' },
      { id: 'a03b', date: '2026-05-01', time: '14:05', type: 'call', result: 'アポ確定', summary: '詳細ヒアリング完了。5/19に商談セット。', talkPoints: ['3LDK希望', '予算4,500万円'], next: '商談', nextDate: '2026-05-19', recorded_by: '山田 けいた' },
    ],
  },

  // ── 日程調整中 ────────────────────────────────────────────────
  {
    id: 'demo-l04', company: 'サンライズ住宅販売株式会社', contact: '小林 純',
    date: '2026-04-20', source: 'HP', status: '日程調整中',
    is_member: '佐藤 ゆり', next_action_date: '2026-05-16', next_action_time: '13:00',
    next_action: '候補日の最終確認',
    mql: 'MQL', zoho_url: '', hp_url: '', is_accuracy: '中',
    created_at: 1745107200000,
    actions: [
      { id: 'a04a', date: '2026-04-20', time: '09:30', type: 'call', result: '取次', summary: 'HP問い合わせ。担当者に繋いでもらった。来週にでも商談したい様子。', talkPoints: ['急いでいる', '5月中に決めたい'], next: '日程調整', nextDate: '2026-04-22', recorded_by: '佐藤 ゆり' },
      { id: 'a04b', date: '2026-04-22', time: '10:00', type: 'call', result: '再架電依頼', summary: '担当者不在。5/16 13時に架電約束。', talkPoints: [], next: '日程確認', nextDate: '2026-05-16', recorded_by: '佐藤 ゆり' },
    ],
  },
  {
    id: 'demo-l05', company: 'ネクスト住宅株式会社', contact: '渡辺 咲',
    date: '2026-05-07', source: '電話', status: '日程調整中',
    is_member: '佐藤 ゆり', next_action_date: '2026-05-20', next_action_time: '15:00',
    next_action: '商談候補日確定の連絡',
    mql: 'MQL', zoho_url: '', hp_url: '', is_accuracy: '中',
    created_at: 1746576000000,
    actions: [
      { id: 'a05a', date: '2026-05-07', time: '14:00', type: 'call', result: 'アポ確定', summary: '飛び込み電話から。来週中に商談希望。候補日調整中。', talkPoints: ['2DKか3DK希望', 'ペット可物件'], next: '日程確定', nextDate: '2026-05-20', recorded_by: '佐藤 ゆり' },
    ],
  },

  // ── 架電済 ────────────────────────────────────────────────────
  {
    id: 'demo-l06', company: 'ライフデザイン不動産株式会社', contact: '中川 大輔',
    date: '2026-04-10', source: 'ポータルサイト', portal_site: 'at home', portal_type: '反響',
    status: '架電済', is_member: '山田 けいた',
    next_action_date: '2026-05-21', next_action_time: '10:00',
    next_action: '再架電（先方から検討中との返答）',
    mql: '', zoho_url: '', hp_url: '', is_accuracy: '低',
    created_at: 1744243200000,
    actions: [
      { id: 'a06a', date: '2026-04-10', time: '11:00', type: 'call', result: '担当不在', summary: 'at home反響。折り返し連絡なし。翌日再架電。', talkPoints: [], next: '再架電', nextDate: '2026-04-11', recorded_by: '山田 けいた' },
      { id: 'a06b', date: '2026-04-11', time: '10:30', type: 'call', result: '取次', summary: '担当者と話せた。まだ検討初期段階とのこと。1ヶ月後に再連絡を約束。', talkPoints: ['急いでいない', '他社も見ている'], next: '再架電', nextDate: '2026-05-21', recorded_by: '山田 けいた' },
    ],
  },
  {
    id: 'demo-l07', company: '株式会社ハーモニー住宅', contact: '岡田 恵',
    date: '2026-04-28', source: 'HP', status: '架電済',
    is_member: '田中 みなみ',
    next_action_date: '2026-05-19', next_action_time: '',
    next_action: 'メールでの情報提供後、反応確認',
    mql: '', zoho_url: '', hp_url: '', is_accuracy: '低',
    created_at: 1745798400000,
    actions: [
      { id: 'a07a', date: '2026-04-28', time: '15:30', type: 'call', result: '取次', summary: 'HP問い合わせ。物件資料の送付を希望。', talkPoints: ['資料希望', '夫婦で検討中'], next: '資料送付後フォロー', nextDate: '2026-05-19', recorded_by: '田中 みなみ' },
    ],
  },
  {
    id: 'demo-l08', company: '株式会社リバーサイドホーム', contact: '吉田 拓海',
    date: '2026-05-08', source: 'HP', status: '架電済',
    is_member: '山田 けいた',
    next_action_date: '2026-05-22', next_action_time: '11:00',
    next_action: '再架電（来週電話OKとのこと）',
    mql: '', zoho_url: '', hp_url: '', is_accuracy: '中',
    created_at: 1746662400000,
    actions: [
      { id: 'a08a', date: '2026-05-08', time: '10:00', type: 'call', result: '折り返し約束', summary: '初回架電。来週架電OKと確認。ニーズは土地探し。', talkPoints: ['50坪以上の土地希望', '南向き条件'], next: '再架電', nextDate: '2026-05-22', recorded_by: '山田 けいた' },
    ],
  },

  // ── 新規 ──────────────────────────────────────────────────────
  {
    id: 'demo-l09', company: '株式会社グリーンプロパティ', contact: '山口 さくら',
    date: '2026-05-13', source: '電話', status: '新規',
    is_member: '田中 みなみ',
    next_action_date: '2026-05-15', next_action_time: '14:00',
    next_action: '初回架電',
    mql: '', zoho_url: '', hp_url: '', is_accuracy: '',
    created_at: 1747094400000,
    actions: [],
  },
  {
    id: 'demo-l10', company: '株式会社スカイレジデンス', contact: '藤田 健太',
    date: '2026-05-14', source: 'HP', status: '新規',
    is_member: '田中 みなみ',
    next_action_date: '2026-05-15', next_action_time: '10:00',
    next_action: '初回架電',
    mql: '', zoho_url: '', hp_url: '', is_accuracy: '',
    created_at: 1747180800000,
    actions: [],
  },
  {
    id: 'demo-l11', company: 'トータルホーム株式会社', contact: '西村 麻衣',
    date: '2026-05-14', source: 'ポータルサイト', portal_site: 'LIFULL HOME\'S', portal_type: '反響',
    status: '新規', is_member: '山田 けいた',
    next_action_date: '2026-05-15', next_action_time: '15:00',
    next_action: '初回架電',
    mql: '', zoho_url: '', hp_url: '', is_accuracy: '',
    created_at: 1747180800000,
    actions: [],
  },

  // ── ナーチャリング ────────────────────────────────────────────
  {
    id: 'demo-l12', company: '株式会社ミライホーム', contact: '加藤 大地',
    date: '2026-02-15', source: 'ポータルサイト', portal_site: 'SUUMO', portal_type: '反響',
    status: 'ナーチャリング', is_member: '山田 けいた',
    next_action_date: '2026-07-01', next_action_time: '',
    next_action: '3ヶ月後にフォロー（育休明け後に再検討予定）',
    mql: '', zoho_url: '', hp_url: '', is_accuracy: '低',
    created_at: 1739577600000,
    actions: [
      { id: 'a12a', date: '2026-02-15', time: '10:00', type: 'call', result: '取次', summary: 'SUUMO反響。担当者と話せた。育休中のため、復帰後に検討予定。', talkPoints: ['育休中', '夏以降に動く予定'], next: '3ヶ月後フォロー', nextDate: '2026-07-01', recorded_by: '山田 けいた' },
    ],
  },
  {
    id: 'demo-l13', company: '株式会社センチュリープロパティ', contact: '林 奈緒',
    date: '2026-03-05', source: '電話', status: 'ナーチャリング',
    is_member: '佐藤 ゆり',
    next_action_date: '2026-06-01', next_action_time: '',
    next_action: '四半期後フォロー（今期は予算化されず）',
    mql: '', zoho_url: '', hp_url: '', is_accuracy: '低',
    created_at: 1741132800000,
    actions: [
      { id: 'a13a', date: '2026-03-05', time: '14:00', type: 'call', result: '取次', summary: '問い合わせあり。今期は社内予算が降りず、次期以降に延期。', talkPoints: ['予算：来期に再申請', 'オフィス移転検討中'], next: '次期フォロー', nextDate: '2026-06-01', recorded_by: '佐藤 ゆり' },
    ],
  },

  // ── 育成対象外 ───────────────────────────────────────────────
  {
    id: 'demo-l14', company: 'プレミアム不動産株式会社', contact: '田村 隆',
    date: '2026-03-20', source: 'ポータルサイト', portal_site: 'at home', portal_type: '反響',
    status: '育成対象外', is_member: '山田 けいた',
    next_action_date: '', next_action_time: '', next_action: '',
    mql: '', zoho_url: '', hp_url: '', is_accuracy: '',
    created_at: 1742428800000,
    actions: [
      { id: 'a14a', date: '2026-03-20', time: '11:30', type: 'call', result: '断り', summary: 'at home反響。架電したところ、すでに他社で決まったとのこと。', talkPoints: [], next: '', nextDate: '', recorded_by: '山田 けいた' },
    ],
  },
];

export const DEMO_DATA = {
  accounts: DEMO_ACCOUNTS,
  leads: DEMO_LEADS,
  masterSettings: DEMO_MASTER,
};
