import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History, Utensils, Heart, ArrowLeft, Loader2,
  Calendar, Clock, XCircle, AlertTriangle, CheckCircle
} from 'lucide-react';
import {
  collectionGroup, query, where, getDocs,
  doc, getDoc, updateDoc, addDoc, collection, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import GlassCard from '../../components/GlassCard';

// ── Statuses that a donor can still cancel ─────────────────────────────────
// 'pending'  = waiting for institution review
// 'approved' = institution has accepted the booking (the main use-case)
const CANCELLABLE_STATUSES = ['pending', 'approved', 'accepted'];

// ── Time helpers ───────────────────────────────────────────────────────────
const getHoursRemaining = (dateStr) => {
  if (!dateStr) return null;
  const bookingMidnight = new Date(dateStr + 'T00:00:00'); // local midnight of that day
  return (bookingMidnight - new Date()) / (1000 * 60 * 60);
};

const formatCountdown = (hrs) => {
  if (hrs === null) return null;
  if (hrs <= 0) return 'Past slot date';
  if (hrs >= 48) {
    const days = Math.floor(hrs / 24);
    const rem = Math.round(hrs % 24);
    return rem > 0 ? `${days}d ${rem}h left to cancel` : `${days}d left to cancel`;
  }
  return `${Math.round(hrs)}h remaining — cancellation locked`;
};

// ── Status badge styles ────────────────────────────────────────────────────
const getStatusStyle = (status) => {
  const base = {
    fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
    padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap'
  };
  if (status === 'approved' || status === 'accepted') return { ...base, background: '#dcfce7', color: '#166534' };
  if (status === 'completed') return { ...base, background: 'var(--success)', color: 'white' };
  if (status === 'pending') return { ...base, background: '#fef3c7', color: '#92400e' };
  if (status === 'cancelled') return { ...base, background: '#fee2e2', color: '#dc2626' };
  if (status === 'rejected') return { ...base, background: 'var(--danger)', color: 'white' };
  return { ...base, background: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)' };
};

const getStatusLabel = (status) => {
  if (status === 'approved' || status === 'accepted') return '✓ Accepted';
  return status;
};

// ══════════════════════════════════════════════════════════════════════════
const DonationHistoryView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user) fetchAllDonations();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  // ── Fetch all donations ─────────────────────────────────────────────────
  const fetchAllDonations = async () => {
    setLoading(true);
    try {
      const foodQ = query(collectionGroup(db, 'foodDonations'), where('userId', '==', user.uid));
      const fundQ = query(collectionGroup(db, 'fundDonations'), where('userId', '==', user.uid));
      const [foodSnap, fundSnap] = await Promise.all([getDocs(foodQ), getDocs(fundQ)]);

      const foodList = foodSnap.docs.map(d => ({
        id: d.id,
        type: 'food',
        docRef: d.ref,           // keep Firestore ref for updateDoc
        institutionId: d.ref.parent.parent.id,
        ...d.data()
      }));

      const fundList = fundSnap.docs.map(d => ({
        id: d.id,
        type: 'fund',
        institutionId: d.ref.parent.parent.id,
        ...d.data()
      }));

      const combined = [...foodList, ...fundList].sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );

      // Resolve institution names
      const instIds = [...new Set(combined.map(d => d.institutionId))];
      const instMap = {};
      await Promise.all(instIds.map(async (instId) => {
        try {
          const snap = await getDoc(doc(db, 'institutions', instId));
          instMap[instId] = snap.exists() ? snap.data().name : 'Unknown Institution';
        } catch {
          instMap[instId] = 'Unknown Institution';
        }
      }));

      setDonations(combined.map(d => ({ ...d, institutionName: instMap[d.institutionId] || 'Institution' })));
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Cancel handler ─────────────────────────────────────────────────────
  const handleCancel = async (donation) => {
    const hrs = getHoursRemaining(donation.date);
    if (hrs === null || hrs < 48) return; // safety guard

    const confirmed = window.confirm(
      `Cancel your "${donation.slotLabel}" slot on ${donation.date}?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setCancelling(donation.id);
    try {
      // 1. Update booking status in Firestore
      await updateDoc(donation.docRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp()
      });

      // 2. Notify institution
      await addDoc(collection(db, 'institutions', donation.institutionId, 'notifications'), {
        type: 'BOOKING_CANCELLED',
        title: 'Food Booking Cancelled',
        message: `${user.email} cancelled their "${donation.slotLabel}" slot scheduled for ${donation.date}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      // 3. Optimistic UI update (no refetch needed)
      setDonations(prev =>
        prev.map(d => d.id === donation.id ? { ...d, status: 'cancelled' } : d)
      );
      showToast('Booking cancelled successfully.', 'success');
    } catch (err) {
      console.error('Cancel error:', err);
      showToast('Could not cancel booking. Please try again.', 'error');
    } finally {
      setCancelling(null);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return 'Unknown Date';
    return ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ══════════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem 1rem' }}>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)',
          background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: toast.type === 'success' ? '#166534' : '#dc2626',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fca5a5'}`,
          fontWeight: '700', fontSize: '0.9rem', boxShadow: 'var(--shadow-lg)',
          animation: 'slideIn 0.3s ease-out'
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

            // ── Cancellation eligibility ───────────────────────
            const hrs = isFood ? getHoursRemaining(donation.date) : null;
            const isCancellable = CANCELLABLE_STATUSES.includes(donation.status);
            const canCancel = isFood && isCancellable && hrs !== null && hrs >= 48;
            const cancelLocked = isFood && isCancellable && hrs !== null && hrs > 0 && hrs < 48;
            const countdown = isFood && !isCancelled ? formatCountdown(hrs) : null;
            const isApproved = donation.status === 'approved' || donation.status === 'accepted';

            return (
              <GlassCard
                key={donation.id}
                style={{
                  padding: '1.25rem',
                  border: isCancelled ? '1px solid #fca5a5' : isApproved && isFood ? '1px solid #bbf7d0' : '1px solid var(--border)',
                  background: isCancelled ? '#fff8f8' : isApproved && isFood ? '#f0fdf4' : 'white',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>

                  {/* Icon */}
                  <div style={{
                    width: '48px', height: '48px', borderRadius: 'var(--radius-md)', flexShrink: 0,
                    backgroundColor: isCancelled ? '#fee2e210' : isApproved && isFood ? '#dcfce7' : `${color}15`,
                    color: isCancelled ? '#dc2626' : isApproved && isFood ? '#16a34a' : color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {isCancelled ? <XCircle size={22} /> : isApproved && isFood ? <CheckCircle size={22} /> : <Icon size={22} />}
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '0.1rem' }}>
                      {donation.institutionName}
                    </p>
                    <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
                      {isFood ? `Food: ${donation.slotLabel}` : `Fund: ₹${donation.amount}`}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={12} />
                      {isFood ? donation.date : formatDate(donation.createdAt)}
                    </p>

                    {/* Countdown or lock message for cancellable bookings */}
                    {countdown && (
                      <p style={{
                        fontSize: '0.75rem', fontWeight: '700', marginTop: '0.5rem',
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        color: canCancel ? 'var(--primary)' : '#f59e0b'
                      }}>
                        <Clock size={12} /> {countdown}
                      </p>
                    )}

                    {/* 48-hour lock warning */}
                    {cancelLocked && (
                      <p style={{
                        fontSize: '0.73rem', color: '#f59e0b', fontWeight: '700',
                        display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem'
                      }}>
                        <AlertTriangle size={12} />
                        Cancellation not allowed within 48 hours of slot
                      </p>
                    )}
                  </div>

                  {/* Right side: status badge + cancel button */}
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-end', gap: '0.6rem', flexShrink: 0
                  }}>
                    {/* Status badge */}
                    <span style={getStatusStyle(donation.status)}>
                      {getStatusLabel(donation.status)}
                    </span>

                    {/* "Slot confirmed" sub-label for approved food bookings */}
                    {isFood && isApproved && !isCancelled && (
                      <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '700' }}>
                        Slot confirmed ✓
                      </span>
                    )}

                    {/* ── Cancel Button ── */}
                    {canCancel && (
                      <button
                        onClick={() => handleCancel(donation)}
                        disabled={cancelling === donation.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                          padding: '6px 14px', borderRadius: 'var(--radius-md)',
                          background: '#fef2f2', color: '#dc2626',
                          border: '1px solid #fca5a5', cursor: 'pointer',
                          fontSize: '0.8rem', fontWeight: '700',
                          transition: 'all 0.2s',
                          opacity: cancelling === donation.id ? 0.6 : 1
                        }}
                      >
                        {cancelling === donation.id
                          ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          : <XCircle size={12} />
                        }
                        {cancelling === donation.id ? 'Cancelling...' : 'Cancel Booking'}
                      </button>
                    )}

                    {/* Disabled cancel when < 48hrs */}
                    {cancelLocked && (
                      <button
                        disabled
                        title="Cancellation is not allowed within 2 days of the scheduled donation"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                          padding: '6px 14px', borderRadius: 'var(--radius-md)',
                          background: '#f3f4f6', color: '#9ca3af',
                          border: '1px solid #e5e7eb', cursor: 'not-allowed',
                          fontSize: '0.8rem', fontWeight: '700'
                        }}
                      >
                        <XCircle size={12} /> Cancel Booking
                      </button>
                    )}
                  </div>

                </div>
              </GlassCard>
            );
          }) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
              <History size={64} style={{ opacity: 0.1, marginBottom: '1.5rem', display: 'block', margin: '0 auto 1.5rem' }} />
              <p style={{ fontWeight: '600' }}>You haven't made any donations yet.</p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Your impact starts here!</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default DonationHistoryView;
