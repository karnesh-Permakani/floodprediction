import { NavLink } from 'react-router-dom';
import { clearSession } from './utils';

const navGroups = [
  { label:'Overview', items:[
    { to:'/',          icon:'📊', label:'Dashboard' },
    { to:'/monitoring',icon:'🎯', label:'Risk Monitoring' },
  ]},
  { label:'Analysis', items:[
    { to:'/weather',   icon:'🌦️', label:'Weather Analysis' },
    { to:'/history',   icon:'📈', label:'Flood History' },
  ]},
  { label:'Control', items:[
    { to:'/model',     icon:'🤖', label:'Model Control' },
    { to:'/data',      icon:'🗄️', label:'Data Management' },
  ]},
];

export default function Sidebar({ user, onLogout }) {
  function logout(){ clearSession(); onLogout(); }

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div style={{fontSize:24,marginBottom:8}}>⚙️</div>
        <div className="sidebar-logo-text">FLOOD GUARD TN</div>
        <div className="sidebar-logo-sub">ADMIN PANEL</div>
      </div>

      <div className="sidebar-nav">
        {navGroups.map(g=>(
          <div key={g.label} style={{marginBottom:16}}>
            <div className="nav-group-label">{g.label}</div>
            {g.items.map(item=>(
              <NavLink key={item.to} to={item.to} end={item.to==='/'} className={({isActive})=>`nav-item${isActive?' active':''}`}>
                <span style={{fontSize:16}}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>
          👤 {user?.email?.split('@')[0]}
          <div style={{fontSize:10,color:'var(--dim)',marginTop:2}}>Administrator</div>
        </div>
        <button className="btn btn-ghost" onClick={logout} style={{width:'100%',justifyContent:'center',fontSize:12}}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
}
