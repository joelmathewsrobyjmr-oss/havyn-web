import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarCheck, Settings, FileText, LogOut, TrendingUp, HandHelping, ShoppingBag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <GlassCard style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ 
        backgroundColor: `${color}20`, 
        color: color, 
        padding: '0.50rem', 
        borderRadius: 'var(--radius-md)',
        display: 'flex'
      }}>
        <Icon size={20} />
      </div>
      <TrendingUp size={16} color="var(--success)" />
    </div>
    <div style={{ marginTop: '0.25rem' }}>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{label}</p>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>{value}</h2>
    </div>
  </GlassCard>
);

const DashboardCard = ({ icon: Icon, title, description, onClick, color }) => (
  <GlassCard 
    style={{ 
      cursor: 'pointer', 
      transition: 'var(--transition)',
      padding: '1.25rem',
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
    <div style={{ flex: 1 }}>
      <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{title}</h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{description}</p>
    </div>
  </GlassCard>
);

const DashboardView = () => {
  const navigate = useNavigate();
  const { userData, logout, institutionId } = useAuth();
  const [stats, setStats] = useState({
    residents: 0,
    attendanceToday: 0,
    donationsPending: 0
  });

  useEffect(() => {
    if (!institutionId) return;

    // Fetch Residents Count
    const residentsQuery = query(
      collection(db, 'institutions', institutionId, 'residents')
    );
    const unsubResidents = onSnapshot(residentsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, residents: snapshot.size }));
    });

    // Fetch Today's Attendance
    const today = new Date().toISOString().split('T')[0];
    const attendanceQuery = query(
      collection(db, 'institutions', institutionId, 'attendance'),
      where('date', '==', today),
      where('status', '==', 'present')
    );
    const unsubAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      setStats(prev => ({ ...prev, attendanceToday: snapshot.size }));
    });

    // Fetch Pending Donations (Food Bookings)
    const donationsQuery = query(
      collection(db, 'institutions', institutionId, 'foodDonations'),
      where('status', '==', 'pending')
    );
    const unsubDonations = onSnapshot(donationsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, donationsPending: snapshot.size }));
    });

    return () => {
      unsubResidents();
      unsubAttendance();
      unsubDonations();
    };
  }, [institutionId]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', fontWeight: '700' }}>
            Hello, {userData?.adminName || 'Admin'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Here's what's happening at your institution today.
          </p>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.5rem' 
      }}>
        <StatCard 
          icon={Users} 
          label="Total Residents" 
          value={stats.residents} 
          color="var(--primary)" 
        />
        <StatCard 
          icon={CalendarCheck} 
          label="Attendance Today" 
          value={stats.attendanceToday} 
          color="var(--success)" 
        />
        <StatCard 
          icon={HandHelping} 
          label="Pending Donations" 
          value={stats.donationsPending} 
          color="#f59e0b" 
        />
      </div>

      <div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontWeight: '600' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <DashboardCard 
            icon={Users}
            title="Resident Management"
            description="Manage profiles and personal records"
            color="var(--primary)"
            onClick={() => navigate('/residents')}
          />
          <DashboardCard 
            icon={CalendarCheck}
            title="Daily Attendance"
            description="Mark and track resident presence"
            color="var(--success)"
            onClick={() => navigate('/attendance')}
          />
          <DashboardCard 
            icon={ShoppingBag}
            title="Donations"
            description="Manage food bookings and fund history"
            color="#f59e0b"
            onClick={() => navigate('/donations')}
          />
          <DashboardCard 
            icon={FileText}
            title="Documents"
            description="Secure document storage and access"
            color="#6366f1"
            onClick={() => navigate('/documents')}
          />
          <DashboardCard 
            icon={Settings}
            title="Institution Settings"
            description="Update profile and configurations"
            color="#64748b"
            onClick={() => navigate('/settings')}
          />
        </div>
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
