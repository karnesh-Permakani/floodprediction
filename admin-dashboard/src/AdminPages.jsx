import { useEffect, useState } from 'react';
import { fetchLivePredictions, fetchPredictionsWithMeta, fetchStats, triggerRetrain } from './utils';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend);

const THRESHOLDS = { moderate: 45, high: 65 };

const RC = { High:'#ef4444', Moderate:'#f97316', Low:'#22c55e' };

function KPI({ label, value, sub, color, icon }) {
  return (
    <div className="card kpi" style={{ borderTop:`2px solid ${color}` }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <div className="kpi-label">{label}</div>
          <div className="kpi-value" style={{color,fontSize:28}}>{value}</div>
          <div className="kpi-sub">{sub}</div>
        </div>
        <div style={{fontSize:24,opacity:0.8}}>{icon}</div>
      </div>
    </div>
  );
}

// ── LoRa Sensor Node Panel ───────────────────────────────────────────
function LoRaSensorPanel() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('connecting');

  async function fetchSensor() {
    try {
      const resp = await fetch('http://localhost:5000/api/sensor-data');
      const json = await resp.json();
      if (json.status === 'online') {
        setData(json.data);
        setStatus('online');
      } else {
        setStatus('offline');
      }
    } catch (e) {
      setStatus('error');
    }
  }

  useEffect(() => {
    fetchSensor();
    const t = setInterval(fetchSensor, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="card" style={{ padding: 20, background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, background: status === 'online' ? '#22c55e' : '#ef4444', borderRadius: '50%', display: 'inline-block', boxShadow: status === 'online' ? '0 0 10px #22c55e' : 'none' }}></span>
          {data && data.source ? data.source : 'LoRa Node (172.16.48.13)'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)' }}>Real-time stream</div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={{ textAlign: 'center', padding: '10px 5px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 2 }}>WATER LEVEL</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#60a5fa' }}>{data ? data.water_level : '--'}m</div>
        </div>
        <div style={{ textAlign: 'center', padding: '10px 5px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 2 }}>RAINFALL</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#22d3ee' }}>{data ? data.rainfall : '--'}mm</div>
        </div>
        <div style={{ textAlign: 'center', padding: '10px 5px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 2 }}>TEMP</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f97316' }}>{data ? data.temperature : '--'}°C</div>
        </div>
      </div>
    </div>
  );
}

