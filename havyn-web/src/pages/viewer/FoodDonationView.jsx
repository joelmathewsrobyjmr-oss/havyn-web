import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Coffee, Utensils, Moon, Calendar, ArrowLeft, Loader2, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import GlassCard from '../../components/GlassCard';
import Button from '../../components/Button';
import Toast from '../../components/Toast';

const slots = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee, time: '07:30 AM - 09:00 AM' },
  { id: 'lunch', label: 'Lunch', icon: Utensils, time: '12:30 PM - 02:00 PM' },
  { id: 'dinner', label: 'Dinner', icon: Moon, time: '07:30 PM - 09:00 PM' }
];

const today = new Date().toISOString().split('T')[0];

const FoodDonationView = () => {
  const { id } = useParams(); // Institution ID
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchBookedSlots();
  }, [selectedDate]);

  const fetchBookedSlots = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'institutions', id, 'foodDonations'),
        where('date', '==', selectedDate)
      );
      const snapshot = await getDocs(q);
      const booked = snapshot.docs.map(doc => doc.data().slotId);
      setBookedSlots(booked);
    } catch (err) {
      console.error('Error fetching booked slots:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!selectedDate) errs.date = 'Please select a donation date.';
    else if (selectedDate < today) errs.date = 'Date cannot be in the past.';
    if (!selectedSlot) errs.slot = 'Please choose a meal slot before submitting.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleBooking = async () => {
    if (!validate() || !user) return;
    setBooking(true);
    try {
      await addDoc(collection(db, 'institutions', id, 'foodDonations'), {
        userId: user.uid,
        userEmail: user.email,
        date: selectedDate,
        slotId: selectedSlot.id,
        slotLabel: selectedSlot.label,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Admin notification
      await addDoc(collection(db, 'institutions', id, 'notifications'), {
        type: 'FOOD_BOOKING',
        title: 'New Food Booking',
        message: `${user.email} requested a ${selectedSlot.label} slot for ${selectedDate}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      setToast({ message: `✅ ${selectedSlot.label} slot on ${selectedDate} booked! Awaiting institution approval.`, type: 'success' });
      // Reset selection for another booking
      setSelectedSlot(null);
      fetchBookedSlots();
    } catch (err) {
      console.error('Booking error:', err);
      setToast({ message: 'Failed to submit booking. Please try again.', type: 'error' });
    } finally {
      setBooking(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem 1rem' }}>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

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

        {/* Date Selector */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text)' }}>
            1. Select Distribution Date
          </label>
          <div style={{ position: 'relative' }}>
            <Calendar size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: errors.date ? '#ef4444' : 'var(--primary)' }} />
            <input 
              id="food-donation-date"
              type="date" 
              value={selectedDate}
              min={today}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null); setErrors(prev => ({ ...prev, date: '' })); }}
              style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: 'var(--radius-md)', border: `2px solid ${errors.date ? '#ef4444' : 'var(--border)'}`, background: 'white', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {errors.date && (
            <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: '600', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={14} /> {errors.date}
            </p>
          )}
        </div>

        {/* Slot Selection */}
        <div style={{ marginBottom: '2.5rem' }}>
          <label style={{ display: 'block', fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text)' }}>
            2. Choose an Available Slot
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {slots.map(slot => {
              const isBooked = bookedSlots.includes(slot.id);
              const isSelected = selectedSlot?.id === slot.id;
              const Icon = slot.icon;

              return (
                <div 
                  key={slot.id}
                  onClick={() => { if (!isBooked) { setSelectedSlot(slot); setErrors(prev => ({ ...prev, slot: '' })); } }}
                  style={{
                    padding: '1.25rem', borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${isSelected ? 'var(--primary)' : errors.slot && !isBooked ? '#ef4444' : 'var(--border)'}`,
                    background: isBooked ? 'rgba(0,0,0,0.02)' : 'white',
                    cursor: isBooked ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '1.25rem',
                    transition: 'all 0.2s ease',
                    opacity: isBooked ? 0.6 : 1,
                    boxShadow: isSelected ? '0 10px 20px rgba(59, 130, 246, 0.1)' : 'none'
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--surface)', color: isSelected ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '700', fontSize: '1.1rem', color: isBooked ? 'var(--text-muted)' : 'var(--text)' }}>{slot.label}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{slot.time}</p>
                  </div>
                  {isBooked ? (
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', background: '#fee2e2', color: '#ef4444', padding: '4px 10px', borderRadius: '999px', textTransform: 'uppercase' }}>Booked</span>
                  ) : isSelected && (
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {errors.slot && (
            <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: '600', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={14} /> {errors.slot}
            </p>
          )}
        </div>

        {/* Note/Info */}
        <div style={{ padding: '1.25rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 'var(--radius-md)', marginBottom: '2.5rem', display: 'flex', gap: '1rem' }}>
          <Info size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Wait for the institution's approval before proceeding with food preparation. You may be contacted by staff for dietary requirements.
          </p>
        </div>

        <Button 
          variant="primary" 
          fullWidth 
          disabled={booking || loading} 
          onClick={handleBooking}
          style={{ padding: '1.25rem', fontSize: '1.1rem' }}
        >
          {booking ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Processing Request...
            </span>
          ) : 'Submit Booking Request'}
        </Button>

        {/* Quick nav to history */}
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
