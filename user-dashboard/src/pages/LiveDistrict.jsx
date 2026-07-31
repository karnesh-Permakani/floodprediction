import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API = 'http://localhost:5000';

// TN Districts with lat/lon
const TN_DISTRICTS = [
  { name:'Tirunelveli',    lat:8.7139,  lon:77.7567 },
  { name:'Chennai',        lat:13.0827, lon:80.2707 },
  { name:'Coimbatore',     lat:11.0168, lon:76.9558 },
  { name:'Madurai',        lat:9.9252,  lon:78.1198 },
  { name:'Salem',          lat:11.6643, lon:78.1460 },
  { name:'Tiruchirappalli',lat:10.7905, lon:78.7047 },
  { name:'Tiruppur',       lat:11.1085, lon:77.3411 },
  { name:'Vellore',        lat:12.9165, lon:79.1325 },
  { name:'Erode',          lat:11.3410, lon:77.7172 },
  { name:'Thanjavur',      lat:10.7870, lon:79.1378 },
  { name:'Dindigul',       lat:10.3624, lon:77.9695 },
  { name:'Cuddalore',      lat:11.7447, lon:79.7689 },
  { name:'Kanchipuram',    lat:12.8342, lon:79.7036 },
  { name:'Nagapattinam',   lat:10.7672, lon:79.8449 },
  { name:'Villupuram',     lat:11.9401, lon:79.4861 },
  { name:'Krishnagiri',    lat:12.5186, lon:78.2137 },
  { name:'Dharmapuri',     lat:12.1211, lon:78.1582 },
  { name:'Namakkal',       lat:11.2190, lon:78.1674 },
  { name:'Tiruvannamalai', lat:12.2253, lon:79.0747 },
  { name:'Ramanathapuram', lat:9.3639,  lon:78.8395 },
  { name:'Thoothukudi',    lat:8.7642,  lon:78.1348 },
  { name:'Kanyakumari',    lat:8.0883,  lon:77.5385 },
  { name:'Virudhunagar',   lat:9.5850,  lon:77.9624 },
  { name:'Sivaganga',      lat:9.8477,  lon:78.4800 },
  { name:'Pudukkottai',    lat:10.3797, lon:78.8201 },
  { name:'Ariyalur',       lat:11.1426, lon:79.0760 },
  { name:'Perambalur',     lat:11.2334, lon:78.8766 },
  { name:'Karur',          lat:10.9601, lon:78.0766 },
  { name:'Tiruvarur',      lat:10.7726, lon:79.6366 },
  { name:'Mayiladuthurai', lat:11.1019, lon:79.6524 },
  { name:'Kallakurichi',   lat:11.7383, lon:78.9607 },
  { name:'Tenkasi',        lat:8.9597,  lon:77.3152 },
  { name:'Ranipet',        lat:12.9220, lon:79.3333 },
  { name:'Chengalpattu',   lat:12.6921, lon:79.9861 },
  { name:'Tirupathur',     lat:12.4958, lon:78.5685 },
  { name:'Tirupattur',     lat:12.4958, lon:78.5685 },
  { name:'Nilgiris',       lat:11.4916, lon:76.7337 },
  { name:'Tiruvallur',     lat:13.1429, lon:79.9081 },
];

const RISK_COLOR  = { High:'#ef4444', Moderate:'#f97316', Low:'#22c55e' };
const RISK_BG     = { High:'rgba(239,68,68,0.12)', Moderate:'rgba(249,115,22,0.12)', Low:'rgba(34,197,94,0.12)' };

// User GPS icon
const userIcon = new L.DivIcon({
  html:`<div style="width:18px;height:18px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3);animation:pulse-dot 1.5s infinite"></div>`,
  className:'',iconSize:[18,18],iconAnchor:[9,9]
});

