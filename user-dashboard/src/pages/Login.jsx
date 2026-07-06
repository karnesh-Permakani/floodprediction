import { useState } from 'react';
import { loginUser, setSession } from '../utils/auth';

export default function Login({ onLogin }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  function handle(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const user = loginUser(email.trim(), password);
      if (user) { setSession(user); onLogin(user); }
      else { setError('Invalid email or password. Please try again.'); }
      setLoading(false);
    }, 800);
  }

  return (
    <div className="auth-wrap" style={{
      background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.15) 0%, transparent 70%), var(--bg-primary)'
    }}>
      <div className="auth-card glass animate-up">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: '0 0 40px rgba(59,130,246,0.35)'
          }}>🌊</div>
          <div style={{
            fontFamily: "'Orbitron', monospace", fontSize: 20, fontWeight: 900,
            letterSpacing: 2, background: 'linear-gradient(135deg,#60a5fa,#a78bfa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>FLOOD GUARD TN</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: 3, marginTop: 2 }}>
            AI FLOOD PREDICTION SYSTEM
          </div>
        </div>

        <h1>Welcome back</h1>
        <p>Sign in to access the live flood monitoring dashboard</p>

        <form onSubmit={handle}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email" value={email} placeholder="your@email.com"
              onChange={e => setEmail(e.target.value)} required autoFocus
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password} placeholder="••••••••"
                onChange={e => setPassword(e.target.value)}
                required style={{ paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer',
                  fontSize:16 }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="form-error" style={{
            background:'rgba(239,68,68,0.1)', padding:'10px 14px',
            borderRadius:8, marginBottom:16
          }}>⚠️ {error}</div>}

          <button className="btn btn-primary" type="submit"
            disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:15 }}>
            {loading ? <><div style={{width:18,height:18,border:'2px solid rgba(255,255,255,0.3)',
              borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
              Signing in…</> : '🔐 Sign In'}
          </button>
        </form>

        <div className="form-sep">Demo Credentials</div>
        <div style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 16px',
          border: '1px solid var(--border)', fontSize: 12
        }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>📧 user@floodtn.gov.in</div>
          <div style={{ color: 'var(--text-muted)' }}>🔑 user@1234</div>
        </div>

        <div style={{ textAlign:'center', marginTop:24, fontSize:12, color:'var(--text-dim)' }}>
          🔒 Secured by Tamil Nadu State Disaster Management Authority
        </div>
      </div>
    </div>
  );
}
