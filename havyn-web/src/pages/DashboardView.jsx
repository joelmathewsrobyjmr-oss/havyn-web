import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarCheck, Settings, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';

const DashboardCard = ({ icon: Icon, title, description, onClick, color }) => (
  <GlassCard 
    style={{ 
      cursor: 'pointer', 
      transition: 'var(--transition)',
      padding: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    }}
    onClick={onClick}
  >
    <div 
      style={{ 
        backgroundColor: color, 
        padding: '0.75rem', 
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}
    >
      <Icon size={24} />
    </div>
    <div>
      <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{title}</h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{description}</p>
    </div>
  </GlassCard>
);

const DashboardView = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/role');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome, {user?.displayName || user?.email?.split('@')[0] || 'User'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {user?.email}
          </p>
        </div>
        <button onClick={handleLogout} style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>
          <LogOut size={18} /> Logout
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        <DashboardCard 
          icon={Users}
          title="Residents"
          description="View, add, or edit resident profiles"
          color="var(--primary)"
          onClick={() => navigate('/residents')}
        />
        <DashboardCard 
          icon={CalendarCheck}
          title="Attendance"
          description="Mark daily attendance"
          color="var(--success)"
          onClick={() => navigate('/attendance')}
        />
        <DashboardCard 
          icon={FileText}
          title="Documents"
          description="Manage important paperwork"
          color="#f59e0b"
          onClick={() => navigate('/documents')}
        />

        <DashboardCard 
          icon={Settings}
          title="Settings"
          description="App configuration"
          color="var(--text-muted)"
          onClick={() => navigate('/settings')}
        />
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

export default DashboardView;
