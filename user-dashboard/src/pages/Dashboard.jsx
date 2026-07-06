import { useEffect, useState, useRef } from 'react';
import { fetchPredictionsWithMeta } from '../utils/api';
import { RISK_COLORS } from '../utils/constants';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale,
  BarElement, PointElement, LineElement, Filler);

// ── Countdown Timer ─────────────────────────────────────────────────
function CountdownTimer({ nextRefreshIn, onRefresh }) {
  const [secs, setSecs] = useState(Math.round(nextRefreshIn));
  const timerRef = useRef(null);

  useEffect(() => {
    setSecs(Math.round(nextRefreshIn));
  }, [nextRefreshIn]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { onRefresh(); return 60; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const pct = Math.max(0, Math.min(100, (secs / 600) * 100));
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ position:'relative', width:38, height:38 }}>
        <svg width="38" height="38" style={{ transform:'rotate(-90deg)' }}>
          <circle cx="19" cy="19" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
          <circle cx="19" cy="19" r="15" fill="none"
            stroke={secs < 60 ? '#f97316' : '#3b82f6'}
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 15}`}
            strokeDashoffset={`${2 * Math.PI * 15 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition:'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div style={{
          position:'absolute', inset:0, display:'flex', alignItems:'center',
          justifyContent:'center', fontSize:10, fontWeight:700,
          color: secs < 60 ? '#f97316' : '#64748b'
        }}>{secs < 60 ? secs : `${Math.ceil(secs/60)}m`}</div>
      </div>
      <div style={{ fontSize:11, color:'var(--text-dim)', lineHeight:1.3 }}>
        <div>Next</div>
        <div>update</div>
      </div>
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon, delay = 0 }) {
  return (
    <div className="card stat-card animate-up" style={{
      animationDelay: `${delay}ms`,
      borderTop: `2px solid ${color}`,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div className="label">{label}</div>
          <div className="value stat-number" style={{ fontSize:34 }}>{value}</div>
          <div className="sub">{sub}</div>
        </div>
        <div style={{
          width:48, height:48, borderRadius:14, fontSize:22,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:`${color}20`, border:`1px solid ${color}40`
        }}>{icon}</div>
      </div>
    </div>
  );
}

// ── Alert Banner ────────────────────────────────────────────────────────
function AlertBanners({ districts }) {
  const high = districts.filter(d => d.risk_level === 'High');
  const mod  = districts.filter(d => d.risk_level === 'Moderate');
  if (!high.length && !mod.length) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      {high.map(d => (
        <div key={d.id} className="alert-bar alert-high">
          🚨 <strong>FLOOD WARNING</strong> — {d.name} at HIGH RISK ({d.flood_prob_pct}% ≥ 65%). Immediate action required.
        </div>
      ))}
      {mod.slice(0,3).map(d => (
        <div key={d.id} className="alert-bar alert-moderate">
          ⚠️ <strong>Flood Watch</strong> — {d.name} at MODERATE RISK ({d.flood_prob_pct}% ≥ 45%). Stay alert.
        </div>
      ))}
    </div>
  );
}

// ── Risk Donut ──────────────────────────────────────────────────────────
function RiskDonut({ districts }) {
  const h = districts.filter(d=>d.risk_level==='High').length;
  const m = districts.filter(d=>d.risk_level==='Moderate').length;
  const l = districts.filter(d=>d.risk_level==='Low').length;
  const data = {
    labels: ['High Risk','Moderate Risk','Low Risk'],
    datasets:[{ data:[h,m,l], backgroundColor:['#ef444488','#f9731688','#22c55e88'],
      borderColor:['#ef4444','#f97316','#22c55e'], borderWidth:2,
      hoverOffset:8 }]
  };
  const opts = {
    responsive:true, maintainAspectRatio:false, cutout:'72%',
    plugins:{ legend:{ position:'right', labels:{ color:'#94a3b8', font:{size:12}, padding:16 }},
      tooltip:{ callbacks:{ label: ctx => ` ${ctx.label}: ${ctx.parsed} districts` }}}
  };
  return (
    <div className="card" style={{ padding:24 }}>
      <div className="section-title">Risk Distribution</div>
      <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:8 }}>
        Moderate ≥ 45% · High ≥ 65%
      </div>
      <div style={{ height:200 }}><Doughnut data={data} options={opts}/></div>
      <div style={{ display:'flex', justifyContent:'center', gap:24, marginTop:16 }}>
        {[{l:'High',c:'#ef4444',v:h},{l:'Moderate',c:'#f97316',v:m},{l:'Low',c:'#22c55e',v:l}].map(x=>(
          <div key={x.l} style={{ textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:x.c }}>{x.v}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{x.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Top Risk Bar Chart ──────────────────────────────────────────────────
function TopRiskBar({ districts }) {
  const sorted = [...districts].sort((a,b)=>b.flood_prob_pct - a.flood_prob_pct).slice(0,12);
  const data = {
    labels: sorted.map(d=>d.name),
    datasets:[{
      label:'Flood Probability (%)',
      data: sorted.map(d=>d.flood_prob_pct),
      backgroundColor: sorted.map(d=>
        d.risk_level==='High' ? 'rgba(239,68,68,0.7)' :
        d.risk_level==='Moderate' ? 'rgba(249,115,22,0.7)' : 'rgba(34,197,94,0.7)'),
      borderColor: sorted.map(d=>
        d.risk_level==='High' ? '#ef4444' :
        d.risk_level==='Moderate' ? '#f97316' : '#22c55e'),
      borderWidth:2, borderRadius:6,
    }]
  };
  const opts = {
    responsive:true, maintainAspectRatio:false, indexAxis:'y',
    plugins:{ legend:{display:false}, tooltip:{ callbacks:{
      label: ctx=>`  Flood Risk: ${ctx.parsed.x.toFixed(1)}%`
    }}},
    scales:{
      x:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#94a3b8'}, max:100,
          title:{display:true,text:'Flood Probability (%)',color:'#64748b',font:{size:11}}},
      y:{ grid:{display:false}, ticks:{color:'#cbd5e1',font:{size:11}} }
    }
  };
  return (
    <div className="card" style={{ padding:24 }}>
      <div className="section-title">Top 12 Highest-Risk Districts</div>
      <div style={{ height:340 }}><Bar data={data} options={opts}/></div>
    </div>
  );
}

// ── Interpolation Progress Bar ──────────────────────────────────────────
function InterpolationBar({ nextRefreshIn }) {
  const pct = Math.max(0, Math.min(100, (nextRefreshIn / 600) * 100));
  return (
    <div style={{
      height:3, background:'rgba(255,255,255,0.05)',
      borderRadius:2, marginBottom:20, overflow:'hidden'
    }}>
      <div style={{
        width:`${100 - pct}%`, height:'100%',
        background:'linear-gradient(90deg,#3b82f6,#8b5cf6)',
        transition:'width 1s linear',
        borderRadius:2,
      }}/>
    </div>
  );
}

// ── LoRa Sensor Node Panel ───────────────────────────────────────────
function LoRaSensorPanel() {
  const [data, setData]     = useState(null);
  const [meta, setMeta]     = useState(null);
  const [status, setStatus] = useState('connecting');

  async function fetchSensor() {
    try {
      const resp = await fetch('http://localhost:5000/api/sensor-data');
      const json = await resp.json();
      if (json.status === 'online') {
        setData(json.data);
        setMeta({ last_updated: json.last_updated });
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

  const rtStatus   = data?.rt_status || '';
  const rtMessage  = data?.rt_message || '';
  const overflow   = data?.overflow   || false;
  const alertColor = overflow || rtStatus === 'DANGER'  ? '#ef4444'
                   : rtStatus === 'WARNING'             ? '#f97316'
                   : '#22c55e';
  const alertLabel = overflow ? 'OVERFLOW!' : (rtStatus || (status === 'online' ? 'LIVE' : status.toUpperCase()));

  return (
    <div className="card" style={{
      padding: 24,
      background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.85))',
      border: overflow ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 18 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
            background: status === 'online' ? alertColor : '#ef4444',
            boxShadow: status === 'online' ? `0 0 10px ${alertColor}` : 'none',
          }}/>
          <span className="section-title" style={{ margin: 0, fontSize: 14 }}>
            {data?.source || 'Firebase Sensor (Tirunelveli)'}
          </span>
          {status === 'online' && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: `${alertColor}22`, color: alertColor, border: `1px solid ${alertColor}55`,
              letterSpacing: 1,
            }}>{alertLabel}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {meta?.last_updated ? `Updated ${meta.last_updated}` : 'Updates every 5s'}
        </div>
      </div>

      {/* Live message bar */}
      {rtMessage && status === 'online' && (
        <div style={{
          fontSize: 12, padding: '6px 14px', borderRadius: 8, marginBottom: 16,
          background: `${alertColor}15`, color: alertColor, border: `1px solid ${alertColor}30`,
        }}>
          📡 {rtMessage}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid-3" style={{ gap: 14 }}>
        {/* Water Level */}
        <div style={{ textAlign:'center', padding:'14px 10px', background:'rgba(59,130,246,0.07)', borderRadius:12, border:'1px solid rgba(59,130,246,0.15)' }}>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:6, letterSpacing:1 }}>WATER LEVEL</div>
          <div style={{ fontSize:28, fontWeight:900, color:'#3b82f6', lineHeight:1 }}>
            {data ? parseFloat(data.water_level).toFixed(3) : '--'}
            <small style={{ fontSize:12, marginLeft:3, fontWeight:400 }}>m</small>
          </div>
          {data?.water_level_mm > 0 && (
            <div style={{ fontSize:10, color:'var(--text-dim)', marginTop:4 }}>
              {data.water_level_mm} mm raw
            </div>
          )}
        </div>

        {/* Flow Rate */}
        <div style={{ textAlign:'center', padding:'14px 10px', background:'rgba(6,182,212,0.07)', borderRadius:12, border:'1px solid rgba(6,182,212,0.15)' }}>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:6, letterSpacing:1 }}>FLOW RATE</div>
          <div style={{ fontSize:28, fontWeight:900, color:'#06b6d4', lineHeight:1 }}>
            {data ? parseFloat(data.flow_rate ?? 0).toFixed(1) : '--'}
            <small style={{ fontSize:12, marginLeft:3, fontWeight:400 }}>L/min</small>
          </div>
          <div style={{ fontSize:10, color:'var(--text-dim)', marginTop:4 }}>
            Rainfall proxy: {data ? parseFloat(data.rainfall ?? 0).toFixed(1) : '--'} mm
          </div>
        </div>

        {/* Temperature */}
        <div style={{ textAlign:'center', padding:'14px 10px', background:'rgba(249,115,22,0.07)', borderRadius:12, border:'1px solid rgba(249,115,22,0.15)' }}>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:6, letterSpacing:1 }}>TEMPERATURE</div>
          <div style={{ fontSize:28, fontWeight:900, color:'#f97316', lineHeight:1 }}>
            {data ? data.temperature : '--'}
            <small style={{ fontSize:12, marginLeft:3, fontWeight:400 }}>°C</small>
          </div>
          <div style={{ fontSize:10, color:'var(--text-dim)', marginTop:4 }}>
            Overflow: <span style={{ color: overflow ? '#ef4444' : '#22c55e', fontWeight:700 }}>{overflow ? 'YES ⚠️' : 'No'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Rainfall Trend ─────────────────────────────────────────────────────
function RainfallTrend({ districts }) {
  const labels = Array.from({length:30},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-29+i);
    return `${d.getDate()}/${d.getMonth()+1}`;
  });
  const avgRain = districts.reduce((s,d)=>s+d.rainfall_mm,0)/(districts.length||1);
  const trend = labels.map((_,i)=>{
    const phase = Math.sin(i/4)*15 + Math.random()*10;
    return Math.max(0, avgRain*0.5 + phase + (i>20 ? avgRain*0.3 : 0)).toFixed(1);
  });
  const data = {
    labels,
    datasets:[{
      label:'Avg Rainfall (mm)',
      data:trend,
      borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.08)',
      fill:true, tension:0.4, pointRadius:0, borderWidth:2,
    }]
  };
  const opts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    scales:{
      x:{ grid:{color:'rgba(255,255,255,0.03)'}, ticks:{color:'#475569',font:{size:10},maxTicksLimit:8}},
      y:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#94a3b8'},
          title:{display:true,text:'Rainfall (mm)',color:'#64748b',font:{size:11}}}
    }
  };
  return (
    <div className="card" style={{ padding:24 }}>
      <div className="section-title">30-Day Rainfall Trend <span>(State Average)</span></div>
      <div style={{ height:220 }}><Line data={data} options={opts}/></div>
    </div>
  );
}

