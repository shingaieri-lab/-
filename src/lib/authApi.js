// 認証関連API（フロントエンド用）

export async function signup(account) {
  const r = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account),
  });
  if (!r.ok) {
    const e = await r.json();
    throw new Error(e.error || '作成に失敗しました');
  }
}

export async function resetPasswordDirect(id, newPassword) {
  const r = await fetch('/api/reset-password-direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, newPassword }),
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error || 'エラーが発生しました');
  }
}

export async function login(id, password) {
  const r = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, password }),
  });
  if (!r.ok) throw new Error('IDまたはパスワードが違います');
  return r.json();
}

export async function fetchAppData() {
  const r = await fetch('/api/data');
  return r.ok ? r.json() : null;
}
