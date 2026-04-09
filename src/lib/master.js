// マスター設定・IS担当カラー・アカウント管理のロジックを集約する

import {
  DEFAULT_SOURCES, DEFAULT_STATUSES_WITH_COLORS, DEFAULT_SALES_MEMBERS,
  DEFAULT_PORTAL_SITES, DEFAULT_PORTAL_TYPES, DEFAULT_IS_MEMBERS,
  SOURCE_COLOR_PALETTE, LEAD_SOURCE_ICONS, PALETTE,
} from './constants.js';
import { apiPost } from './api.js';

// ── マスター設定 ──────────────────────────────────────────

export function loadMasterSettings() {
  return window.__appData.masterSettings || null;
}

export function saveMasterSettings(s) {
  window.__appData.masterSettings = s;
  apiPost('/api/master-settings', s);
}

export function getMaster() {
  const s = loadMasterSettings();
  const defaults = {
    salesMembers: DEFAULT_SALES_MEMBERS,
    portalSites: DEFAULT_PORTAL_SITES,
    portalTypes: DEFAULT_PORTAL_TYPES,
    portalSiteSource: {},
    sources: DEFAULT_SOURCES,
    statuses: DEFAULT_STATUSES_WITH_COLORS,
  };
  if (!s) return defaults;
  return {
    ...defaults,
    ...s,
    portalSiteSource: s.portalSiteSource || {},
    sources: s.sources || DEFAULT_SOURCES,
    statuses: s.statuses || DEFAULT_STATUSES_WITH_COLORS,
  };
}

// ── ステータス ────────────────────────────────────────────

export function getStatuses() { return (getMaster().statuses || DEFAULT_STATUSES_WITH_COLORS).map(s => s.label || s); }

export function getStatusColor(label) {
  const statuses = getMaster().statuses || DEFAULT_STATUSES_WITH_COLORS;
  const found = statuses.find(s => (s.label || s) === label);
  return found ? (found.color || "#6a9a7a") : "#6a9a7a";
}

// ── 営業担当・ポータルサイト・流入元 ──────────────────────

export function getSalesMembers() { return getMaster().salesMembers; }
export function getPortalSites() { return getMaster().portalSites; }
export function getPortalTypes() { return getMaster().portalTypes; }

export function getPortalPrice(site, type) {
  if (!type) return 0;
  const types = getPortalTypes()[site] || [];
  const found = types.find(t => t.label === type);
  return found ? found.price : 0;
}

export function getPortalSiteSource(site) { return (getMaster().portalSiteSource || {})[site] || ""; }

export function getPortalSitesForSource(source) {
  if (!source) return [];
  const m = getMaster().portalSiteSource || {};
  return getPortalSites().filter(s => m[s] === source);
}

export function sourceHasPortal(source) { return getPortalSitesForSource(source).length > 0; }

export function getSources() { return (getMaster().sources || DEFAULT_SOURCES).map(s => typeof s === "string" ? s : s.label); }
export function getSourcesWithMeta() { return (getMaster().sources || DEFAULT_SOURCES).map(s => typeof s === "string" ? {label:s, icon:null} : s); }

export function getSourceIcon(sourceName) {
  const src = (getMaster().sources || DEFAULT_SOURCES).find(s => (typeof s === "string" ? s : s.label) === sourceName);
  return (src && typeof src === "object") ? src.icon : null;
}

export function getSourceColor(sourceName, fallbackIdx) {
  const iconKey = getSourceIcon(sourceName);
  if (iconKey) { const def = LEAD_SOURCE_ICONS.find(d => d.key === iconKey); if (def) return def.color; }
  if (sourceName === "HP") return "#0ea5e9";
  if (sourceName === "ポータルサイト") return "#8b5cf6";
  if (sourceName === "電話") return "#f59e0b";
  return SOURCE_COLOR_PALETTE[(fallbackIdx + 3) % SOURCE_COLOR_PALETTE.length];
}

// ── IS担当カラー ──────────────────────────────────────────

export const IS_COLORS = {};

export function getISMembers() {
  const accounts = window.__appData?.accounts || [];
  if (accounts.length > 0) {
    const isStaffAccounts = accounts.filter(a => a.isStaff).map(a => a.name);
    return isStaffAccounts.length > 0 ? isStaffAccounts : accounts.map(a => a.name);
  }
  return DEFAULT_IS_MEMBERS;
}

export function syncISColors() {
  const accounts = window.__appData?.accounts || [];
  accounts.forEach(a => {
    IS_COLORS[a.name] = { bg: a.color, text: a.color, border: a.color + "55" };
  });
}
syncISColors();

// ── アカウント管理 ────────────────────────────────────────

export const USER_COLORS = {};
export const DEFAULT_ACCOUNTS = [];

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

// ── AI設定 ───────────────────────────────────────────────
// geminiKey はサーバー側のみ保持。フロントには geminiConfigured フラグのみ返す

export function getEffectiveAiConfig(currentUser) {
  if (!currentUser) return {};
  // 共有設定（管理者が設定したもの）をフォールバックとして使用する
  const shared = window.__appData?.aiConfig || {};
  return {
    geminiConfigured: !!(currentUser.geminiConfigured || shared.geminiConfigured),
    gmailClientId: currentUser.gmailClientId || shared.gmailClientId || ""
  };
}
