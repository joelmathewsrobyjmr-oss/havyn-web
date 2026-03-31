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
  BarChart3,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();


  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Residents', path: '/residents' },
    { icon: CalendarCheck, label: 'Daily Presence', path: '/attendance' },
    { icon: BarChart3, label: 'Attendance Analytics', path: '/attendance-report' },
    { icon: ShoppingBag, label: 'Donation Desk', path: '/donations' },
    { icon: FileText, label: 'Donation Report', path: '/donation-report' },
    { icon: Package, label: 'Supply Needs', path: '/requirements' },
    { icon: FileText, label: 'Institutional Archives', path: '/documents' },
    { icon: Activity, label: 'Activity Audit', path: '/logs' },
    { icon: Settings, label: 'System Settings', path: '/settings' },
  ];

  return (
    <>
      {/* Mobile Overlay Background */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="show-on-mobile"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 40,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* Actual Sidebar */}
      <aside 
        className="sidebar-wrapper"
        style={{
          width: 'var(--sidebar-width)',
          backgroundColor: 'white',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          zIndex: 50,
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        <div style={{ padding: '2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
          <button 
            className="show-on-mobile" 
            onClick={() => setIsOpen(false)}
            style={{ padding: '4px', background: 'var(--background)', borderRadius: 'var(--radius-sm)' }}
          >
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <nav style={{ flex: 1, padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {menuItems.map((item) => {
          // Smart active detection per route
          let isActive = false;
          if (item.path === '/dashboard') {
            isActive = location.pathname === '/dashboard';
          } else if (item.path === '/residents') {
            isActive = location.pathname.startsWith('/resident');
          } else {
            isActive = location.pathname.startsWith(item.path);
          }
          const Icon = item.icon;

          return (
            <div
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setIsOpen(false);
              }}
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



    </aside>

      {/* Add CSS for the sidebar desktop/mobile toggle via injected styles or generic classes. */}
      <style>{`
        .sidebar-wrapper {
          position: sticky;
          top: 0;
          transform: translateX(0);
        }
        @media (max-width: 768px) {
          .sidebar-wrapper {
            position: fixed;
            left: 0;
            top: 0;
            transform: ${isOpen ? 'translateX(0)' : 'translateX(-100%)'};
          }
        }
      `}</style>
    </>
  );
};

export default Sidebar;
