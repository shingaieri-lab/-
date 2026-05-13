// IS進捗レポートのビジネスロジック
import { TODAY } from './holidays.js';
import { THIS_MONTH } from './constants.js';

// 自分担当のリードだけを取り出す（is_member フィールドで照合）
export function getMyLeads(leads, memberName) {
  if (!memberName) return [];
  return leads.filter(l => l.is_member === memberName);
}

// 現在ログイン中のユーザーがIS担当として1件以上設定されているか
export function isISMember(leads, memberName) {
  if (!memberName) return false;
  return leads.some(l => l.is_member === memberName);
}

// リードをIS担当者別にグループ化して返す
// 戻り値: [{ member: "名前", leads: [...] }, ...]  担当者名の昇順
export function groupByISMember(leads) {
  const map = {};
  leads.forEach(l => {
    const key = l.is_member || "未割当";
    if (!map[key]) map[key] = [];
    map[key].push(l);
  });
  return Object.entries(map)
    .map(([member, items]) => ({ member, leads: items }))
    .sort((a, b) => {
      if (a.member === "未割当") return 1;
      if (b.member === "未割当") return -1;
      return a.member.localeCompare(b.member, "ja");
    });
}

// ステータス別件数をオブジェクト形式で返す { "追客中": 3, "新規": 1, ... }
export function countByStatus(leads) {
  return leads.reduce((acc, l) => {
    const s = l.status || "未設定";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
}

// サマリー指標を計算して返す
export function calcSummary(leads) {
  const overdue = leads.filter(l => l.next_action_date && l.next_action_date < TODAY).length;
  const dueToday = leads.filter(l => l.next_action_date === TODAY).length;
  const noAction = leads.filter(l => !l.next_action_date).length;
  return { total: leads.length, overdue, dueToday, noAction };
}

// 指定開始日〜今日の架電数を集計（sinceDate: "YYYY-MM-DD"）
export function countCallsSince(leads, sinceDate) {
  return leads.reduce((sum, l) => {
    return sum + (l.actions || []).filter(
      a => a.type === "call" && (a.date || "") >= sinceDate && (a.date || "") <= TODAY
    ).length;
  }, 0);
}

export function countCallsSinceByLead(leads, sinceDate) {
  const result = {};
  leads.forEach(l => {
    result[l.id] = (l.actions || []).filter(
      a => a.type === "call" && (a.date || "") >= sinceDate && (a.date || "") <= TODAY
    ).length;
  });
  return result;
}

// summaryフィールドがJSON文字列の場合にテキストだけ取り出す
export function extractText(raw) {
  if (!raw) return "";
  try {
    const p = JSON.parse(raw);
    return p.action_summary || p.summary || raw;
  } catch {
    return raw;
  }
}

// アクション履歴からルールベースで現状サマリーを生成する（AI不要・常に表示）
// 例: "04-22  資料送付済み。前向きに検討中とのこと…"
export function buildRuleSummary(actions) {
  if (!actions || actions.length === 0) return "";

  const last = actions[0];
  const lastDate = last?.date ? last.date.slice(5).replace("-", "/") : "";
  const memo = extractText(last?.summary || "");
  const memoPart = memo.length > 50 ? memo.slice(0, 50) + "…" : memo;

  return [lastDate, memoPart].filter(Boolean).join("  ");
}

export const ACTION_TYPE_LABEL = { call: '電話', email: 'メール', sms: 'SMS', other: 'その他', consultation: '相談メモ' };

// アクション履歴をAIに渡す要約プロンプトを生成する
export function buildSummaryPrompt(lead) {
  const actions = (lead.actions || []).filter(a => a.type !== 'consultation').slice(0, 8);
  const lines = actions.map(a => {
    const typeLabel = ACTION_TYPE_LABEL[a.type] || a.type;
    const parts = [a.date, typeLabel, a.result, a.summary].filter(Boolean);
    return "- " + parts.join(" ");
  }).join("\n") || "（なし）";

  return `以下のリードのアクション履歴をもとに、現在の追客状況を日本語1文（40文字以内）で要約してください。

リード: ${lead.company || "不明"}
ステータス: ${lead.status || "不明"}

アクション履歴（新しい順）:
${lines}

【出力形式】
- 日本語の文章のみ（1文・40文字以内）
- JSONやコードは絶対に出力しない
- 例：「2回架電で取次あり、資料送付済み。意思決定者との調整待ち。」`;
}

// 電話が繋がっていないか自動検出する
// 直近の架電アクションが2回以上あり、すべて「不在」「留守」「繋がらない」系の結果かどうかを判定する
const UNREACHABLE_RESULT = ['不在', '不通', '留守', '繋がらない', '繋がらず', 'not in'];
const UNREACHABLE_MEMO   = ['繋がら', '不在', '留守'];

function isCallUnreachable(action) {
  const result = (action.result || '').toLowerCase();
  const memo   = extractText(action.summary || '').toLowerCase();
  return UNREACHABLE_RESULT.some(k => result.includes(k.toLowerCase()))
    || UNREACHABLE_MEMO.some(k => memo.includes(k));
}

export function detectUnreachable(lead, minCalls = 2) {
  const calls = (lead.actions || []).filter(a => a.type === 'call');
  if (calls.length < minCalls) return false;
  // 新しい順（配列先頭が最新）で先頭から連続して不在・不通が続く件数を数える
  let consecutive = 0;
  for (const call of calls) {
    if (isCallUnreachable(call)) {
      consecutive++;
    } else {
      break;
    }
  }
  return consecutive >= minCalls;
}

// アクションが止まっているか検出
// opts.stalledNoNextAction:  アクションはあるが次回アクション日が未設定のリードも対象
// opts.stalledOverdueAction: 次回アクション日が期限切れのリードも対象
// opts.stalledLastFailed:    直前の非相談アクション結果が「不在」または「不通」のリードのみ対象
export function detectStalled(lead, days = 14, opts = {}) {
  const { stalledNoNextAction = false, stalledOverdueAction = false, stalledLastFailed = false } = opts;
  const actions = lead.actions || [];

  if (stalledLastFailed) {
    const lastReal = actions.find(a => a.type !== 'consultation');
    const result = lastReal?.result || '';
    if (result !== '不在' && result !== '不通') return false;
  }

  if (actions.length > 0) {
    const lastDate = actions[0].date || '';
    if (lastDate) {
      const diffDays = (new Date(TODAY + 'T00:00:00+09:00') - new Date(lastDate + 'T00:00:00+09:00')) / 86400000;
      if (diffDays >= days) return true;
    }
  }

  if (stalledNoNextAction && actions.length > 0 && !lead.next_action_date) return true;

  if (stalledOverdueAction && lead.next_action_date && lead.next_action_date < TODAY) return true;

  return false;
}

// 相談ボード用のAIプロンプトを生成する
export function buildConsultationPrompt(lead, reason) {
  const reasonText = {
    unreachable: '電話が繋がらない状況が続いている',
    stalled: 'アクションが長期間止まっている',
    flagged: '担当者が相談を希望している',
  }[reason] || '';

  const actions = (lead.actions || []).filter(a => a.type !== 'consultation').slice(0, 5);
  const lines = actions.map(a => {
    const typeLabel = ACTION_TYPE_LABEL[a.type] || a.type;
    return `- ${a.date || ''} ${typeLabel} ${a.result || ''} ${extractText(a.summary || '').slice(0, 50)}`;
  }).join('\n') || '（なし）';

  return `以下のリードについて、上長への相談ドラフトを1〜2文（60文字以内）で生成してください。

リード: ${lead.company || '不明'}
状況: ${reasonText}

アクション履歴（新しい順）:
${lines}

【出力形式】
- 「【自動判定】〇〇〇」形式で書く
- 日本語のみ、JSONは出力しない
- 例：「【自動判定】受付で3回ブロック。別のアプローチが必要」`;
}

// 次アクション日が近い順にソート（期限切れ → 今日 → 近い順 → 未設定）
export function sortByNextAction(leads) {
  return [...leads].sort((a, b) => {
    const ad = a.next_action_date || "";
    const bd = b.next_action_date || "";
    if (!ad && !bd) return 0;
    if (!ad) return 1;
    if (!bd) return -1;
    return ad.localeCompare(bd);
  });
}
