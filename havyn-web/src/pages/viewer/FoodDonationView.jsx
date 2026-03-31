import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Coffee, Utensils, Moon, Calendar, ArrowLeft,
  Loader2, CheckCircle, Info, AlertCircle, Lock, Clock
} from 'lucide-react';
import {
  collection, getDocs, addDoc, query, where, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import GlassCard from '../../components/GlassCard';
import Button from '../../components/Button';
import Toast from '../../components/Toast';

// ── Meal slot definitions ──────────────────────────────────────────────────
const SLOTS = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee, time: '07:30 AM – 09:00 AM' },
  { id: 'lunch',    label: 'Lunch',     icon: Utensils, time: '12:30 PM – 02:00 PM' },
  { id: 'dinner',   label: 'Dinner',    icon: Moon, time: '07:30 PM – 09:00 PM' },
];

// Active statuses that occupy a slot (cancelled/rejected don't block)
const BLOCKING_STATUSES = ['pending', 'approved', 'accepted'];

const today = new Date().toISOString().split('T')[0];

// ═══════════════════════════════════════════════════════════════════════════
const FoodDonationView = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotStatusMap, setSlotStatusMap] = useState({});
  // slotStatusMap: { breakfast: 'approved', lunch: 'pending', dinner: null }
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  // ── Fetch slot availability with STATUS awareness ────────────────────
  useEffect(() => {
    fetchSlotStatus();
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSlotStatus = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'institutions', id, 'foodDonations'),
        where('date', '==', selectedDate)
      );
      const snapshot = await getDocs(q);

      // Build a map: slotId -> highest-priority active status
      // Priority: approved > pending > (not blocking)
      const map = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (!BLOCKING_STATUSES.includes(data.status)) return; // skip cancelled/rejected
        const existing = map[data.slotId];
        if (!existing || data.status === 'approved' || data.status === 'accepted') {
          map[data.slotId] = data.status === 'accepted' ? 'approved' : data.status;
        }
      });
      setSlotStatusMap(map);
    } catch (err) {
      console.error('Error fetching slot status:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Validation ─────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!selectedDate) errs.date = 'Please select a donation date.';
    else if (selectedDate < today) errs.date = 'Date cannot be in the past.';
    if (!selectedSlot) errs.slot = 'Please choose a meal slot before submitting.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Booking handler with server-side re-check (race condition guard) ──
  const handleBooking = async () => {
    if (!validate() || !user) return;
    setBooking(true);
    try {
      // ── Server-side re-check: verify slot is still available ──
      const recheck = query(
        collection(db, 'institutions', id, 'foodDonations'),
        where('date', '==', selectedDate),
        where('slotId', '==', selectedSlot.id)
      );
      const recheckSnap = await getDocs(recheck);
      const hasActiveBooking = recheckSnap.docs.some(d =>
        BLOCKING_STATUSES.includes(d.data().status)
      );

      if (hasActiveBooking) {
        // Another donor grabbed it in the meantime
        setToast({ message: '⚠️ This slot was just booked by another donor. Please choose a different slot.', type: 'error' });
        setSelectedSlot(null);
        fetchSlotStatus(); // refresh the UI
        return;
      }

      // ── Proceed with booking ──
      await addDoc(collection(db, 'institutions', id, 'foodDonations'), {
        userId: user.uid,
        userEmail: user.email,
        date: selectedDate,
        slotId: selectedSlot.id,
        slotLabel: selectedSlot.label,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Notify institution
      await addDoc(collection(db, 'institutions', id, 'notifications'), {
        type: 'FOOD_BOOKING',
        title: 'New Food Booking',
        message: `${user.email} requested a ${selectedSlot.label} slot for ${selectedDate}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      setToast({ message: `✅ ${selectedSlot.label} slot on ${selectedDate} booked! Awaiting institution approval.`, type: 'success' });
      setSelectedSlot(null);
      fetchSlotStatus();
    } catch (err) {
      console.error('Booking error:', err);
      setToast({ message: 'Failed to submit booking. Please try again.', type: 'error' });
    } finally {
      setBooking(false);
    }
  };

  // ── Count available slots ──────────────────────────────────────────────
  const bookedCount = Object.keys(slotStatusMap).length;
  const allBooked = bookedCount >= SLOTS.length;

  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem 1rem' }}>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <button
          onClick={() => navigate(`/viewer/institution/${id}`)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: '600' }}
        >
          <ArrowLeft size={20} /> Back to Institution
        </button>

        <header style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>Food Donation</h1>
          <p style={{ color: 'var(--text-muted)' }}>Choose a day and an available meal slot to contribute.</p>
        </header>

        {/* ── 1. Date Selector ─────────────────────────────────────────── */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem' }}>
            1. Select Distribution Date
          </label>
          <div style={{ position: 'relative' }}>
            <Calendar size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: errors.date ? '#ef4444' : 'var(--primary)' }} />
            <input
              id="food-donation-date"
              type="date"
              value={selectedDate}
              min={today}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null); setErrors({}); }}
              style={{
                width: '100%', padding: '1rem 1rem 1rem 3rem',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${errors.date ? '#ef4444' : 'var(--border)'}`,
                background: 'white', fontSize: '1rem', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
          {errors.date && (
            <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: '600', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={14} /> {errors.date}
            </p>
          )}
        </div>

        {/* ── Availability summary ────────────────────────────────────── */}
        {!loading && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            marginBottom: '1rem', padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: allBooked ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${allBooked ? '#fca5a5' : '#bbf7d0'}`
          }}>
            {allBooked
              ? <Lock size={16} color="#dc2626" />
              : <CheckCircle size={16} color="#16a34a" />
            }
            <span style={{
              fontSize: '0.85rem', fontWeight: '700',
              color: allBooked ? '#dc2626' : '#16a34a'
            }}>
              {allBooked
                ? 'All slots are booked for this day'
                : `${SLOTS.length - bookedCount} of ${SLOTS.length} slots available`
              }
            </span>
          </div>
        )}

        {/* ── 2. Slot Selection ─────────────────────────────────────────── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <label style={{ display: 'block', fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>
            2. Choose an Available Slot
          </label>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 size={28} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {SLOTS.map(slot => {
                const slotStatus = slotStatusMap[slot.id]; // 'approved','pending', or undefined
                const isBlocked = !!slotStatus;
                const isApproved = slotStatus === 'approved';
                const isPending = slotStatus === 'pending';
                const isSelected = selectedSlot?.id === slot.id;
                const Icon = slot.icon;

                return (
                  <div
                    key={slot.id}
                    onClick={() => {
                      if (isBlocked) {
                        setToast({
                          message: isApproved
                            ? `❌ ${slot.label} is already confirmed by the institution. Please choose another slot.`
                            : `⏳ ${slot.label} has a pending booking. Try another slot or date.`,
                          type: 'error'
                        });
                        return;
                      }
                      setSelectedSlot(slot);
                      setErrors(prev => ({ ...prev, slot: '' }));
                    }}
                    style={{
                      padding: '1.25rem', borderRadius: 'var(--radius-lg)',
                      border: `2px solid ${
                        isSelected ? 'var(--primary)' :
                        isApproved ? '#dcfce7' :
                        isPending ? '#fef3c7' :
                        errors.slot ? '#ef4444' : 'var(--border)'
                      }`,
                      background: isApproved ? '#f8fdf8' : isPending ? '#fffdf5' : 'white',
                      cursor: isBlocked ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '1.25rem',
                      transition: 'all 0.2s ease',
                      opacity: isBlocked ? 0.65 : 1,
                      boxShadow: isSelected ? '0 10px 20px rgba(59, 130, 246, 0.1)' : 'none'
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      backgroundColor: isBlocked ? (isApproved ? '#dcfce7' : '#fef3c7') : isSelected ? 'var(--primary-light)' : 'var(--surface)',
                      color: isBlocked ? (isApproved ? '#16a34a' : '#d97706') : isSelected ? 'var(--primary)' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={24} />
                    </div>

                    {/* Label */}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '700', fontSize: '1.1rem', color: isBlocked ? 'var(--text-muted)' : 'var(--text)' }}>
                        {slot.label}
                      </p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={12} /> {slot.time}
                      </p>
                      {isBlocked && (
                        <p style={{
                          fontSize: '0.75rem', fontWeight: '700', marginTop: '0.3rem',
                          color: isApproved ? '#16a34a' : '#d97706',
                          display: 'flex', alignItems: 'center', gap: '0.3rem'
                        }}>
                          {isApproved ? <><Lock size={11} /> Confirmed — Slot not available</> : <><Clock size={11} /> Pending approval by institution</>}
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    {isApproved ? (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
                        padding: '4px 10px', borderRadius: '999px',
                        background: '#dcfce7', color: '#16a34a'
                      }}>
                        ✓ Booked
                      </span>
                    ) : isPending ? (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
                        padding: '4px 10px', borderRadius: '999px',
                        background: '#fef3c7', color: '#d97706'
                      }}>
                        ⏳ Pending
                      </span>
                    ) : isSelected ? (
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        backgroundColor: 'var(--primary)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <CheckCircle size={16} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {errors.slot && (
            <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: '600', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={14} /> {errors.slot}
            </p>
          )}
        </div>

        {/* ── Info note ────────────────────────────────────────────────── */}
        <div style={{ padding: '1.25rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 'var(--radius-md)', marginBottom: '2.5rem', display: 'flex', gap: '1rem' }}>
          <Info size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Wait for the institution's approval before proceeding with food preparation. You may be contacted by staff for dietary requirements.
          </p>
        </div>

        {/* ── Submit ──────────────────────────────────────────────────── */}
        <Button
          variant="primary"
          fullWidth
          disabled={booking || loading || allBooked}
          onClick={handleBooking}
          style={{ padding: '1.25rem', fontSize: '1.1rem' }}
        >
          {booking ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Verifying & Booking...
            </span>
          ) : allBooked ? (
            'All Slots Booked for This Day'
          ) : (
            'Submit Booking Request'
          )}
        </Button>

        {/* Quick nav */}
        <button
          onClick={() => navigate('/viewer/history')}
          style={{ display: 'block', width: '100%', marginTop: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'center', fontWeight: '600' }}
        >
          View My Donation History →
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default FoodDonationView;
