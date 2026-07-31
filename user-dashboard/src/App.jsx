import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getSession, setSession } from './utils/auth';
import Navbar    from './components/Navbar';
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveMap   from './pages/LiveMap';
import Districts from './pages/Districts';
import History   from './pages/History';
import Safety    from './pages/Safety';
import About        from './pages/About';
import LiveDistrict from './pages/LiveDistrict';
import './index.css';

function ProtectedLayout({ user, onLogin, theme, onToggleTheme }) {
  if (!user) return <Login onLogin={onLogin} />;
  return (
    <>
      <Navbar user={user} theme={theme} onToggleTheme={onToggleTheme} />
      <Routes>
        <Route path="/"          element={<Dashboard />} />
        <Route path="/map"       element={<LiveMap />} />
        <Route path="/districts" element={<Districts />} />
        <Route path="/history"   element={<History />} />
        <Route path="/safety"    element={<Safety />} />
        <Route path="/about"          element={<About />} />
        <Route path="/live-district"   element={<LiveDistrict />} />
        <Route path="*"          element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(getSession);
  // Light mode is default
  const [theme, setTheme] = useState(() => localStorage.getItem('ug-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ug-theme', theme);
  }, [theme]);

  function handleToggleTheme() {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }

  function handleLogin(u) { setUser(u); }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
        <Route path="/*"     element={
          <ProtectedLayout
            user={user}
            onLogin={handleLogin}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          />
        } />
      </Routes>
    </BrowserRouter>
  );
}
