import { NavLink } from 'react-router-dom';

const links = [
  { to: '/',               label: 'Dashboard' },
  { to: '/map',            label: 'Live Map' },
  { to: '/live-district',  label: '📍 Live District' },
  { to: '/ai-training',    label: '🧠 AI Training' },
  { to: '/districts',      label: 'Districts' },
  { to: '/history',        label: 'History' },
  { to: '/safety',         label: 'Safety' },
  { to: '/about',          label: 'About' },
];

export default function Navbar({ theme, onToggleTheme }) {
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
        <div className="live-dot">LIVE MONITORING</div>
        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            background: 'var(--border)', border: 'none', cursor: 'pointer',
            borderRadius: 20, padding: '5px 12px', fontSize: 14,
            transition: 'all 0.2s', color: 'var(--text)'
          }}
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
    </nav>
  );
}
