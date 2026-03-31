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

  // Group institutions by the 14 districts
  const sections = KERALA_DISTRICTS.map(dist => {
    const matching = institutions.filter(inst => {
      const isThisDistrict = (inst.district || '').toLowerCase() === dist.toLowerCase();
      const matchesSearch =
        (inst.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inst.address || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inst.district || '').toLowerCase().includes(searchQuery.toLowerCase());
      return isThisDistrict && matchesSearch;
    });
    return { district: dist, institutions: matching };
  });

  // Also gather any "Other" institutions that don't match the standard 14 precisely, 
  // just in case data was entered incorrectly, so they aren't completely hidden.
  const knownDistrictsLower = KERALA_DISTRICTS.map(d => d.toLowerCase());
  const otherInstitutions = institutions.filter(inst => {
    const isOther = !knownDistrictsLower.includes((inst.district || '').toLowerCase());
    const matchesSearch =
      (inst.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inst.address || '').toLowerCase().includes(searchQuery.toLowerCase());
    return isOther && matchesSearch;
  });
  
  if (otherInstitutions.length > 0) {
    sections.push({ district: 'Other / Unspecified', institutions: otherInstitutions });
  }

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
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '0.75rem' }}>Find an Institution</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Discover care homes and non-profits registered across Kerala.</p>
        </header>

        <Input
          icon={Search}
          placeholder="Search institutions by name or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginBottom: '2.5rem', padding: '1.25rem' }}
        />

        {/* ── District Sections Vertical Layout ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
          {sections.map(({ district, institutions: distInsts }) => {
            // Hide empty sections when user is actively searching
            if (searchQuery && distInsts.length === 0) return null;

            return (
              <section key={district} style={{ scrollMarginTop: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={22} /> {district}
                  </h2>
                  <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 12px', borderRadius: 'calc(var(--radius-md) * 2)', fontSize: '0.8rem', fontWeight: '700' }}>
                    {distInsts.length}
                  </span>
                </div>

                {distInsts.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                    {distInsts.map(inst => (
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
                  <GlassCard style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--border)', background: 'transparent', boxShadow: 'none' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No institutions registered in {district} yet.</p>
                  </GlassCard>
                )}
              </section>
            );
          })}

          {/* If search yields absolutely nothing */}
          {searchQuery && sections.every(s => s.institutions.length === 0) && (
             <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
               <Building2 size={56} style={{ opacity: 0.15, marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
               <p style={{ fontWeight: '600' }}>No institutions found matching "{searchQuery}"</p>
             </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default InstitutionListView;
