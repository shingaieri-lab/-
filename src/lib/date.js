// 日付・営業日ユーティリティ

// 日付を YYYY-MM-DD に正規化する
// 対応フォーマット: "YYYY-MM-DD"（そのまま）、"YYYY/M/D" or "YYYY-M-D"（ゼロ埋め変換）
export function normalizeDate(s) {
  if (!s) return "";
  s = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return s;
}

import { TODAY } from './constants.js';

// フォールバック用ハードコードリスト（APIが取得できない場合に使用）
export const JP_HOLIDAYS = new Set([
  "2025-01-01","2025-01-13","2025-02-11","2025-02-23","2025-02-24",
  "2025-03-20","2025-04-29","2025-05-03","2025-05-04","2025-05-05","2025-05-06",
  "2025-07-21","2025-08-11","2025-09-15","2025-09-23","2025-10-13",
  "2025-11-03","2025-11-23","2025-11-24","2025-12-23",
  "2026-01-01","2026-01-12","2026-02-11","2026-02-23",
  "2026-03-20","2026-04-29","2026-05-03","2026-05-04","2026-05-05","2026-05-06",
  "2026-07-20","2026-08-11","2026-09-21","2026-09-22","2026-09-23","2026-10-12",
  "2026-11-03","2026-11-23",
]);

// 起動時に内閣府データ準拠の祝日APIから最新の祝日を取得してSetを自動更新する
// 取得失敗時はハードコードリストをそのまま使う（ネットワーク不要で動作）
(async () => {
  try {
    const res = await fetch('https://holidays-jp.github.io/api/v1/date.json');
    if (res.ok) {
      const data = await res.json();
      Object.keys(data).forEach(d => JP_HOLIDAYS.add(d));
    }
  } catch(e) { /* フォールバック継続 */ }
})();

export const isBusinessDay = (dateStr) => {
  if (!dateStr) return true;
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay();
  return dow !== 0 && dow !== 6 && !JP_HOLIDAYS.has(dateStr);
};

export const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  return dateStr < TODAY;
};

export const isDueToday = (dateStr) => dateStr === TODAY;

export const isDueSoon = (dateStr) => {
  if (!dateStr || dateStr < TODAY) return false;
  const d = new Date(dateStr + "T00:00:00");
  const t = new Date(TODAY + "T00:00:00");
  return (d - t) / 86400000 <= 2;
};

export function addBusinessDays(dateStr, days) {
  const d = new Date((dateStr || TODAY) + "T00:00:00");
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    const ds = d.toISOString().split("T")[0];
    if (dow !== 0 && dow !== 6 && !JP_HOLIDAYS.has(ds)) added++;
  }
  return d.toISOString().split("T")[0];
}
