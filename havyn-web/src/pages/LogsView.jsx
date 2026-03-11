import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Clock, User, Info, Loader2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';

const LogsView = () => {
  const { institutionId } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!institutionId) return;

    const q = query(
      collection(db, 'activityLogs'),
      where('institutionId', '==', institutionId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [institutionId]);

  const getActionColor = (action) => {
    if (action.includes('CREATE') || action.includes('ADD') || action.includes('BOOK')) return 'var(--success)';
    if (action.includes('DELETE') || action.includes('REJECT')) return 'var(--danger)';
    if (action.includes('UPDATE') || action.includes('APPROVE')) return 'var(--primary)';
    return 'var(--text-muted)';
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts.seconds * 1000).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Activity size={24} color="var(--primary)" />
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Activity Audit Logs</h1>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        A chronological record of all system events and administrative actions within your institution.
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
          <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
        </div>
      ) : logs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {logs.map(log => (
            <GlassCard key={log.id} style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ 
                width: '42px', height: '42px', borderRadius: '50%', 
                backgroundColor: `${getActionColor(log.action)}15`, 
                color: getActionColor(log.action),
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Activity size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text)' }}>{log.action.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} /> {formatTime(log.timestamp)}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{log.details}</p>
                {log.userId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>
                    <User size={12} /> Donor ID: {log.userId.slice(-6)}
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '5rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)' }}>
          <Activity size={48} style={{ opacity: 0.1, marginBottom: '1rem', margin: '0 auto' }} />
          <p style={{ color: 'var(--text-muted)' }}>No activity logs recorded yet.</p>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default LogsView;
