import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children, showNavbar = true }) => {
  return (
    <div className="min-h-screen bg-neutral-50 safe-area-inset-y">
      {showNavbar && <Navbar />}
      <main className={`${showNavbar ? 'pt-0' : ''} mobile-container`}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;