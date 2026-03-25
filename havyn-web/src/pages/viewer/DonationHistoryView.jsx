import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Utensils, Heart, ArrowLeft, Loader2, Calendar, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { collectionGroup, query, where, getDocs, doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import GlassCard from '../../components/GlassCard';

// ── Helper: hours remaining until a booking date ───────────────────────────
const getHoursRemaining = (dateStr) => {
  if (!dateStr) return null;
  const bookingDate = new Date(dateStr + 'T00:00:00'); // local midnight
  return (bookingDate - new Date()) / (1000 * 60 * 60);
};

const formatHoursLeft = (hrs) => {
  if (hrs === null) return null;
  if (hrs <= 0) return 'Past slot';
  if (hrs >= 48) {
    const days = Math.floor(hrs / 24);
    const rem = Math.round(hrs % 24);
    return rem > 0 ? `${days}d ${rem}h left to cancel` : `${days}d left to cancel`;
  }
  return `${Math.round(hrs)}h left — cancellation locked`;
};

const DonationHistoryView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null); // bookingId being cancelled
  const [toast, setToast] = useState(null); // { message, type }

  useEffect(() => {
    if (user) fetchAllDonations();
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchAllDonations = async () => {
    setLoading(true);
    try {
      const foodQ = query(collectionGroup(db, 'foodDonations'), where('userId', '==', user.uid));
      const fundQ = query(collectionGroup(db, 'fundDonations'), where('userId', '==', user.uid));
      const [foodSnap, fundSnap] = await Promise.all([getDocs(foodQ), getDocs(fundQ)]);

      const foodList = foodSnap.docs.map(d => ({
        id: d.id, type: 'food', docRef: d.ref, ...d.data(),
        institutionId: d.ref.parent.parent.id
      }));
      const fundList = fundSnap.docs.map(d => ({
        id: d.id, type: 'fund', ...d.data(),
        institutionId: d.ref.parent.parent.id
      }));

      const combined = [...foodList, ...fundList].sort((a, b) =>
        (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );

      // Resolve institution names
      const instIds = [...new Set(combined.map(d => d.institutionId))];
      const instMap = {};
      await Promise.all(instIds.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'institutions', id));
          if (snap.exists()) instMap[id] = snap.data().name;
        } catch { instMap[id] = 'Unknown Institution'; }
      }));

      setDonations(combined.map(d => ({ ...d, institutionName: instMap[d.institutionId] || 'Institution' })));
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (donation) => {
    const hrs = getHoursRemaining(donation.date);
    if (hrs === null || hrs < 48) return; // double-guard

    if (!window.confirm(`Cancel your ${donation.slotLabel} slot on ${donation.date}?\n\nThis action cannot be undone.`)) return;

    setCancelling(donation.id);
    try {
      // 1. Update Firestore booking status
      await updateDoc(donation.docRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp()
      });

      // 2. Notify institution
      await addDoc(collection(db, 'institutions', donation.institutionId, 'notifications'), {
        type: 'BOOKING_CANCELLED',
        title: 'Food Booking Cancelled',
        message: `${user.email} cancelled their ${donation.slotLabel} slot for ${donation.date}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      // 3. Optimistic UI update
      setDonations(prev => prev.map(d =>
        d.id === donation.id ? { ...d, status: 'cancelled' } : d
      ));
      showToast('Booking cancelled successfully.', 'success');
    } catch (err) {
      console.error('Cancel error:', err);
      showToast('Failed to cancel booking. Please try again.', 'error');
    } finally {
      setCancelling(null);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return 'Unknown Date';
    return ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusStyle = (status) => {
    const base = { fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '999px' };
    if (status === 'completed' || status === 'approved') return { ...base, background: 'var(--success)', color: 'white' };
    if (status === 'pending') return { ...base, background: 'var(--warning)', color: 'white' };
    if (status === 'cancelled') return { ...base, background: '#fee2e2', color: '#dc2626' };
    if (status === 'rejected') return { ...base, background: 'var(--danger)', color: 'white' };
    return { ...base, background: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)' };
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background)' }}>
        <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem 1rem' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)',
          background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: toast.type === 'success' ? '#166534' : '#dc2626',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fee2e2'}`,
          fontWeight: '700', fontSize: '0.9rem', boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/viewer/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: '600' }}
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>

        <header style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>Your History</h1>
          <p style={{ color: 'var(--text-muted)' }}>A summary of your contributions to various institutions.</p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {donations.length > 0 ? donations.map(donation => {
            const isFood = donation.type === 'food';
            const Icon = isFood ? Utensils : Heart;
            const color = isFood ? 'var(--primary)' : '#ec4899';
            const isCancelled = donation.status === 'cancelled';

            // Cancellation eligibility (only for food bookings)
            const hrs = isFood ? getHoursRemaining(donation.date) : null;
            const canCancel = hrs !== null && hrs >= 48 && donation.status === 'pending';
            const cancelLocked = hrs !== null && hrs < 48 && hrs > 0 && donation.status === 'pending';
            const hoursLabel = isFood && !isCancelled ? formatHoursLeft(hrs) : null;

            return (
              <GlassCard
                key={donation.id}
                style={{
                  padding: '1.25rem',
                  border: isCancelled ? '1px solid #fee2e2' : '1px solid var(--border)',
                  background: isCancelled ? '#fffcfc' : 'white',
                  opacity: isCancelled ? 0.85 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                  {/* Icon */}
                  <div style={{
                    width: '50px', height: '50px', borderRadius: 'var(--radius-md)',
                    backgroundColor: isCancelled ? '#fee2e210' : `${color}10`,
                    color: isCancelled ? '#dc2626' : color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    {isCancelled ? <XCircle size={24} /> : <Icon size={24} />}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: '800', fontSize: '1.05rem', marginBottom: '0.15rem' }}>{donation.institutionName}</p>
                    <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
                      {isFood ? `Food: ${donation.slotLabel}` : `Fund: ₹${donation.amount}`}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={12} />
                      {isFood ? donation.date : formatDate(donation.createdAt)}
                    </p>

                    {/* Countdown / Cancel status */}
                    {hoursLabel && (
                      <p style={{
                        fontSize: '0.75rem', fontWeight: '700', marginTop: '0.5rem',
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        color: canCancel ? 'var(--primary)' : cancelLocked ? '#f59e0b' : 'var(--text-muted)'
                      }}>
                        <Clock size={12} /> {hoursLabel}
                      </p>
                    )}

                    {/* Cancel locked message */}
                    {cancelLocked && (
                      <p style={{
                        fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.35rem',
                        display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600'
                      }}>
                        <AlertTriangle size={12} /> Cancellation not allowed within 48hrs of slot
                      </p>
                    )}
                  </div>

                  {/* Right side: status + cancel button */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem', flexShrink: 0 }}>
                    <span style={getStatusStyle(donation.status)}>
                      {donation.status}
                    </span>

                    {/* Cancel button — food donations only, pending only */}
                    {isFood && donation.status === 'pending' && (
                      canCancel ? (
                        <button
                          onClick={() => handleCancel(donation)}
                          disabled={cancelling === donation.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                            padding: '6px 12px', borderRadius: 'var(--radius-md)',
                            background: '#fef2f2', color: '#dc2626',
                            border: '1px solid #fee2e2', cursor: 'pointer',
                            fontSize: '0.78rem', fontWeight: '700',
                            transition: 'all 0.2s',
                            opacity: cancelling === donation.id ? 0.6 : 1
                          }}
                        >
                          {cancelling === donation.id
                            ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                            : <XCircle size={12} />
                          }
                          {cancelling === donation.id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      ) : cancelLocked ? (
                        <button
                          disabled
                          title="Cancellation is not allowed within 2 days of the scheduled donation"
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                            padding: '6px 12px', borderRadius: 'var(--radius-md)',
                            background: 'rgba(0,0,0,0.04)', color: 'var(--text-muted)',
                            border: '1px solid var(--border)', cursor: 'not-allowed',
                            fontSize: '0.78rem', fontWeight: '700'
                          }}
                        >
                          <XCircle size={12} /> Cancel
                        </button>
                      ) : null
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          }) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
              <History size={64} style={{ opacity: 0.1, marginBottom: '1.5rem', margin: '0 auto' }} />
              <p>You haven't made any donations yet. Your impact starts here!</p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default DonationHistoryView;