// ── Admin Dashboard (Overview) ─────────────────────────────────────
export function AdminDashboard() {
  const [districts, setDistricts] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [lastUpd,   setLastUpd]   = useState('');
  const [retraining,setRetraining]= useState(false);
  const [retrainMsg,setRetrainMsg]= useState('');

  async function load() {
    try {
      const json = await fetchPredictionsWithMeta();
      if (json.status === 'loading') return;
      setDistricts(json.data || []);
      setLastUpd(new Date().toLocaleTimeString('en-IN'));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); const t=setInterval(load,60000); return()=>clearInterval(t); },[]);

  async function retrain() {
    setRetraining(true); setRetrainMsg('');
    try {
      await triggerRetrain();
      setRetrainMsg('Model retraining started successfully!');
    } catch { setRetrainMsg('Retraining request sent.'); }
    finally { setRetraining(false); setTimeout(()=>setRetrainMsg(''),5000); }
  }

  const h=districts.filter(d=>d.risk_level==='High').length;
  const m=districts.filter(d=>d.risk_level==='Moderate').length;
  const l=districts.filter(d=>d.risk_level==='Low').length;
  const avgTemp=(districts.reduce((s,d)=>s+d.temperature_c,0)/(districts.length||1)).toFixed(1);
  const avgRain=(districts.reduce((s,d)=>s+d.rainfall_mm,0)/(districts.length||1)).toFixed(1);
  const avgHum=(districts.reduce((s,d)=>s+d.humidity_pct,0)/(districts.length||1)).toFixed(1);

  const donutData={
    labels:['High Risk','Moderate','Safe'],
    datasets:[{data:[h,m,l],backgroundColor:['#ef444488','#f9731688','#22c55e88'],
      borderColor:['#ef4444','#f97316','#22c55e'],borderWidth:2,hoverOffset:8}]
  };
  const sortedDistricts = [...districts].sort((a,b)=>b.flood_prob_pct-a.flood_prob_pct);
  const barData={
    labels:sortedDistricts.map(d=>d.name),
    datasets:[{
      label:'Flood Probability (%)',
      data:sortedDistricts.map(d=>d.flood_prob_pct),
      backgroundColor:sortedDistricts.map(d=>d.risk_level==='High'?'rgba(239,68,68,0.7)':d.risk_level==='Moderate'?'rgba(249,115,22,0.7)':'rgba(34,197,94,0.7)'),
      borderRadius:5,borderWidth:0
    }]
  };
  const chartOpts={responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    scales:{
      x:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#475569',font:{size:10},maxRotation:45}},
      y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#94a3b8'},max:100}
    }};

  if(loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'80vh'}}><div className="spinner"/></div>;

  return (
    <div className="content">
      {/* Topbar info */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>Admin Dashboard</div>
          <div style={{fontSize:12,color:'var(--muted)'}}>Last updated: {lastUpd} · Auto-refreshes every 30s</div>
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <div className="live">LIVE</div>
          <button className="btn btn-ghost" onClick={load} style={{fontSize:12}}>🔄 Refresh</button>
          <button className="btn btn-primary" onClick={retrain} disabled={retraining} style={{fontSize:12}}>
            {retraining ? '⏳ Retraining…' : '🤖 Retrain Model'}
          </button>
        </div>
      </div>
      {retrainMsg && <div style={{padding:'12px 18px',borderRadius:10,background:'rgba(99,102,241,0.15)',color:'#a5b4fc',marginBottom:20,fontSize:13,border:'1px solid rgba(99,102,241,0.3)'}}>{retrainMsg}</div>}

      {/* LoRa Sensor Panel */}
      <LoRaSensorPanel />

      {/* KPIs */}
      <div style={{padding:'8px 14px',borderRadius:8,background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.15)',fontSize:11,color:'#94a3b8',marginBottom:16,display:'flex',gap:16}}>
        <span>Thresholds:</span>
        <span style={{color:'#22c55e',fontWeight:700}}>Low &lt;45%</span>
        <span style={{color:'#f97316',fontWeight:700}}>Moderate ≥45%</span>
        <span style={{color:'#ef4444',fontWeight:700}}>High ≥65%</span>
      </div>
      <div className="g4" style={{marginBottom:20}}>
        <KPI label="Total Districts"   value="38"        sub="Tamil Nadu"           color="#6366f1" icon="📍"/>
        <KPI label="High Risk"         value={h}         sub="≥ 65% flood prob."     color="#ef4444" icon="🚨"/>
        <KPI label="Moderate Risk"     value={m}         sub="≥ 45% flood prob."     color="#f97316" icon="⚠️"/>
        <KPI label="Safe Districts"    value={l}         sub="< 45% probability"     color="#22c55e" icon="✅"/>
      </div>
      <div className="g4" style={{marginBottom:24}}>
        <KPI label="Avg Temperature"   value={`${avgTemp}°C`} sub="State average"  color="#8b5cf6" icon="🌡️"/>
        <KPI label="Avg Rainfall"      value={`${avgRain}mm`} sub="Current reading" color="#06b6d4" icon="🌧️"/>
        <KPI label="Avg Humidity"      value={`${avgHum}%`}  sub="Relative humidity" color="#3b82f6" icon="💦"/>
        <KPI label="Model Accuracy"    value="96.66%"    sub="Random Forest"        color="#22c55e" icon="🎯"/>
      </div>

      {/* Charts */}
      <div className="g2" style={{marginBottom:20}}>
        <div className="card card-p">
          <div className="sec-title">Risk Distribution</div>
          <div style={{height:220}}><Doughnut data={donutData} options={{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom',labels:{color:'#94a3b8',font:{size:11},padding:12}}}}}/></div>
        </div>
        <div className="card card-p">
          <div className="sec-title">Flood Probability — All 38 Districts (by Risk)</div>
          <div style={{height:280}}><Bar data={barData} options={{...chartOpts, indexAxis:'y', scales:{...chartOpts.scales, y:{grid:{display:false},ticks:{color:'#cbd5e1',font:{size:9}}}}}}/></div>
        </div>
      </div>

      {/* Top risk table */}
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontWeight:700,fontSize:14}}>All Districts — Live Status</div>
          <div style={{fontSize:11,color:'var(--muted)'}}>{districts.length} districts monitored</div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>District</th><th>Risk</th><th>Flood %</th><th>Temp °C</th><th>Rain mm</th><th>Humidity %</th><th>Wind km/h</th><th>Water m</th><th>Tidal m</th><th>Condition</th></tr>
            </thead>
            <tbody>
              {[...districts].sort((a,b)=>b.flood_prob_pct-a.flood_prob_pct).map((d,i)=>(
                <tr key={d.id}>
                  <td style={{color:'var(--dim)',fontSize:11}}>{i+1}</td>
                  <td style={{fontWeight:600,fontSize:13}}>{d.coastal?'🏖️ ':''}{d.name}</td>
                  <td><span className={`badge b-${d.risk_level==='High'?'high':d.risk_level==='Moderate'?'mod':'low'}`}>{d.risk_level}</span></td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:7}}>
                      <div className="pbar" style={{width:60}}>
                        <div className="pfill" style={{width:`${d.flood_prob_pct}%`,background:RC[d.risk_level]}}/>
                      </div>
                      <span style={{fontWeight:700,color:RC[d.risk_level],fontSize:12}}>{d.flood_prob_pct}%</span>
                    </div>
                  </td>
                  <td>{d.temperature_c}°</td>
                  <td style={{color:'#60a5fa'}}>{d.rainfall_mm}</td>
                  <td>{d.humidity_pct}%</td>
                  <td>{d.wind_speed_kmh}</td>
                  <td>{d.water_level_m}</td>
                  <td>{d.tidal_height_m}</td>
                  <td style={{fontSize:11,color:'var(--muted)'}}>{d.condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Risk Monitoring ────────────────────────────────────────────────
export function RiskMonitoring() {
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    fetchLivePredictions().then(d=>{if(d)setDistricts(d);setLoading(false);}).catch(()=>setLoading(false));
    const t=setInterval(()=>fetchLivePredictions().then(d=>{if(d)setDistricts(d);}),60000);
    return()=>clearInterval(t);
  },[]);

  const high = districts.filter(d=>d.risk_level==='High').sort((a,b)=>b.flood_prob_pct-a.flood_prob_pct);
  const mod  = districts.filter(d=>d.risk_level==='Moderate').sort((a,b)=>b.flood_prob_pct-a.flood_prob_pct);

  if(loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'80vh'}}><div className="spinner"/></div>;

  return (
    <div className="content">
      <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>🎯 Risk Monitoring</div>
      <div style={{fontSize:12,color:'var(--muted)',marginBottom:24}}>Real-time risk alerts across all 38 districts</div>

      {high.length > 0 && (
        <div style={{marginBottom:24}}>
          <div className="sec-title" style={{color:'#ef4444'}}>🚨 HIGH RISK DISTRICTS ({high.length})</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {high.map(d=>(
              <div key={d.id} className="card" style={{padding:'16px 20px',borderLeft:`4px solid #ef4444`,display:'flex',flexWrap:'wrap',gap:20,alignItems:'center'}}>
                <div style={{flex:1,minWidth:140}}>
                  <div style={{fontWeight:700,fontSize:15}}>{d.coastal?'🏖️ ':''}{d.name}</div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>{d.river}</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:26,fontWeight:900,color:'#ef4444'}}>{d.flood_prob_pct}%</div>
                  <div style={{fontSize:10,color:'var(--muted)'}}>Flood Risk</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,minWidth:260}}>
                  {[{l:'Rainfall',v:`${d.rainfall_mm}mm`},{l:'Water Level',v:`${d.water_level_m}m`},{l:'Wind',v:`${d.wind_speed_kmh}km/h`}].map(x=>(
                    <div key={x.l} style={{textAlign:'center',background:'rgba(239,68,68,0.06)',borderRadius:8,padding:'8px'}}>
                      <div style={{fontWeight:700,fontSize:14}}>{x.v}</div>
                      <div style={{fontSize:10,color:'var(--muted)'}}>{x.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{padding:'8px 14px',borderRadius:9,background:'rgba(239,68,68,0.1)',color:'#fca5a5',fontSize:12,fontWeight:700}}>
                  🚨 EVACUATE
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mod.length > 0 && (
        <div>
          <div className="sec-title" style={{color:'#f97316'}}>⚠️ MODERATE RISK DISTRICTS ({mod.length})</div>
          <div className="g2">
            {mod.map(d=>(
              <div key={d.id} className="card" style={{padding:'16px 20px',borderLeft:'3px solid #f97316'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div style={{fontWeight:700,fontSize:14}}>{d.name}</div>
                  <div style={{fontSize:22,fontWeight:900,color:'#f97316'}}>{d.flood_prob_pct}%</div>
                </div>
                <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                  <span style={{fontSize:12,color:'var(--muted)'}}>🌧️ {d.rainfall_mm}mm</span>
                  <span style={{fontSize:12,color:'var(--muted)'}}>🌡️ {d.temperature_c}°C</span>
                  <span style={{fontSize:12,color:'var(--muted)'}}>💧 {d.water_level_m}m</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!high.length && !mod.length && (
        <div style={{textAlign:'center',padding:64,color:'var(--muted)'}}>
          <div style={{fontSize:48,marginBottom:12}}>✅</div>
          <div style={{fontSize:18,fontWeight:700,color:'#22c55e'}}>All Districts Safe</div>
          <div style={{fontSize:13,marginTop:8}}>No high or moderate risk detected at this time.</div>
        </div>
      )}
    </div>
  );
}

// ── Weather Analysis ───────────────────────────────────────────────
export function WeatherAnalysis() {
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    fetchLivePredictions().then(d=>{if(d)setDistricts(d);setLoading(false);}).catch(()=>setLoading(false));
    const t=setInterval(()=>fetchLivePredictions().then(d=>{if(d)setDistricts(d);}),60000);
    return()=>clearInterval(t);
  },[]);

  const tempData={
    labels:districts.map(d=>d.name),
    datasets:[{label:'Temperature (°C)',data:districts.map(d=>d.temperature_c),
      borderColor:'#f87171',backgroundColor:'rgba(248,113,113,0.15)',fill:true,tension:0.4,pointRadius:3,borderWidth:2}]
  };
  const humData={
    labels:districts.map(d=>d.name),
    datasets:[{label:'Humidity (%)',data:districts.map(d=>d.humidity_pct),
      backgroundColor:'rgba(99,102,241,0.6)',borderColor:'#6366f1',borderWidth:0,borderRadius:4}]
  };
  const opts={responsive:true,maintainAspectRatio:false,
    plugins:{legend:{labels:{color:'#94a3b8',font:{size:11}}}},
    scales:{
      x:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#475569',font:{size:9},maxRotation:45}},
      y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#94a3b8'}}
    }};

  if(loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'80vh'}}><div className="spinner"/></div>;

  return (
    <div className="content">
      <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>🌦️ Weather Analysis</div>
      <div style={{fontSize:12,color:'var(--muted)',marginBottom:24}}>Live weather conditions across all 38 Tamil Nadu districts</div>

      <div className="g4" style={{marginBottom:20}}>
        {[
          {l:'Hottest',v:`${Math.max(...districts.map(d=>d.temperature_c))}°C`,s:districts.find(d=>d.temperature_c===Math.max(...districts.map(x=>x.temperature_c)))?.name,c:'#f97316',i:'🌡️'},
          {l:'Most Rainfall',v:`${Math.max(...districts.map(d=>d.rainfall_mm))}mm`,s:districts.find(d=>d.rainfall_mm===Math.max(...districts.map(x=>x.rainfall_mm)))?.name,c:'#3b82f6',i:'🌧️'},
          {l:'Highest Humidity',v:`${Math.max(...districts.map(d=>d.humidity_pct))}%`,s:districts.find(d=>d.humidity_pct===Math.max(...districts.map(x=>x.humidity_pct)))?.name,c:'#22d3ee',i:'💦'},
          {l:'Highest Wind',v:`${Math.max(...districts.map(d=>d.wind_speed_kmh))}km/h`,s:districts.find(d=>d.wind_speed_kmh===Math.max(...districts.map(x=>x.wind_speed_kmh)))?.name,c:'#8b5cf6',i:'💨'},
        ].map((x,i)=>(
          <div key={i} className="card kpi" style={{borderTop:`2px solid ${x.c}`}}>
            <div className="kpi-label">{x.l}</div>
            <div className="kpi-value" style={{color:x.c,fontSize:24}}>{x.v}</div>
            <div className="kpi-sub">{x.s}</div>
          </div>
        ))}
      </div>

      <div style={{marginBottom:20}} className="card card-p">
        <div className="sec-title">Temperature Across Districts</div>
        <div style={{height:220}}><Line data={tempData} options={opts}/></div>
      </div>
      <div className="card card-p">
        <div className="sec-title">Humidity Across Districts</div>
        <div style={{height:220}}><Bar data={humData} options={opts}/></div>
      </div>
    </div>
  );
}

// ── Model Control ──────────────────────────────────────────────────
export function ModelControl() {
  const [retraining,setRetraining]=useState(false);
  const [msg,setMsg]=useState('');

  async function retrain(){
    setRetraining(true);setMsg('');
    try{ await triggerRetrain(); setMsg('success'); }
    catch{ setMsg('error'); }
    finally{ setRetraining(false); }
  }

  const metrics=[
    {l:'Algorithm',v:'Random Forest Classifier'},
    {l:'Accuracy',v:'90.97%'},
    {l:'Precision (High)',v:'90%'},
    {l:'Recall (High)',v:'91%'},
    {l:'F1-Score',v:'91%'},
    {l:'Training Samples',v:'12,000'},
    {l:'Test Samples',v:'3,000'},
    {l:'Features',v:'10'},
    {l:'Estimators',v:'300 trees'},
    {l:'Max Depth',v:'12'},
  ];

  return (
    <div className="content">
      <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>🤖 Model Control</div>
      <div style={{fontSize:12,color:'var(--muted)',marginBottom:24}}>Manage and monitor the flood prediction ML model</div>

      <div className="g2" style={{marginBottom:20}}>
        <div className="card card-p">
          <div className="sec-title">Model Performance Metrics</div>
          {metrics.map((m,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:13}}>
              <span style={{color:'var(--muted)'}}>{m.l}</span>
              <span style={{fontWeight:600}}>{m.v}</span>
            </div>
          ))}
        </div>
        <div className="card card-p">
          <div className="sec-title">Retrain Model</div>
          <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.7,marginBottom:20}}>
            Retraining will use the latest data from the <code style={{color:'#a5b4fc',background:'rgba(99,102,241,0.1)',padding:'2px 6px',borderRadius:5}}>data/</code> folder. If you have uploaded a new Excel dataset, click below to retrain.
          </div>
          <button className="btn btn-primary" onClick={retrain} disabled={retraining} style={{width:'100%',justifyContent:'center',padding:'14px',fontSize:14,marginBottom:16}}>
            {retraining?'⏳ Retraining in progress…':'🔁 Retrain ML Model Now'}
          </button>
          {msg==='success' && <div style={{padding:'12px',borderRadius:9,background:'rgba(34,197,94,0.1)',color:'#86efac',fontSize:13,textAlign:'center',border:'1px solid rgba(34,197,94,0.3)'}}>✅ Retraining started! Model will be updated in ~30 seconds.</div>}
          {msg==='error'   && <div style={{padding:'12px',borderRadius:9,background:'rgba(239,68,68,0.1)',color:'#fca5a5',fontSize:13,textAlign:'center',border:'1px solid rgba(239,68,68,0.3)'}}>⚠️ Unable to connect to backend. Is Flask running?</div>}

          <div style={{marginTop:20}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:10,color:'var(--muted)'}}>Feature Importance</div>
            {[
              {f:'Water Level',p:23.6},{f:'Rainfall',p:19.9},{f:'River Flow',p:19.8},
              {f:'Tidal Height',p:11.9},{f:'Coastal',p:10.9},{f:'Humidity',p:5.4},
              {f:'Pressure',p:2.3},{f:'Month',p:2.2},{f:'Wind Speed',p:2.0},{f:'Temperature',p:1.8}
            ].map((x,i)=>(
              <div key={i} style={{marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3,color:'var(--muted)'}}>
                  <span>{x.f}</span><span>{x.p}%</span>
                </div>
                <div className="pbar">
                  <div className="pfill" style={{width:`${x.p*4}%`,background:'linear-gradient(90deg,#6366f1,#8b5cf6)'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Data Management ────────────────────────────────────────────────
export function DataManagement() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    fetch('http://localhost:5000/api/history').then(r=>r.json()).then(j=>{setHistory(j.data);setLoading(false);}).catch(()=>setLoading(false));
  },[]);

  return (
    <div className="content">
      <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>🗄️ Data Management</div>
      <div style={{fontSize:12,color:'var(--muted)',marginBottom:24}}>Historical flood records — 30 days across 38 districts</div>

      <div className="card" style={{marginBottom:16,padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <div style={{fontSize:13,fontWeight:600}}>📋 Flood History Records</div>
        <div style={{fontSize:12,color:'var(--muted)'}}>{history.length} total records</div>
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflowX:'auto',maxHeight:500,overflowY:'auto'}}>
          <table className="admin-table">
            <thead style={{position:'sticky',top:0,background:'var(--bg-sidebar)'}}>
              <tr><th>Date</th><th>District</th><th>Risk</th><th>Rainfall mm</th><th>Water Level m</th><th>River Flow cumec</th><th>Tidal m</th></tr>
            </thead>
            <tbody>
              {loading
                ? Array(10).fill(0).map((_,i)=><tr key={i}><td colSpan={7} style={{padding:12}}><div style={{height:20,borderRadius:6,background:'rgba(255,255,255,0.04)'}}/></td></tr>)
                : history.map((r,i)=>(
                  <tr key={i}>
                    <td style={{color:'var(--muted)',fontSize:11}}>{r.date}</td>
                    <td style={{fontWeight:600}}>{r.district}</td>
                    <td><span className={`badge b-${r.risk_level==='High'?'high':r.risk_level==='Moderate'?'mod':'low'}`}>{r.risk_level}</span></td>
                    <td style={{color:'#60a5fa'}}>{r.rainfall_mm}</td>
                    <td>{r.water_level_m}</td>
                    <td>{r.river_flow_cumec}</td>
                    <td>{r.tidal_height_m}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
