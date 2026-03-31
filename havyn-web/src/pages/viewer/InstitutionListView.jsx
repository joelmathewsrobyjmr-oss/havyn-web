import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Phone, Building2, ArrowRight, Loader2 } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import GlassCard from '../../components/GlassCard';
import Input from '../../components/Input';
import Button from '../../components/Button';

const InstitutionListView = () => {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
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

  // Build district list dynamically from actual data + sort alphabetically
  const dynamicDistricts = [
    'All Districts',
    ...Array.from(new Set(
      institutions
        .map(inst => inst.district || '')
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b))
  ];

  // Case-insensitive district filter so "Kannur" matches "kannur" etc.
  const filtered = institutions.filter(inst => {
    const matchesSearch =
      (inst.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inst.address || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inst.district || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDistrict =
      selectedDistrict === 'All Districts' ||
      (inst.district || '').toLowerCase() === selectedDistrict.toLowerCase();

    return matchesSearch && matchesDistrict;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background)' }}>
        <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '0.5rem' }}>Find an Institution</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Discover care homes and non-profits seeking support near you.</p>
        </header>

        <Input
          icon={Search}
          placeholder="Search by name, location or district..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginBottom: '1.5rem' }}
        />

        {/* ── Two-column layout: district sidebar + institution list ── */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>

          {/* District Filter — Vertical */}
          <GlassCard style={{ padding: '1.25rem', minWidth: '190px', maxWidth: '210px', flexShrink: 0, position: 'sticky', top: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <MapPin size={13} /> District
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {dynamicDistricts.map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDistrict(d)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    fontWeight: selectedDistrict === d ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: selectedDistrict === d ? 'var(--primary)' : 'transparent',
                    color: selectedDistrict === d ? 'white' : 'var(--text)',
                    border: 'none',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: 'inherit'
                  }}
                >
                  <span>{d}</span>
                  {selectedDistrict === d && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
            {selectedDistrict !== 'All Districts' && (
              <button
                onClick={() => setSelectedDistrict('All Districts')}
                style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', width: '100%', textAlign: 'center', fontFamily: 'inherit' }}
              >
                ✕ Clear filter
              </button>
            )}
          </GlassCard>

          {/* Institution List */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Count badge */}
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              {filtered.length} institution{filtered.length !== 1 ? 's' : ''} found
              {selectedDistrict !== 'All Districts' ? ` in ${selectedDistrict}` : ''}
            </p>

            {filtered.length > 0 ? filtered.map(inst => (
              <GlassCard
                key={inst.id}
                style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', transition: 'transform 0.2s' }}
                className="hover:scale-[1.01]"
              >
                <div style={{ width: '72px', height: '72px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {inst.logo
                    ? <img src={inst.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Building2 size={36} />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.name}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {inst.district && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MapPin size={12} /> {inst.district}
                      </p>
                    )}
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={12} /> {inst.address || 'Address not listed'}
                    </p>
                    {inst.phone && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Phone size={12} /> {inst.phone}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={() => navigate(`/viewer/institution/${inst.id}`)}
                  style={{ height: 'fit-content', flexShrink: 0 }}
                >
                  View <ArrowRight size={16} style={{ marginLeft: '6px' }} />
                </Button>
              </GlassCard>
            )) : (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                <Building2 size={56} style={{ opacity: 0.15, marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                <p style={{ fontWeight: '600' }}>No institutions found</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {selectedDistrict !== 'All Districts'
                    ? `No institutions registered in ${selectedDistrict} yet.`
                    : 'Try adjusting your search.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default InstitutionListView;
