// Zoho連携API

// ZohoのURLや生IDから、Lead/Dealの種別とIDを抽出する
// Zohoの画面URLは「商談」が `Potentials` パスで表現される（API名はDealsだが、画面URLパスはPotentials）
// 受け付ける形式：
//   - 旧形式: "https://crm.zoho.jp/crm/tab/Leads/1234567890"           → { type: 'Lead', id }
//   - 新形式: "https://crm.zoho.jp/crm/org12345/tab/Leads/1234567890"  → { type: 'Lead', id }
//   - 旧形式: "https://crm.zoho.jp/crm/tab/Deals/9876543210"           → { type: 'Deal', id }
//   - 新形式: "https://crm.zoho.jp/crm/org12345/tab/Potentials/9876543210" → { type: 'Deal', id }
//   - 生ID:   "1234567890" → { type: null, id: '1234567890' }
//   - 不正:   その他 → null
export function parseZohoUrl(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  // URL形式：/Leads/<id> / /Deals/<id> / /Potentials/<id>（新URL形式の商談画面）
  const urlMatch = trimmed.match(/\/(Leads|Deals|Potentials)\/(\d+)/);
  if (urlMatch) {
    const [, mod, id] = urlMatch;
    // Potentials も Deals と同じ「商談（Deal）」扱い
    return { type: mod === 'Leads' ? 'Lead' : 'Deal', id };
  }
  // 生ID（数字のみ）
  if (/^\d+$/.test(trimmed)) {
    return { type: null, id: trimmed };
  }
  return null;
}

// データセンター(jp/com)に応じた ZohoのCRMドメインを返す
export function getZohoCrmDomain() {
  const dc = window.__appData?.zohoConfig?.dataCenter || 'jp';
  return dc === 'com' ? 'zoho.com' : 'zoho.jp';
}

// Lead/Deal IDから Zoho の画面URLを組み立てる（フォールバック用）
// 注意：Zohoの新URL形式は /crm/org{ID}/tab/... のように組織IDを含むが、
// ここでは組織ID不明のため旧形式で組み立てる。Zoho側でリダイレクトが効くケースが多い。
// 商談画面のパスは Potentials（API名 Deals とは異なる）
export function buildZohoUrl(type, id) {
  const domain = getZohoCrmDomain();
  const path = type === 'Deal' ? 'Potentials' : 'Leads';
  return `https://crm.${domain}/crm/tab/${path}/${id}`;
}


export async function createZohoDeal(lead) {
  const res = await fetch('/api/zoho/create-deal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function pushZohoAction(zohoLeadId, action) {
  const res = await fetch('/api/zoho/push-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zohoLeadId, action }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function saveZohoConfig(cfg) {
  const res = await fetch('/api/zoho-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg),
  });
  if (res.ok) return { ok: true };
  const d = await res.json().catch(() => ({}));
  return { ok: false, error: d.error || res.status };
}

export async function importZohoLead(zohoLeadId) {
  const res = await fetch('/api/zoho/import-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zohoLeadId }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function fetchZohoUsers() {
  const res = await fetch('/api/zoho/users');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Zohoユーザー取得失敗');
  return data.users;
}

export async function updateZohoLeadStatus(zohoLeadId, localStatus) {
  await fetch('/api/zoho/update-lead-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zohoLeadId, localStatus }),
  }).catch(() => {});
}

// 【開発用】Zohoの指定モジュール（Deals等）のフィールド一覧を取得
// 営業確度・ステージなどのAPI名（半角英数字）を確認するための開発者向け関数
export async function fetchZohoModuleFields(module = 'Deals') {
  const res = await fetch('/api/zoho/module-fields?module=' + encodeURIComponent(module));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'フィールド取得失敗');
  return data.fields;
}

// Zohoから商談確定リード全件の営業確度・ステージを同期取得
// 返却: { ok, synced, total, skipped, errors, leads }
export async function syncZohoDeals() {
  const res = await fetch('/api/zoho/sync-deals', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '同期失敗');
  return data;
}
