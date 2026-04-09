// サーバーAPI層: アプリ共有データストアの初期化とAPI呼び出しを管理する

// アプリ全体で共有するメモリ上のデータストア
// サーバーから取得したデータをここに保持し、コンポーネントが参照する
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

// サーバーへのPOSTリクエスト共通関数
export async function apiPost(path, data) {
  try {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    // 413: ペイロードが大きすぎる / 507: Vercel KV の容量不足
    if (res.status === 413 || res.status === 507) {
      console.error('API storage error:', path, res.status);
      alert('データの保存に失敗しました。ストレージの上限に達している可能性があります。管理者にお問い合わせください。');
    } else if (!res.ok) {
      // バリデーションエラー等はユーザーに表示する
      const errData = await res.json().catch(() => ({}));
      console.error('API error:', path, res.status, errData);
      alert('保存に失敗しました: ' + (errData.error || `エラーコード ${res.status}`));
    }
    return res;
  } catch(e) { console.error('API error:', path, e); }
}

export async function loadLeads() {
  return window.__appData.leads || [];
}

export async function saveLeads(leads) {
  const prev = window.__appData.leads;
  window.__appData.leads = leads;
  const res = await apiPost('/api/leads', leads);
  if (!res || !res.ok) {
    window.__appData.leads = prev; // API失敗時はメモリ上のデータを元に戻す
  }
}
