// Google Calendar 設定のロード・保存
import { apiPost } from './api.js';

export function loadGCalConfig() {
  return window.__appData?.gcalConfig || {};
}

export function saveGCalConfig(cfg) {
  window.__appData.gcalConfig = cfg;
  apiPost('/api/gcal-config', cfg);
}
