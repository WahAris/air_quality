import React, { useState, useEffect, useRef } from 'react';
import { getCoData } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { POLLUTANTS } from '../utils/aqiCalculator';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Download, Table as TableIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import './DataCO.css';

const COUNTRIES = {
  canberra: { name: 'Canberra', color: '#378ADD' },
  bangkok: { name: 'Bangkok', color: '#EF9F27' },
  hongkong: { name: 'Hong Kong', color: '#1D9E75' },
  london: { name: 'London', color: '#993C1D' },
  philadelphia: { name: 'Philadelphia', color: '#BA7517' }
};

function DataCO() {
  const { state } = useAppContext();
  const [granularity, setGranularity] = useState('hourly');
  const [selectedCountries, setSelectedCountries] = useState(['canberra', 'bangkok']);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');
  const chartRef = useRef(null);

  const activePollutantInfo = POLLUTANTS[state.activePollutant] || POLLUTANTS.CO;

  useEffect(() => {
    setLoading(true);
    setDateError('');

    if (startDate && endDate) {
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      const diffDays = (eDate - sDate) / (1000 * 60 * 60 * 24);
      
      if (diffDays < 0) {
        setDateError('Tanggal akhir harus setelah tanggal mulai.');
        setLoading(false);
        return;
      }
      if (granularity === 'hourly' && diffDays > 1) {
        setDateError('Rentang data Hourly maksimal 2 hari (48 jam).');
        setLoading(false);
        return;
      }
      if (granularity === 'daily' && diffDays > 6) {
        setDateError('Rentang data Daily maksimal 7 hari.');
        setLoading(false);
        return;
      }
      if (granularity === 'monthly' && diffDays > 365) {
        setDateError('Rentang data Monthly maksimal 12 bulan.');
        setLoading(false);
        return;
      }
    }
    
    let startStr = startDate ? new Date(startDate).toISOString() : null;
    let endStr = null;
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59);
      endStr = eDate.toISOString();
    }

    getCoData(selectedCountries, granularity, startStr, endStr, state.activePollutant).then((res) => {
      // Transform data for recharts (group by datetime)
      // Reverse to show older -> newer on the chart left -> right
      const rawData = [...res.data].reverse();
      const grouped = rawData.reduce((acc, curr) => {
        const d = new Date(curr.datetime_utc);
        let timeStr = d.toLocaleDateString();
        
        if (granularity === 'hourly') {
          timeStr = d.toLocaleString([], {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'});
        } else if (granularity === 'monthly') {
          timeStr = d.toLocaleDateString([], {month: 'short', year: 'numeric'});
        } else if (granularity === 'yearly') {
          timeStr = d.getFullYear().toString();
        }

        if (!acc[timeStr]) acc[timeStr] = { time: timeStr, rawDate: d };
        acc[timeStr][curr.country] = curr.value;
        return acc;
      }, {});
      
      const chartData = Object.values(grouped).sort((a, b) => a.rawDate - b.rawDate);
      setData(chartData);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching data:', err);
      setDateError('Gagal memuat data dari server. Pastikan backend sudah berjalan.');
      setLoading(false);
    });
  }, [granularity, selectedCountries, state.activePollutant, startDate, endDate]);

  const toggleCountry = (country) => {
    setSelectedCountries(prev => 
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    );
  };

  const handleExportPNG = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = `${state.activePollutant.toLowerCase()}-data-chart.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className="data-co-page">
      <div className="controls-panel card">
        <div className="control-group">
          <h3>Rentang Waktu</h3>
          <div className="tabs">
            {['hourly', 'daily', 'monthly', 'yearly'].map(g => {
              const labels = { hourly: 'Per Jam', daily: 'Harian', monthly: 'Bulanan', yearly: 'Tahunan' };
              return (
                <button 
                  key={g} 
                  className={`tab ${granularity === g ? 'active' : ''}`}
                  onClick={() => { setGranularity(g); setStartDate(''); setEndDate(''); setDateError(''); }}
                >
                  {labels[g]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="control-group">
          <h3>Lokasi</h3>
          <div className="country-toggles">
            {Object.entries(COUNTRIES).map(([key, info]) => (
              <label key={key} className="country-checkbox">
                <input 
                  type="checkbox" 
                  checked={selectedCountries.includes(key)}
                  onChange={() => toggleCountry(key)}
                />
                <span style={{ color: info.color, fontWeight: 'bold' }}>{info.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="control-group">
          <h3>Rentang Tanggal (Opsional)</h3>
          <div className="date-filters">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="date-input"
            />
            <span> - </span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="date-input"
            />
            {(startDate || endDate) && (
              <button className="btn-clear" onClick={() => { setStartDate(''); setEndDate(''); }}>Hapus</button>
            )}
          </div>
          {dateError && <div className="date-error" style={{ color: '#E53E3E', fontSize: '13px', marginTop: '8px', fontWeight: '500' }}>{dateError}</div>}
        </div>
      </div>

      <div className="chart-panel card">
        <div className="panel-header">
          <h2>Tren Konsentrasi {activePollutantInfo.name} ({activePollutantInfo.key})</h2>
          <button className="btn btn-outline" onClick={handleExportPNG}>
            <Download size={16} /> Ekspor PNG
          </button>
        </div>
        
        {loading ? (
          <div className="loading-state">Memuat data...</div>
        ) : (
          <div className="chart-container" ref={chartRef}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-200)" />
                <XAxis dataKey="time" stroke="var(--color-gray-500)" fontSize={12} />
                <YAxis 
                  stroke="var(--color-gray-500)" 
                  fontSize={12} 
                  label={{ value: `${activePollutantInfo.key} (${activePollutantInfo.unit})`, angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                />
                <Legend />
                {selectedCountries.map(country => (
                  <Line 
                    key={country} 
                    type="monotone" 
                    dataKey={country} 
                    name={COUNTRIES[country].name} 
                    stroke={COUNTRIES[country].color} 
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 1 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="table-panel card">
        <div className="panel-header">
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <TableIcon size={20} />
            <h2>Tabel Data</h2>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                {selectedCountries.map(c => (
                  <th key={c}>{COUNTRIES[c].name} ({activePollutantInfo.unit})</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td>{row.time}</td>
                  {selectedCountries.map(c => (
                    <td key={c}>{row[c] !== undefined ? row[c].toFixed(2) : '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DataCO;
