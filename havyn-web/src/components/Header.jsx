import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Feather, Menu, Bell, ArrowLeft } from 'lucide-react';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/dashboard';

  return (
    <header 
      className="glass"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'rgba(255, 255, 255, 0.8)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {!isHome && (
          <button 
            onClick={() => navigate(-1)} 
            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <ArrowLeft size={22} />
          </button>
        )}
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}
        >
          <Feather size={24} color="var(--primary)" />
          <span style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.05em' }}>
            HAVYN
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button style={{ color: 'var(--text-muted)' }} className="hover:text-primary transition">
          <Bell size={20} />
        </button>
        <button style={{ color: 'var(--text-muted)' }} className="hover:text-primary transition">
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
};

export default Header;
