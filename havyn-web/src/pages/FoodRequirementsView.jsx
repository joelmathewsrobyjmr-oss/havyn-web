import React, { useState, useEffect } from 'react';
import { Utensils, Plus, Trash2, Edit3, Loader2, Save, X, AlertCircle, ShoppingBag } from 'lucide-react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import Input from '../components/Input';

const FoodRequirementsView = () => {
  const { institutionId } = useAuth();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    item: '',
    quantity: '',
    urgency: 'medium',
    category: 'Grains'
  });
  const [saving, setSaving] = useState(false);

  const categories = ['Grains', 'Vegetables', 'Fruits', 'Dairy', 'Protein', 'Sanitation', 'Other'];

  useEffect(() => {
    if (!institutionId) return;

    const q = query(
      collection(db, 'institutions', institutionId, 'foodRequirements'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setRequirements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [institutionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item || !formData.quantity) return;

    setSaving(true);
    try {
      if (editingId) {
        const docRef = doc(db, 'institutions', institutionId, 'foodRequirements', editingId);
        await updateDoc(docRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'institutions', institutionId, 'foodRequirements'), {
          ...formData,
          institutionId,
          createdAt: serverTimestamp()
        });
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Failed to save requirement.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (req) => {
    setFormData({
      item: req.item,
      quantity: req.quantity,
      urgency: req.urgency,
      category: req.category
    });
    setEditingId(req.id);
    setIsAdding(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this requirement?')) return;
    try {
      await deleteDoc(doc(db, 'institutions', institutionId, 'foodRequirements', id));
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({ item: '', quantity: '', urgency: 'medium', category: 'Grains' });
    setEditingId(null);
    setIsAdding(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '10rem 0' }}>
      <Loader2 size={48} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShoppingBag size={28} color="var(--primary)" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Supply Requirements</h1>
        </div>
        {!isAdding && (
          <Button variant="primary" onClick={() => setIsAdding(true)}>
            <Plus size={18} style={{ marginRight: '6px' }} /> Post Requirement
          </Button>
        )}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '600px' }}>
        List the items your institution currently needs. These will be visible to potential donors on your profile page.
      </p>

      {isAdding && (
        <GlassCard style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>
              {editingId ? 'Edit Requirement' : 'Add New Requirement'}
            </h3>
            <button onClick={resetForm} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>Item Name</label>
              <Input 
                placeholder="e.g. Basmati Rice" 
                value={formData.item}
                onChange={(e) => setFormData(p => ({ ...p, item: e.target.value }))}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>Quantity Needed</label>
              <Input 
                placeholder="e.g. 25 kg / 10 Litres" 
                value={formData.quantity}
                onChange={(e) => setFormData(p => ({ ...p, quantity: e.target.value }))}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>Category</label>
              <select 
                style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white' }}
                value={formData.category}
                onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>Urgency Level</label>
              <select 
                style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white' }}
                value={formData.urgency}
                onChange={(e) => setFormData(p => ({ ...p, urgency: e.target.value }))}
              >
                <option value="low">Low - Future need</option>
                <option value="medium">Medium - Running low</option>
                <option value="high">High - Urgent requirement</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <Button type="submit" variant="primary" fullWidth disabled={saving}>
                {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><Save size={18} style={{ marginRight: '8px' }} /> {editingId ? 'Update' : 'Post'} Requirement</>}
              </Button>
              <Button type="button" variant="outline" fullWidth onClick={resetForm}>Cancel</Button>
            </div>
          </form>
        </GlassCard>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {requirements.length > 0 ? requirements.map(req => (
          <GlassCard key={req.id} style={{ padding: '1.5rem', borderLeft: `5px solid ${req.urgency === 'high' ? 'var(--danger)' : req.urgency === 'medium' ? 'var(--primary)' : 'var(--success)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span style={{ 
                  fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', 
                  padding: '2px 8px', borderRadius: '999px',
                  backgroundColor: 'var(--surface)', color: 'var(--text-muted)'
                }}>
                  {req.category}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginTop: '0.5rem' }}>{req.item}</h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleEdit(req)} style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDelete(req.id)} style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', background: 'none', border: '1px solid var(--border)', color: 'var(--danger)', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Quantity</p>
                <p style={{ fontWeight: '700', fontSize: '1rem' }}>{req.quantity}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Urgency</p>
                <p style={{ 
                  fontWeight: '700', fontSize: '0.85rem', 
                  color: req.urgency === 'high' ? 'var(--danger)' : req.urgency === 'medium' ? 'var(--primary)' : 'var(--success)',
                  textTransform: 'uppercase'
                }}>
                  {req.urgency}
                </p>
              </div>
            </div>
          </GlassCard>
        )) : !isAdding && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem 0', background: 'var(--surface)', borderRadius: 'var(--radius-lg)' }}>
            <Utensils size={48} style={{ opacity: 0.1, marginBottom: '1rem', margin: '0 auto' }} />
            <p style={{ color: 'var(--text-muted)' }}>No requirements posted yet.</p>
            <Button variant="outline" style={{ marginTop: '1rem' }} onClick={() => setIsAdding(true)}>Create Your First Requirement</Button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default FoodRequirementsView;
