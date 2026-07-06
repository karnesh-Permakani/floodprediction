import { useEffect, useState } from 'react';
import { fetchHistory } from '../utils/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend);

const RISK_COLOR = { High:'#ef4444', Moderate:'#f97316', Low:'#22c55e' };

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState('');

  useEffect(()=>{
    fetchHistory(district||null).then(d=>{setHistory(d);setLoading(false);}).catch(()=>setLoading(false));
  },[district]);

  // Build chart data grouped by date
  const dates = [...new Set(history.map(r=>r.date))].sort();
  const avgRainByDate = dates.map(date=>{
    const rows = history.filter(r=>r.date===date);
    return (rows.reduce((s,r)=>s+r.rainfall_mm,0)/rows.length).toFixed(1);
  });
  const highCountByDate = dates.map(date=>history.filter(r=>r.date===date&&r.risk_level==='High').length);

  const lineData = {
    labels: dates,
    datasets:[{
      label:'Avg Rainfall (mm)',
      data:avgRainByDate,
      borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.08)',
      fill:true,tension:0.4,pointRadius:3,borderWidth:2,
    }]
  };
  const barData = {
    labels: dates,
    datasets:[{
      label:'High Risk Districts',
      data:highCountByDate,
      backgroundColor:'rgba(239,68,68,0.6)',borderColor:'#ef4444',
      borderWidth:2,borderRadius:4,
    }]
  };
  const chartOpts = {
    responsive:true,maintainAspectRatio:false,
    plugins:{legend:{labels:{color:'#94a3b8',font:{size:12}}}},
    scales:{
      x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#475569',font:{size:10},maxTicksLimit:6}},
      y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#94a3b8'}}
    }
  };

  const TN_DISTRICTS = ["All","Chennai","Coimbatore","Madurai","Tiruchirappalli","Salem","Tirunelveli","Tiruppur","Vellore","Erode","Thoothukudi","Dindigul","Thanjavur","Ranipet","Sivaganga","Virudhunagar","Nagapattinam","Kancheepuram","Tiruvallur","Cuddalore","Krishnagiri","Dharmapuri","Perambalur","Ariyalur","Karur","Namakkal","Nilgiris","Pudukkottai","Ramanathapuram","Theni","Tiruvannamalai","Villupuram","Kallakurichi"];

  return (
    <div className="page">
      <div className="container" style={{paddingTop:32,paddingBottom:48}}>
        <div className="page-header">
          <h1>📈 Flood History</h1>
          <p>30-day historical flood and rainfall records across Tamil Nadu</p>
        </div>

        {/* Filter */}
        <div style={{marginBottom:24,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
          <label style={{color:'var(--text-muted)',fontSize:13}}>Filter by district:</label>
          <select value={district} onChange={e=>setDistrict(e.target.value==='All'?'':e.target.value)}
            style={{padding:'9px 14px',background:'var(--bg-card)',border:'1px solid var(--border)',
              borderRadius:10,color:'var(--text)',fontSize:13,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
            {TN_DISTRICTS.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Charts */}
        <div className="grid-2" style={{marginBottom:24}}>
          <div className="card" style={{padding:24}}>
            <div className="section-title">Rainfall Trend (30 days)</div>
            <div style={{height:200}}>{!loading && <Line data={lineData} options={chartOpts}/>}</div>
          </div>
          <div className="card" style={{padding:24}}>
            <div className="section-title">High-Risk Districts per Day</div>
            <div style={{height:200}}>{!loading && <Bar data={barData} options={chartOpts}/>}</div>
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{overflow:'hidden'}}>
          <div style={{padding:'16px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontWeight:700}}>Historical Records</div>
            <div style={{fontSize:12,color:'var(--text-muted)'}}>{history.length} records</div>
          </div>
          <div style={{overflowX:'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th><th>District</th><th>Risk Level</th>
                  <th>Rainfall mm</th><th>Water Level m</th>
                  <th>River Flow cumec</th><th>Tidal m</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array(8).fill(0).map((_,i)=>(
                    <tr key={i}><td colSpan={7}><div className="shimmer" style={{height:36,borderRadius:6}}/></td></tr>
                  ))
                  : history.slice(0,100).map((r,i)=>(
                    <tr key={i}>
                      <td style={{color:'var(--text-muted)',fontSize:12}}>{r.date}</td>
                      <td style={{fontWeight:600}}>{r.district}</td>
                      <td>
                        <span className={`badge badge-${r.risk_level.toLowerCase()}`}>
                          {r.risk_level==='High'?'🚨':r.risk_level==='Moderate'?'⚠️':'✅'} {r.risk_level}
                        </span>
                      </td>
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
    </div>
  );
}
