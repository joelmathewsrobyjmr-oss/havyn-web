import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Feather, Sparkles } from 'lucide-react';

const SplashView = () => {
  const navigate = useNavigate();
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Fade in
    setTimeout(() => setOpacity(1), 100);
    
    // Navigate to role selection after 2.5 seconds
    const timer = setTimeout(() => {
      setOpacity(0);
      setTimeout(() => navigate('/role'), 500); // Wait for fade out
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div 
      className="splash-container" 
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--primary)',
        color: 'white',
        opacity: opacity,
        transition: 'opacity 0.5s ease-in-out',
        minHeight: '100vh',
      }}
    >
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'float 3s ease-in-out infinite'
        }}
      >
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Feather size={80} strokeWidth={1.5} color="white" fill="rgba(255,255,255,0.2)" />
          <Sparkles 
            size={24} 
            color="white" 
            style={{ position: 'absolute', top: -10, left: -15, animation: 'pulse 2s infinite' }} 
          />
        </div>
        <h1 
          style={{ 
            fontFamily: 'serif', 
            fontSize: '3rem', 
            fontWeight: 400,
            letterSpacing: '0.1em'
          }}
        >
          HAVYN
        </h1>
      </div>
      
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes pulse {
          0% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.5; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default SplashView;
