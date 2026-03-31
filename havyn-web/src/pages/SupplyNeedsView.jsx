import React, { useState, useEffect } from 'react';
import { Plus, PackageOpen, PackageCheck, Loader2, Trash2, CheckCircle2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import Input from '../components/Input';

const SupplyNeedsView = () => {
  const { institutionId } = useAuth();
  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!institutionId) return;

    const q = query(
      collection(db, 'institutions', institutionId, 'supplyNeeds'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNeeds(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching supply needs:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [institutionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'institutions', institutionId, 'supplyNeeds'), {
        title: title.trim(),
        description: description.trim(),
        status: 'open',
        createdAt: serverTimestamp(),
      });
      setTitle('');
      setDescription('');
      setShowModal(false);
    } catch (err) {
      console.error('Error posting need:', err);
      alert('Failed to post supply need.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (needId) => {
    if (window.confirm('Are you sure you want to delete this need?')) {
      try {
        await deleteDoc(doc(db, 'institutions', institutionId, 'supplyNeeds', needId));
      } catch (err) {
        console.error('Error deleting need:', err);
      }
    }
  };

  const handleMarkFulfilled = async (needId) => {
    if (window.confirm('Mark this need as fulfilled? It will be removed from the public donor page.')) {
      try {
        await updateDoc(doc(db, 'institutions', institutionId, 'supplyNeeds', needId), {
          status: 'fulfilled',
          fulfilledAt: serverTimestamp(),
          fulfilledBy: 'Institution Admin (Manual)'
        });
      } catch (err) {
        console.error('Error updating need:', err);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const openNeeds = needs.filter(n => n.status === 'open');
  const fulfilledNeeds = needs.filter(n => n.status === 'fulfilled');

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: 'var(--text)' }}>Supply Needs</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Publish requests for clothes, medicine, or other physical items.</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus size={18} style={{ marginRight: '6px' }} /> Post a Need
        </Button>
      </header>

      {/* Active Needs Section */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text)' }}>
        Active Needs ({openNeeds.length})
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
        {openNeeds.length > 0 ? openNeeds.map((need) => (
          <GlassCard key={need.id} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--primary)' }}>{need.title}</h3>
              <span style={{ fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', textTransform: 'uppercase' }}>
                Open
              </span>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 1.25rem 0', flex: 1 }}>
              {need.description}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button 
                onClick={() => handleMarkFulfilled(need.id)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.6rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--success)', background: '#def7ec', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer' }}
              >
                <CheckCircle2 size={16} /> Mark Fulfilled
              </button>
              <button 
                onClick={() => handleDelete(need.id)}
                style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', background: '#fde8e8', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </GlassCard>
        )) : (
          <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
            <PackageOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.2, color: 'var(--text-muted)' }} />
            <p style={{ margin: 0, fontWeight: '600', color: 'var(--text-muted)' }}>No active needs published.</p>
          </div>
        )}
      </div>

      {/* Fulfilled Needs Section */}
      {fulfilledNeeds.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text)' }}>
            Recently Fulfilled ({fulfilledNeeds.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {fulfilledNeeds.map((need) => (
              <GlassCard key={need.id} style={{ padding: '1.25rem', opacity: 0.7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: 'var(--text)", textDecoration: "line-through' }}>{need.title}</h3>
                  <span style={{ fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: '#def7ec', color: '#03543f', textTransform: 'uppercase' }}>
                    Fulfilled
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>{need.description}</p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PackageCheck size={14} color="var(--success)" />
                  Fulfilled by {need.fulfilledBy || 'Unknown'}
                </div>
              </GlassCard>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(5, 10, 30, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '500px', background: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.3s ease-out', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Post a New Need</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text)' }}>
                  Item Title
                </label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Winter Clothes for Adult Men"
                  required
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text)' }}>
                  Detailed Description
                </label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="E.g. We urgently need 20 sets of warm clothes (jackets, sweaters) for our elderly inmates as winter approaches."
                  required
                  rows={4}
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => setShowModal(false)} type="button">
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Publishing...' : 'Publish Need'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default SupplyNeedsView;
