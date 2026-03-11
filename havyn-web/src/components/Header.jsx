import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Feather, Bell, ArrowLeft, LogOut, Clock, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';

const Header = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, institutionId, userData, institutionData } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
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
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      try { await logout(); navigate('/role'); }
      catch (err) { console.error('Logout failed:', err); }
    }
  };

  const markAsRead = async (id) => {
    try { await updateDoc(doc(db, 'institutions', institutionId, 'notifications', id), { read: true }); }
    catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'institutions', institutionId, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (err) { console.error(err); }
  };

  const adminInitial = (institutionData?.name || userData?.adminName || 'A').charAt(0).toUpperCase();

  return (
    <header className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)' }}>
      {/* Left: hamburger + logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button className="show-on-mobile" onClick={toggleSidebar} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <Menu size={24} />
        </button>
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

      {/* Right: notifications + profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>

        {/* 🔔 Notifications bell */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}
            style={{ color: showNotif ? 'var(--primary)' : 'var(--text-muted)', position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
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
                {unreadCount > 0 && <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Mark all read</button>}
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {notifications.length > 0 ? notifications.map(n => (
                  <div key={n.id}
                    onClick={() => { markAsRead(n.id); if (n.type === 'FOOD_BOOKING') navigate('/donations'); }}
                    style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: n.read ? 'white' : 'rgba(59,130,246,0.03)' }}>
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

        {/* 👤 Admin Profile Avatar */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
            title="Admin Profile"
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), #3b82f6)',
              color: 'white', fontWeight: '800', fontSize: '0.95rem',
              border: showProfile ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: showProfile ? '0 0 0 3px rgba(92,203,244,0.3)' : '0 2px 8px rgba(92,203,244,0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            {adminInitial}
          </button>

          {showProfile && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 12px)', right: '0',
              width: '280px', backgroundColor: 'white',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
              border: '1px solid var(--border)', overflow: 'hidden',
              animation: 'profileFadeIn 0.2s ease-out',
              zIndex: 200
            }}>
              {/* Gradient header */}
              <div style={{ background: 'linear-gradient(135deg, var(--primary), #3b82f6)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '1.3rem', flexShrink: 0 }}>
                  {adminInitial}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ color: 'white', fontWeight: '800', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {institutionData?.name || 'Institution'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem' }}>
                    {userData?.adminName || 'Admin'}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
                  {[
                    { label: 'Email', value: userData?.email || '—' },
                    { label: 'Role', value: userData?.role || 'admin', highlight: true },
                    { label: 'Institution ID', value: institutionId || '—', small: true },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{row.label}</span>
                      <span style={{
                        fontWeight: row.highlight ? '800' : '600',
                        color: row.highlight ? 'var(--primary)' : 'var(--text)',
                        fontSize: row.small ? '0.7rem' : '0.82rem',
                        textTransform: row.highlight ? 'capitalize' : 'none',
                        maxWidth: '155px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <button onClick={() => { navigate('/settings'); setShowProfile(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)', width: '100%' }}>
                    <Settings size={16} color="var(--primary)" /> Settings
                  </button>
                  <button onClick={handleLogout}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)', background: '#fff5f5', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: 'var(--danger)', width: '100%' }}>
                    <LogOut size={16} /> Log Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes profileFadeIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </header>
  );
};

export default Header;
