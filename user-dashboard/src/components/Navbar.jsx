import { NavLink, useNavigate } from 'react-router-dom';
import { clearSession } from '../utils/auth';

const links = [
  { to: '/',          label: 'Dashboard' },
  { to: '/map',       label: 'Live Map' },
  { to: '/districts', label: 'Districts' },
  { to: '/history',   label: 'History' },
  { to: '/safety',    label: 'Safety' },
  { to: '/about',     label: 'About' },
];

export default function Navbar({ user, theme, onToggleTheme }) {
  const navigate = useNavigate();
  function logout() { clearSession(); navigate('/login'); }

  return (
    <nav className="nav">
      <div className="nav-logo">⛈ Flood Guard TN</div>
      <div className="nav-links">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {l.label}
          </NavLink>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="live-dot">LIVE</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          👤 {user?.email?.split('@')[0]}
        </div>
        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            background: 'var(--border)', border: 'none', cursor: 'pointer',
            borderRadius: 20, padding: '5px 10px', fontSize: 14,
            transition: 'all 0.2s', color: 'var(--text-muted)'
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button className="btn btn-ghost" onClick={logout} style={{ padding: '7px 14px', fontSize: 12 }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
