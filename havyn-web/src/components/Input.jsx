import React from 'react';

const Input = ({ 
  label, 
  id, 
  error, 
  fullWidth = true,
  className = '',
  icon: Icon,
  style = {},       // applied to outer wrapper div
  inputStyle = {},  // applied to <input> element directly
  ...props 
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: fullWidth ? '100%' : 'auto', marginBottom: '0.75rem', ...style }} className={className}>
      {label && (
        <label 
          htmlFor={id} 
          style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-muted)' }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
        {Icon && (
          <Icon 
            size={18} 
            color="var(--text-muted)" 
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 1, pointerEvents: 'none', lineHeight: 1 }} 
          />
        )}
        <input
          id={id}
          style={{
            width: '100%',
            padding: Icon ? '12px 16px 12px 40px' : '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            outline: 'none',
            fontSize: '1rem',
            color: 'inherit',
            transition: 'var(--transition)',
            boxShadow: 'var(--shadow-sm)',
            boxSizing: 'border-box',
            lineHeight: '1.5',
            ...inputStyle
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--primary)';
            e.target.style.boxShadow = '0 0 0 3px var(--primary-light)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)';
            e.target.style.boxShadow = 'var(--shadow-sm)';
          }}
          {...props}
        />
      </div>
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{error}</span>
      )}
    </div>
  );
};

export default Input;

