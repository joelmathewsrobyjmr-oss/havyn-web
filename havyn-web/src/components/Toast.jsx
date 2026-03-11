import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

/**
 * Toast – a self-dismissing notification banner.
 *
 * Props:
 *   message  {string}  – text to display
 *   type     {string}  – 'success' | 'error' | 'warning'
 *   onClose  {fn}      – called when the toast dismisses itself or is closed manually
 *   duration {number}  – ms before auto-close (default 4000)
 */
const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in
    const show = setTimeout(() => setVisible(true), 30);
    // Auto-dismiss
    const hide = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 350); // wait for slide-out animation
    }, duration);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [duration, onClose]);

  const configs = {
    success: { bg: '#f0fdf4', border: '#86efac', color: '#16a34a', Icon: CheckCircle },
    error:   { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', Icon: XCircle },
    warning: { bg: '#fffbeb', border: '#fde68a', color: '#d97706', Icon: AlertCircle },
  };

  const { bg, border, color, Icon } = configs[type] || configs.success;

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.25rem',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '-120%'})`,
        zIndex: 9999,
        minWidth: '280px',
        maxWidth: '420px',
        width: 'calc(100% - 2rem)',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '14px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      role="alert"
    >
      <Icon size={22} color={color} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '0.93rem', fontWeight: '600', color, lineHeight: 1.4 }}>
        {message}
      </span>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 350); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color, opacity: 0.7, flexShrink: 0 }}
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
