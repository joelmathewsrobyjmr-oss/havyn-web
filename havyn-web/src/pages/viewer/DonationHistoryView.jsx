import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Utensils, Heart, ArrowLeft, Loader2, Calendar, ChevronRight } from 'lucide-react';
import { collectionGroup, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import GlassCard from '../../components/GlassCard';

const DonationHistoryView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchAllDonations();
  }, [user]);

  const fetchAllDonations = async () => {
    setLoading(true);
    try {
      // Query collectionGroup for all 'foodDonations' and 'fundDonations' by this user
      const foodQ = query(collectionGroup(db, 'foodDonations'), where('userId', '==', user.uid));
      const fundQ = query(collectionGroup(db, 'fundDonations'), where('userId', '==', user.uid));

      const [foodSnap, fundSnap] = await Promise.all([getDocs(foodQ), getDocs(fundQ)]);

      const foodList = foodSnap.docs.map(doc => ({ 
        id: doc.id, 
        type: 'food', 
        ...doc.data(),
        institutionId: doc.ref.parent.parent.id 
      }));
      
      const fundList = fundSnap.docs.map(doc => ({ 
        id: doc.id, 
        type: 'fund', 
        ...doc.data(),
        institutionId: doc.ref.parent.parent.id 
      }));

      const combined = [...foodList, ...fundList].sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      // Resolve institution names
      const instIds = [...new Set(combined.map(d => d.institutionId))];
      const instMap = {};
      
      await Promise.all(instIds.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'institutions', id));
          if (snap.exists()) instMap[id] = snap.data().name;
        } catch (e) { instMap[id] = 'Unknown Institution'; }
      }));

      setDonations(combined.map(d => ({ ...d, institutionName: instMap[d.institutionId] || 'Institution' })));
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return 'Unknown Date';
    return ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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

            return (
              <GlassCard key={donation.id} style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: 'var(--radius-md)', backgroundColor: `${color}10`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.15rem' }}>{donation.institutionName}</p>
                  <p style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
                    {isFood ? `Food: ${donation.slotLabel}` : `Fund: ₹${donation.amount}`}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={12} /> {isFood ? donation.date : formatDate(donation.createdAt)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', 
                    padding: '4px 10px', borderRadius: '999px',
                    backgroundColor: 
                      donation.status === 'completed' || donation.status === 'approved' ? 'var(--success)' : 
                      donation.status === 'pending' ? 'var(--warning)' : 
                      donation.status === 'rejected' ? 'var(--danger)' : 'rgba(0,0,0,0.05)',
                    color: 
                      donation.status === 'completed' || donation.status === 'approved' || donation.status === 'pending' || donation.status === 'rejected' ? 'white' : 'var(--text-muted)'
                  }}>
                    {donation.status}
                  </span>
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default DonationHistoryView;
