import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Loader2 } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import Input from '../components/Input';
import Button from '../components/Button';
import ResidentCard from '../components/ResidentCard';

const ResidentListView = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchResidents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'residents'), orderBy('name'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setResidents(data);
    } catch (err) {
      console.error('Error fetching residents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, []);

  const filteredResidents = residents.filter(r => 
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resident?')) return;
    try {
      await deleteDoc(doc(db, 'residents', id));
      setResidents(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error deleting resident:', err);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease-out' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>Residents</h2>
        <Button 
          variant="primary" 
          style={{ padding: '8px 16px', fontSize: '0.875rem' }}
          onClick={() => navigate('/resident/new')}
        >
          <Plus size={16} style={{ marginRight: '4px' }} />
          Add New
        </Button>
      </div>

      <Input 
        icon={Search}
        placeholder="Search residents by name or email..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filteredResidents.length > 0 ? (
          filteredResidents.map(resident => (
            <ResidentCard 
              key={resident.id}
              name={resident.name || 'Unnamed'}
              email={resident.email || ''}
              status={resident.status || 'active'}
              imageUrl={resident.profileImage || ''}
              onClick={() => navigate(`/resident/${resident.id}`)}
            />
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            {searchQuery 
              ? `No residents found matching "${searchQuery}".`
              : 'No residents yet. Click "Add New" to create one.'}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ResidentListView;
