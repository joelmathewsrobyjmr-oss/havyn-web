import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  onClick, 
  fullWidth = false,
  style = {},
  ...props 
}) => {
  const baseStyle = {
    padding: '13px 28px',
    borderRadius: 'var(--radius-md)',   // 12px – boxy rounded corners
    fontWeight: '700',
    fontSize: '0.975rem',
    letterSpacing: '0.02em',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    border: '2px solid transparent',
    width: fullWidth ? '100%' : 'auto',
    ...style
  };

  const variants = {
    primary: {
      backgroundColor: 'var(--primary)',
      color: 'white',
      borderColor: 'var(--primary)',
      boxShadow: '0 4px 12px rgba(92, 203, 244, 0.3)',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--primary)',
      borderColor: 'var(--primary)',
    },
    danger: {
      backgroundColor: 'var(--danger)',
      color: 'white',
      borderColor: 'var(--danger)',
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
    },
    'outline-danger': {
      backgroundColor: 'transparent',
      color: 'var(--danger)',
      borderColor: 'var(--danger)',
    }
  };

  return (
    <button
      style={{ ...baseStyle, ...variants[variant] }}
      className={`${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

