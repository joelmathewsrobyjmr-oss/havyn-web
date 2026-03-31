import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';

const RoleSelectionView = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  // While Firebase is still resolving session, show a spinner
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #e8f5ff 0%, #f0f4ff 100%)' }}>
        <div style={{ width: '44px', height: '44px', border: '4px solid #e0e0e0', borderTopColor: '#5ccbf4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // If user is already logged in, redirect them to their home
  if (user && role) {
    navigate(role === 'viewer' ? '/viewer/dashboard' : '/dashboard', { replace: true });
    return null;
  }

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

      <div style={{ width: '100%', maxWidth: '800px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <GlassCard 
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2.5rem' }}
          className="hover:-translate-y-2 transition-transform duration-300"
        >
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Building2 size={32} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Institution Admin</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Manage residents, attendance, and documents for your home.</p>
          </div>
          <Button 
            variant="primary" 
            fullWidth 
            onClick={() => navigate('/login?role=admin')}
          >
            Log In
          </Button>
        </GlassCard>

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
