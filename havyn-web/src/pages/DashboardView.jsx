import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  Users, CalendarCheck, Settings, FileText, LogOut, TrendingUp, 
  HandHelping, ShoppingBag, X, ChevronRight, ArrowUpRight, ArrowDownRight, Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const StatCard = ({ icon: Icon, label, value, color, onClick }) => (
  <GlassCard 
    style={{ 
      padding: '0.9rem 0.75rem',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '0.65rem',
      flex: '1 1 0',
      minWidth: 0,
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}
    className="hover:scale-105 active:scale-95"
    onClick={onClick}
  >
    <div style={{ 
      backgroundColor: `${color}20`, 
      color: color, 
      width: '38px',
      height: '38px',
      borderRadius: 'var(--radius-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}>
      <Icon size={20} />
    </div>
    <div style={{ minWidth: 0, overflow: 'hidden' }}>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '1px' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, lineHeight: 1 }}>{value}</h2>
        <ArrowUpRight size={12} color={color} style={{ opacity: 0.6 }} />
      </div>
    </div>
  </GlassCard>
);

const StatDetailModal = ({ isOpen, onClose, type, data, color }) => {
  if (!isOpen) return null;

  const getDetails = () => {
    switch (type) {
      case 'Residents':
        return {
          title: 'Resident Demographics',
          marquee: 'Total residents currently in house: ' + data.residents + ' • Last updated just now • View all residents for full list',
          items: [
            { label: 'Active Profiles', value: data.residents, suffix: 'Active' },
            { label: 'Capacity Used', value: '85%', suffix: 'Stable' },
            { label: 'New This Month', value: '+4', suffix: 'Entry' }
          ]
        };
      case 'Attendance':
        return {
          title: 'Today\'s Attendance',
          marquee: 'Average attendance rate is 92% • Morning shift completed • Verification in progress for evening marks',
          items: [
            { label: 'Marked Present', value: data.attendanceToday, suffix: 'Present' },
            { label: 'Absent/Leave', value: Math.max(0, data.residents - data.attendanceToday), suffix: 'Missing' },
            { label: 'Rate', value: data.residents > 0 ? Math.round((data.attendanceToday / data.residents) * 100) + '%' : '0%', suffix: 'Today' }
          ]
        };
      case 'Donations':
        return {
          title: 'Donation Activity',
          marquee: 'Fund donations are up 12% from last month • 3 new food bookings pending verification • Top donor of the week: Anonymous',
          items: [
            { label: 'Pending Total', value: data.donationsPending, suffix: 'Orders' },
            { label: 'Confirmed Funds', value: '₹14.2k', suffix: 'Monthly' },
            { label: 'Food Items', value: data._foodCount || 0, suffix: 'Pending' }
          ]
        };
      case 'Active Needs':
        return {
          title: 'Institution Requirements',
          marquee: 'Urgent need for Rice and Oil • 2 orders fulfilled by local donors • New requirement added by Admin morning session',
          items: [
            { label: 'Open Needs', value: data.activeRequirements, suffix: 'Live' },
            { label: 'Critical', value: '2', suffix: 'Urgent' },
            { label: 'Fulfilled', value: '18', suffix: 'This Week' }
          ]
        };
      default: return {};
    }
  };

  const details = getDetails();

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'backdropFade 0.3s ease-out forwards'
      }}
    >
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }} />
      
      <GlassCard 
        style={{ 
          width: '100%', 
          maxWidth: '450px', 
          position: 'relative', 
          overflow: 'hidden',
          padding: 0,
          border: `1px solid ${color}40`,
          animation: 'modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }}
      >
        {/* Header Decoration */}
        <div style={{ height: '6px', background: color, width: '100%' }} />
        
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text)' }}>{details.title}</h3>
            <button onClick={onClose} style={{ background: 'var(--surface)', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {details.items.map((item, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>{item.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: color }}>{item.value}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.8 }}>{item.suffix}</div>
              </div>
            ))}
          </div>

          {/* Scrolling Marquee */}
          <div style={{ 
            background: 'var(--surface)', 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            overflow: 'hidden', 
            position: 'relative',
            border: '1px solid var(--border)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: color }}>
              <TrendingUp size={14} />
              <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>Live Insight</span>
            </div>
            <div style={{ overflow: 'hidden', position: 'relative', whiteSpace: 'nowrap' }}>
              <div className="scrolling-marquee" style={{ 
                display: 'inline-block', 
                fontSize: '0.9rem', 
                color: 'var(--text)', 
                paddingLeft: '100%',
                fontWeight: '500'
              }}>
                {details.marquee}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            <button 
              onClick={onClose}
              style={{ 
                flex: 1, 
                padding: '0.8rem', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border)', 
                background: 'white', 
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            <button 
              style={{ 
                flex: 2, 
                padding: '0.8rem', 
                borderRadius: 'var(--radius-md)', 
                border: 'none', 
                background: color, 
                color: 'white', 
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              Full Analytics <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </GlassCard>

      <style>{`
        @keyframes backdropFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes marquee {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-100%, 0); }
        }
        .scrolling-marquee {
          animation: marquee 15s linear infinite;
        }
      `}</style>
    </div>,
    document.body
  );
};

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
        width: '46px',
        height: '46px', 
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        flexShrink: 0
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
  const { userData, logout, institutionId, institutionData } = useAuth();
    const [stats, setStats] = useState({
    residents: 0,
    attendanceToday: 0,
    donationsPending: 0,
    activeRequirements: 0
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

    // Fetch Today's Attendance Count
    const today = new Date().toISOString().split('T')[0];
    const attendanceRecordsQuery = query(
      collection(db, 'institutions', institutionId, 'attendance', today, 'records'),
      where('present', '==', true)
    );
    const unsubAttendance = onSnapshot(attendanceRecordsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, attendanceToday: snapshot.size }));
    });

    // Fetch Pending Donations (Food + Fund)
    const foodDonQuery = query(collection(db, 'institutions', institutionId, 'foodDonations'), where('status', '==', 'pending'));
    const fundDonQuery = query(collection(db, 'institutions', institutionId, 'fundDonations'), where('status', '==', 'pending'));

    const unsubFood = onSnapshot(foodDonQuery, (foodSnap) => {
      // We need to wait for both or just use separate states? 
      // Let's use separate states for cleaner real-time. Or just a combined total.
      setStats(prev => ({ ...prev, _foodCount: foodSnap.size, donationsPending: (prev._fundCount || 0) + foodSnap.size }));
    });
    
    const unsubFund = onSnapshot(fundDonQuery, (fundSnap) => {
      setStats(prev => ({ ...prev, _fundCount: fundSnap.size, donationsPending: (prev._foodCount || 0) + fundSnap.size }));
    });

    // Fetch Active Requirements
    const reqQuery = query(
      collection(db, 'institutions', institutionId, 'foodRequirements')
    );
    const unsubReq = onSnapshot(reqQuery, (snapshot) => {
      setStats(prev => ({ ...prev, activeRequirements: snapshot.size }));
    });

    return () => {
      unsubResidents();
      unsubAttendance();
      unsubFood();
      unsubFund();
      unsubReq();
    };
  }, [institutionId]);

  const [selectedStat, setSelectedStat] = useState(null);

  const getStatColor = (label) => {
    switch(label) {
      case 'Residents': return 'var(--primary)';
      case 'Attendance': return 'var(--success)';
      case 'Donations': return '#f59e0b';
      case 'Active Needs': return '#8b5cf6';
      default: return 'var(--primary)';
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', fontWeight: '700' }}>
            Hello, {institutionData?.name || userData?.adminName || 'Admin'} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Here's what's happening at your institution today.
          </p>
        </div>
      </div>

      {/* Stats row — always 4 columns side-by-side */}
      <div style={{ 
        display: 'flex',
        flexDirection: 'row',
        gap: '0.75rem',
        marginBottom: '1rem',
        width: '100%'
      }}>
        <StatCard 
          icon={Users} 
          label="Residents" 
          value={stats.residents} 
          color="var(--primary)" 
          onClick={() => setSelectedStat('Residents')}
        />
        <StatCard 
          icon={CalendarCheck} 
          label="Attendance" 
          value={stats.attendanceToday} 
          color="var(--success)" 
          onClick={() => setSelectedStat('Attendance')}
        />
        <StatCard 
          icon={HandHelping} 
          label="Donations" 
          value={stats.donationsPending} 
          color="#f59e0b" 
          onClick={() => setSelectedStat('Donations')}
        />
        <StatCard 
          icon={ShoppingBag} 
          label="Active Needs" 
          value={stats.activeRequirements} 
          color="#8b5cf6" 
          onClick={() => setSelectedStat('Active Needs')}
        />
      </div>

      <StatDetailModal 
        isOpen={!!selectedStat} 
        onClose={() => setSelectedStat(null)} 
        type={selectedStat} 
        data={stats}
        color={getStatColor(selectedStat)}
      />

      <div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontWeight: '600' }}>Quick Actions</h2>
        <div className="mobile-1-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
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
