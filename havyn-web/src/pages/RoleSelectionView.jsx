import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';

const RoleSelectionView = () => {
  const navigate = useNavigate();

  return (
    <div 
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--surface) 100%)',
        animation: 'fadeIn 0.5s ease-out'
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: '800' }}>HAYVN</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Bringing care to those who need it most</p>
      </div>

      <div style={{ width: '100%', maxWidth: '380px' }}>
        <GlassCard 
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2.5rem' }}
          className="hover:-translate-y-2 transition-transform duration-300"
        >
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899' }}>
            <User size={32} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Public Donor</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Support institutions through food and fund donations.</p>
          </div>
          <Button 
            variant="outline" 
            fullWidth 
            onClick={() => navigate('/viewer/login')}
            style={{ borderColor: '#ec4899', color: '#ec4899' }}
          >
            Get Started
          </Button>
        </GlassCard>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default RoleSelectionView;
