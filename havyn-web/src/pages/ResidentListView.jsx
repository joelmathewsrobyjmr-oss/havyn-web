import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Loader2, Download } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
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

  const filteredResidents = residents
    .filter(r => 
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.status || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aDeceased = a.status === 'died' || a.status === 'deceased';
      const bDeceased = b.status === 'died' || b.status === 'deceased';
      if (aDeceased && !bDeceased) return 1;
      if (!aDeceased && bDeceased) return -1;
      return (a.name || '').localeCompare(b.name || '');
    });

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
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Institution Residents</h2>
        <Button 
          variant="primary" 
          style={{ padding: '14px 28px', fontSize: '1rem', fontWeight: '700', boxShadow: '0 6px 18px rgba(92,203,244,0.35)', letterSpacing: '0.02em' }}
          onClick={() => navigate('/resident/new')}
        >
          <Plus size={20} style={{ marginRight: '8px' }} />
          Add Resident
        </Button>
      </div>

      <Input 
        icon={Search}
        placeholder="Search by name, email or status..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ marginBottom: '1.5rem' }}
      />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '1rem' }}>
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
                status={resident.status === 'died' ? 'deceased' : (resident.status || 'active')}
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

      {/* Export button — footer, centered, outline only (stroke, no fill) */}
      <div style={{ paddingTop: '1.25rem', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={downloadCSV}
          disabled={residents.length === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 28px',
            fontSize: '0.95rem', fontWeight: '700',
            color: residents.length === 0 ? 'var(--text-muted)' : 'var(--primary)',
            background: 'transparent',
            border: `2px solid ${residents.length === 0 ? 'var(--border)' : 'var(--primary)'}`,
            borderRadius: 'var(--radius-md)',
            cursor: residents.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: residents.length === 0 ? 0.5 : 1
          }}
        >
          <Download size={18} />
          Export to Excel
        </button>
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
