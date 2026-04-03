// 日付ユーティリティ

// 日付を YYYY-MM-DD に正規化する
// 対応フォーマット: "YYYY-MM-DD"（そのまま）、"YYYY/M/D" or "YYYY-M-D"（ゼロ埋め変換）
// CSVインポート・リード編集・ダッシュボードすべてでこの関数を経由するため
// 保存データの日付フォーマットは常に YYYY-MM-DD に統一される
export function normalizeDate(s) {
  if (!s) return "";
  s = s.trim();
  // 既に YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // YYYY/M/D or YYYY-M-D（月・日が1桁でもOK）
  const m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return s;
}
