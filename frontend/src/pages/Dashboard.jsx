import React, { useEffect, useState } from 'react';
import { getSummary } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { POLLUTANTS } from '../utils/aqiCalculator';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import './Dashboard.css';

function Sparkline({ baseValue, color }) {
  // Generate pseudo-random realistic trend for the sparkline based on the base value
  const chartData = [1, 2, 3, 4, 5, 6, 7].map((d, i) => {
    const variation = baseValue * 0.15;
    const val = baseValue + Math.sin(i * 41) * variation;
    return { value: parseFloat(val.toFixed(2)) };
  });
  return (
    <div style={{ height: '50px', width: '100px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Dashboard() {
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    setLoading(true);
    getSummary(state.activePollutant).then((res) => {
      setSummaryData(res.data);
      setLoading(false);
      
      // Update global context for header with active country data
      const activeData = res.data.find(d => d.country === state.activeCountry);
      if (activeData) {
        dispatch({ 
          type: 'SET_AQI_DATA', 
          payload: { activeValue: activeData.value } 
        });
      }
    });
  }, [state.activeCountry, state.activePollutant, dispatch]);

  if (loading) return <div className="loading-state">Memuat dasbor...</div>;

  const activePollutantInfo = POLLUTANTS[state.activePollutant] || POLLUTANTS.CO;

  return (
    <div className="dashboard">
      <div className="dashboard-intro card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
          Menampilkan konsentrasi {activePollutantInfo.name} ({activePollutantInfo.key}) di seluruh stasiun pemantauan
        </h2>
      </div>
      <div className="summary-grid">
        {summaryData.map((data) => {

          return (
            <div 
              key={data.country} 
              className={`card summary-card ${data.country === state.activeCountry ? 'active' : ''}`} 
              onClick={() => dispatch({ type: 'SET_ACTIVE_COUNTRY', payload: data.country })}
            >
              <div className="card-header">
                <h3>{data.location_name}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', display: 'block', marginTop: '4px' }}>
                  {new Date(data.datetime_utc).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="card-body">
                <div className="co-stats">
                  <span className="co-val">{data.value.toFixed(2)}</span>
                  <span className="co-unit">{data.unit}</span>
                </div>
                <div className={`co-change ${data.change_24h > 0 ? 'up' : 'down'}`}>
                  {data.change_24h > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{Math.abs(data.change_24h).toFixed(2)} vs 24h</span>
                </div>
              </div>
              <div className="card-footer">
                <Sparkline baseValue={data.value} color="var(--color-sky-blue)" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Dashboard;
