import React, { useState, useEffect } from 'react';
import { Utensils, Heart, Check, X, AlertCircle, Loader2, ArrowLeft, Calendar, Search, Filter } from 'lucide-react';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

const DonationsManagementView = () => {
  const { institutionId } = useAuth();
  const [activeTab, setActiveTab] = useState('food'); // 'food' or 'fund'
  const [foodDonations, setFoodDonations] = useState([]);
  const [fundDonations, setFundDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

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

    return () => {
      unsubFood();
      unsubFund();
    };
  }, [institutionId]);

  const updateDonationStatus = async (id, newStatus, type = 'food') => {
    setProcessing(id);
    try {
      const collectionName = type === 'food' ? 'foodDonations' : 'fundDonations';
      const docRef = doc(db, 'institutions', institutionId, collectionName, id);
      await updateDoc(docRef, { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Log activity
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Donation Management</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('food')}
          style={{ 
            background: 'none', border: 'none', padding: '0.75rem 1.5rem', 
            fontSize: '1rem', fontWeight: '600', cursor: 'pointer',
            color: activeTab === 'food' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'food' ? '2px solid var(--primary)' : 'none',
            display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'var(--transition)'
          }}
        >
          <Utensils size={18} /> Food Bookings
        </button>
        <button 
          onClick={() => setActiveTab('fund')}
          style={{ 
            background: 'none', border: 'none', padding: '0.75rem 1.5rem', 
            fontSize: '1rem', fontWeight: '600', cursor: 'pointer',
            color: activeTab === 'fund' ? '#ec4899' : 'var(--text-muted)',
            borderBottom: activeTab === 'fund' ? '2px solid #ec4899' : 'none',
            display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'var(--transition)'
          }}
        >
          <Heart size={18} /> Financial Support
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
        </div>
      ) : activeTab === 'food' ? (
        /* Food Bookings List */
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
                    <Calendar size={14} color="var(--text-muted)" /> {donation.date}
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
      ) : (
        /* Fund Donations List */
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
      `}</style>
    </div>
  );
};

export default DonationsManagementView;
