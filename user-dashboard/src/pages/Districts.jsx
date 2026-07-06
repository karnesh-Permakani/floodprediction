import { useEffect, useState } from 'react';
import { fetchLivePredictions } from '../utils/api';

const RISK_COLOR = { High:'#ef4444', Moderate:'#f97316', Low:'#22c55e' };

export default function Districts() {
  const [districts, setDistricts] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('All');
  const [sort,      setSort]      = useState('flood_prob_pct');
  const [selected,  setSelected]  = useState(null);
  const [lastUpdate, setLastUpdate] = useState('');

  async function load() {
    try {
      const d = await fetchLivePredictions();
      if (d) {
        setDistricts(d);
        setLastUpdate(new Date().toLocaleTimeString('en-IN'));
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{
    load();
    const t = setInterval(load, 60000); // per-minute updates
    return ()=>clearInterval(t);
  },[]);

  const filtered = districts
    .filter(d => filter==='All' || d.risk_level===filter)
    .filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => typeof a[sort]==='string' ? a[sort].localeCompare(b[sort]) : b[sort]-a[sort]);

  if (loading) return (
    <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>
      <div style={{textAlign:'center'}}>
        <div className="spinner" style={{margin:'0 auto 12px'}}/>
        <div style={{color:'var(--text-muted)',fontSize:14}}>Loading 38 districts…</div>
      </div>
    </div>
  );

  const h = districts.filter(d=>d.risk_level==='High').length;
  const m = districts.filter(d=>d.risk_level==='Moderate').length;
  const l = districts.filter(d=>d.risk_level==='Low').length;

  return (
    <div className="page">
      <div className="container" style={{paddingTop:32,paddingBottom:48}}>
        <div className="page-header">
          <h1>📍 District Details</h1>
          <p>Live weather and flood predictions for all 38 Tamil Nadu districts · Updated {lastUpdate}</p>
        </div>

        {/* Threshold notice */}
        <div style={{
          display:'flex', gap:12, marginBottom:20, flexWrap:'wrap',
          padding:'10px 16px', borderRadius:10, background:'rgba(59,130,246,0.06)',
          border:'1px solid rgba(59,130,246,0.15)', fontSize:12
        }}>
          <span style={{color:'#94a3b8'}}>Risk Thresholds:</span>
          <span style={{color:'#22c55e', fontWeight:700}}>✅ Low &lt; 45%</span>
          <span style={{color:'#f97316', fontWeight:700}}>⚠️ Moderate ≥ 45%</span>
          <span style={{color:'#ef4444', fontWeight:700}}>🚨 High ≥ 65%</span>
          <span style={{marginLeft:'auto', color:'#64748b'}}>{districts.length} districts · {h} High · {m} Moderate · {l} Safe</span>
        </div>

        {/* Controls */}
        <div style={{display:'flex',gap:12,marginBottom:24,flexWrap:'wrap',alignItems:'center'}}>
          <input
            type="text" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="🔍 Search district…"
            style={{
              padding:'10px 16px',background:'var(--bg-card)',border:'1px solid var(--border)',
              borderRadius:10,color:'var(--text)',fontSize:13,flex:1,minWidth:200,
              fontFamily:'Inter,sans-serif',outline:'none'
            }}
          />
          {['All','High','Moderate','Low'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className="btn" style={{
              padding:'9px 18px',fontSize:13,
              background:filter===f?(f==='High'?'#ef4444':f==='Moderate'?'#f97316':f==='Low'?'#22c55e':'var(--accent)'):'var(--bg-card)',
              color:filter===f?'#fff':'var(--text-muted)',border:'1px solid var(--border)'
            }}>{f} {f!=='All' ? `(${districts.filter(d=>d.risk_level===f).length})` : `(${districts.length})`}</button>
          ))}
          <select value={sort} onChange={e=>setSort(e.target.value)}
            style={{padding:'9px 12px',background:'var(--bg-card)',border:'1px solid var(--border)',
              borderRadius:10,color:'var(--text)',fontSize:13,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
            <option value="flood_prob_pct">Sort: Risk %</option>
            <option value="name">Sort: Name</option>
            <option value="rainfall_mm">Sort: Rainfall</option>
            <option value="temperature_c">Sort: Temperature</option>
            <option value="tidal_height_m">Sort: Tide Height</option>
          </select>
        </div>

        {/* Table */}
        <div className="card" style={{overflow:'hidden',marginBottom:24}}>
          <div style={{overflowX:'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>District</th><th>Risk Level</th>
                  <th>Flood %</th><th>Temp °C</th><th>Rainfall mm</th>
                  <th>Humidity %</th><th>Wind km/h</th><th>Water m</th>
                  <th>Tide m</th><th>Condition</th><th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d,i)=>{
                  const c = RISK_COLOR[d.risk_level];
                  return (
                    <tr key={d.id} style={{cursor:'pointer'}} onClick={()=>setSelected(d===selected?null:d)}>
                      <td style={{color:'var(--text-dim)',fontSize:12}}>{i+1}</td>
                      <td style={{fontWeight:600}}>
                        {d.coastal && <span title="Coastal district">🏖️ </span>}
                        {d.name}
                      </td>
                      <td>
                        <span className={`badge badge-${d.risk_level.toLowerCase()}`}>
                          {d.risk_level==='High'?'🚨':d.risk_level==='Moderate'?'⚠️':'✅'} {d.risk_level}
                        </span>
                      </td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{flex:1,height:6,borderRadius:3,background:'rgba(255,255,255,0.06)'}}>
                            <div style={{width:`${d.flood_prob_pct}%`,height:'100%',borderRadius:3,background:c}}/>
                          </div>
                          <span style={{fontSize:12,fontWeight:700,color:c,minWidth:38}}>{d.flood_prob_pct}%</span>
                        </div>
                      </td>
                      <td>{d.temperature_c}°</td>
                      <td style={{color:'#60a5fa'}}>{d.rainfall_mm}</td>
                      <td>{d.humidity_pct}%</td>
                      <td>{d.wind_speed_kmh}</td>
                      <td>{d.water_level_m}</td>
                      <td style={{color: d.coastal ? '#06b6d4' : 'var(--text-dim)'}}>
                        {d.coastal ? `${d.tidal_height_m}m` : '—'}
                      </td>
                      <td style={{fontSize:12,color:'var(--text-muted)'}}>{d.condition}</td>
                      <td>
                        <button className="btn btn-ghost" style={{padding:'4px 10px',fontSize:11}}
                          onClick={e=>{e.stopPropagation();setSelected(d===selected?null:d)}}>
                          {selected?.id===d.id ? 'Close' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected District Detail Card */}
        {selected && (
          <div className="card animate-in" style={{padding:28}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
              <div>
                <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>{selected.name}</div>
                <div style={{fontSize:13,color:'var(--text-muted)'}}>
                  Rivers: {selected.river} · {selected.coastal?'Coastal District':'Inland District'}
                  {selected.coastal && ` · Tide Station data`}
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{
                  fontSize:36,fontWeight:900,
                  color:RISK_COLOR[selected.risk_level]
                }}>{selected.flood_prob_pct}%</div>
                <div style={{fontSize:12,color:'var(--text-muted)'}}>Flood Probability</div>
                <div style={{fontSize:11,color:'var(--text-dim)',marginTop:2}}>
                  Base: {selected.baseline_prob || '—'}%
                </div>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12}}>
              {[
                {k:'Risk Level',v:selected.risk_level,icon:'⚡',c:RISK_COLOR[selected.risk_level]},
                {k:'Temperature',v:`${selected.temperature_c}°C`,icon:'🌡️',c:'#a78bfa'},
                {k:'Rainfall',v:`${selected.rainfall_mm} mm`,icon:'🌧️',c:'#60a5fa'},
                {k:'Humidity',v:`${selected.humidity_pct}%`,icon:'💦',c:'#22d3ee'},
                {k:'Wind Speed',v:`${selected.wind_speed_kmh} km/h`,icon:'💨',c:'#94a3b8'},
                {k:'Pressure',v:`${selected.pressure_hpa} hPa`,icon:'🔵',c:'#818cf8'},
                {k:'Water Level',v:`${selected.water_level_m} m`,icon:'🏞️',c:'#38bdf8'},
                {k:'Tide Height',v:selected.coastal ? `${selected.tidal_height_m} m` : 'Inland',icon:'🌊',c:'#06b6d4'},
                {k:'River Flow',v:`${selected.river_flow_cumec} cumec`,icon:'🌀',c:'#3b82f6'},
                {k:'Weather',v:selected.condition,icon:'☁️',c:'#94a3b8'},
              ].map(x=>(
                <div key={x.k} style={{
                  background:'rgba(255,255,255,0.03)',borderRadius:10,
                  padding:'14px 16px',border:`1px solid ${x.c}30`
                }}>
                  <div style={{fontSize:18,marginBottom:6}}>{x.icon}</div>
                  <div style={{fontSize:20,fontWeight:800,color:x.c}}>{x.v}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)',marginTop:3}}>{x.k}</div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop:20,padding:'14px 20px',borderRadius:12,textAlign:'center',
              fontWeight:700,fontSize:15,
              background: selected.risk_level==='High'?'rgba(239,68,68,0.1)':
                         selected.risk_level==='Moderate'?'rgba(249,115,22,0.1)':'rgba(34,197,94,0.1)',
              color:RISK_COLOR[selected.risk_level],
              border:`1px solid ${RISK_COLOR[selected.risk_level]}40`
            }}>
              {selected.risk_level==='High'
                ? '🚨 FLOOD WARNING: Immediate evacuation recommended. Contact NDRF.'
                : selected.risk_level==='Moderate'
                ? '⚠️ FLOOD WATCH: Remain alert. Avoid riverbanks and low-lying areas.'
                : '✅ SAFE: No immediate flood threat. Continue monitoring.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
