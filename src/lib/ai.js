// AI解析API

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
