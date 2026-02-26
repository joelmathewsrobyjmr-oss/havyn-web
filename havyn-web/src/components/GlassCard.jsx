import React from 'react';

const GlassCard = ({ children, className = '', style = {}, ...props }) => {
  return (
    <div 
      className={`glass ${className}`}
      style={{
        padding: '2rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
