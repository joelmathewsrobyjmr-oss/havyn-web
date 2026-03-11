import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, 
  CalendarCheck, 
  Settings, 
  FileText, 
  LayoutDashboard, 
  ShoppingBag,
  Bell,
  ChevronRight,
  Activity,
  Package,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Residents', path: '/residents' },
    { icon: CalendarCheck, label: 'Attendance', path: '/attendance' },
    { icon: ShoppingBag, label: 'Donations', path: '/donations' },
    { icon: BarChart3, label: 'Donation Report', path: '/donation-report' },
    { icon: Package, label: 'Supply Needs', path: '/requirements' },
    { icon: FileText, label: 'Documents', path: '/documents' },
    { icon: Activity, label: 'Activity Logs', path: '/logs' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <aside style={{
      width: '240px',
      backgroundColor: 'white',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      transition: 'var(--transition)'
    }}>
      <div style={{ padding: '2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          borderRadius: 'var(--radius-md)', 
          background: 'var(--primary)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: 'white' 
        }}>
          <span style={{ fontWeight: '800', fontSize: '1rem' }}>H</span>
        </div>
        <span style={{ fontWeight: '800', fontSize: '1.25rem', letterSpacing: '-0.02em', fontFamily: 'serif' }}>
          HAVYN
        </span>
      </div>

      <nav style={{ flex: 1, padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: isActive ? '700' : '500',
              }}
              className="sidebar-item"
            >
              <Icon size={20} />
              <span style={{ flex: 1, fontSize: '0.9rem' }}>{item.label}</span>
              {isActive && <ChevronRight size={14} />}
            </div>
          );
        })}
      </nav>

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ 
          background: 'var(--surface)', 
          padding: '1rem', 
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            background: 'var(--primary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white',
            fontWeight: '700'
          }}>
            {userData?.adminName?.charAt(0) || 'A'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userData?.adminName || 'Admin'}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
