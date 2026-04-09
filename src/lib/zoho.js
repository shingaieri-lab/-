// Zoho連携API

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

export async function updateZohoLeadStatus(zohoLeadId, localStatus) {
  await fetch('/api/zoho/update-lead-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zohoLeadId, localStatus }),
  }).catch(() => {});
}
