// アカウント管理API

export async function getLoginLocks() {
  const r = await fetch('/api/login-locks');
  return r.ok ? r.json() : {};
}

export async function unlockAccount(id) {
  await fetch('/api/login-lock/' + id, { method: 'DELETE' });
}

export async function createInvite() {
  const r = await fetch('/api/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || `エラーコード ${r.status}`);
  }
  return r.json();
}
