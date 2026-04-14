// アプリ全体で使う定数（固定値）
// 動的なマスターデータは lib/master.js で管理

export const SOURCE_COLOR_PALETTE = [
  "#0ea5e9","#8b5cf6","#f59e0b","#10b981",
  "#d97706","#ea580c","#6366f1","#ec4899",
];

export const STATUS_COLOR_PALETTE = [
  "#0ea5e9","#8b5cf6","#0d9488","#d97706",
  "#dc2626","#ea580c","#10b981","#f59e0b","#6366f1","#ec4899",
];

export const LEAD_SOURCE_ICONS = [
  { key: "home",      label: "ホーム・HP",     color: "#10b981" },
  { key: "search",    label: "ポータル検索",   color: "#8b5cf6" },
  { key: "phone",     label: "電話",           color: "#f59e0b" },
  { key: "mail",      label: "メール",         color: "#0ea5e9" },
  { key: "chat",      label: "チャット",       color: "#0d9488" },
  { key: "megaphone", label: "広告",           color: "#ea580c" },
  { key: "star",      label: "口コミ",         color: "#eab308" },
  { key: "people",    label: "紹介",           color: "#6366f1" },
  { key: "briefcase", label: "飛び込み",       color: "#d97706" },
  { key: "map",       label: "マップ",         color: "#dc2626" },
  { key: "globe",     label: "Web広告",        color: "#06b6d4" },
  { key: "newspaper", label: "媒体・メディア", color: "#6a9a7a" },
  { key: "video",     label: "動画広告",       color: "#f43f5e" },
  { key: "qr",        label: "QRコード",       color: "#374151" },
  { key: "social",    label: "SNS",            color: "#ec4899" },
  { key: "document",  label: "資料請求",       color: "#475569" },
  { key: "building",  label: "施設・展示場",   color: "#92400e" },
  { key: "lightbulb", label: "セミナー",       color: "#ca8a04" },
  { key: "event",     label: "イベント",       color: "#7c3aed" },
  { key: "referral",  label: "他社紹介",       color: "#65a30d" },
];

export const MQL_OPTIONS = ["MQL", "非MQL"];

export const ACTION_TYPES = [
  { v: "call",  label: "電話",  icon: "📞", color: "#10b981" },
  { v: "email", label: "メール",icon: "✉️",  color: "#8b5cf6" },
  { v: "sms",   label: "SMS",   icon: "💬", color: "#0ea5e9" },
  { v: "other", label: "その他",icon: "📝", color: "#6a9a7a" },
];

export const ACTION_RESULTS = ["取次", "不在", "不通", "折電", "送信済", "その他"];

// ACTION_TYPE を v（値）で引く便利関数
export const at = (v) => ACTION_TYPES.find(a => a.v === v) || ACTION_TYPES[0];

// ユニークID生成（リード・アクション等に使用）
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// アカウントアイコン・ステータス等のカラーパレット
export const PALETTE = [
  "#7c3aed","#0369a1","#059669","#d97706","#dc2626",
  "#0891b2","#db2777","#65a30d","#ea580c","#0f766e",
  "#6d28d9","#1d4ed8","#047857","#b45309","#991b1b",
  "#0e7490","#9d174d","#3f6212","#c2410c","#134e4a",
];
