// Google Calendar 設定の読み書き・API呼び出し

import { apiPost } from './api.js';

export function loadGCalConfig() {
  return window.__appData?.gcalConfig || {};
}

export function saveGCalConfig(cfg) {
  window.__appData.gcalConfig = cfg;
  apiPost('/api/gcal-config', cfg);
}

// freeBusy API：指定カレンダーIDの予定を取得する
export async function fetchFreeBusy(apiKey, timeMin, timeMax, items) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/freeBusy?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeMin, timeMax, items }),
    }
  );
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error?.message || "APIエラー");
  }
  return res.json();
}

// カレンダーイベント登録API：1件のスロットをカレンダーに登録する
export async function createCalendarEvent(token, title, slot, attendees) {
  const startDT = `${slot.date}T${slot.start}:00+09:00`;
  const endDT   = `${slot.date}T${slot.end}:00+09:00`;
  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none`,
    {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: title,
        start: { dateTime: startDT, timeZone: "Asia/Tokyo" },
        end:   { dateTime: endDT,   timeZone: "Asia/Tokyo" },
        attendees,
      }),
    }
  );
  if (!resp.ok) {
    const err = await resp.json();
    if (err.error?.code === 401) throw new Error('__AUTH_EXPIRED__');
    throw new Error(err.error?.message || "登録失敗");
  }
  return true;
}
