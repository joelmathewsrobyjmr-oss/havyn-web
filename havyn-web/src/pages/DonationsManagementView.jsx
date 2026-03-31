import React, { useState, useEffect, useMemo } from 'react';
import {
  Utensils, Heart, Check, X, Loader2, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, Clock, User, Coffee, Moon
} from 'lucide-react';
import {
  collection, query, onSnapshot, doc, updateDoc,
  orderBy, serverTimestamp, addDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';

// ── Slot metadata ──────────────────────────────────────────────────────────
const SLOT_META = {
  breakfast: { label: 'Breakfast', icon: Coffee, time: '07:30 – 09:00 AM' },
  lunch:    { label: 'Lunch',     icon: Utensils, time: '12:30 – 02:00 PM' },
  dinner:   { label: 'Dinner',    icon: Moon, time: '07:30 – 09:00 PM' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ═══════════════════════════════════════════════════════════════════════════
const DonationsManagementView = () => {
  const { institutionId } = useAuth();
  const [activeTab, setActiveTab] = useState('food');
  const [foodDonations, setFoodDonations] = useState([]);
  const [fundDonations, setFundDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  // Calendar state
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);   // YYYY-MM-DD or null

  // ── Real-time listeners ────────────────────────────────────────────────
  useEffect(() => {
    if (!institutionId) return;

    const foodQ = query(
      collection(db, 'institutions', institutionId, 'foodDonations'),
      orderBy('createdAt', 'desc')
    );
    const unsubFood = onSnapshot(foodQ, (snap) => {
      setFoodDonations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const fundQ = query(
      collection(db, 'institutions', institutionId, 'fundDonations'),
      orderBy('createdAt', 'desc')
    );
    const unsubFund = onSnapshot(fundQ, (snap) => {
      setFundDonations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubFood(); unsubFund(); };
  }, [institutionId]);

  // ── Status update ──────────────────────────────────────────────────────
  const updateDonationStatus = async (id, newStatus, type = 'food') => {
    setProcessing(id);
    try {
      const collPath = type === 'food' ? 'foodDonations' : 'fundDonations';
      await updateDoc(doc(db, 'institutions', institutionId, collPath, id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      await addDoc(collection(db, 'activityLogs'), {
        institutionId,
        action: `${type.toUpperCase()}_DONATION_${newStatus.toUpperCase()}`,
        details: `${type} donation ${id} ${newStatus}`,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    return ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // ══════════════════════════════════════════════════════════════════════
  //  CALENDAR LOGIC
  // ══════════════════════════════════════════════════════════════════════

  // Build a map: dateStr -> [ ...bookings ] for fast lookup
  const bookingsByDate = useMemo(() => {
    const map = {};
    foodDonations.forEach(d => {
      if (!d.date) return;
      if (!map[d.date]) map[d.date] = [];
      map[d.date].push(d);
    });
    return map;
  }, [foodDonations]);

  // Build calendar grid cells
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();
    const cells = [];

    // Pad start
    for (let i = 0; i < startPad; i++) cells.push(null);
    // Actual days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const bookings = bookingsByDate[dateStr] || [];
      const approved = bookings.filter(b => b.status === 'approved');
      const pending = bookings.filter(b => b.status === 'pending');
      cells.push({ day: d, dateStr, bookings, approved, pending });
    }
    return cells;
  }, [calMonth, calYear, bookingsByDate]);

  const todayStr = new Date().toISOString().split('T')[0];

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  // Bookings for the selected day
  const selectedBookings = selectedDay ? (bookingsByDate[selectedDay] || []) : [];

  // ══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease-out' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Donation Management</h1>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'food',     icon: Utensils,     label: 'Food Bookings', color: 'var(--primary)' },
          { id: 'calendar', icon: CalendarIcon,  label: 'Calendar',      color: '#16a34a' },
          { id: 'fund',     icon: Heart,         label: 'Financial',     color: '#ec4899' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none', border: 'none', padding: '0.75rem 1.25rem',
              fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer',
              color: activeTab === tab.id ? tab.color : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? `2px solid ${tab.color}` : 'none',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'var(--transition)'
            }}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
        </div>

      // ══════════════════════════════════════════════════════════════════
      //  📅 CALENDAR TAB
      // ══════════════════════════════════════════════════════════════════
      ) : activeTab === 'calendar' ? (
        <div>
          {/* Month Navigation */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '1.5rem', padding: '0.5rem 0'
          }}>
            <button onClick={prevMonth} style={navBtnStyle}>
              <ChevronLeft size={20} />
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.01em' }}>
              {MONTH_NAMES[calMonth]} {calYear}
            </h2>
            <button onClick={nextMonth} style={navBtnStyle}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{
                textAlign: 'center', fontSize: '0.7rem', fontWeight: '800',
                textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0.5rem 0',
                letterSpacing: '0.05em'
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
            {calendarDays.map((cell, i) => {
              if (!cell) return <div key={`pad-${i}`} />;

              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDay;
              const hasApproved = cell.approved.length > 0;
              const hasPending = cell.pending.length > 0;
              const allSlotsBooked = cell.approved.length >= 3;

              let bg = 'white';
              if (isSelected) bg = 'var(--primary-light)';
              else if (allSlotsBooked) bg = '#dcfce7';
              else if (hasApproved) bg = '#f0fdf4';

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDay(cell.dateStr === selectedDay ? null : cell.dateStr)}
                  style={{
                    position: 'relative',
                    minHeight: '70px', padding: '6px',
                    borderRadius: '10px', cursor: 'pointer',
                    border: isToday ? '2px solid var(--primary)' : isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: bg,
                    transition: 'all 0.15s ease',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: isSelected ? '0 4px 12px rgba(59,130,246,0.15)' : 'none'
                  }}
                >
                  {/* Day number */}
                  <span style={{
                    fontSize: '0.85rem', fontWeight: isToday ? '800' : '600',
                    color: isToday ? 'var(--primary)' : 'var(--text)',
                  }}>
                    {cell.day}
                  </span>

                  {/* Dots */}
                  <div style={{ display: 'flex', gap: '3px', marginTop: 'auto', flexWrap: 'wrap' }}>
                    {hasApproved && (
                      <span style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: '#16a34a', display: 'inline-block'
                      }} title={`${cell.approved.length} approved`} />
                    )}
                    {hasPending && (
                      <span style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: '#f59e0b', display: 'inline-block'
                      }} title={`${cell.pending.length} pending`} />
                    )}
                  </div>

                  {/* Slot count */}
                  {cell.bookings.length > 0 && (
                    <span style={{
                      fontSize: '0.58rem', fontWeight: '700', color: hasApproved ? '#16a34a' : '#f59e0b',
                      marginTop: '2px'
                    }}>
                      {cell.approved.length}/3
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {[
              { color: '#16a34a', label: 'Approved' },
              { color: '#f59e0b', label: 'Pending' },
              { color: 'var(--primary)', label: 'Today', ring: true },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                <span style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: l.ring ? 'transparent' : l.color,
                  border: l.ring ? `2px solid ${l.color}` : 'none',
                  display: 'inline-block'
                }} />
                {l.label}
              </div>
            ))}
          </div>

          {/* ── Selected Day Detail Panel ─────────────────────────────── */}
          {selectedDay && (
            <GlassCard style={{
              marginTop: '1.5rem', padding: '1.5rem',
              borderLeft: '4px solid var(--primary)',
              animation: 'slideUp 0.25s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: '800', fontSize: '1.1rem' }}>
                  <CalendarIcon size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => setSelectedDay(null)} style={{
                  background: 'var(--surface)', border: 'none', borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px', cursor: 'pointer', color: 'var(--text-muted)'
                }}>
                  <X size={16} />
                </button>
              </div>

              {selectedBookings.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedBookings.map(bk => {
                    const meta = SLOT_META[bk.slotId] || { label: bk.slotLabel || bk.slotId, icon: Utensils, time: '' };
                    const SlotIcon = meta.icon;
                    const statusColor = bk.status === 'approved' ? '#16a34a' : bk.status === 'pending' ? '#f59e0b' : bk.status === 'cancelled' ? '#dc2626' : '#ef4444';

                    return (
                      <div key={bk.id} style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                        background: 'var(--surface)', border: '1px solid var(--border)'
                      }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          background: `${statusColor}15`, color: statusColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <SlotIcon size={18} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>{meta.label}</p>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={11} /> {meta.time}
                          </p>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <User size={11} /> {bk.userEmail}
                          </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                          <span style={{
                            fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase',
                            padding: '3px 8px', borderRadius: '999px',
                            background: bk.status === 'approved' ? '#dcfce7' : bk.status === 'pending' ? '#fef3c7' : '#fee2e2',
                            color: statusColor
                          }}>
                            {bk.status === 'approved' ? '✓ Accepted' : bk.status}
                          </span>

                          {bk.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                onClick={() => updateDonationStatus(bk.id, 'rejected')}
                                disabled={processing === bk.id}
                                style={miniBtn('#ef4444', '#fee2e2')}
                                title="Reject"
                              >
                                <X size={14} />
                              </button>
                              <button
                                onClick={() => updateDonationStatus(bk.id, 'approved')}
                                disabled={processing === bk.id}
                                style={{ ...miniBtn('#16a34a', '#dcfce7'), color: 'white', background: '#16a34a', border: 'none' }}
                                title="Approve"
                              >
                                {processing === bk.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <CalendarIcon size={32} style={{ opacity: 0.15, marginBottom: '0.75rem' }} />
                  <p style={{ fontWeight: '600' }}>No bookings for this day</p>
                </div>
              )}
            </GlassCard>
          )}
        </div>

      // ══════════════════════════════════════════════════════════════════
      //  🍽 FOOD BOOKINGS LIST TAB
      // ══════════════════════════════════════════════════════════════════
      ) : activeTab === 'food' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {foodDonations.length > 0 ? foodDonations.map(donation => (
            <GlassCard key={donation.id} style={{ padding: '1.25rem', borderLeft: `4px solid ${donation.status === 'pending' ? '#f59e0b' : donation.status === 'approved' ? 'var(--success)' : '#ef4444'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>{donation.slotLabel}</h3>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: '999px',
                      backgroundColor: donation.status === 'pending' ? '#fef3c7' : donation.status === 'approved' ? 'var(--success-light)' : '#fee2e2',
                      color: donation.status === 'pending' ? '#d97706' : donation.status === 'approved' ? 'var(--success)' : '#ef4444'
                    }}>
                      {donation.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarIcon size={14} color="var(--text-muted)" /> {donation.date}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Donor: {donation.userEmail}</p>
                </div>

                {donation.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => updateDonationStatus(donation.id, 'rejected')}
                      disabled={processing === donation.id}
                      style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #fee2e2', background: 'white', color: '#ef4444', cursor: 'pointer' }}
                      title="Reject"
                    >
                      <X size={18} />
                    </button>
                    <button
                      onClick={() => updateDonationStatus(donation.id, 'approved')}
                      disabled={processing === donation.id}
                      style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--success)', color: 'white', cursor: 'pointer' }}
                      title="Approve"
                    >
                      {processing === donation.id ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={18} />}
                    </button>
                  </div>
                )}
              </div>
            </GlassCard>
          )) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
              <Utensils size={48} style={{ opacity: 0.1, marginBottom: '1rem', margin: '0 auto' }} />
              <p>No food bookings found for your institution.</p>
            </div>
          )}
        </div>

      // ══════════════════════════════════════════════════════════════════
      //  💰 FUND DONATIONS LIST TAB
      // ══════════════════════════════════════════════════════════════════
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {fundDonations.length > 0 ? fundDonations.map(donation => (
            <GlassCard key={donation.id} style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ec4899' }}>₹{donation.amount}</h3>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: '999px',
                      backgroundColor:
                        donation.status === 'pending' ? '#fef3c7' :
                        donation.status === 'completed' || donation.status === 'approved' ? 'var(--success-light)' : '#fee2e2',
                      color:
                        donation.status === 'pending' ? '#d97706' :
                        donation.status === 'completed' || donation.status === 'approved' ? 'var(--success)' : '#ef4444'
                    }}>
                      {donation.status || 'COMPLETED'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
                    Ref: <code style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{donation.referenceNumber || 'N/A'}</code>
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>From: {donation.userEmail}</p>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(donation.createdAt)}</p>
                  {donation.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => updateDonationStatus(donation.id, 'rejected', 'fund')}
                        disabled={processing === donation.id}
                        style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid #fee2e2', background: 'white', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}
                      >Reject</button>
                      <button
                        onClick={() => updateDonationStatus(donation.id, 'approved', 'fund')}
                        disabled={processing === donation.id}
                        style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--success)', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}
                      >
                        {processing === donation.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Approve'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          )) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
              <Heart size={48} style={{ opacity: 0.1, marginBottom: '1rem', margin: '0 auto' }} />
              <p>No financial contributions recorded yet.</p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

// ── Style helpers ──────────────────────────────────────────────────────────
const navBtnStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', padding: '0.5rem', cursor: 'pointer',
  color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s'
};

const miniBtn = (color, bg) => ({
  padding: '4px 8px', borderRadius: 'var(--radius-sm)',
  border: `1px solid ${bg}`, background: bg, color,
  cursor: 'pointer', display: 'flex', alignItems: 'center',
  fontSize: '0.75rem', fontWeight: '700'
});

export default DonationsManagementView;
