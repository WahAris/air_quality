import React, { useState, useEffect, useRef, useMemo } from 'react';
import Map, { Marker, Popup, Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getGisSensors } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { POLLUTANTS } from '../utils/aqiCalculator';
import { Layers } from 'lucide-react';
import './GIS.css';

function GIS() {
  const { state } = useAppContext();
  const [sensors, setSensors] = useState(null);
  const [popupInfo, setPopupInfo] = useState(null);
  const [viewMode, setViewMode] = useState('markers'); // markers or heatmap
  const mapRef = useRef();

  const activePollutantInfo = POLLUTANTS[state.activePollutant] || POLLUTANTS.CO;

  useEffect(() => {
    getGisSensors(state.activePollutant).then(res => setSensors(res.data));
  }, [state.activePollutant]);

  // Sync popupInfo with fresh sensor data when pollutant changes
  useEffect(() => {
    if (popupInfo && sensors) {
      const updatedFeature = sensors.features.find(
        f => f.properties.country === popupInfo.properties.country
      );
      if (updatedFeature) {
        setPopupInfo(updatedFeature);
      }
    }
  }, [sensors]);

  const heatmapLayer = useMemo(() => ({
    id: 'co-heatmap',
    type: 'heatmap',
    paint: {
      'heatmap-weight': 1,
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(33,102,172,0)',
        0.2, '#E6F1FB',
        0.4, '#A0C6EB',
        0.6, '#6AA3E0',
        0.8, '#378ADD',
        1, '#2B70B5'
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 15, 9, 40],
      'heatmap-opacity': 0.8
    }
  }), []);



  const onSelectCity = (lon, lat) => {
    mapRef.current?.flyTo({ center: [lon, lat], zoom: 6, duration: 2000 });
  };

  return (
    <div className="gis-page">
      <div className="card map-container">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: 0,
            latitude: 20,
            zoom: 1.5
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          mapLib={maplibregl}
        >
          <NavigationControl position="top-left" />

          {viewMode === 'markers' && sensors && sensors.features.map((feature, index) => (
            <Marker
              key={`marker-${index}`}
              longitude={feature.geometry.coordinates[0]}
              latitude={feature.geometry.coordinates[1]}
              anchor="bottom"
              onClick={e => {
                e.originalEvent.stopPropagation();
                setPopupInfo(feature);
                onSelectCity(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
              }}
            >
              <div 
                className="sensor-marker"
                style={{ backgroundColor: 'var(--color-sky-blue)' }}
              />
            </Marker>
          ))}

          {viewMode === 'heatmap' && sensors && (
            <Source type="geojson" data={sensors}>
              <Layer {...heatmapLayer} />
            </Source>
          )}

          {popupInfo && (
            <Popup
              anchor="top"
              longitude={popupInfo.geometry.coordinates[0]}
              latitude={popupInfo.geometry.coordinates[1]}
              onClose={() => setPopupInfo(null)}
              className="sensor-popup"
            >
              <div className="popup-content" style={{ minWidth: '220px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: '4px' }}>
                  {popupInfo.properties.city}
                </h4>
                <div className="popup-pollutants-list" style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                  <div style={{ marginBottom: '8px', fontSize: '0.8rem', color: 'var(--color-gray-600)' }}>
                    Tampilan aktif: <strong>{activePollutantInfo.key}</strong>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-gray-200)', fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>
                        <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Polutan</th>
                        <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Nilai</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr 
                        style={{ 
                          backgroundColor: 'rgba(55, 138, 221, 0.08)', 
                          fontWeight: 'bold',
                          borderBottom: '1px solid var(--color-gray-50)'
                        }}
                      >
                        <td style={{ padding: '4px 0' }}>{activePollutantInfo.key}</td>
                        <td style={{ textAlign: 'right', padding: '4px 0' }}>{popupInfo.properties.value.toFixed(2)} {popupInfo.properties.unit}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="popup-time" style={{ marginTop: '10px', fontSize: '0.7rem', color: 'var(--color-gray-400)', textAlign: 'right' }}>
                  Diukur pada: {new Date(popupInfo.properties.measured_at_local).toLocaleTimeString()}
                </div>
              </div>
            </Popup>
          )}

          {/* Controls Overlay */}
          <div className="map-overlay">
            <div className="layer-toggle card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Layers size={16} /> <strong>Mode Lapisan</strong>
              </div>
              <label className="toggle-label">
                <input type="radio" name="layerMode" checked={viewMode === 'markers'} onChange={() => setViewMode('markers')} />
                Penanda Sensor
              </label>
              <label className="toggle-label">
                <input type="radio" name="layerMode" checked={viewMode === 'heatmap'} onChange={() => setViewMode('heatmap')} />
                Kepadatan Heatmap
              </label>
            </div>


          </div>
        </Map>
      </div>
    </div>
  );
}

export default GIS;
