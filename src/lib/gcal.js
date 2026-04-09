// Google Calendar 設定の読み書き

import { apiPost } from './api.js';

export function loadGCalConfig() {
  return window.__appData?.gcalConfig || {};
}

export function saveGCalConfig(cfg) {
  window.__appData.gcalConfig = cfg;
  apiPost('/api/gcal-config', cfg);
}
