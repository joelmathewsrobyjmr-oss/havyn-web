import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Feather, Bell, ArrowLeft, LogOut, Clock, Settings, Camera, Loader2, Maximize2, X, Mail, Shield, Hash } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/* ─── Extract dominant colour from an image data URL via Canvas ─── */
function extractDominantColor(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 50; canvas.height = 50;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 50, 50);
      const pixels = ctx.getImageData(0, 0, 50, 50).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        if (brightness > 20 && brightness < 240) {  // skip near-black and near-white
          r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; count++;
        }
      }
      if (count === 0) { resolve({ r: 59, g: 130, b: 246 }); return; }
      resolve({ r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) });
    };
    img.onerror = () => resolve({ r: 59, g: 130, b: 246 });
    img.src = dataUrl;
  });
}

const Header = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, institutionId, user, userData, institutionData, updateProfileData } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileGradient, setProfileGradient] = useState('linear-gradient(135deg, #1e40af, #3b82f6)');
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const photoInputRef = useRef(null);
  const isHome = location.pathname === '/dashboard';

  // Compute gradient from existing photo on mount / photo change
  const adminPhotoUrl = userData?.adminPhotoUrl || null;

  useEffect(() => {
    if (adminPhotoUrl) {
      extractDominantColor(adminPhotoUrl).then(({ r, g, b }) => {
        const darker = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;
        setProfileGradient(`linear-gradient(135deg, ${darker}, rgb(${r},${g},${b}))`);
      });
    } else {
      setProfileGradient('linear-gradient(135deg, #1e3a8a, #2563eb)');
    }
  }, [adminPhotoUrl]);

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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) { console.warn('No file or user'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Photo must be under 5MB.'); return; }
    if (photoInputRef.current) photoInputRef.current.value = '';

    // Read local file as data URL for canvas colour extraction (avoids CORS)
    let localDataUrl = null;
    try {
      localDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (err) {
      console.error('FileReader error:', err);
    }

    setUploadingPhoto(true);
    try {
      // Use institution path — this is covered by existing Storage rules
      const path = institutionId
        ? `institutions/${institutionId}/adminPhoto/${user.uid}_${Date.now()}`
        : `users/${user.uid}/adminPhoto_${Date.now()}`;

      console.log('[AdminPhoto] Uploading to:', path);
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      console.log('[AdminPhoto] Upload complete, getting URL…');
      const url = await getDownloadURL(storageRef);
      console.log('[AdminPhoto] URL obtained, saving to Firestore…');
      await updateProfileData(user.uid, { adminPhotoUrl: url });
      console.log('[AdminPhoto] Saved to Firestore successfully');

      // Apply gradient from local data URL — fire-and-forget (won't block spinner clear)
      if (localDataUrl) {
        extractDominantColor(localDataUrl).then(({ r, g, b }) => {
          const darker = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;
          setProfileGradient(`linear-gradient(135deg, ${darker}, rgb(${r},${g},${b}))`);
        }).catch(() => {});
      }
    } catch (err) {
      console.error('[AdminPhoto] Upload failed:', err);
      alert(`Failed to upload photo: ${err.message || err.code || 'Unknown error'}. Check Firebase Storage rules.`);
    } finally {
      setUploadingPhoto(false);
    }
  };


  const adminInitial = (institutionData?.name || userData?.adminName || 'A').charAt(0).toUpperCase();

  return (
    <header className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)' }}>
      {/* Left */}
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

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>

        {/* 🔔 Notifications */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}
            style={{ color: showNotif ? 'var(--primary)' : 'var(--text-muted)', position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
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

        {/* 👤 Admin Avatar button with ring */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
            title="Admin Profile"
            style={{
              width: '42px', height: '42px', borderRadius: '50%',
              padding: '0', border: 'none', cursor: 'pointer',
              /* gradient ring via box-shadow */
              boxShadow: showProfile
                ? '0 0 0 3px white, 0 0 0 5px var(--primary), 0 4px 12px rgba(37,99,235,0.4)'
                : '0 0 0 3px white, 0 0 0 5px rgba(37,99,235,0.5)',
              transition: 'all 0.2s ease',
              overflow: 'hidden',
              background: adminPhotoUrl ? 'transparent' : profileGradient,
              flexShrink: 0
            }}
          >
            {adminPhotoUrl ? (
              <img src={adminPhotoUrl} alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <span style={{ color: 'white', fontWeight: '800', fontSize: '1.1rem' }}>{adminInitial}</span>
            )}
          </button>

          {showProfile && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 14px)', right: '0',
              width: '320px', backgroundColor: 'white',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.14)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              animation: 'profileFadeIn 0.2s ease-out',
              zIndex: 200
            }}>

              {/* ── GRADIENT HEADER ── */}
              <div style={{ background: profileGradient, padding: '1.5rem 1.25rem 2.5rem', position: 'relative' }}>
                {/* Expand button — top-left */}
                <button
                  onClick={() => { setShowFullProfile(true); setShowProfile(false); }}
                  title="View full profile"
                  style={{
                    position: 'absolute', top: '10px', left: '10px',
                    width: '26px', height: '26px', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', backdropFilter: 'blur(6px)', transition: 'all 0.2s'
                  }}
                >
                  <Maximize2 size={13} color="white" />
                </button>

                {/* Avatar with ring + upload overlay */}
                <div style={{ position: 'relative', width: '68px', height: '68px', margin: '0 auto 0.75rem' }}>
                  <div style={{
                    width: '68px', height: '68px', borderRadius: '50%',
                    border: '3px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 0 0 3px rgba(255,255,255,0.3)',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {uploadingPhoto ? (
                      <Loader2 size={24} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                    ) : adminPhotoUrl ? (
                      <img src={adminPhotoUrl} alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: 'white', fontWeight: '800', fontSize: '1.75rem' }}>{adminInitial}</span>
                    )}
                  </div>

                  {/* Camera overlay to upload */}
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    style={{
                      position: 'absolute', bottom: '0', right: '0',
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: 'white', border: '2px solid rgba(255,255,255,0.6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }}
                  >
                    <Camera size={13} color="#1e3a8a" />
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                </div>

                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: 'white', fontWeight: '800', fontSize: '1.1rem', marginBottom: '2px' }}>
                    {institutionData?.name || 'Institution'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                    {userData?.adminName || 'Admin'}
                  </p>
                </div>
              </div>

              {/* ── DETAIL ROWS ── */}
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.1rem' }}>
                  {[
                    { label: 'Email', value: userData?.email || '—' },
                    { label: 'Role', value: userData?.role || 'admin', highlight: true },
                    { label: 'Institution ID', value: institutionId || '—', small: true },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem' }}>{row.label}</span>
                      <span style={{
                        fontWeight: row.highlight ? '800' : '600',
                        color: row.highlight ? 'var(--primary)' : 'var(--text)',
                        fontSize: row.small ? '0.72rem' : '0.88rem',
                        textTransform: row.highlight ? 'capitalize' : 'none',
                        maxWidth: '175px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border)', paddingTop: '0.9rem' }}>
                  <button onClick={() => { navigate('/settings'); setShowProfile(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.7rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--background)', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text)', width: '100%', textAlign: 'left' }}>
                    <Settings size={17} color="var(--primary)" /> Settings
                  </button>
                  <button onClick={handleLogout}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.7rem 0.85rem', borderRadius: 'var(--radius-md)', background: '#fff5f5', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', color: 'var(--danger)', width: '100%', textAlign: 'left' }}>
                    <LogOut size={17} /> Log Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          FULL-SCREEN PROFILE MODAL
      ════════════════════════════════════════ */}
      {showFullProfile && (
        <div
          onClick={() => setShowFullProfile(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(5, 10, 30, 0.75)',
            backdropFilter: 'blur(18px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fullProfileBg 0.35s ease-out'
          }}
        >
          {/* Card — stop click propagation */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(400px, 92vw)',
              background: 'white',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
              animation: 'fullProfileEntry 0.4s cubic-bezier(0.34,1.56,0.64,1)'
            }}
          >
            {/* Gradient top section */}
            <div style={{ background: profileGradient, padding: '2.5rem 1.5rem 3rem', position: 'relative', textAlign: 'center' }}>
              {/* Close button */}
              <button
                onClick={() => setShowFullProfile(false)}
                style={{
                  position: 'absolute', top: '14px', right: '14px',
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', backdropFilter: 'blur(4px)'
                }}
              >
                <X size={16} color="white" />
              </button>

              {/* Rotating ring avatar */}
              <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1.25rem' }}>
                {/* The rotating conic-gradient ring */}
                <div style={{
                  position: 'absolute', inset: '-6px',
                  borderRadius: '50%',
                  background: 'conic-gradient(from 0deg, rgba(255,255,255,0.9), rgba(255,255,255,0.1), rgba(255,255,255,0.9))',
                  animation: 'ringRotate 2.5s linear infinite'
                }} />
                {/* White gap ring */}
                <div style={{
                  position: 'absolute', inset: '-2px',
                  borderRadius: '50%',
                  background: 'white',
                  zIndex: 1
                }} />
                {/* Avatar */}
                <div style={{
                  position: 'absolute', inset: '4px',
                  borderRadius: '50%', overflow: 'hidden',
                  background: profileGradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 2
                }}>
                  {adminPhotoUrl ? (
                    <img src={adminPhotoUrl} alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: 'white', fontWeight: '900', fontSize: '2.75rem' }}>{adminInitial}</span>
                  )}
                </div>
              </div>

              <h2 style={{ color: 'white', fontWeight: '900', fontSize: '1.5rem', margin: '0 0 4px' }}>
                {institutionData?.name || 'Institution'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', margin: 0 }}>
                {userData?.adminName || 'Admin'}
              </p>
            </div>

            {/* Detail section */}
            <div style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { icon: Mail, label: 'Email', value: userData?.email || '—' },
                  { icon: Shield, label: 'Role', value: userData?.role || 'admin', highlight: true },
                  { icon: Hash, label: 'Institution ID', value: institutionId || '—', mono: true },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-light, rgba(59,130,246,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <row.icon size={17} color="var(--primary)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>{row.label}</p>
                      <p style={{
                        fontSize: row.mono ? '0.78rem' : '0.92rem',
                        fontWeight: row.highlight ? '800' : '600',
                        color: row.highlight ? 'var(--primary)' : 'var(--text)',
                        textTransform: row.highlight ? 'capitalize' : 'none',
                        fontFamily: row.mono ? 'monospace' : 'inherit',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0
                      }}>{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => { navigate('/settings'); setShowFullProfile(false); }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.8rem', borderRadius: '12px', background: 'var(--background)', border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700', color: 'var(--text)' }}>
                  <Settings size={17} color="var(--primary)" /> Settings
                </button>
                <button onClick={handleLogout}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.8rem', borderRadius: '12px', background: '#fff5f5', border: '1.5px solid #fecaca', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700', color: 'var(--danger)' }}>
                  <LogOut size={17} /> Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes profileFadeIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ringRotate { to { transform: rotate(360deg); } }
        @keyframes fullProfileBg {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fullProfileEntry {
          from { opacity: 0; transform: scale(0.7) translateY(40px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </header>
  );
};

export default Header;

