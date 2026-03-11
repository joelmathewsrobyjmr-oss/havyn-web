import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Feather, Bell, ArrowLeft, LogOut, X, Clock, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import GlassCard from './GlassCard';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, institutionId } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);
  const isHome = location.pathname === '/dashboard';

  useEffect(() => {
    if (!institutionId) return;

    const q = query(
      collection(db, 'institutions', institutionId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.read).length);
    });

    return () => unsub();
  }, [institutionId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      try {
        await logout();
        navigate('/role');
      } catch (err) {
        console.error('Logout failed:', err);
      }
    }
  };

  const markAsRead = async (id) => {
    try {
      const docRef = doc(db, 'institutions', institutionId, 'notifications', id);
      await updateDoc(docRef, { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        const docRef = doc(db, 'institutions', institutionId, 'notifications', n.id);
        batch.update(docRef, { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {!isHome && (
          <button onClick={() => navigate(-1)} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'none', border: 'none' }}>
            <ArrowLeft size={22} />
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
          <Feather size={24} color="var(--primary)" />
          <span style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.05em' }}>HAVYN</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button 
            onClick={() => setShowNotif(!showNotif)}
            style={{ color: showNotif ? 'var(--primary)' : 'var(--text-muted)', position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }} 
            className="hover:text-primary transition"
          >
            <Bell size={22} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '0px', right: '0px', width: '10px', height: '10px', backgroundColor: 'var(--danger)', borderRadius: '50%', border: '2px solid white' }} />
            )}
          </button>

          {showNotif && (
            <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '1rem', width: '320px', maxHeight: '450px', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Mark all read</button>
                )}
              </div>
              
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {notifications.length > 0 ? notifications.map(n => (
                  <div key={n.id} 
                    onClick={() => { markAsRead(n.id); if(n.type === 'FOOD_BOOKING') navigate('/donations'); }}
                    style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: n.read ? 'white' : 'rgba(59, 130, 246, 0.03)', transition: 'background 0.2s' }}
                    className="hover:bg-slate-50"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{n.title}</span>
                      {!n.read && <div style={{ width: '6px', height: '6px', backgroundColor: 'var(--primary)', borderRadius: '50%' }} />}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '0.5rem' }}>{n.message}</p>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> {n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Bell size={32} style={{ opacity: 0.1, marginBottom: '0.75rem', margin: '0 auto' }} />
                    <p style={{ fontSize: '0.85rem' }}>No notifications yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button onClick={handleLogout} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }} className="hover:text-danger transition" title="Logout">
          <LogOut size={22} />
        </button>
      </div>
    </header>
  );
};

export default Header;
