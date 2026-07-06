import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchLivePredictions } from '../utils/api';

const RISK_COLOR  = { High:'#ef4444', Moderate:'#f97316', Low:'#22c55e' };
const RISK_FILL   = { High:'rgba(239,68,68,0.35)', Moderate:'rgba(249,115,22,0.3)', Low:'rgba(34,197,94,0.25)' };

function RiskLegend() {
  return (
    <div style={{
      position:'absolute', bottom:32, right:16, zIndex:999,
      background:'rgba(8,12,20,0.92)', border:'1px solid rgba(255,255,255,0.1)',
      backdropFilter:'blur(20px)', borderRadius:12, padding:'14px 18px',
    }}>
      <div style={{fontSize:11,fontWeight:700,color:'#64748b',letterSpacing:2,marginBottom:10,textTransform:'uppercase'}}>
        Flood Risk
      </div>
      {Object.entries(RISK_COLOR).map(([r,c])=>(
        <div key={r} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,fontSize:13}}>
          <div style={{width:14,height:14,borderRadius:'50%',background:c,boxShadow:`0 0 8px ${c}`}}/>
          <span style={{color:'#cbd5e1'}}>{r} Risk</span>
        </div>
      ))}
    </div>
  );
}

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(()=>{ if(center) map.setView(center, map.getZoom()); },[center]);
  return null;
}

