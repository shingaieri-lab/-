// サーバーAPI層
// アプリ全体のキャッシュ（window.__appData）は将来的にReact Contextへ移行予定

// アプリ内メモリキャッシュの初期値
// Step3（コンポーネント移行）でReact Contextに置き換える
if (!window.__appData) {
  window.__appData = {
    accounts: [],
    leads: [],
    masterSettings: null,
    aiConfig: {},
    gcalConfig: {},
    emailTpls: null,
    zohoConfig: null,
    zohoAuthenticated: false,
  };
}

// POST リクエストを送る共通関数
// ストレージ上限エラー（413/507）とその他エラーをユーザーに通知する
export async function apiPost(path, data) {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    // 413: ペイロードが大きすぎる / 507: Vercel KV の容量不足
    if (res.status === 413 || res.status === 507) {
      console.error('API storage error:', path, res.status);
      alert('データの保存に失敗しました。ストレージの上限に達している可能性があります。管理者にお問い合わせください。');
    } else if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('API error:', path, res.status, errData);
      alert('保存に失敗しました: ' + (errData.error || `エラーコード ${res.status}`));
    }
    return res;
  } catch (e) {
    console.error('API error:', path, e);
  }
}

export async function loadLeads() {
  return window.__appData.leads || [];
}

// リードを保存する。API失敗時はメモリ上のデータを元に戻す（ロールバック）
export async function saveLeads(leads) {
  const prev = window.__appData.leads;
  window.__appData.leads = leads;
  const res = await apiPost('/api/leads', leads);
  if (!res || !res.ok) {
    window.__appData.leads = prev;
  }
}
