import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';

const MainLayout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      <Header />
      <main style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
