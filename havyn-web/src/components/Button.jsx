import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  onClick, 
  fullWidth = false,
  ...props 
}) => {
  const baseStyle = {
    padding: '12px 24px',
    borderRadius: 'var(--radius-full)',
    fontWeight: '600',
    fontSize: '1rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'var(--transition)',
    width: fullWidth ? '100%' : 'auto',
  };

  const variants = {
    primary: {
      backgroundColor: 'var(--primary)',
      color: 'white',
      boxShadow: 'var(--shadow-md)',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--primary)',
      border: '2px solid var(--primary)',
    }
  };

  return (
    <button
      style={{ ...baseStyle, ...variants[variant] }}
      className={`hover:-translate-y-1 hover:shadow-lg active:translate-y-0 active:shadow-md ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
