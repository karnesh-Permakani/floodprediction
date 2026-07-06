export const API_BASE = 'http://localhost:5000/api';

export const ADMIN_CREDENTIALS = {
  email: 'admin@floodtn.gov.in', password: 'admin@1234', role: 'admin', name: 'Admin'
};

export function loginAdmin(email, password) {
  if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password)
    return { ...ADMIN_CREDENTIALS };
  return null;
}
export function getSession() {
  try { const s=sessionStorage.getItem('flood_admin'); return s?JSON.parse(s):null; } catch{return null;}
}
export function setSession(u) { sessionStorage.setItem('flood_admin', JSON.stringify(u)); }
export function clearSession() { sessionStorage.removeItem('flood_admin'); }

/** Fetch interpolated predictions with metadata */
export async function fetchLivePredictions() {
  const r = await fetch(`${API_BASE}/interpolated-predictions`);
  const j = await r.json();
  if (j.status === 'loading') return null;
  return j.data;
}

/** Fetch with full meta (next_refresh_in, risk_summary, thresholds) */
export async function fetchPredictionsWithMeta() {
  const r = await fetch(`${API_BASE}/interpolated-predictions`);
  return r.json();
}

export async function fetchHistory() {
  const r = await fetch(`${API_BASE}/history`);
  const j = await r.json(); return j.data;
}
export async function fetchStats() {
  const r = await fetch(`${API_BASE}/stats`);
  const j = await r.json(); return j.data;
}
export async function triggerRetrain() {
  const r = await fetch(`${API_BASE}/retrain`, {method:'POST'});
  return r.json();
}
