// AI解析API・AIページ補助ロジック

import { addBizDays } from './holidays.js';

// 上限に達していない最も近い営業日を返す（最大60営業日先まで探す）
export function findAvailableNextDate(leads, proposedDate, dailyLimit = 4) {
  let date = proposedDate;
  for (let i = 0; i < 60; i++) {
    const count = leads.filter(l => l.next_action_date === date).length;
    if (count < dailyLimit) return date;
    date = addBizDays(date, 1);
  }
  return proposedDate;
}

// AIが提案する時間を営業時間（9〜18時、12〜13時除外）に補正する
export function clampToBusinessTime(timeStr) {
  if (!timeStr) return '10:00';
  const [h, m] = timeStr.split(':').map(Number);
  const mins = (isNaN(h) ? 10 : h) * 60 + (isNaN(m) ? 0 : m);
  if (mins < 9 * 60) return '09:00';
  if (mins >= 18 * 60) return '17:00';
  if (mins >= 12 * 60 && mins < 13 * 60) return '13:00';
  return timeStr;
}

export async function testGeminiKey(key) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  return r.ok;
}

export async function analyzeWithAI(prompt) {
  const res = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `エラーコード ${res.status}`);
  if (data.error) throw new Error(data.error.message || data.error.status);
  return data;
}
