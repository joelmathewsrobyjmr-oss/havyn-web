import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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
    // Redirect to their respective dashboard if they try to access unauthorized path
    const targetPath = role === 'viewer' ? '/viewer/dashboard' : '/dashboard';
    
    // Prevent infinite redirect loops if we are already on the target path or have no role
    if (location.pathname === targetPath || !role) {
      return <Navigate to="/role" replace />;
    }
    return <Navigate to={targetPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
