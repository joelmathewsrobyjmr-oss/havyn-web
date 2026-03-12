import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: 'var(--primary)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/role" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // If we have a user but no role yet, wait for it with a spinner
    if (!role) {
      return (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          color: 'var(--primary)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
        </div>
      );
    }

    // Role is loaded but unauthorized for this specific route.
    // Divert them to their specific home.
    const CORRECT_HOME = role === 'viewer' ? '/viewer/dashboard' : '/dashboard';
    
    // Safety: If they are ALREADY on their correct home, but it's somehow not in allowedRoles 
    // (which shouldn't happen), avoid infinite loop.
    if (location.pathname === CORRECT_HOME) {
      return children || <Outlet />;
    }

    return <Navigate to={CORRECT_HOME} replace />;
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
