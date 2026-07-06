import { useState } from 'react';
import { loginAdmin, setSession } from './utils';

export default function AdminLogin({ onLogin }) {
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showP,   setShowP]   = useState(false);

  function handle(e) {
    e.preventDefault(); setError(''); setLoading(true);
    setTimeout(()=>{
      const u = loginAdmin(email.trim(), pass);
      if (u) { setSession(u); onLogin(u); }
      else setError('Invalid admin credentials.');
      setLoading(false);
    }, 800);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card a-up">
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{
            width:60,height:60,borderRadius:16,margin:'0 auto 14px',
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:26,boxShadow:'0 0 40px rgba(99,102,241,0.4)'
          }}>⚙️</div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:14,fontWeight:900,letterSpacing:2,
            background:'linear-gradient(135deg,#818cf8,#a78bfa)',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            FLOOD GUARD TN
          </div>
          <div style={{fontSize:10,color:'var(--dim)',letterSpacing:3,marginTop:2}}>ADMIN CONTROL PANEL</div>
        </div>

        <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>Administrator Login</div>
        <div style={{fontSize:13,color:'var(--muted)',marginBottom:28}}>Restricted access — authorized personnel only</div>

        <form onSubmit={handle}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="admin@floodtn.gov.in" required autoFocus/>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div style={{position:'relative'}}>
              <input type={showP?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)}
                placeholder="••••••••" required style={{paddingRight:44}}/>
              <button type="button" onClick={()=>setShowP(p=>!p)}
                style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',
                  background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:15}}>
                {showP?'🙈':'👁️'}
              </button>
            </div>
          </div>
          {error && <div style={{color:'#fca5a5',fontSize:12,background:'rgba(239,68,68,0.1)',padding:'9px 13px',borderRadius:8,marginBottom:14}}>⚠️ {error}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{width:'100%',justifyContent:'center',padding:'13px',fontSize:14}}>
            {loading
              ? <><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>Authenticating…</>
              : '🔐 Sign In as Admin'}
          </button>
        </form>

        <div style={{marginTop:20,padding:'12px 14px',borderRadius:9,border:'1px solid var(--border)',background:'rgba(255,255,255,0.02)',fontSize:12}}>
          <div style={{color:'var(--muted)',marginBottom:5}}>📧 admin@floodtn.gov.in</div>
          <div style={{color:'var(--muted)'}}>🔑 admin@1234</div>
        </div>
      </div>
    </div>
  );
}