// Village icon
const villageIcon = (color='#6366f1') => new L.DivIcon({
  html:`<div style="width:10px;height:10px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  className:'',iconSize:[10,10],iconAnchor:[5,5]
});

// Map re-center helper
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom, { duration:1.2 }); }, [center, zoom]);
  return null;
}

// ── Water Level Gauge ────────────────────────────────────────────────
function WaterGauge({ level, max=10 }) {
  const pct    = Math.min((level / max) * 100, 100);
  const color  = level >= 8 ? '#ef4444' : level >= 5 ? '#f97316' : level >= 3 ? '#eab308' : '#22c55e';
  const label  = level >= 8 ? 'DANGER' : level >= 5 ? 'HIGH' : level >= 3 ? 'MODERATE' : 'SAFE';
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div style={{ fontWeight:700, fontSize:13, color:'var(--text-dim)' }}>Water Level</div>
      <div style={{ position:'relative', width:52, height:160, background:'rgba(0,0,0,0.15)', borderRadius:30, overflow:'hidden', border:'2px solid var(--border)' }}>
        {/* danger line at 80% */}
        <div style={{ position:'absolute', top:'20%', left:0, right:0, height:1.5, background:'rgba(239,68,68,0.5)', zIndex:2 }} />
        {/* fill */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          height:`${pct}%`,
          background:`linear-gradient(to top, ${color}, ${color}88)`,
          transition:'height 1s ease',
          borderRadius:'0 0 26px 26px',
        }} />
        {/* marks */}
        {[2,4,6,8,10].map(m => (
          <div key={m} style={{ position:'absolute', bottom:`${(m/max)*100}%`, left:4, right:4, height:1, background:'rgba(255,255,255,0.15)', zIndex:1 }}>
            <span style={{ position:'absolute', right:'105%', top:-7, fontSize:8, color:'var(--text-dim)', whiteSpace:'nowrap' }}>{m}m</span>
          </div>
        ))}
      </div>
      <div style={{ fontWeight:800, fontSize:18, color }}>{level.toFixed(2)} m</div>
      <div style={{ fontSize:11, fontWeight:700, color, background:color+'22', padding:'3px 10px', borderRadius:20 }}>{label}</div>
    </div>
  );
}

// ── Risk Badge ───────────────────────────────────────────────────────
function RiskBadge({ risk }) {
  const c = RISK_COLOR[risk] || '#64748b';
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      background: c+'22', color:c, border:`1px solid ${c}44`,
      borderRadius:20, padding:'4px 14px', fontWeight:700, fontSize:13
    }}>
      <span style={{ width:7, height:7, background:c, borderRadius:'50%', display:'inline-block' }}/>
      {risk} Risk
    </span>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────
function StatCard({ icon, label, value, unit, color='var(--text-main)' }) {
  return (
    <div style={{
      background:'var(--card)', border:'1px solid var(--border)', borderRadius:14,
      padding:'14px 16px', display:'flex', alignItems:'center', gap:12
    }}>
      <div style={{ fontSize:22 }}>{icon}</div>
      <div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>{label}</div>
        <div style={{ fontWeight:800, fontSize:20, color }}>{value} <span style={{ fontSize:12, fontWeight:400 }}>{unit}</span></div>
      </div>
    </div>
  );
}

// ── Alert Banner ─────────────────────────────────────────────────────
function AlertBanner({ district, onDismiss }) {
  return (
    <div style={{
      background:'rgba(239,68,68,0.15)', border:'1.5px solid #ef4444',
      borderRadius:12, padding:'14px 18px', marginBottom:18,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      animation:'pulse-alert 2s infinite'
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:22 }}>🚨</span>
        <div>
          <div style={{ fontWeight:800, color:'#ef4444', fontSize:14 }}>HIGH FLOOD RISK — {district}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>Immediate action required. Contact authorities immediately.</div>
        </div>
      </div>
      <button onClick={onDismiss} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18 }}>✕</button>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────
export default function LiveDistrict() {
  const [selectedDistrict, setSelectedDistrict] = useState('Tirunelveli');
  const [districtData,     setDistrictData]     = useState(null);
  const [allDistricts,     setAllDistricts]      = useState([]);
  const [villages,         setVillages]          = useState([]);
  const [userLocation,     setUserLocation]      = useState(null);
  const [locationError,    setLocationError]     = useState('');
  const [loading,          setLoading]           = useState(true);
  const [mapCenter,        setMapCenter]         = useState([8.7139, 77.7567]);
  const [alertVisible,     setAlertVisible]      = useState(true);
  const [notifSent,        setNotifSent]         = useState(false);
  const [lastUpdate,       setLastUpdate]        = useState('');
  const [villagesLoading,  setVillagesLoading]   = useState(false);
  const intervalRef = useRef(null);

  // ── Fetch live prediction data ──────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/interpolated-predictions`);
      const json = await res.json();
      if (json.status === 'ok') {
        setAllDistricts(json.data);
        const d = json.data.find(x => x.name === selectedDistrict);
        if (d) { setDistrictData(d); setAlertVisible(d.risk_level === 'High'); }
        setLastUpdate(new Date().toLocaleTimeString('en-IN'));
      }
    } catch(e) { console.error('Fetch error:', e); }
    finally { setLoading(false); }
  }, [selectedDistrict]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchData, 60000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  // ── Update map center when district changes ──────────────────────
  useEffect(() => {
    const d = TN_DISTRICTS.find(d => d.name === selectedDistrict);
    if (d) { setMapCenter([d.lat, d.lon]); fetchVillages(d.lat, d.lon, selectedDistrict); }
  }, [selectedDistrict]);

  // ── Fetch villages via Nominatim ─────────────────────────────────
  async function fetchVillages(lat, lon, distName) {
    setVillagesLoading(true);
    setVillages([]);
    try {
      // Fetch towns + villages + suburbs in bounding box around district
      const delta = 0.45;
      const bbox  = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
      const url   = `https://nominatim.openstreetmap.org/search?`
        + `q=village+${encodeURIComponent(distName)}+Tamil+Nadu`
        + `&format=json&addressdetails=1&limit=40&bounded=1&viewbox=${bbox}`;
      const res  = await fetch(url, { headers:{ 'Accept-Language':'en' } });
      const data = await res.json();
      const seen = new Set();
      const results = data
        .filter(r => ['village','town','suburb','hamlet','neighbourhood','city'].includes(r.type))
        .filter(r => { const k = r.display_name; if(seen.has(k)) return false; seen.add(k); return true; })
        .slice(0, 35)
        .map(r => ({
          name: r.name || r.display_name.split(',')[0],
          lat:  parseFloat(r.lat),
          lon:  parseFloat(r.lon),
          type: r.type,
        }));
      setVillages(results.length > 0 ? results : []);
    } catch(e) {
      console.error('Village fetch error:', e);
    } finally {
      setVillagesLoading(false);
    }
  }

  // ── Get user GPS location ────────────────────────────────────────
  function getLocation() {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported.'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationError('');
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
      },
      err => setLocationError('Location denied. Please allow GPS access.'),
      { enableHighAccuracy: true }
    );
  }

  useEffect(() => { getLocation(); }, []);

  // ── Send alert to admin dashboard ───────────────────────────────
  async function sendAdminAlert() {
    if (!districtData) return;
    try {
      await fetch(`${API}/api/predict`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          district: selectedDistrict,
          alert_type: 'MANUAL',
          triggered_by: 'user',
          timestamp: new Date().toISOString(),
          risk_level: districtData.risk_level,
          flood_prob_pct: districtData.flood_prob_pct,
          water_level_m: districtData.water_level_m,
          location: userLocation,
        })
      });
    } catch(e) { /* backend may not have alert endpoint */ }
    setNotifSent(true);
    setTimeout(() => setNotifSent(false), 4000);
  }

  // ── Distance helper ─────────────────────────────────────────────
  function distKm(lat1, lon1, lat2, lon2) {
    const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  const riskColor = districtData ? RISK_COLOR[districtData.risk_level] : '#64748b';

  // ── Styles ───────────────────────────────────────────────────────
  const pageStyle = {
    minHeight:'100vh', background:'var(--bg)', color:'var(--text-main)',
    fontFamily:'var(--font-main, Inter, sans-serif)',
    padding:'24px 20px 40px'
  };

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes pulse-dot { 0%,100%{box-shadow:0 0 0 4px rgba(59,130,246,0.4)} 50%{box-shadow:0 0 0 10px rgba(59,130,246,0.1)} }
        @keyframes pulse-alert { 0%,100%{opacity:1} 50%{opacity:0.85} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .ld-card { background:var(--card); border:1px solid var(--border); border-radius:16px; animation:fadeIn 0.4s ease; }
        .ld-section-title { font-size:13px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:12px; }
        .village-item { padding:8px 12px; border-radius:10px; cursor:pointer; transition:background 0.15s; display:flex; align-items:center; gap:8px; }
        .village-item:hover { background:rgba(99,102,241,0.08); }
        .alert-btn { display:flex; align-items:center; justify-content:center; gap:8px; padding:12px 0; border-radius:12px; font-weight:700; font-size:14px; cursor:pointer; border:none; transition:all 0.2s; width:100%; }
        .alert-btn:hover { filter:brightness(1.1); transform:translateY(-1px); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom:24, display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:26, fontWeight:900, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:28 }}>📍</span> Live District Monitor
          </h1>
          <p style={{ margin:'4px 0 0', color:'var(--text-muted)', fontSize:13 }}>
            Real-time flood data · Updated {lastUpdate || '—'}
            {districtData && <span style={{ marginLeft:10 }}><RiskBadge risk={districtData.risk_level} /></span>}
          </p>
        </div>
        {/* District Selector */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <select
            value={selectedDistrict}
            onChange={e => setSelectedDistrict(e.target.value)}
            style={{
              background:'var(--card)', color:'var(--text-main)', border:'1.5px solid var(--border)',
              borderRadius:10, padding:'9px 14px', fontSize:14, fontWeight:600, cursor:'pointer'
            }}
          >
            {TN_DISTRICTS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
          <button onClick={fetchData} style={{
            background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)',
            color:'#6366f1', borderRadius:10, padding:'9px 16px', cursor:'pointer', fontWeight:600, fontSize:13
          }}>⟳ Refresh</button>
          <button onClick={getLocation} style={{
            background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)',
            color:'#3b82f6', borderRadius:10, padding:'9px 16px', cursor:'pointer', fontWeight:600, fontSize:13
          }}>📡 My Location</button>
        </div>
      </div>

      {/* ── Alert Banner ── */}
      {districtData?.risk_level === 'High' && alertVisible && (
        <AlertBanner district={selectedDistrict} onDismiss={() => setAlertVisible(false)} />
      )}
      {locationError && (
        <div style={{ background:'rgba(249,115,22,0.1)', border:'1px solid rgba(249,115,22,0.3)', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#f97316' }}>
          ⚠️ {locationError}
        </div>
      )}

      {/* ── Main Grid ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, alignItems:'start' }}>

        {/* LEFT COLUMN */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* ── Map ── */}
          <div className="ld-card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px 10px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontWeight:700, fontSize:15 }}>🗺️ District Map — {selectedDistrict}</div>
              {villagesLoading && <span style={{ fontSize:11, color:'var(--text-muted)' }}>Loading villages…</span>}
            </div>
            <div style={{ height:420 }}>
              <MapContainer
                center={mapCenter}
                zoom={10}
                style={{ height:'100%', width:'100%' }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='© <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapController center={mapCenter} zoom={10} />

                {/* District risk circle */}
                {districtData && (
                  <Circle
                    center={[districtData.lat, districtData.lon]}
                    radius={25000}
                    pathOptions={{
                      color: riskColor, fillColor: riskColor,
                      fillOpacity:0.12, weight:2
                    }}
                  />
                )}

                {/* District center marker */}
                {districtData && (
                  <Marker position={[districtData.lat, districtData.lon]}>
                    <Popup>
                      <div style={{ minWidth:180 }}>
                        <b style={{ fontSize:14 }}>{districtData.name}</b><br/>
                        <span style={{ color: riskColor, fontWeight:700 }}>{districtData.risk_level} Risk</span><br/>
                        💧 Water Level: <b>{districtData.water_level_m?.toFixed(2)} m</b><br/>
                        🌧️ Rainfall: <b>{districtData.rainfall_mm?.toFixed(1)} mm</b><br/>
                        📈 Flood Prob: <b>{districtData.flood_prob_pct?.toFixed(1)}%</b>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Village markers */}
                {villages.map((v, i) => (
                  <Marker key={i} position={[v.lat, v.lon]} icon={villageIcon('#6366f1')}>
                    <Popup>
                      <div>
                        <b>{v.name}</b><br/>
                        <span style={{ fontSize:11, color:'#64748b', textTransform:'capitalize' }}>{v.type}</span>
                        {userLocation && (
                          <><br/><span style={{ fontSize:11 }}>📍 {distKm(userLocation.lat, userLocation.lon, v.lat, v.lon).toFixed(1)} km away</span></>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* User location */}
                {userLocation && (
                  <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon}>
                    <Popup><div><b style={{ color:'#3b82f6' }}>📍 Your Location</b><br/><span style={{ fontSize:11 }}>{userLocation.lat.toFixed(5)}, {userLocation.lon.toFixed(5)}</span></div></Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>

          {/* ── Live Stats Grid ── */}
          {loading ? (
            <div style={{ textAlign:'center', padding:30, color:'var(--text-muted)' }}>
              <div className="spinner" style={{ margin:'0 auto 10px' }} />Loading live data…
            </div>
          ) : districtData ? (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:12 }}>
                <StatCard icon="🌧️" label="Rainfall Today"    value={districtData.rainfall_mm?.toFixed(1)}        unit="mm"    />
                <StatCard icon="🌡️" label="Temperature"       value={districtData.temperature_c?.toFixed(1)}      unit="°C"    />
                <StatCard icon="💨" label="Wind Speed"         value={districtData.wind_speed_kmh?.toFixed(1)}     unit="km/h"  />
                <StatCard icon="💧" label="Humidity"           value={districtData.humidity_pct?.toFixed(1)}       unit="%"     />
                <StatCard icon="🌊" label="River Flow"         value={districtData.river_flow_cumec?.toFixed(0)}   unit="cumec" />
                <StatCard icon="🔱" label="Pressure"           value={districtData.pressure_hpa?.toFixed(0)}       unit="hPa"   />
              </div>

              {/* Flood probability bar */}
              <div className="ld-card" style={{ padding:'18px 20px' }}>
                <div className="ld-section-title">Flood Probability</div>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:10 }}>
                  <div style={{ flex:1, height:16, background:'rgba(0,0,0,0.15)', borderRadius:10, overflow:'hidden' }}>
                    <div style={{
                      height:'100%', width:`${districtData.flood_prob_pct}%`,
                      background:`linear-gradient(90deg, #22c55e, ${districtData.flood_prob_pct>=65?'#ef4444':districtData.flood_prob_pct>=45?'#f97316':'#22c55e'})`,
                      borderRadius:10, transition:'width 1s ease'
                    }} />
                  </div>
                  <span style={{ fontWeight:800, fontSize:20, color: riskColor, minWidth:56 }}>{districtData.flood_prob_pct?.toFixed(1)}%</span>
                </div>
                <div style={{ display:'flex', gap:16, fontSize:12, color:'var(--text-muted)' }}>
                  <span>🟢 Low: {districtData.prob_low?.toFixed(1)}%</span>
                  <span>🟠 Moderate: {districtData.prob_moderate?.toFixed(1)}%</span>
                  <span>🔴 High: {districtData.prob_high?.toFixed(1)}%</span>
                </div>
                <div style={{ marginTop:10, fontSize:12, color:'var(--text-muted)' }}>
                  Thresholds: Moderate ≥ 45% · High ≥ 65% · Condition: <b>{districtData.condition}</b>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:30, color:'var(--text-muted)', fontSize:14 }}>No data available for this district.</div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* ── Water Level Gauge ── */}
          <div className="ld-card" style={{ padding:'18px 20px', display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div className="ld-section-title" style={{ alignSelf:'flex-start' }}>💧 Water Measurement</div>
            <WaterGauge level={districtData?.water_level_m ?? 0} />
            <div style={{ marginTop:12, fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>
              Tidal height: {districtData?.tidal_height_m?.toFixed(3) ?? '—'} m<br/>
              Coastal: {districtData?.coastal ? '✅ Yes' : '❌ No'}
            </div>
          </div>

          {/* ── Emergency Alerts ── */}
          <div className="ld-card" style={{ padding:'18px 20px' }}>
            <div className="ld-section-title">🚨 Emergency Alerts</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button className="alert-btn" style={{ background:'rgba(239,68,68,0.15)', color:'#ef4444', border:'1.5px solid rgba(239,68,68,0.4)' }}
                onClick={() => window.open('tel:1070')}>
                📞 Call Disaster Mgmt (1070)
              </button>
              <button className="alert-btn" style={{ background:'rgba(249,115,22,0.15)', color:'#f97316', border:'1.5px solid rgba(249,115,22,0.4)' }}
                onClick={() => window.open(`sms:1070?body=FLOOD ALERT: ${selectedDistrict} district. Risk: ${districtData?.risk_level ?? 'Unknown'}. Water Level: ${districtData?.water_level_m?.toFixed(2) ?? '?'} m. Flood Probability: ${districtData?.flood_prob_pct?.toFixed(1) ?? '?'}%. Please assist immediately.`)}>
                📱 Send SMS Alert
              </button>
              <button className="alert-btn"
                style={{ background: notifSent ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)', color: notifSent ? '#22c55e' : '#6366f1', border:`1.5px solid ${notifSent ? 'rgba(34,197,94,0.4)' : 'rgba(99,102,241,0.4)'}` }}
                onClick={sendAdminAlert}>
                {notifSent ? '✅ Alert Sent!' : '🔔 Notify Admin Dashboard'}
              </button>
              <button className="alert-btn" style={{ background:'rgba(59,130,246,0.1)', color:'#3b82f6', border:'1.5px solid rgba(59,130,246,0.3)' }}
                onClick={() => {
                  const txt = userLocation
                    ? `FloodGuard TN — ${selectedDistrict}\nRisk: ${districtData?.risk_level}\nWater: ${districtData?.water_level_m?.toFixed(2)}m\nMy Location: ${userLocation.lat.toFixed(5)},${userLocation.lon.toFixed(5)}\nhttps://maps.google.com/?q=${userLocation.lat},${userLocation.lon}`
                    : `FloodGuard TN — ${selectedDistrict}\nRisk: ${districtData?.risk_level}\nWater: ${districtData?.water_level_m?.toFixed(2)}m`;
                  navigator.clipboard.writeText(txt);
                  alert('Alert info copied to clipboard!');
                }}>
                📋 Share Location & Data
              </button>
            </div>
          </div>

          {/* ── My Location ── */}
          <div className="ld-card" style={{ padding:'16px 18px' }}>
            <div className="ld-section-title">📡 My GPS Location</div>
            {userLocation ? (
              <div style={{ fontSize:13 }}>
                <div style={{ fontWeight:700, color:'#3b82f6', marginBottom:4 }}>Location Active ✅</div>
                <div style={{ color:'var(--text-muted)', fontSize:12 }}>
                  Lat: {userLocation.lat.toFixed(5)}<br/>
                  Lon: {userLocation.lon.toFixed(5)}
                </div>
                <a
                  href={`https://maps.google.com/?q=${userLocation.lat},${userLocation.lon}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:12, color:'#6366f1', marginTop:6, display:'inline-block' }}
                >Open in Google Maps →</a>
              </div>
            ) : (
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>
                {locationError || 'Waiting for GPS…'}
                <button onClick={getLocation} style={{ display:'block', marginTop:8, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)', color:'#3b82f6', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                  Enable GPS
                </button>
              </div>
            )}
          </div>

          {/* ── Village List ── */}
          <div className="ld-card" style={{ padding:'16px 18px', maxHeight:320, overflowY:'auto' }}>
            <div className="ld-section-title">🏘️ Villages & Towns ({villages.length})</div>
            {villagesLoading ? (
              <div style={{ textAlign:'center', padding:16, color:'var(--text-muted)', fontSize:13 }}>
                <div className="spinner" style={{ margin:'0 auto 8px' }}/>Loading villages…
              </div>
            ) : villages.length === 0 ? (
              <div style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:12 }}>No villages found</div>
            ) : (
              villages.map((v, i) => (
                <div key={i} className="village-item"
                  onClick={() => setMapCenter([v.lat, v.lon])}>
                  <span style={{ fontSize:13 }}>
                    {v.type === 'city' ? '🏙️' : v.type === 'town' ? '🏪' : '🏘️'}
                  </span>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13 }}>{v.name}</div>
                    {userLocation && (
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                        {distKm(userLocation.lat, userLocation.lon, v.lat, v.lon).toFixed(1)} km away · {v.type}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── All Districts Quick View ── */}
          <div className="ld-card" style={{ padding:'16px 18px', maxHeight:280, overflowY:'auto' }}>
            <div className="ld-section-title">📋 All Districts Risk</div>
            {allDistricts.slice().sort((a,b)=>b.flood_prob_pct-a.flood_prob_pct).map(d => (
              <div key={d.name}
                onClick={() => setSelectedDistrict(d.name)}
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'opacity 0.15s' }}
                className="village-item">
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:8, height:8, background:RISK_COLOR[d.risk_level]||'#64748b', borderRadius:'50%', display:'inline-block', flexShrink:0 }} />
                  <span style={{ fontSize:13, fontWeight: d.name===selectedDistrict ? 700 : 400 }}>{d.name}</span>
                </div>
                <span style={{ fontSize:12, color:RISK_COLOR[d.risk_level]||'#64748b', fontWeight:700 }}>{d.flood_prob_pct?.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
