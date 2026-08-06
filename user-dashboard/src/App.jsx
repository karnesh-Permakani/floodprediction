import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar       from './components/Navbar';
import Dashboard    from './pages/Dashboard';
import LiveMap      from './pages/LiveMap';
import Districts    from './pages/Districts';
import History      from './pages/History';
import Safety       from './pages/Safety';
import About        from './pages/About';
import LiveDistrict from './pages/LiveDistrict';
import AiTraining   from './pages/AiTraining';
import './index.css';

function MainLayout({ theme, onToggleTheme }) {
  return (
    <>
      <Navbar theme={theme} onToggleTheme={onToggleTheme} />
      <Routes>
        <Route path="/"              element={<Dashboard />} />
        <Route path="/map"           element={<LiveMap />} />
        <Route path="/live-district" element={<LiveDistrict />} />
        <Route path="/ai-training"   element={<AiTraining />} />
        <Route path="/districts"     element={<Districts />} />
        <Route path="/history"       element={<History />} />
        <Route path="/safety"        element={<Safety />} />
        <Route path="/about"         element={<About />} />
        <Route path="*"              element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('ug-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ug-theme', theme);
  }, [theme]);

  function handleToggleTheme() {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }

  return (
    <BrowserRouter>
      <MainLayout theme={theme} onToggleTheme={handleToggleTheme} />
    </BrowserRouter>
  );
}
