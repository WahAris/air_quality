import React, { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { POLLUTANTS } from '../../utils/aqiCalculator';
import { getSummary } from '../../services/api';
import './Header.css';

const LOCATIONS = {
  canberra: 'Canberra, Australia',
  bangkok: 'Bangkok, Thailand',
  hongkong: 'Causeway Bay, Hong Kong SAR',
  london: 'London, United Kingdom',
  philadelphia: 'Philadelphia, USA',
};

const COUNTRY_GRADIENTS = {
  canberra: 'linear-gradient(135deg, #0b1a30, #1b355a)',      // Deep navy/indigo blue
  bangkok: 'linear-gradient(135deg, #0a1f33, #153c60)',       // Classic dark blue
  hongkong: 'linear-gradient(135deg, #061c30, #0c395e)',      // Dark ocean blue
  london: 'linear-gradient(135deg, #031525, #083050)',        // Midnight blue
  philadelphia: 'linear-gradient(135deg, #0e1e38, #1c3a6b)',  // Slate dark blue
};

function Header() {
  const { state, dispatch } = useAppContext();
  const { activeCountry, activePollutant, activeValue } = state;

  useEffect(() => {
    getSummary(activePollutant).then(res => {
      const activeData = res.data.find(d => d.country === activeCountry);
      if (activeData) {
        dispatch({
          type: 'SET_AQI_DATA',
          payload: { activeValue: activeData.value }
        });
      }
    });
  }, [activeCountry, activePollutant, dispatch]);

  const handleCountryChange = (e) => {
    dispatch({ type: 'SET_ACTIVE_COUNTRY', payload: e.target.value });
  };

  const handlePollutantChange = (pKey) => {
    dispatch({ type: 'SET_ACTIVE_POLLUTANT', payload: pKey });
  };

  const headerBg = COUNTRY_GRADIENTS[activeCountry] || COUNTRY_GRADIENTS.canberra;
  const activePollutantInfo = POLLUTANTS[activePollutant] || POLLUTANTS.CO;

  return (
    <div 
      className="aqi-header" 
      style={{ background: headerBg }}
    >
      <div className="container header-content">
        <div className="header-info">
          <h2>{LOCATIONS[activeCountry] || activeCountry}</h2>
          <div className="aqi-details">
            <span className="co-value">
              {activeValue !== undefined ? activeValue.toFixed(2) : '0.00'} {activePollutantInfo.unit} {activePollutantInfo.key}
            </span>
          </div>
        </div>
        <div className="header-controls">
          <div className="control-selectors">
            <div className="selector-group">
              <label htmlFor="country-select" className="sr-only">Pilih Kota</label>
              <select 
                id="country-select"
                value={activeCountry} 
                onChange={handleCountryChange}
                className="country-select"
              >
                {Object.entries(LOCATIONS).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>
            <div className="pollutant-pills">
              {Object.keys(POLLUTANTS).map(pKey => (
                <button
                  key={pKey}
                  onClick={() => handlePollutantChange(pKey)}
                  className={`pollutant-pill ${activePollutant === pKey ? 'active' : ''}`}
                >
                  {pKey}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;
