// CSV パース処理
import { normalizeDate } from './date.js';
import { uid } from './holidays.js';
import { getStatuses } from './master.js';
import { MQL_OPTIONS } from '../constants/index.js';

// CSV列名 → データキーのマッピング
export const CSV_COLUMNS = {
  "会社名":               "company",
  "担当者名":             "contact",
  "反響日":               "date",
  "流入元":               "source",
  "ポータルサイト名":     "portal_site",
  "ポータル種別":         "portal_type",
  "課金対象外申請済":     "charge_applied",
  "ステータス":           "status",
  "IS担当":               "is_member",
  "商談日":               "meeting_date",
  "商談時刻":             "meeting_time",
  "担当営業":             "sales_member",
  "Zoho CRM URL":         "zoho_url",
  "HP URL":               "hp_url",
  "IS確度":               "is_accuracy",
  "ネクストアクション日": "next_action_date",
  "ネクストアクション時刻":"next_action_time",
  "ネクストアクションメモ":"next_action",
  "MQL判定":              "mql",
};

// CSV1行をフィールド配列に分解する（クォートで囲まれたカンマを正しく処理）
export function parseCSVLine(line) {
  const fields = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === "," && !inQ) { fields.push(cur.trim()); cur = ""; }
    else { cur += c; }
  }
  fields.push(cur.trim());
  return fields;
}

// CSV テキストを解析してリード配列とエラー配列を返す
export function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 1) return { leads: [], errors: ["データがありません"] };

  let headerIdx = lines.findIndex(l => l.includes("会社名"));

  const FIXED_COLS = [
    "company","contact","date","source","portal_site","portal_type",
    "charge_applied","status","is_member","mql","meeting_date","meeting_time",
    "sales_member","zoho_url","next_action_date","next_action_time","next_action",
  ];

  const leads = []; const errors = [];

  // ヘッダー行なし（固定カラム順）
  if (headerIdx < 0) {
    for (let i = 0; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      if (!vals[0] || vals[0].includes("フォーマット") || vals[0].startsWith("★") || vals[0].startsWith("会社名")) continue;
      const row = {};
      FIXED_COLS.forEach((k, j) => { row[k] = (vals[j] || "").trim(); });
      if (!row.company) continue;
      row.id = uid(); row.actions = []; row.created_at = Date.now();
      row.charge_applied = row.charge_applied === "TRUE" || row.charge_applied === "true";
      if (!getStatuses().includes(row.status)) row.status = getStatuses()[0] || "新規";
      if (!MQL_OPTIONS.includes(row.mql)) row.mql = "非MQL";
      row.date = normalizeDate(row.date);
      row.next_action_date = normalizeDate(row.next_action_date);
      row.meeting_date = normalizeDate(row.meeting_date);
      leads.push(row);
    }
    if (leads.length === 0) return { leads: [], errors: ["データ行が見つかりません。フォーマットのヘッダー行（会社名・担当者名…）が必要です"] };
    return { leads, errors };
  }

  // ヘッダー行あり
  const headers = parseCSVLine(lines[headerIdx]).map(h => h.replace(" ★", ""));
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, j) => { const key = CSV_COLUMNS[h]; if (key) row[key] = (vals[j] || "").trim(); });
    if (!row.company) { errors.push(`${i + 1}行目: 会社名が空のためスキップ`); continue; }
    row.id = uid(); row.actions = []; row.created_at = Date.now();
    row.charge_applied = row.charge_applied === "TRUE" || row.charge_applied === "true";
    if (!getStatuses().includes(row.status)) row.status = getStatuses()[0] || "新規";
    if (!MQL_OPTIONS.includes(row.mql)) row.mql = "非MQL";
    row.date = normalizeDate(row.date);
    row.next_action_date = normalizeDate(row.next_action_date);
    row.meeting_date = normalizeDate(row.meeting_date);
    leads.push(row);
  }
  return { leads, errors };
}
