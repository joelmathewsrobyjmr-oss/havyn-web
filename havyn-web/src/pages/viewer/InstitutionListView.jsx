import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Phone, Building2, ArrowRight, Loader2 } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import GlassCard from '../../components/GlassCard';
import Input from '../../components/Input';
import Button from '../../components/Button';

const KERALA_DISTRICTS = [
  'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 
  'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 
  'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'
];

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

  // Filter institutions based on search query and selected district
  const filteredInstitutions = institutions.filter(inst => {
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

  const sidebarDistricts = ['All Districts', ...KERALA_DISTRICTS];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '0.5rem' }}>Find an Institution</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Discover care homes and non-profits registered across Kerala.</p>
        </header>

        <Input
          icon={Search}
          placeholder="Search institutions by name or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginBottom: '1.5rem' }}
        />

        {/* ── Two-column layout: district sidebar + filtered institution list ── */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>

          {/* Left Side: District Filter Vertical Sidebar */}
          <GlassCard style={{ padding: '1.25rem', minWidth: '220px', maxWidth: '240px', flexShrink: 0, position: 'sticky', top: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <MapPin size={13} /> Districts
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {sidebarDistricts.map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDistrict(d)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.9rem',
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
          </GlassCard>

          {/* Right Side: Institution List */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text)' }}>
                {selectedDistrict}
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', background: 'var(--surface)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                {filteredInstitutions.length} Result{filteredInstitutions.length !== 1 ? 's' : ''}
              </span>
            </div>

            {filteredInstitutions.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                {filteredInstitutions.map(inst => (
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
                ))}
              </div>
            ) : (
              <GlassCard style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={56} style={{ opacity: 0.15, marginBottom: '1rem' }} />
                <p style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.25rem' }}>No institutions found</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {selectedDistrict !== 'All Districts' 
                    ? `There are no institutions registered in ${selectedDistrict} yet.` 
                    : 'Try adjusting your search query.'}
                </p>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default InstitutionListView;
