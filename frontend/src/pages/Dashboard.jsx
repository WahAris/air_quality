import React, { useEffect, useState } from 'react';
import { getSummary } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { POLLUTANTS } from '../utils/aqiCalculator';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import './Dashboard.css';

const COUNTRIES = [
  { key: 'canberra', name: 'Canberra' },
  { key: 'bangkok', name: 'Bangkok' },
  { key: 'hongkong', name: 'Causeway Bay' },
  { key: 'london', name: 'London' },
  { key: 'philadelphia', name: 'Philadelphia' }
];

function Sparkline({ baseValue, color }) {
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
      
      const activeData = res.data.find(d => d.country === state.activeCountry);
      if (activeData) {
        dispatch({ 
          type: 'SET_AQI_DATA', 
          payload: { activeValue: activeData.value } 
        });
      }
    });
  }, [state.activeCountry, state.activePollutant, dispatch]);

  const activePollutantInfo = POLLUTANTS[state.activePollutant] || POLLUTANTS.CO;

  // Helper to find data for a specific country
  const getDataForCountry = (countryKey) => {
    return summaryData.find(d => d.country === countryKey);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-intro card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
          Overview 5 Negara: Konsentrasi {activePollutantInfo.name} ({activePollutantInfo.key})
        </h2>
      </div>
      
      <div className="summary-grid">
        {COUNTRIES.map((country) => {
          const data = getDataForCountry(country.key);
          const isActive = country.key === state.activeCountry;
          
          return (
            <div 
              key={country.key} 
              className={`card summary-card ${isActive ? 'active' : ''}`} 
              onClick={() => dispatch({ type: 'SET_ACTIVE_COUNTRY', payload: country.key })}
            >
              <div className="card-header">
                <h3 style={{ fontSize: '1.1rem' }}>{country.name}</h3>
                {data && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', display: 'block', marginTop: '4px' }}>
                    {new Date(data.datetime_utc).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              
              <div className="card-body">
                {loading ? (
                  <div style={{ color: 'var(--color-gray-400)', fontSize: '0.9rem', padding: '10px 0' }}>Memuat data...</div>
                ) : data ? (
                  <>
                    <div className="co-stats">
                      <span className="co-val">{data.value.toFixed(2)}</span>
                      <span className="co-unit">{data.unit}</span>
                    </div>
                    <div className={`co-change ${data.change_24h > 0 ? 'up' : 'down'}`}>
                      {data.change_24h > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      <span>{Math.abs(data.change_24h).toFixed(2)} vs 24h</span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-rust-hazard)', padding: '10px 0', fontSize: '0.9rem' }}>
                    <AlertCircle size={16} /> Data tidak tersedia
                  </div>
                )}
              </div>
              
              <div className="card-footer" style={{ minHeight: '60px' }}>
                {data && <Sparkline baseValue={data.value} color="var(--color-sky-blue)" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Dashboard;
