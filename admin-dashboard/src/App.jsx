import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getSession, setSession } from './utils';
import AdminLogin from './AdminLogin';
import Sidebar from './Sidebar';
import { AdminDashboard, RiskMonitoring, WeatherAnalysis, ModelControl, DataManagement } from './AdminPages';
import './index.css';

function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="theme-toggle"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
      style={{ marginLeft: 12 }}
    />
  );
}

function AdminLayout({ user, onLogout, theme, onToggleTheme }) {
  return (
    <div className="admin-layout">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="main-area">
        <div className="topbar">
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
            Flood Guard TN — Admin Panel
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="live">LIVE MONITORING</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              👤 {user?.email?.split('@')[0]}
            </div>
            <span style={{ fontSize: 12, color: 'var(--dim)' }}>
              {theme === 'dark' ? '🌙' : '☀️'}
            </span>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>
        <Routes>
          <Route path="/"           element={<AdminDashboard />} />
          <Route path="/monitoring" element={<RiskMonitoring />} />
          <Route path="/weather"    element={<WeatherAnalysis />} />
          <Route path="/model"      element={<ModelControl />} />
          <Route path="/data"       element={<DataManagement />} />
          <Route path="*"           element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(getSession);
  // Light mode is default
  const [theme, setTheme] = useState(() => localStorage.getItem('ag-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ag-theme', theme);
  }, [theme]);

  function handleToggleTheme() {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }

  function handleLogin(u) { setSession(u); setUser(u); }
  function handleLogout() { setUser(null); }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <AdminLogin onLogin={handleLogin} />} />
        <Route path="/*"     element={user
          ? <AdminLayout user={user} onLogout={handleLogout} theme={theme} onToggleTheme={handleToggleTheme} />
          : <AdminLogin onLogin={handleLogin} />}
        />
      </Routes>
    </BrowserRouter>
  );
}
