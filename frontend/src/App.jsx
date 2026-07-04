import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import DataCO from './pages/DataCO';
import Forecasting from './pages/Forecasting';
import GIS from './pages/GIS';
import About from './pages/About';
import './App.css';

function App() {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/data" element={<DataCO />} />
            <Route path="/forecast" element={<Forecasting />} />
            <Route path="/gis" element={<GIS />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
}

export default App;
