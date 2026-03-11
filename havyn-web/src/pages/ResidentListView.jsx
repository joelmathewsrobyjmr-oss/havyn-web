import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Loader2, Download } from 'lucide-react';
import { collection, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import ResidentCard from '../components/ResidentCard';
import * as XLSX from 'xlsx';

const ResidentListView = () => {
  const navigate = useNavigate();
  const { institutionId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!institutionId) return;

    const q = query(
      collection(db, 'institutions', institutionId, 'residents'), 
      orderBy('name')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setResidents(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching residents:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [institutionId]);

  const filteredResidents = residents.filter(r => 
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const downloadCSV = () => {
    if (residents.length === 0) return;
    const header = ['ID', 'Name', 'Email', 'Phone', 'Gender', 'Status', 'Admission Date'];
    const rows = residents.map(r => [
      r.id,
      r.name || '',
      r.email || '',
      r.phone || '',
      r.gender || '',
      r.status || 'active',
      r.admissionDate || r.admission_date || ''
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = header.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Residents');
    XLSX.writeFile(wb, `residents_list_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease-out' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Institution Residents</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button 
            variant="outline" 
            style={{ padding: '10px 20px', fontSize: '0.9rem' }}
            onClick={downloadCSV}
            disabled={residents.length === 0}
          >
            <Download size={18} style={{ marginRight: '6px' }} />
            Export
          </Button>
          <Button 
            variant="primary" 
            style={{ padding: '10px 20px', fontSize: '0.9rem' }}
            onClick={() => navigate('/resident/new')}
          >
            <Plus size={18} style={{ marginRight: '6px' }} />
            Add Resident
          </Button>
        </div>
      </div>

      <Input 
        icon={Search}
        placeholder="Search by name, email or status..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ marginBottom: '1.5rem' }}
      />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <Loader2 size={36} color="var(--primary)" style={{ animation: 'spin 1.8s linear infinite' }} />
          </div>
        ) : filteredResidents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredResidents.map(resident => (
              <ResidentCard 
                key={resident.id}
                name={resident.name || 'Unnamed'}
                email={resident.email || ''}
                status={resident.status || 'active'}
                imageUrl={resident.profileImage || ''}
                onClick={() => navigate(`/resident/${resident.id}/view`)}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <div style={{ marginBottom: '1rem', opacity: 0.5 }}>
              <Search size={48} style={{ margin: '0 auto' }} />
            </div>
            {searchQuery 
              ? `No residents found matching "${searchQuery}".`
              : 'Your institution has no registered residents yet.'}
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
