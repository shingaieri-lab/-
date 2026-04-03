// マスターデータ管理
// マスター設定（担当者・ポータルサイト・ステータス等）の取得・更新を担う

import { LEAD_SOURCE_ICONS, SOURCE_COLOR_PALETTE } from '../constants/index.js';
import { apiPost } from './api.js';

// デフォルト値（マスター設定未登録の場合に使う）
const DEFAULT_SALES_MEMBERS = [];
const DEFAULT_IS_MEMBERS = [];
const DEFAULT_PORTAL_SITES = [];
const DEFAULT_PORTAL_TYPES = {};
const DEFAULT_SOURCES = [];
const DEFAULT_STATUSES_WITH_COLORS = [];

function loadMasterSettings() {
  return window.__appData?.masterSettings || null;
}

export function saveMasterSettings(s) {
  window.__appData.masterSettings = s;
  apiPost('/api/master-settings', s);
}

// マスター設定をデフォルトとマージして返す
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

export function getStatuses() {
  return (getMaster().statuses || DEFAULT_STATUSES_WITH_COLORS).map(s => s.label || s);
}

export function getStatusColor(label) {
  const statuses = getMaster().statuses || DEFAULT_STATUSES_WITH_COLORS;
  const found = statuses.find(s => (s.label || s) === label);
  return found ? (found.color || "#6a9a7a") : "#6a9a7a";
}

export function getSalesMembers() { return getMaster().salesMembers; }
export function getPortalSites()  { return getMaster().portalSites; }
export function getPortalTypes()  { return getMaster().portalTypes; }

export function getPortalPrice(site, type) {
  if (!type) return 0;
  const types = getPortalTypes()[site] || [];
  const found = types.find(t => t.label === type);
  return found ? found.price : 0;
}

export function getPortalSiteSource(site) {
  return (getMaster().portalSiteSource || {})[site] || "";
}

export function getPortalSitesForSource(source) {
  if (!source) return [];
  const m = getMaster().portalSiteSource || {};
  return getPortalSites().filter(s => m[s] === source);
}

export function sourceHasPortal(source) {
  return getPortalSitesForSource(source).length > 0;
}

export function getSources() {
  return (getMaster().sources || DEFAULT_SOURCES).map(s => typeof s === "string" ? s : s.label);
}

export function getSourcesWithMeta() {
  return (getMaster().sources || DEFAULT_SOURCES).map(s =>
    typeof s === "string" ? { label: s, icon: null } : s
  );
}

export function getSourceIcon(sourceName) {
  const src = (getMaster().sources || DEFAULT_SOURCES).find(s =>
    (typeof s === "string" ? s : s.label) === sourceName
  );
  return (src && typeof src === "object") ? src.icon : null;
}

export function getSourceColor(sourceName, fallbackIdx) {
  const iconKey = getSourceIcon(sourceName);
  if (iconKey) {
    const def = LEAD_SOURCE_ICONS.find(d => d.key === iconKey);
    if (def) return def.color;
  }
  if (sourceName === "HP")          return "#0ea5e9";
  if (sourceName === "ポータルサイト") return "#8b5cf6";
  if (sourceName === "電話")         return "#f59e0b";
  return SOURCE_COLOR_PALETTE[(fallbackIdx + 3) % SOURCE_COLOR_PALETTE.length];
}

// ISメンバー（インサイドセールス担当者）をアカウント情報から動的に取得する
export function getISMembers() {
  const accounts = window.__appData?.accounts || [];
  if (accounts.length > 0) {
    const isStaff = accounts.filter(a => a.isStaff).map(a => a.name);
    return isStaff.length > 0 ? isStaff : accounts.map(a => a.name);
  }
  return DEFAULT_IS_MEMBERS;
}

// IS担当者ごとのカラー設定（バッジ等に使用）
export const IS_COLORS = {};

export function syncISColors() {
  const accounts = window.__appData?.accounts || [];
  accounts.forEach(a => {
    IS_COLORS[a.name] = { bg: a.color, text: a.color, border: a.color + "55" };
  });
}

syncISColors();
