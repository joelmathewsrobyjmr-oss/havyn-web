import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, HandHelping, History, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import GlassCard from '../../components/GlassCard';

const ViewerDashboardView = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Welcome to HAYVN</h1>
          <p style={{ color: 'var(--text-muted)' }}>How would you like to help today, {user?.email}?</p>
        </div>
        <button 
          onClick={() => logout().then(() => navigate('/role'))}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
        >
          <LogOut size={20} /> Logout
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <GlassCard 
          onClick={() => navigate('/viewer/food')}
          style={{ cursor: 'pointer', textAlign: 'center', padding: '3rem' }}
        >
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            <HandHelping size={32} />
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Donate Food</h3>
          <p style={{ color: 'var(--text-muted)' }}>Book a slot to provide meals or groceries to an institution.</p>
        </GlassCard>

        <GlassCard 
          onClick={() => navigate('/viewer/fund')}
          style={{ cursor: 'pointer', textAlign: 'center', padding: '3rem' }}
        >
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            <Heart size={32} />
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Donate Funds</h3>
          <p style={{ color: 'var(--text-muted)' }}>Contribute financially through secure QR codes or bank transfers.</p>
        </GlassCard>
      </div>

      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <button 
          onClick={() => navigate('/viewer/history')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', color: 'var(--primary)', border: '1px solid var(--primary-light)', fontWeight: '600', cursor: 'pointer' }}
        >
          <History size={20} /> View Your Donation History
        </button>
      </div>
    </div>
  );
};

export default ViewerDashboardView;
