import React, { useState, useEffect } from 'react';
import { getForecast } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { POLLUTANTS } from '../utils/aqiCalculator';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, ComposedChart } from 'recharts';
import { Activity } from 'lucide-react';
import './Forecasting.css';

const HORIZONS = {
  xgboost: [
    { value: 'h1', label: '1 Jam' },
    { value: 'h6', label: '6 Jam' },
    { value: 'h24', label: '24 Jam' }
  ],
  prophet: [
    { value: '1_week', label: '1 Minggu' },
    { value: '1_month', label: '1 Bulan' },
    { value: '1_year', label: '1 Tahun' }
  ]
};

function Forecasting() {
  const { state } = useAppContext();
  const [model, setModel] = useState('xgboost');
  const [country, setCountry] = useState('canberra');
  const [horizon, setHorizon] = useState('h24');
  const [data, setData] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeModel, setActiveModel] = useState('');

  const activePollutantInfo = POLLUTANTS[state.activePollutant] || POLLUTANTS.CO;

  // When model changes, update horizon to valid default
  useEffect(() => {
    if (model === 'xgboost') setHorizon('h24');
    else setHorizon('1_month');
  }, [model]);

  // Reset forecasting data if pollutant changes so user runs it again with correct pollutant
  useEffect(() => {
    setData([]);
    setMetrics(null);
  }, [state.activePollutant]);

  const runForecast = () => {
    setLoading(true);
    setError('');
    setData([]);
    setMetrics(null);
    getForecast(model, country, horizon, state.activePollutant).then(res => {
      const predictions = (res.data.predictions || []).map(p => ({
        ...p,
        // Format ds for readability
        label: model === 'xgboost'
          ? new Date(p.ds).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : new Date(p.ds).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      }));
      setData(predictions);
      setMetrics(res.data.metrics);
      setActiveModel(res.data.model || model);
      setLoading(false);
    }).catch(err => {
      const msg = err?.response?.data?.detail || 'Gagal menjalankan forecast. Pastikan backend berjalan.';
      setError(msg);
      setLoading(false);
    });
  };

  return (
    <div className="forecast-page">
      <div className="forecast-layout">
        {/* Sidebar Controls */}
        <div className="forecast-sidebar">
          <div className="card control-card">
            <h3>Konfigurasi Prediksi</h3>
            <div style={{ marginBottom: 'var(--space-sm)', fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>
              Target Polutan: <strong>{activePollutantInfo.name} ({activePollutantInfo.key})</strong>
            </div>
            
            <div className="form-group">
              <label>Pilihan Model</label>
              <div className="model-toggle">
                <button 
                  className={`model-btn ${model === 'xgboost' ? 'active' : ''}`}
                  onClick={() => setModel('xgboost')}
                >
                  XGBoost (Jangka Pendek)
                </button>
                <button 
                  className={`model-btn ${model === 'prophet' ? 'active' : ''}`}
                  onClick={() => setModel('prophet')}
                >
                  Prophet (Jangka Panjang)
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Lokasi Target</label>
              <select className="select-input" value={country} onChange={e => setCountry(e.target.value)}>
                <option value="canberra">Canberra, Australia</option>
                <option value="bangkok">Bangkok, Thailand</option>
                <option value="hongkong">Causeway Bay, Hong Kong</option>
                <option value="london">London, UK</option>
                <option value="philadelphia">Philadelphia, USA</option>
              </select>
            </div>

            <div className="form-group">
              <label>Rentang Waktu Prediksi</label>
              <select className="select-input" value={horizon} onChange={e => setHorizon(e.target.value)}>
                {HORIZONS[model].map(h => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>

            <button className="btn btn-primary run-btn" onClick={runForecast} disabled={loading}>
              {loading ? 'Menjalankan Model...' : 'Jalankan Prediksi'}
            </button>
          </div>

          {metrics && (
            <div className="card metrics-card">
              <h3>Performa Model (Data Uji)</h3>
              <div className="metric-row">
                <span>MAE:</span>
                <strong>{metrics.mae != null ? metrics.mae.toFixed(4) : 'N/A'}</strong>
              </div>
              <div className="metric-row">
                <span>RMSE:</span>
                <strong>{metrics.rmse != null ? metrics.rmse.toFixed(4) : 'N/A'}</strong>
              </div>
              <div className="metric-row">
                <span>SMAPE:</span>
                <strong>{metrics.smape != null ? `${metrics.smape.toFixed(2)}%` : 'N/A'}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Main Chart Area */}
        <div className="forecast-main">
          <div className="card chart-card">
            <div className="chart-header">
              <Activity size={20} color="var(--color-sky-blue)" />
              <h2>Prediksi {activePollutantInfo.key} — {activeModel || (model === 'xgboost' ? 'XGBoost' : 'Prophet')}</h2>
            </div>
            {error && (
              <div style={{ color: '#E53E3E', padding: '12px', background: '#FFF5F5', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                ⚠️ {error}
              </div>
            )}
            {data.length === 0 && !loading && !error ? (
              <div className="empty-state">
                <p>Atur parameter dan klik "Jalankan Prediksi" untuk melihat hasil untuk <strong>{activePollutantInfo.key}</strong>.</p>
              </div>
            ) : loading ? (
              <div className="empty-state">⏳ Sedang menjalankan model, harap tunggu...</div>
            ) : data.length > 0 ? (
              <div style={{ height: '450px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis label={{ value: `${activePollutantInfo.key} (${activePollutantInfo.unit})`, angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(val) => [val?.toFixed ? val.toFixed(4) : val, '']} />
                    <Legend />
                    <Area type="monotone" dataKey="yhat_upper" name="Batas Atas" fill="rgba(55,138,221,0.15)" stroke="none" />
                    <Area type="monotone" dataKey="yhat_lower" name="Batas Bawah" fill="white" stroke="none" />
                    <Line type="monotone" dataKey="yhat" name="Prediksi" stroke="var(--color-sky-blue)" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Forecasting;
