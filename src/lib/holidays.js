// 祝日・営業日ユーティリティ

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
  } catch (e) { /* フォールバック継続 */ }
})();

// TODAYはconstants.jsで一元管理（JST対応）。関数内でも参照するためimportする
import { TODAY, THIS_MONTH, uid } from './constants.js';
export { TODAY, THIS_MONTH, uid };

// 指定日が営業日かどうかを判定（土日・祝日はfalse）
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

// 指定日から営業日数後の日付を返す（土日・祝日をスキップ）
export const addBizDays = (dateStr, days) => {
  let d = new Date(dateStr + "T00:00:00"), c = 0;
  while (c < days) {
    d.setDate(d.getDate() + 1);
    const s = d.toISOString().split("T")[0];
    if (d.getDay() !== 0 && d.getDay() !== 6 && !JP_HOLIDAYS.has(s)) c++;
  }
  return d.toISOString().split("T")[0];
};
