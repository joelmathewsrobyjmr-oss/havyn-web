import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Phone, Building2, ArrowRight, Loader2, Globe } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import GlassCard from '../../components/GlassCard';
import Input from '../../components/Input';
import Button from '../../components/Button';

const InstitutionListView = () => {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const q = query(collection(db, 'institutions'), orderBy('name'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInstitutions(list);
      } catch (err) {
        console.error('Error fetching institutions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInstitutions();
  }, []);

  const filtered = institutions.filter(inst => 
    inst.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background)' }}>
        <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '0.75rem' }}>Find an Institution</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Discover care homes and non-profits seeking support near you.</p>
        </header>

        <Input 
          icon={Search}
          placeholder="Search by name, location, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginBottom: '2rem', padding: '1.25rem' }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
          {filtered.length > 0 ? filtered.map(inst => (
            <GlassCard key={inst.id} style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', transition: 'transform 0.2s' }} className="hover:scale-[1.01]">
              <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {inst.logo ? <img src={inst.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Building2 size={40} />}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>{inst.name}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} /> {inst.address || 'Location hidden'}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={14} /> {inst.phone || 'Phone hidden'}
                  </p>
                </div>
              </div>
              <Button 
                variant="primary" 
                onClick={() => navigate(`/viewer/institution/${inst.id}`)}
                style={{ height: 'fit-content' }}
              >
                View Needs <ArrowRight size={18} style={{ marginLeft: '8px' }} />
              </Button>
            </GlassCard>
          )) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
              <Building2 size={64} style={{ opacity: 0.1, marginBottom: '1.5rem', margin: '0 auto' }} />
              <p>No institutions found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default InstitutionListView;
