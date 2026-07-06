import { API_BASE } from './constants';

/** Fetch interpolated predictions (smooth per-minute updates) */
export async function fetchLivePredictions() {
  const res = await fetch(`${API_BASE}/interpolated-predictions`);
  if (!res.ok) throw new Error('Failed to fetch predictions');
  const json = await res.json();
  if (json.status === 'loading') return null;  // not ready yet
  return json.data;
}

/** Fetch with metadata (next refresh time, interpolation info) */
export async function fetchPredictionsWithMeta() {
  const res = await fetch(`${API_BASE}/interpolated-predictions`);
  if (!res.ok) throw new Error('Failed to fetch predictions');
  return await res.json();
}

export async function fetchHistory(district = null) {
  const url = district
    ? `${API_BASE}/history?district=${encodeURIComponent(district)}`
    : `${API_BASE}/history`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch history');
  const json = await res.json();
  return json.data;
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  const json = await res.json();
  return json.data;
}

export async function triggerRetrain() {
  const res = await fetch(`${API_BASE}/retrain`, { method: 'POST' });
  const json = await res.json();
  return json;
}
