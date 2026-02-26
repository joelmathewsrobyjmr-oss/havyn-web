import React from 'react';
import { ChevronRight } from 'lucide-react';
import GlassCard from './GlassCard';

const statusColors = {
  active: 'var(--success)',
  inactive: '#9ca3af',
  discharged: '#f59e0b',
  died: 'var(--danger)'
};

const ResidentCard = ({ name, email, status = 'active', imageUrl, onClick }) => {
  return (
    <GlassCard 
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '1rem',
        cursor: 'pointer',
        marginBottom: '0.75rem',
        transition: 'var(--transition)'
      }}
      onClick={onClick}
    >
      <div 
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary-light)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          fontWeight: '600',
          marginRight: '1rem',
          overflow: 'hidden',
          flexShrink: 0,
          border: `2px solid ${statusColors[status] || 'var(--primary-light)'}`
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h4 style={{ fontSize: '1rem', marginBottom: '0.125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </h4>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {email}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div 
          style={{
            fontSize: '0.65rem',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '3px 8px',
            borderRadius: '999px',
            backgroundColor: statusColors[status] || 'var(--success)',
            color: 'white'
          }}
        >
          {status}
        </div>
        <ChevronRight size={20} color="var(--text-muted)" />
      </div>
    </GlassCard>
  );
};

export default ResidentCard;
