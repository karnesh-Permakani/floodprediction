const measures = [
  { icon:'🚨', title:'Immediate Evacuation', risk:'High',
    steps:['Move to nearest government shelter immediately','Carry essentials: ID, medicines, 3-day food/water','Disconnect electricity at main switch','Do not walk through moving water','Call NDRF Helpline: 1078'] },
  { icon:'🌊', title:'If Trapped by Floodwater', risk:'High',
    steps:['Move to highest floor or rooftop','Signal for help using bright cloth or torch','Do not attempt to swim through floodwater','Avoid electrical hazards','Wait for official rescue teams'] },
  { icon:'⚠️', title:'Flood Watch Precautions', risk:'Moderate',
    steps:['Monitor official alerts and local media','Stock emergency supplies (water, food, torch, battery)','Move vehicles to higher ground','Secure loose outdoor furniture','Keep phone charged and emergency contacts ready'] },
  { icon:'🏠', title:'Home Flood-Proofing', risk:'Moderate',
    steps:['Seal doors and windows with sandbags','Move valuables and electronics to upper floors','Turn off gas and electricity if flooding is imminent','Clear gutters and drains around your home','Know your evacuation route in advance'] },
  { icon:'✅', title:'General Preparedness', risk:'Low',
    steps:['Create a family emergency plan','Prepare a 72-hour emergency kit','Identify evacuation routes and shelters','Register with local emergency services','Stay informed via Tamil Nadu Disaster Management app'] },
  { icon:'📞', title:'Emergency Contacts', risk:'All',
    steps:['NDRF Helpline: 1078','TN Disaster Mgmt: 1070','Police: 100','Ambulance: 108','Fire: 101','Coast Guard: 1554'] },
];

const RISK_BADGE = { High:'badge-high', Moderate:'badge-moderate', Low:'badge-low', All:'badge-low' };

export default function Safety() {
  return (
    <div className="page">
      <div className="container" style={{paddingTop:32,paddingBottom:48}}>
        <div className="page-header">
          <h1>🛡️ Safety Measures & Recommendations</h1>
          <p>Official flood safety guidelines from Tamil Nadu State Disaster Management Authority</p>
        </div>

        {/* Alert */}
        <div style={{
          padding:'20px 24px', borderRadius:14, marginBottom:32,
          background:'linear-gradient(135deg,rgba(59,130,246,0.12),rgba(139,92,246,0.08))',
          border:'1px solid rgba(59,130,246,0.3)',
        }}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:6}}>
            🌊 About Tamil Nadu Flood Risk
          </div>
          <div style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.7}}>
            Tamil Nadu experiences two monsoon seasons — the Northeast Monsoon (Oct–Dec) and Southwest Monsoon (Jun–Sep).
            Coastal districts like Chennai, Nagapattinam, and Cuddalore are historically most vulnerable. The AI system
            monitors all 32 districts 24/7 and updates risk levels every 30 seconds.
          </div>
        </div>

        <div className="grid-2" style={{gap:20}}>
          {measures.map((m,i)=>(
            <div key={i} className="card animate-up" style={{padding:24,animationDelay:`${i*60}ms`}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                <div style={{
                  width:48,height:48,borderRadius:14,fontSize:22,display:'flex',alignItems:'center',justifyContent:'center',
                  background:'rgba(255,255,255,0.05)',border:'1px solid var(--border)'
                }}>{m.icon}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{m.title}</div>
                  <span className={`badge ${RISK_BADGE[m.risk]}`}>{m.risk} Risk</span>
                </div>
              </div>
              <ul style={{paddingLeft:0,listStyle:'none'}}>
                {m.steps.map((s,j)=>(
                  <li key={j} style={{
                    padding:'8px 12px',marginBottom:6,borderRadius:8,fontSize:13,
                    background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.04)',
                    display:'flex',alignItems:'flex-start',gap:10,color:'var(--text-muted)',lineHeight:1.5
                  }}>
                    <span style={{color:'var(--accent)',fontWeight:700,flexShrink:0}}>{j+1}.</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Do's and Don'ts */}
        <div style={{marginTop:32}} className="grid-2">
          <div className="card" style={{padding:24}}>
            <div style={{fontSize:18,fontWeight:700,color:'#22c55e',marginBottom:16}}>✅ DO's During Floods</div>
            {['Stay calm and follow official instructions','Move to higher ground immediately','Carry emergency kit and documents','Help elderly and disabled neighbours','Use official evacuation routes only','Drink only purified/bottled water','Report missing persons to authorities'].map((t,i)=>(
              <div key={i} style={{padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:13,color:'var(--text-muted)',display:'flex',gap:10}}>
                <span style={{color:'#22c55e'}}>✓</span>{t}
              </div>
            ))}
          </div>
          <div className="card" style={{padding:24}}>
            <div style={{fontSize:18,fontWeight:700,color:'#ef4444',marginBottom:16}}>❌ DON'Ts During Floods</div>
            {["Don't walk through moving floodwater","Don't ignore evacuation orders","Don't touch electrical equipment in flood zones","Don't drive through flooded roads","Don't consume flood-contaminated food","Don't spread rumours or misinformation","Don't return home until officially cleared"].map((t,i)=>(
              <div key={i} style={{padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:13,color:'var(--text-muted)',display:'flex',gap:10}}>
                <span style={{color:'#ef4444'}}>✗</span>{t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
