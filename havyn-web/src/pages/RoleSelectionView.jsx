import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

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
        animation: 'fadeIn 0.5s ease-out'
      }}
    >
      <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Button 
          variant="primary" 
          fullWidth 
          onClick={() => navigate('/login?role=admin')}
        >
          Admin
        </Button>
        <Button 
          variant="outline" 
          fullWidth 
          onClick={() => navigate('/dashboard?role=viewer')} // For now, viewers go straight to a dashboard view maybe?
        >
          Viewer
        </Button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default RoleSelectionView;
