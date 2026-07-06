export default function About() {
  const tech = [
    { icon:'🐍', name:'Python Flask',     desc:'REST API backend serving ML predictions and live weather data' },
    { icon:'🤖', name:'Random Forest',    desc:'90.97% accurate ML classifier trained on Tamil Nadu flood data' },
    { icon:'⚛️', name:'React + Vite',     desc:'High-performance frontend with real-time state management' },
    { icon:'🗺️', name:'React Leaflet',   desc:'Interactive map rendering all 32 TN districts with risk markers' },
    { icon:'📊', name:'Chart.js',         desc:'Dynamic bar, pie, and line charts for visualization' },
    { icon:'🌦️', name:'Open-Meteo API', desc:'Live weather data fetched every 30 seconds for all districts' },
    { icon:'🌊', name:'Tidal Prediction', desc:'Scientific tidal height data integrated with ML prediction pipeline' },
    { icon:'🔒', name:'Secure Auth',      desc:'Role-based login for User and Admin dashboards' },
  ];
  const team = [
    { role:'ML Engineer',           task:'Model training, feature engineering, accuracy tuning' },
    { role:'Backend Developer',     task:'Flask API design, Open-Meteo integration, tidal data pipeline' },
    { role:'Frontend Developer',    task:'React UI, Leaflet maps, Chart.js visualizations' },
    { role:'Data Analyst',          task:'Tamil Nadu district data, historical flood analysis' },
  ];

  return (
    <div className="page">
      <div className="container" style={{paddingTop:32,paddingBottom:64}}>
        {/* Hero */}
        <div style={{textAlign:'center',padding:'48px 24px',marginBottom:48}}>
          <div style={{
            width:80,height:80,borderRadius:24,margin:'0 auto 24px',
            background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:36,boxShadow:'0 0 60px rgba(59,130,246,0.4)'
          }}>🌊</div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:24,fontWeight:900,letterSpacing:3,
            background:'linear-gradient(135deg,#60a5fa,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:8}}>
            FLOOD GUARD TN
          </div>
          <h1 style={{fontSize:28,fontWeight:800,marginBottom:12}}>
            AI-Powered Flood Prediction System
          </h1>
          <p style={{color:'var(--text-muted)',maxWidth:600,margin:'0 auto',fontSize:15,lineHeight:1.7}}>
            A state-of-the-art flood monitoring and early warning system for Tamil Nadu, 
            combining machine learning, live weather data, and tidal predictions to protect 
            lives across all 32 districts.
          </p>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{marginBottom:48}}>
          {[
            {v:'90.97%',l:'Model Accuracy',icon:'🎯'},
            {v:'32',l:'Districts Monitored',icon:'📍'},
            {v:'30s',l:'Update Interval',icon:'⚡'},
            {v:'15,000+',l:'Training Samples',icon:'📊'},
          ].map((s,i)=>(
            <div key={i} className="card" style={{padding:24,textAlign:'center'}}>
              <div style={{fontSize:28,marginBottom:8}}>{s.icon}</div>
              <div className="stat-number" style={{fontSize:30,marginBottom:4}}>{s.v}</div>
              <div style={{fontSize:12,color:'var(--text-muted)'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tech Stack */}
        <div style={{marginBottom:48}}>
          <div className="section-title" style={{fontSize:20,marginBottom:20}}>⚙️ Technology Stack</div>
          <div className="grid-2" style={{gap:16}}>
            {tech.map((t,i)=>(
              <div key={i} className="card" style={{padding:20,display:'flex',gap:16,alignItems:'flex-start'}}>
                <div style={{fontSize:28,flexShrink:0}}>{t.icon}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{t.name}</div>
                  <div style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.5}}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="card" style={{padding:32,marginBottom:32}}>
          <div style={{fontSize:20,fontWeight:700,marginBottom:20}}>🔄 How It Works</div>
          <div style={{display:'flex',gap:0,flexWrap:'wrap'}}>
            {[
              {n:'1',t:'Live Weather Fetch',d:'Open-Meteo API fetches real-time temperature, rainfall, humidity, wind, and pressure for each district every 30 seconds.'},
              {n:'2',t:'Tidal Data Integration',d:'Pre-loaded tidal prediction tables provide accurate sea level data for all 11 coastal districts of Tamil Nadu.'},
              {n:'3',t:'ML Prediction',d:'The Random Forest model (90.97% accuracy) processes all 10 features and outputs flood probability and risk classification.'},
              {n:'4',t:'Live Dashboard',d:'Results are displayed on the interactive map, charts, and district tables, updating automatically in real-time.'},
            ].map((s,i)=>(
              <div key={i} style={{flex:'1 1 200px',padding:'16px 20px',borderRight:i<3?'1px solid var(--border)':'none'}}>
                <div style={{
                  width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',
                  display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,marginBottom:12
                }}>{s.n}</div>
                <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>{s.t}</div>
                <div style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.6}}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{textAlign:'center',padding:24,color:'var(--text-dim)',fontSize:12}}>
          © 2025 Flood Guard TN · Tamil Nadu State Disaster Management Authority · Built with ❤️ for Public Safety
        </div>
      </div>
    </div>
  );
}