export default function LiveMap() {
  const [districts, setDistricts] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [filter,    setFilter]    = useState('All');
  const [lastUpdate,setLastUpdate]= useState('');

  async function load() {
    try {
      const data = await fetchLivePredictions();
      setDistricts(data);
      setLastUpdate(new Date().toLocaleTimeString('en-IN'));
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(()=>{ load(); const t=setInterval(load,30000); return()=>clearInterval(t); },[]);

  const visible = filter==='All' ? districts : districts.filter(d=>d.risk_level===filter);

  return (
    <div className="page">
      <div className="container" style={{paddingTop:32,paddingBottom:48}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontSize:24,fontWeight:800,marginBottom:4}}>🗺️ Live Flood Map</h1>
            <p style={{color:'var(--text-muted)',fontSize:13}}>
              Interactive map — all 32 Tamil Nadu districts · Last updated {lastUpdate}
            </p>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            {['All','High','Moderate','Low'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className="btn" style={{
                  padding:'8px 16px',fontSize:13,
                  background: filter===f
                    ? (f==='High'?'#ef4444':f==='Moderate'?'#f97316':f==='Low'?'#22c55e':'var(--accent)')
                    : 'var(--bg-card)',
                  color: filter===f ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border)'
                }}>{f}</button>
            ))}
            <button className="btn btn-ghost" onClick={load} style={{fontSize:13}}>🔄</button>
          </div>
        </div>

        {/* Info cards row */}
        <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'}}>
          {['High','Moderate','Low'].map(r=>{
            const count = districts.filter(d=>d.risk_level===r).length;
            const color = RISK_COLOR[r];
            return (
              <div key={r} className="card" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:14,flex:1,minWidth:140}}>
                <div style={{width:12,height:12,borderRadius:'50%',background:color,boxShadow:`0 0 10px ${color}`}}/>
                <div>
                  <div style={{fontSize:22,fontWeight:900,color}}>{count}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:1}}>{r} Risk</div>
                </div>
              </div>
            );
          })}
          <div className="card" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:14,flex:1,minWidth:140}}>
            <div className="live-dot"/>
            <div>
              <div style={{fontSize:22,fontWeight:900,color:'var(--accent)'}}>{districts.length}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:1}}>Monitoring</div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={{position:'relative'}}>
          {loading && (
            <div style={{position:'absolute',inset:0,zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(8,12,20,0.7)',borderRadius:16}}>
              <div style={{textAlign:'center'}}>
                <div className="spinner" style={{margin:'0 auto 12px'}}/>
                <div style={{color:'var(--text-muted)',fontSize:13}}>Fetching live data…</div>
              </div>
            </div>
          )}
          <div className="map-wrapper">
            <MapContainer center={[10.8, 78.6]} zoom={7} style={{height:'100%',width:'100%'}} zoomControl={true}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              {visible.map(d=>{
                const color = RISK_COLOR[d.risk_level];
                const fill  = RISK_FILL[d.risk_level];
                const radius = d.risk_level==='High'?14:d.risk_level==='Moderate'?11:8;
                return (
                  <CircleMarker key={d.id} center={[d.lat,d.lon]}
                    radius={radius} color={color} fillColor={fill}
                    weight={2} fillOpacity={0.85}
                    eventHandlers={{ click:()=>setSelected(d) }}>
                    <Popup>
                      <div className="popup-card">
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                          <h3 style={{margin:0}}>{d.name}</h3>
                          <span style={{
                            padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,
                            background: d.risk_level==='High'?'#fef2f2':d.risk_level==='Moderate'?'#fff7ed':'#f0fdf4',
                            color: d.risk_level==='High'?'#dc2626':d.risk_level==='Moderate'?'#ea580c':'#16a34a',
                          }}>{d.risk_level} Risk</span>
                        </div>
                        <div className="popup-row"><span className="key">🌊 Flood Probability</span><span className="val" style={{color:color}}>{d.flood_prob_pct}%</span></div>
                        <div className="popup-row"><span className="key">🌡️ Temperature</span><span className="val">{d.temperature_c}°C</span></div>
                        <div className="popup-row"><span className="key">💧 Rainfall</span><span className="val">{d.rainfall_mm} mm</span></div>
                        <div className="popup-row"><span className="key">💦 Humidity</span><span className="val">{d.humidity_pct}%</span></div>
                        <div className="popup-row"><span className="key">💨 Wind Speed</span><span className="val">{d.wind_speed_kmh} km/h</span></div>
                        <div className="popup-row"><span className="key">🌊 Water Level</span><span className="val">{d.water_level_m} m</span></div>
                        <div className="popup-row"><span className="key">🌊 Tidal Height</span><span className="val">{d.tidal_height_m} m</span></div>
                        <div className="popup-row"><span className="key">🏞️ Rivers</span><span className="val">{d.river}</span></div>
                        <div className="popup-row"><span className="key">🌤️ Condition</span><span className="val">{d.condition}</span></div>
                        <div style={{marginTop:8,padding:'6px 10px',borderRadius:8,fontSize:11,textAlign:'center',
                          background:d.risk_level==='High'?'#fef2f2':d.risk_level==='Moderate'?'#fff7ed':'#f0fdf4',
                          color:d.risk_level==='High'?'#dc2626':d.risk_level==='Moderate'?'#ea580c':'#16a34a',fontWeight:700}}>
                          {d.risk_level==='High'?'🚨 EVACUATE IMMEDIATELY':d.risk_level==='Moderate'?'⚠️ REMAIN ALERT':'✅ SAFE ZONE'}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
            <RiskLegend/>
          </div>
        </div>

        {/* Selected district detail */}
        {selected && (
          <div className="card animate-in" style={{padding:24,marginTop:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontSize:18,fontWeight:700}}>📍 {selected.name} — Detailed Reading</div>
              <button className="btn btn-ghost" onClick={()=>setSelected(null)} style={{padding:'6px 12px',fontSize:12}}>✕ Close</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12}}>
              {[
                {k:'Flood Probability',v:`${selected.flood_prob_pct}%`,icon:'🌊'},
                {k:'Risk Level',v:selected.risk_level,icon:'⚡'},
                {k:'Temperature',v:`${selected.temperature_c}°C`,icon:'🌡️'},
                {k:'Rainfall',v:`${selected.rainfall_mm} mm`,icon:'🌧️'},
                {k:'Humidity',v:`${selected.humidity_pct}%`,icon:'💦'},
                {k:'Wind Speed',v:`${selected.wind_speed_kmh} km/h`,icon:'💨'},
                {k:'Water Level',v:`${selected.water_level_m} m`,icon:'🏞️'},
                {k:'Tidal Height',v:`${selected.tidal_height_m} m`,icon:'🌊'},
                {k:'River Flow',v:`${selected.river_flow_cumec} cumec`,icon:'🌀'},
                {k:'Pressure',v:`${selected.pressure_hpa} hPa`,icon:'🔵'},
                {k:'Condition',v:selected.condition,icon:'☁️'},
                {k:'Coastal',v:selected.coastal?'Yes':'No',icon:'🏖️'},
              ].map(x=>(
                <div key={x.k} style={{
                  background:'rgba(255,255,255,0.03)',borderRadius:10,
                  padding:'12px 14px',border:'1px solid var(--border)'
                }}>
                  <div style={{fontSize:16,marginBottom:4}}>{x.icon}</div>
                  <div style={{fontSize:18,fontWeight:700,color:'var(--text)'}}>{x.v}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{x.k}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
