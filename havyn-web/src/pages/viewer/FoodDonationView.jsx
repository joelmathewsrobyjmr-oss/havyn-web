import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Coffee, Utensils, Moon, ArrowLeft, Loader2, CheckCircle,
  Info, AlertCircle, Lock, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  collection, getDocs, addDoc, query, where, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import GlassCard from '../../components/GlassCard';
import Button from '../../components/Button';
import Toast from '../../components/Toast';

// ── Constants ──────────────────────────────────────────────────────────────
const SLOTS = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee, time: '07:30 AM – 09:00 AM' },
  { id: 'lunch',    label: 'Lunch',     icon: Utensils, time: '12:30 PM – 02:00 PM' },
  { id: 'dinner',   label: 'Dinner',    icon: Moon,     time: '07:30 PM – 09:00 PM' },
];

const BLOCKING_STATUSES = ['pending', 'approved', 'accepted'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const todayStr = new Date().toISOString().split('T')[0];
const todayDate = new Date();

// ═══════════════════════════════════════════════════════════════════════════
const FoodDonationView = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Calendar state
  const [calMonth, setCalMonth] = useState(todayDate.getMonth());
  const [calYear, setCalYear] = useState(todayDate.getFullYear());

  // Booking state
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotStatusMap, setSlotStatusMap] = useState({});
  const [monthBookings, setMonthBookings] = useState({}); // { 'YYYY-MM-DD': [...bookings] }
  const [loading, setLoading] = useState(true);
  const [calLoading, setCalLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  // ── Fetch ALL bookings for the visible month (calendar data) ──────────
  const fetchMonthBookings = useCallback(async () => {
    setCalLoading(true);
    try {
      // Date range for the month
      const firstDay = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
      const lastDayNum = new Date(calYear, calMonth + 1, 0).getDate();
      const lastDay = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

      const q = query(
        collection(db, 'institutions', id, 'foodDonations'),
        where('date', '>=', firstDay),
        where('date', '<=', lastDay)
      );
      const snap = await getDocs(q);

      const map = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (!BLOCKING_STATUSES.includes(data.status)) return;
        if (!map[data.date]) map[data.date] = [];
        map[data.date].push(data);
      });
      setMonthBookings(map);
    } catch (err) {
      console.error('Error fetching month bookings:', err);
    } finally {
      setCalLoading(false);
    }
  }, [id, calMonth, calYear]);

  useEffect(() => { fetchMonthBookings(); }, [fetchMonthBookings]);

  // ── Fetch slot status for the SELECTED day ────────────────────────────
  const fetchSlotStatus = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'institutions', id, 'foodDonations'),
        where('date', '==', selectedDate)
      );
      const snapshot = await getDocs(q);
      const map = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (!BLOCKING_STATUSES.includes(data.status)) return;
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
  }, [id, selectedDate]);

  useEffect(() => { fetchSlotStatus(); }, [fetchSlotStatus]);

  // ── Calendar grid data ────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const cells = [];

    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayBookings = monthBookings[dateStr] || [];
      const approvedCount = dayBookings.filter(b => b.status === 'approved' || b.status === 'accepted').length;
      const pendingCount = dayBookings.filter(b => b.status === 'pending').length;
      const totalBlocked = approvedCount + pendingCount;
      cells.push({
        day: d, dateStr, approvedCount, pendingCount, totalBlocked,
        allBooked: totalBlocked >= SLOTS.length,
        isPast: dateStr < todayStr
      });
    }
    return cells;
  }, [calMonth, calYear, monthBookings]);

  // ── Navigation ────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const selectDay = (dateStr) => {
    if (dateStr < todayStr) return; // can't book past dates
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setErrors({});
  };

  // ── Validation ────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!selectedDate) errs.date = 'Please select a date.';
    else if (selectedDate < todayStr) errs.date = 'Cannot book past dates.';
    if (!selectedSlot) errs.slot = 'Please choose a meal slot.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Booking with race-condition guard ─────────────────────────────────
  const handleBooking = async () => {
    if (!validate() || !user) return;
    setBooking(true);
    try {
      // Re-check availability right before booking
      const recheck = query(
        collection(db, 'institutions', id, 'foodDonations'),
        where('date', '==', selectedDate),
        where('slotId', '==', selectedSlot.id)
      );
      const recheckSnap = await getDocs(recheck);
      const hasActive = recheckSnap.docs.some(d => BLOCKING_STATUSES.includes(d.data().status));

      if (hasActive) {
        setToast({ message: '⚠️ Sorry, this slot was just booked by another donor. Please select another slot.', type: 'error' });
        setSelectedSlot(null);
        fetchSlotStatus();
        fetchMonthBookings();
        return;
      }

      await addDoc(collection(db, 'institutions', id, 'foodDonations'), {
        userId: user.uid,
        userEmail: user.email,
        date: selectedDate,
        slotId: selectedSlot.id,
        slotLabel: selectedSlot.label,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'institutions', id, 'notifications'), {
        type: 'FOOD_BOOKING',
        title: 'New Food Booking',
        message: `${user.email} requested a ${selectedSlot.label} slot for ${selectedDate}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      setToast({ message: `✅ ${selectedSlot.label} on ${selectedDate} booked! Awaiting approval.`, type: 'success' });
      setSelectedSlot(null);
      fetchSlotStatus();
      fetchMonthBookings();
    } catch (err) {
      console.error('Booking error:', err);
      setToast({ message: 'Failed to submit booking. Please try again.', type: 'error' });
    } finally {
      setBooking(false);
    }
  };

  const bookedCount = Object.keys(slotStatusMap).length;
  const allBooked = bookedCount >= SLOTS.length;

  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem 1rem' }}>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <button
          onClick={() => navigate(`/viewer/institution/${id}`)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: '600' }}
        >
          <ArrowLeft size={20} /> Back to Institution
        </button>

        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>Food Donation</h1>
          <p style={{ color: 'var(--text-muted)' }}>Pick a date from the calendar and choose an available meal slot.</p>
        </header>

        {/* ══════════════════════════════════════════════════════════════
            📅 MONTHLY CALENDAR
        ═══════════════════════════════════════════════════════════════ */}
        <GlassCard style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <button onClick={prevMonth} style={navBtn}><ChevronLeft size={18} /></button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>
              {MONTH_NAMES[calMonth]} {calYear}
            </h3>
            <button onClick={nextMonth} style={navBtn}><ChevronRight size={18} /></button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{
                textAlign: 'center', fontSize: '0.65rem', fontWeight: '800',
                textTransform: 'uppercase', color: 'var(--text-muted)',
                padding: '0.4rem 0', letterSpacing: '0.04em'
              }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          {calLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem' }}>
              <Loader2 size={24} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
              {calendarDays.map((cell, i) => {
                if (!cell) return <div key={`pad-${i}`} />;

                const isToday = cell.dateStr === todayStr;
                const isSelected = cell.dateStr === selectedDate;
                const hasSlots = cell.totalBlocked > 0;
                const available = SLOTS.length - cell.totalBlocked;

                // Determine cell color
                let bg = 'white';
                let borderColor = 'var(--border)';
                if (cell.isPast) {
                  bg = '#f9fafb';
                } else if (isSelected) {
                  bg = 'var(--primary-light)';
                  borderColor = 'var(--primary)';
                } else if (cell.allBooked) {
                  bg = '#f3f4f6'; // grey = fully booked
                } else if (cell.approvedCount > 0) {
                  bg = '#f0fdf4'; // light green = some approved but slots remain
                }

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => !cell.isPast && selectDay(cell.dateStr)}
                    style={{
                      position: 'relative', minHeight: '56px', padding: '4px 5px',
                      borderRadius: '8px', cursor: cell.isPast ? 'default' : 'pointer',
                      border: isToday ? '2px solid var(--primary)' : isSelected ? `2px solid ${borderColor}` : `1px solid ${borderColor}`,
                      background: bg,
                      opacity: cell.isPast ? 0.45 : 1,
                      transition: 'all 0.15s ease',
                      display: 'flex', flexDirection: 'column',
                      boxShadow: isSelected ? '0 4px 12px rgba(59,130,246,0.15)' : 'none'
                    }}
                  >
                    {/* Day number */}
                    <span style={{
                      fontSize: '0.8rem', fontWeight: isToday || isSelected ? '800' : '600',
                      color: cell.isPast ? '#9ca3af' : isToday ? 'var(--primary)' : 'var(--text)'
                    }}>
                      {cell.day}
                    </span>

                    {/* Slot dots + count */}
                    {!cell.isPast && hasSlots && (
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {cell.approvedCount > 0 && (
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                        )}
                        {cell.pendingCount > 0 && (
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                        )}
                        <span style={{
                          fontSize: '0.55rem', fontWeight: '700', marginLeft: '1px',
                          color: cell.allBooked ? '#9ca3af' : '#16a34a'
                        }}>
                          {cell.allBooked ? 'Full' : `${available}/${SLOTS.length}`}
                        </span>
                      </div>
                    )}

                    {/* Green available indicator for future empty days */}
                    {!cell.isPast && !hasSlots && (
                      <span style={{
                        marginTop: 'auto', fontSize: '0.55rem', fontWeight: '700', color: '#16a34a'
                      }}>
                        {SLOTS.length}/{SLOTS.length}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { color: '#16a34a', label: 'Confirmed' },
              { color: '#f59e0b', label: 'Pending' },
              { color: '#9ca3af', label: 'Fully Booked' },
              { color: 'var(--primary)', label: 'Selected', ring: true },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: l.ring ? 'transparent' : l.color,
                  border: l.ring ? `2px solid ${l.color}` : 'none',
                  display: 'inline-block'
                }} />
                {l.label}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ══════════════════════════════════════════════════════════════
            Selected Day Banner
        ═══════════════════════════════════════════════════════════════ */}
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
          background: allBooked ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${allBooked ? '#fca5a5' : '#bbf7d0'}`,
          marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          {allBooked ? <Lock size={16} color="#dc2626" /> : <CheckCircle size={16} color="#16a34a" />}
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: '700', color: allBooked ? '#dc2626' : '#16a34a' }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {allBooked ? 'All 3 slots are booked' : `${SLOTS.length - bookedCount} of ${SLOTS.length} slots available`}
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            🍽 SLOT SELECTION
        ═══════════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>
            Choose an Available Slot
          </label>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 size={28} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {SLOTS.map(slot => {
                const status = slotStatusMap[slot.id];
                const isBlocked = !!status;
                const isApproved = status === 'approved';
                const isPending = status === 'pending';
                const isSelected = selectedSlot?.id === slot.id;
                const Icon = slot.icon;

                return (
                  <div
                    key={slot.id}
                    onClick={() => {
                      if (isBlocked) {
                        setToast({
                          message: isApproved
                            ? `❌ ${slot.label} is already confirmed. Please choose another slot.`
                            : `⏳ ${slot.label} has a pending booking. Try another slot or date.`,
                          type: 'error'
                        });
                        return;
                      }
                      setSelectedSlot(slot);
                      setErrors(prev => ({ ...prev, slot: '' }));
                    }}
                    style={{
                      padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)',
                      border: `2px solid ${
                        isSelected ? 'var(--primary)' :
                        isApproved ? '#dcfce7' :
                        isPending ? '#fef3c7' :
                        errors.slot ? '#ef4444' : 'var(--border)'
                      }`,
                      background: isApproved ? '#f8fdf8' : isPending ? '#fffdf5' : 'white',
                      cursor: isBlocked ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '1rem',
                      transition: 'all 0.2s',
                      opacity: isBlocked ? 0.6 : 1,
                      boxShadow: isSelected ? '0 8px 16px rgba(59,130,246,0.1)' : 'none'
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                      backgroundColor: isBlocked ? (isApproved ? '#dcfce7' : '#fef3c7') : isSelected ? 'var(--primary-light)' : 'var(--surface)',
                      color: isBlocked ? (isApproved ? '#16a34a' : '#d97706') : isSelected ? 'var(--primary)' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={22} />
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '700', fontSize: '1rem', color: isBlocked ? 'var(--text-muted)' : 'var(--text)' }}>
                        {slot.label}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={11} /> {slot.time}
                      </p>
                      {isBlocked && (
                        <p style={{
                          fontSize: '0.72rem', fontWeight: '700', marginTop: '0.2rem',
                          color: isApproved ? '#16a34a' : '#d97706',
                          display: 'flex', alignItems: 'center', gap: '0.25rem'
                        }}>
                          {isApproved
                            ? <><Lock size={10} /> Booked by another donor</>
                            : <><Clock size={10} /> Pending approval</>
                          }
                        </p>
                      )}
                    </div>

                    {/* Badge */}
                    {isApproved ? (
                      <span style={badgeStyle('#dcfce7', '#16a34a')}>✓ Booked</span>
                    ) : isPending ? (
                      <span style={badgeStyle('#fef3c7', '#d97706')}>⏳ Pending</span>
                    ) : isSelected ? (
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: 'var(--primary)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <CheckCircle size={14} />
                      </div>
                    ) : (
                      <span style={badgeStyle('#f0fdf4', '#16a34a')}>Available</span>
                    )}
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

        {/* ── Info ────────────────────────────────────────────────────── */}
        <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.05)', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', gap: '0.75rem' }}>
          <Info size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Wait for institution approval before preparing food. Staff may contact you about dietary requirements.
          </p>
        </div>

        {/* ── Submit ──────────────────────────────────────────────────── */}
        <Button
          variant="primary"
          fullWidth
          disabled={booking || loading || allBooked}
          onClick={handleBooking}
          style={{ padding: '1.25rem', fontSize: '1.05rem' }}
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

        <button
          onClick={() => navigate('/viewer/history')}
          style={{ display: 'block', width: '100%', marginTop: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'center', fontWeight: '600' }}
        >
          View My Donation History →
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// ── Style helpers ──────────────────────────────────────────────────────────
const navBtn = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '6px', cursor: 'pointer',
  color: 'var(--text)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', transition: 'all 0.15s'
};

const badgeStyle = (bg, color) => ({
  fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase',
  padding: '3px 8px', borderRadius: '999px', whiteSpace: 'nowrap',
  background: bg, color
});

export default FoodDonationView;
