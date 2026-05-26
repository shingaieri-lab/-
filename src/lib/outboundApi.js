// アウトバウンド機能のAPI呼び出し・ユーティリティ層

// リスト一覧取得
export async function fetchOutboundLists() {
  const r = await fetch('/api/outbound/lists');
  if (!r.ok) throw new Error('リスト取得に失敗しました');
  return r.json();
}

// リスト作成（CSVデータ込み）
export async function createOutboundList(name, leads) {
  const r = await fetch('/api/outbound/lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, leads }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || 'リスト作成に失敗しました');
  }
  return r.json();
}

// リスト削除
export async function deleteOutboundList(listId) {
  const r = await fetch(`/api/outbound/lists/${listId}`, { method: 'DELETE' });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || '削除に失敗しました');
  }
}

// リード一覧取得
export async function fetchOutboundLeads(listId) {
  const r = await fetch(`/api/outbound/leads/${listId}`);
  if (!r.ok) throw new Error('架電リスト取得に失敗しました');
  return r.json();
}

// リード保存（配列ごと上書き）
export async function saveOutboundLeads(listId, leads) {
  const r = await fetch(`/api/outbound/leads/${listId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leads),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || '保存に失敗しました');
  }
}

// Chatwork送信
export async function sendChatwork(message) {
  const r = await fetch('/api/outbound/chatwork', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || 'Chatwork送信に失敗しました');
  }
}

// Chatwork設定取得（admin用）
export async function fetchOutboundConfig() {
  const r = await fetch('/api/outbound/config', { cache: 'no-store' });
  if (!r.ok) throw new Error('設定取得に失敗しました');
  return r.json();
}

// Chatwork設定保存（admin用）
export async function saveOutboundConfig(config) {
  const r = await fetch('/api/outbound/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || '設定保存に失敗しました');
  }
}

// 列マッピング（CSV・Excel共通）
function buildColMap(headers) {
  const h = headers.map(v => String(v ?? '').trim().toLowerCase());
  return {
    company:  h.findIndex(v => ['company',  '会社名'].includes(v)),
    contact:  h.findIndex(v => ['contact',  '担当者名', '担当者'].includes(v)),
    phone:    h.findIndex(v => ['phone',    '電話番号', '電話'].includes(v)),
    mobile:   h.findIndex(v => ['mobile',   '携帯番号', '携帯'].includes(v)),
    email:    h.findIndex(v => ['email',    'メール', 'メールアドレス'].includes(v)),
    industry: h.findIndex(v => ['industry', '業種'].includes(v)),
    position: h.findIndex(v => ['position', '役職'].includes(v)),
    address:  h.findIndex(v => ['address',  '住所'].includes(v)),
    memo:     h.findIndex(v => ['memo',     'メモ', '備考'].includes(v)),
  };
}

function rowToLead(cols, colMap) {
  const get = (k) => colMap[k] >= 0 ? String(cols[colMap[k]] ?? '').trim() : '';
  return { company: get('company'), contact: get('contact'), phone: get('phone'), mobile: get('mobile'), email: get('email'), industry: get('industry'), position: get('position'), address: get('address'), memo: get('memo') };
}

// アウトバウンド用 Excel パース（.xlsx / .xls）
// SheetJSを動的インポートすることで通常画面のバンドルサイズに影響させない
export async function parseOutboundExcel(arrayBuffer) {
  const XLSX = await import('xlsx');
  const wb   = XLSX.read(arrayBuffer, { type: 'array', cellText: false, cellDates: true });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // # で始まるコメント行・空行をスキップ
  const dataRows = rows.filter(r => {
    const first = String(r[0] ?? '').trim();
    return first !== '' && !first.startsWith('#');
  });

  if (dataRows.length < 2) return { leads: [], errors: ['ヘッダー行とデータ行が必要です'] };

  const colMap = buildColMap(dataRows[0]);
  const errors = [];
  const leads  = [];

  dataRows.slice(1).forEach((row, i) => {
    const lead = rowToLead(row, colMap);
    if (!lead.company) { errors.push(`${i + 2}行目: 会社名が空のためスキップ`); return; }
    leads.push(lead);
  });

  return { leads, errors };
}

// アウトバウンド用CSVパース
// 対応列: 会社名, 担当者名, 電話番号, 携帯番号, メールアドレス, 業種, 役職, 住所, メモ
export function parseOutboundCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
  if (lines.length < 2) return { leads: [], errors: ['ヘッダー行とデータ行が必要です'] };

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
  const colMap = buildColMap(headers);

  const errors = [];
  const leads = [];

  lines.slice(1).forEach((line, i) => {
    const cols = splitCSVLine(line);
    const company = colMap.company >= 0 ? (cols[colMap.company] || '').trim() : '';
    if (!company) { errors.push(`${i + 2}行目: 会社名が空のためスキップ`); return; }
    leads.push({
      company,
      contact:  colMap.contact  >= 0 ? (cols[colMap.contact]  || '').trim() : '',
      phone:    colMap.phone    >= 0 ? (cols[colMap.phone]    || '').trim() : '',
      mobile:   colMap.mobile   >= 0 ? (cols[colMap.mobile]   || '').trim() : '',
      email:    colMap.email    >= 0 ? (cols[colMap.email]    || '').trim() : '',
      industry: colMap.industry >= 0 ? (cols[colMap.industry] || '').trim() : '',
      position: colMap.position >= 0 ? (cols[colMap.position] || '').trim() : '',
      address:  colMap.address  >= 0 ? (cols[colMap.address]  || '').trim() : '',
      memo:     colMap.memo     >= 0 ? (cols[colMap.memo]     || '').trim() : '',
    });
  });

  return { leads, errors };
}

function splitCSVLine(line) {
  const cols = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { cols.push(cur); cur = ''; }
    else { cur += c; }
  }
  cols.push(cur);
  return cols.map(c => c.replace(/^"(.*)"$/, '$1'));
}

// 全リストのアポ獲得リード一括取得
export async function fetchOutboundAppointments() {
  const r = await fetch('/api/outbound/appointments');
  if (!r.ok) throw new Error('アポデータの取得に失敗しました');
  return r.json();
}

// アポ単価文字列（例: '20,000円'）を数値に変換
export const parseAppointPrice = (str) =>
  str ? parseInt(str.replace(/[^\d]/g, ''), 10) || 0 : 0;

// Chatwork送信メッセージ生成
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function buildChatworkMessage(lead) {
  const info = lead.appointmentInfo || {};

  let meetingDatetime = '';
  if (info.meetingDate) {
    const weekday = WEEKDAYS[new Date(info.meetingDate + 'T00:00:00').getDay()];
    meetingDatetime = `${info.meetingDate}（${weekday}）${info.meetingTime ? ' ' + info.meetingTime : ''}`;
  }

  const lines = [
    'お疲れ様です、アポイントを獲得したので報告致します。',
    '',
    `リスト：${lead.listName || ''}`,
    `営業担当者：${info.salesPerson || ''}`,
    `企業名：${lead.company || ''}`,
    `会社HP：${info.website || ''}`,
    `住所：${info.address || ''}`,
    `役職/氏名：${[lead.position, lead.contact].filter(Boolean).join(' / ')}`,
    `電話番号：${lead.phone || ''}`,
    `携帯電話：${lead.mobile || ''}`,
    `メールアドレス：${lead.email || ''}`,
    `商談獲得日：${info.confirmedDate || ''}`,
    `商談日時：${meetingDatetime}`,
    `工事内容：${info.construction || ''}`,
    `ランク：${info.rank || ''}`,
    '',
    '【概要】',
    info.note || '',
  ];
  return lines.join('\n');
}
