import axios from 'axios';
import { getAqiInfo } from '../utils/aqiCalculator';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// We are now connected to the real backend
const MOCK_MODE = false;

const BASE_VALUES = {
  CO: { canberra: 1.10, bangkok: 4.20, hongkong: 5.80, london: 2.50, philadelphia: 3.20 },
  NO2: { canberra: 0.015, bangkok: 0.045, hongkong: 0.065, london: 0.028, philadelphia: 0.035 },
  O3: { canberra: 0.025, bangkok: 0.055, hongkong: 0.042, london: 0.032, philadelphia: 0.038 },
  PM10: { canberra: 0.12, bangkok: 0.75, hongkong: 0.58, london: 0.22, philadelphia: 0.30 },
  'PM2.5': { canberra: 0.06, bangkok: 0.38, hongkong: 0.28, london: 0.12, philadelphia: 0.18 }
};

// Deterministic pseudo-random based on seed (no Math.random per-render)
const seededVal = (seed, min, max) => {
  const x = Math.sin(seed) * 10000;
  return min + (x - Math.floor(x)) * (max - min);
};

export const getSummary = async (pollutant = 'CO') => {
  if (MOCK_MODE) {
    const unit = 'ppm';
    const bases = BASE_VALUES[pollutant] || BASE_VALUES.CO;
    
    const summary = [
      { country: 'canberra', location_name: 'Canberra', change_24h: 0.05 * bases.canberra },
      { country: 'bangkok', location_name: 'Bangkok', change_24h: -0.08 * bases.bangkok },
      { country: 'hongkong', location_name: 'Causeway Bay', change_24h: 0.12 * bases.hongkong },
      { country: 'london', location_name: 'London', change_24h: -0.03 * bases.london },
      { country: 'philadelphia', location_name: 'Philadelphia', change_24h: 0.04 * bases.philadelphia },
    ].map(data => {
      const base = bases[data.country];
      const val = parseFloat(base.toFixed(3)); // use 3 decimals for ppm representation
      const aqiInfo = getAqiInfo(val, pollutant);
      return {
        ...data,
        value_ppm: val,
        value: val,
        unit,
        aqi_tier: aqiInfo.tier,
        aqi: aqiInfo.aqi
      };
    });
    
    return new Promise(resolve => setTimeout(() => resolve({ data: summary }), 500));
  }
  
  const response = await api.get('/api/data/summary', { params: { pollutant } });
  response.data = response.data.map(item => {
    const aqiInfo = getAqiInfo(item.value, pollutant);
    return {
      ...item,
      aqi_tier: aqiInfo.tier,
      aqi: aqiInfo.aqi
    };
  });
  return response;
};

export const getCoData = async (countries, granularity, start, end, pollutant = 'CO') => {
  if (MOCK_MODE) {
    const data = [];
    const pointCount = granularity === 'hourly' ? 48 : granularity === 'daily' ? 30 : granularity === 'monthly' ? 12 : 5;
    const now = new Date();
    
    const bases = BASE_VALUES[pollutant] || BASE_VALUES.CO;
    
    for (let i = 0; i < pointCount; i++) {
      const d = new Date(now);
      if (granularity === 'hourly') d.setHours(d.getHours() - (pointCount - i));
      else if (granularity === 'daily') d.setDate(d.getDate() - (pointCount - i));
      else if (granularity === 'monthly') d.setMonth(d.getMonth() - (pointCount - i));
      else d.setFullYear(d.getFullYear() - (pointCount - i));

      countries.forEach(country => {
        const base = bases[country] ?? 1.0;
        const variation = base * 0.2;
        data.push({
          datetime_utc: d.toISOString(),
          country,
          value_ppm: parseFloat((base + seededVal(i * 31 + country.charCodeAt(0), -variation, variation)).toFixed(3)),
        });
      });
    }
    return new Promise(resolve => setTimeout(() => resolve({ data }), 600));
  }
  return api.get(`/api/data/${pollutant.toLowerCase()}`, { params: { countries: countries.join(','), gran: granularity, start, end, pollutant } });
};

export const getForecast = async (model, country, horizon, pollutant = 'CO') => {
  if (MOCK_MODE) {
    const predictions = [];
    const now = new Date();
    const bases = BASE_VALUES[pollutant] || BASE_VALUES.CO;
    const baseVal = bases[country] || 1.0;
    
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      
      const yhat = baseVal + (Math.random() * baseVal * 0.3) - (baseVal * 0.15);
      predictions.push({
        ds: d.toISOString().split('T')[0],
        yhat: parseFloat(yhat.toFixed(3)),
        yhat_lower: parseFloat((yhat * 0.8).toFixed(3)),
        yhat_upper: parseFloat((yhat * 1.2).toFixed(3)),
      });
    }
    return new Promise(resolve => setTimeout(() => resolve({ 
      data: {
        predictions,
        metrics: { mae: baseVal * 0.05, rmse: baseVal * 0.08, smape: 11.2 }
      }
    }), 1000));
  }

  // Real API: route to correct endpoint based on model
  const endpoint = model === 'prophet' ? '/api/forecast/prophet' : '/api/forecast/xgboost';
  const pollutantKey = pollutant === 'PM2.5' ? 'pm25' : pollutant.toLowerCase();
  const response = await api.post(endpoint, {
    country,
    horizon,
    pollutant: pollutantKey,
  });
  // Normalize response to match existing frontend shape
  return {
    data: {
      predictions: response.data.predictions,
      metrics: response.data.metrics,
      model: response.data.model,
    }
  };
};

export const getGisSensors = async (pollutant = 'CO') => {
  if (MOCK_MODE) {
    const unit = 'ppm';
    const bases = BASE_VALUES[pollutant] || BASE_VALUES.CO;
    
    const features = Object.keys(bases).map(country => {
      const coords = {
        canberra: [149.1300, -35.2809],
        bangkok: [100.5018, 13.7563],
        hongkong: [114.1831, 22.2802],
        london: [-0.1278, 51.5074],
        philadelphia: [-75.1652, 39.9526],
      };
      
      const cityNames = {
        canberra: 'Canberra, Australia',
        bangkok: 'Bangkok, Thailand',
        hongkong: 'Causeway Bay, Hong Kong',
        london: 'London, UK',
        philadelphia: 'Philadelphia, USA'
      };
      
      const val = bases[country];
      const aqiInfo = getAqiInfo(val, pollutant);
      
      // Compute all values in ppm
      const allValues = {};
      Object.keys(BASE_VALUES).forEach(pKey => {
        allValues[pKey] = BASE_VALUES[pKey][country];
      });
      
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: coords[country] },
        properties: {
          country: country,
          city: cityNames[country],
          co_ppm: val,
          value: val,
          unit,
          pollutant,
          aqi: aqiInfo.aqi,
          aqi_tier: aqiInfo.tier,
          measured_at_local: new Date().toISOString(),
          all_pollutants: allValues
        }
      };
    });
    return new Promise(resolve => setTimeout(() => resolve({
      data: { type: "FeatureCollection", features }
    }), 500));
  }
  
  const response = await api.get('/api/gis/sensors', { params: { pollutant } });
  response.data.features = response.data.features.map(feature => {
    const val = feature.properties.value;
    const aqiInfo = getAqiInfo(val, pollutant);
    
    feature.properties = {
      ...feature.properties,
      aqi: aqiInfo.aqi,
      aqi_tier: aqiInfo.tier,
      all_pollutants: { [pollutant]: val }
    };
    return feature;
  });
  return response;
};

export default api;
