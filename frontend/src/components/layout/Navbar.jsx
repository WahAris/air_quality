import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, BarChart2, TrendingUp, Map, Info } from 'lucide-react';
import './Navbar.css';

function Navbar() {
  const navItems = [
    { path: '/', label: 'Dasbor', icon: <Activity size={18} /> },
    { path: '/data', label: 'Data Historis', icon: <BarChart2 size={18} /> },
    { path: '/forecast', label: 'Prediksi', icon: <TrendingUp size={18} /> },
    { path: '/gis', label: 'Peta', icon: <Map size={18} /> },
    { path: '/about', label: 'Tentang', icon: <Info size={18} /> },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container container">
        <div className="navbar-logo">
          <Activity size={24} color="var(--color-sky-blue)" />
          <span>Kualitas Udara</span>
        </div>
        <ul className="navbar-menu">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink 
                to={item.path} 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
