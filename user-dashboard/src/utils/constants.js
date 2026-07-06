// API base URL - change if backend is on a different port
export const API_BASE = 'http://localhost:5000/api';

export const RISK_COLORS = {
  High:     '#ef4444',
  Moderate: '#f97316',
  Low:      '#22c55e',
};

export const RISK_GRADIENTS = {
  High:     'linear-gradient(135deg,#ef4444,#991b1b)',
  Moderate: 'linear-gradient(135deg,#f97316,#c2410c)',
  Low:      'linear-gradient(135deg,#22c55e,#15803d)',
};

export const RISK_BG = {
  High:     'rgba(239,68,68,0.15)',
  Moderate: 'rgba(249,115,22,0.15)',
  Low:      'rgba(34,197,94,0.15)',
};

export function weatherIcon(code) {
  if (code === 0) return '☀️';
  if ([1,2,3].includes(code)) return '⛅';
  if ([45,48].includes(code)) return '🌫️';
  if ([51,53,55,56,57].includes(code)) return '🌦️';
  if ([61,63,65,66,67].includes(code)) return '🌧️';
  if ([71,73,75,77].includes(code)) return '❄️';
  if ([80,81,82].includes(code)) return '🌨️';
  if ([95,96,99].includes(code)) return '⛈️';
  return '🌤️';
}

export function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
