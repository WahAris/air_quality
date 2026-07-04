/**
 * Calculates AQI and Tier based on standard EPA breakpoints in ppm
 * Supports CO (ppm), NO2 (ppm), O3 (ppm), PM10 (ppm), and PM2.5 (ppm)
 */

export const AQI_TIERS = {
  GOOD: { tier: 'Good', minAqi: 0, maxAqi: 50, color: 'var(--color-sky-blue)', hex: '#378ADD' },
  MODERATE: { tier: 'Moderate', minAqi: 51, maxAqi: 100, color: 'var(--color-teal-dusk)', hex: '#1D9E75' },
  UNHEALTHY_SENSITIVE: { tier: 'Unhealthy Sensitive', minAqi: 101, maxAqi: 150, color: 'var(--color-amber-haze)', hex: '#EF9F27' },
  UNHEALTHY: { tier: 'Unhealthy', minAqi: 151, maxAqi: 200, color: 'var(--color-copper-smog)', hex: '#BA7517' },
  HAZARDOUS: { tier: 'Hazardous', minAqi: 201, maxAqi: 500, color: 'var(--color-rust-hazard)', hex: '#993C1D' },
};

const BREAKPOINTS = {
  CO: [ // ppm
    { cMin: 0.0, cMax: 4.4, aqiMin: 0, aqiMax: 50 },
    { cMin: 4.5, cMax: 9.4, aqiMin: 51, aqiMax: 100 },
    { cMin: 9.5, cMax: 12.4, aqiMin: 101, aqiMax: 150 },
    { cMin: 12.5, cMax: 15.4, aqiMin: 151, aqiMax: 200 },
    { cMin: 15.5, cMax: 30.4, aqiMin: 201, aqiMax: 300 },
    { cMin: 30.5, cMax: 40.4, aqiMin: 301, aqiMax: 400 },
    { cMin: 40.5, cMax: 50.4, aqiMin: 401, aqiMax: 500 }
  ],
  NO2: [ // ppm (ppb divided by 1000)
    { cMin: 0.000, cMax: 0.053, aqiMin: 0, aqiMax: 50 },
    { cMin: 0.054, cMax: 0.100, aqiMin: 51, aqiMax: 100 },
    { cMin: 0.101, cMax: 0.360, aqiMin: 101, aqiMax: 150 },
    { cMin: 0.361, cMax: 0.649, aqiMin: 151, aqiMax: 200 },
    { cMin: 0.650, cMax: 1.249, aqiMin: 201, aqiMax: 300 },
    { cMin: 1.250, cMax: 1.649, aqiMin: 301, aqiMax: 400 },
    { cMin: 1.650, cMax: 2.049, aqiMin: 401, aqiMax: 500 }
  ],
  O3: [ // ppm (ppb divided by 1000)
    { cMin: 0.000, cMax: 0.054, aqiMin: 0, aqiMax: 50 },
    { cMin: 0.055, cMax: 0.070, aqiMin: 51, aqiMax: 100 },
    { cMin: 0.071, cMax: 0.085, aqiMin: 101, aqiMax: 150 },
    { cMin: 0.086, cMax: 0.105, aqiMin: 151, aqiMax: 200 },
    { cMin: 0.106, cMax: 0.200, aqiMin: 201, aqiMax: 300 },
    { cMin: 0.201, cMax: 0.500, aqiMin: 301, aqiMax: 500 }
  ],
  PM10: [ // ppm (scaled by dividing µg/m³ by 100)
    { cMin: 0.000, cMax: 0.540, aqiMin: 0, aqiMax: 50 },
    { cMin: 0.541, cMax: 1.540, aqiMin: 51, aqiMax: 100 },
    { cMin: 1.541, cMax: 2.540, aqiMin: 101, aqiMax: 150 },
    { cMin: 2.541, cMax: 3.540, aqiMin: 151, aqiMax: 200 },
    { cMin: 3.541, cMax: 4.240, aqiMin: 201, aqiMax: 300 },
    { cMin: 4.241, cMax: 5.040, aqiMin: 301, aqiMax: 400 },
    { cMin: 5.041, cMax: 6.040, aqiMin: 401, aqiMax: 500 }
  ],
  PM25: [ // ppm (scaled by dividing µg/m³ by 100)
    { cMin: 0.000, cMax: 0.120, aqiMin: 0, aqiMax: 50 },
    { cMin: 0.121, cMax: 0.354, aqiMin: 51, aqiMax: 100 },
    { cMin: 0.355, cMax: 0.554, aqiMin: 101, aqiMax: 150 },
    { cMin: 0.555, cMax: 1.504, aqiMin: 151, aqiMax: 200 },
    { cMin: 1.505, cMax: 2.504, aqiMin: 201, aqiMax: 300 },
    { cMin: 2.505, cMax: 3.504, aqiMin: 301, aqiMax: 400 },
    { cMin: 3.505, cMax: 5.004, aqiMin: 401, aqiMax: 500 }
  ]
};

export const POLLUTANTS = {
  CO: { name: 'Carbon Monoxide', key: 'CO', unit: 'ppm', defaultVal: 1.2 },
  NO2: { name: 'Nitrogen Dioxide', key: 'NO2', unit: 'ppm', defaultVal: 0.045 },
  O3: { name: 'Ozone', key: 'O3', unit: 'ppm', defaultVal: 0.035 },
  PM10: { name: 'PM10', key: 'PM10', unit: 'µg/m³', defaultVal: 0.50 },
  'PM2.5': { name: 'PM2.5', key: 'PM2.5', unit: 'µg/m³', defaultVal: 0.15 }
};

export function calculateAQI(value, pollutant) {
  const key = pollutant.toUpperCase().replace('.', ''); // PM2.5 -> PM25
  const bpList = BREAKPOINTS[key];
  if (!bpList) return 0;
  
  const bp = bpList.find(b => value >= b.cMin && value <= b.cMax);
  if (!bp) {
    const lastBp = bpList[bpList.length - 1];
    if (value > lastBp.cMax) {
      return lastBp.aqiMax;
    }
    return 0;
  }
  
  const { cMin, cMax, aqiMin, aqiMax } = bp;
  const aqi = ((aqiMax - aqiMin) / (cMax - cMin)) * (value - cMin) + aqiMin;
  return Math.round(aqi);
}

export function getAqiFromCo(coPpm) {
  return calculateAQI(coPpm, 'CO');
}

export function getAqiTier(aqi) {
  if (aqi <= 50) return AQI_TIERS.GOOD;
  if (aqi <= 100) return AQI_TIERS.MODERATE;
  if (aqi <= 150) return AQI_TIERS.UNHEALTHY_SENSITIVE;
  if (aqi <= 200) return AQI_TIERS.UNHEALTHY;
  return AQI_TIERS.HAZARDOUS;
}

export function getAqiInfo(value, pollutant = 'CO') {
  const aqi = calculateAQI(value, pollutant);
  const tierInfo = getAqiTier(aqi);
  return {
    aqi,
    ...tierInfo
  };
}
