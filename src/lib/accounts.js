// アカウント（ユーザー）データの管理
import { apiPost } from './api.js';
import { IS_COLORS } from './master.js';

// アイコン色パレット
export const PALETTE = [
  "#7c3aed","#0369a1","#059669","#d97706","#dc2626",
  "#0891b2","#db2777","#65a30d","#ea580c","#0f766e",
  "#6d28d9","#1d4ed8","#047857","#b45309","#991b1b",
  "#0e7490","#9d174d","#3f6212","#c2410c","#134e4a",
];

// ユーザー名→カラーの動的マップ（ログイン時・saveAccounts 時に更新）
export const USER_COLORS = {};

const DEFAULT_ACCOUNTS = [];

export function loadAccounts() {
  const saved = window.__appData?.accounts;
  if (!saved || saved.length === 0) return DEFAULT_ACCOUNTS;
  return saved;
}

export function saveAccounts(accounts) {
  window.__appData.accounts = accounts;
  apiPost('/api/accounts', accounts);
  accounts.forEach(a => {
    USER_COLORS[a.name] = a.color;
    IS_COLORS[a.name] = { bg: a.color, text: a.color, border: a.color + "55" };
  });
}

// 有効な AI 設定を返す（共有設定をフォールバックとして使用）
// geminiKey はサーバー側のみ保持。フロントエンドには geminiConfigured フラグのみ返す
export function getEffectiveAiConfig(currentUser) {
  if (!currentUser) return {};
  const shared = window.__appData?.aiConfig || {};
  return {
    geminiConfigured: !!(currentUser.geminiConfigured || shared.geminiConfigured),
    gmailClientId: currentUser.gmailClientId || shared.gmailClientId || "",
  };
}
