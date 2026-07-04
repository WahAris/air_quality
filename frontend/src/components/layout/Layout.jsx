import React from 'react';
import Navbar from './Navbar';
import Header from './Header';

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <Header />
      <main className="container" style={{ padding: 'var(--space-xl) var(--space-md)' }}>
        {children}
      </main>
    </div>
  );
}

export default Layout;