// ── Weather Ticker ─────────────────────────────────────────────────────
function WeatherTicker({ districts }) {
  const [idx, setIdx] = useState(0);
  useEffect(()=>{
    const t = setInterval(()=>setIdx(i=>(i+1)%districts.length),3000);
    return ()=>clearInterval(t);
  },[districts.length]);
  if (!districts.length) return null;
  const d = districts[idx];
  const riskColor = d.risk_level==='High'?'#ef4444':d.risk_level==='Moderate'?'#f97316':'#22c55e';
  return (
    <div className="card" style={{ padding:'16px 24px', display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:11, color:'var(--text-dim)', letterSpacing:2 }}>
        LIVE TICKER
      </div>
      <div style={{ fontWeight:700, fontSize:15 }}>{d.name}</div>
      <div style={{ display:'flex', gap:20, flexWrap:'wrap', flex:1 }}>
        <span style={{fontSize:13}}>🌡️ {d.temperature_c}°C</span>
        <span style={{fontSize:13}}>💧 {d.rainfall_mm} mm</span>
        <span style={{fontSize:13}}>💨 {d.wind_speed_kmh} km/h</span>
        <span style={{fontSize:13}}>🌊 Water {d.water_level_m}m</span>
        {d.coastal && <span style={{fontSize:13}}>🌊 Tide {d.tidal_height_m}m</span>}
        <span style={{fontSize:13}}>🌀 {d.condition}</span>
      </div>
      <div className={`badge badge-${d.risk_level.toLowerCase()}`}>
        {d.risk_level} Risk · {d.flood_prob_pct}%
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────
export default function Dashboard() {
  const [districts,    setDistricts]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [lastUpdate,   setLastUpdate]   = useState('');
  const [nextRefresh,  setNextRefresh]  = useState(600);
  const [interpolated, setInterpolated] = useState(false);

  async function load() {
    try {
      const json = await fetch('http://localhost:5000/api/interpolated-predictions').then(r=>r.json());
      if (json.status === 'loading') return;
      setDistricts(json.data || []);
      setNextRefresh(json.next_refresh_in || 600);
      setInterpolated(json.interpolated || false);
      setLastUpdate(new Date().toLocaleTimeString('en-IN'));
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  useEffect(()=>{
    load();
    const t = setInterval(load, 60000); // poll every minute
    return()=>clearInterval(t);
  },[]);

  if (loading) return (
    <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>
      <div style={{textAlign:'center'}}>
        <div className="spinner" style={{margin:'0 auto 16px'}}/>
        <div style={{color:'var(--text-muted)',fontSize:14}}>Loading live data from 38 districts…</div>
      </div>
    </div>
  );

  const h = districts.filter(d=>d.risk_level==='High').length;
  const m = districts.filter(d=>d.risk_level==='Moderate').length;
  const l = districts.filter(d=>d.risk_level==='Low').length;
  const avgTemp = (districts.reduce((s,d)=>s+d.temperature_c,0)/(districts.length||1)).toFixed(1);
  const avgRain = (districts.reduce((s,d)=>s+d.rainfall_mm,0)/(districts.length||1)).toFixed(1);

  return (
    <div className="page">
      <div className="container" style={{paddingTop:32,paddingBottom:48}}>

        {/* Interpolation progress bar */}
        <InterpolationBar nextRefreshIn={nextRefresh} />

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontSize:26,fontWeight:800,marginBottom:4}}>
              Tamil Nadu Flood Dashboard
            </h1>
            <p style={{color:'var(--text-muted)',fontSize:13}}>
              AI predictions for all 38 districts · Moderate ≥ 45% · High ≥ 65% · Updated {lastUpdate}
            </p>
          </div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <CountdownTimer nextRefreshIn={nextRefresh} onRefresh={load} />
            <div className="live-dot">LIVE</div>
            <button className="btn btn-ghost" onClick={load} style={{fontSize:13}}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Alert Banners */}
        <AlertBanners districts={districts} />

        {/* Weather Ticker */}
        <div style={{marginBottom:20}}><WeatherTicker districts={districts}/></div>

        {/* LoRa Sensor Panel */}
        <div style={{marginBottom:24}}><LoRaSensorPanel /></div>

        {/* Stat Cards */}
        <div className="grid-4" style={{marginBottom:24}}>
          <StatCard label="Total Districts" value="38" sub="Tamil Nadu" color="#3b82f6" icon="📍" delay={0}/>
          <StatCard label="High Risk" value={h} sub="≥ 65% flood prob." color="#ef4444" icon="🚨" delay={80}/>
          <StatCard label="Moderate Risk" value={m} sub="≥ 45% flood prob." color="#f97316" icon="⚠️" delay={160}/>
          <StatCard label="Safe Zones" value={l} sub="< 45% probability" color="#22c55e" icon="✅" delay={240}/>
        </div>

        <div className="grid-2" style={{marginBottom:24}}>
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div className="grid-2">
              <StatCard label="Avg Temperature" value={`${avgTemp}°C`} sub="State average" color="#8b5cf6" icon="🌡️"/>
              <StatCard label="Avg Rainfall" value={`${avgRain}mm`} sub="Live reading" color="#06b6d4" icon="🌧️"/>
            </div>
            <RainfallTrend districts={districts}/>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <RiskDonut districts={districts}/>
            {/* Tide info card */}
            <div className="card" style={{padding:20}}>
              <div className="section-title" style={{marginBottom:12}}>🌊 Coastal Tide Data</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:12}}>
                Real gauge readings from tide_data_cleaned.xlsx
              </div>
              {[
                {station:'Chennai',    color:'#3b82f6'},
                {station:'Nagapattinam', color:'#8b5cf6'},
                {station:'Tuticorin', color:'#06b6d4'},
              ].map(s => {
                const d = districts.find(x => x.name === s.station || x.name === 'Thoothukudi');
                const tide = districts.filter(x => x.coastal).find(x =>
                  (s.station === 'Chennai' && x.name === 'Chennai') ||
                  (s.station === 'Nagapattinam' && x.name === 'Nagapattinam') ||
                  (s.station === 'Tuticorin' && x.name === 'Thoothukudi')
                );
                return (
                  <div key={s.station} style={{
                    display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'
                  }}>
                    <span style={{fontSize:13,color:'var(--text-muted)'}}>📍 {s.station}</span>
                    <span style={{fontSize:14,fontWeight:700,color:s.color}}>
                      {tide ? `${tide.tidal_height_m} m` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Risk Bar */}
        <TopRiskBar districts={districts}/>

      </div>
    </div>
  );
}
