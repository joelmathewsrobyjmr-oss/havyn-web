import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, MapPin, Phone, Mail, Globe, HandHelping, Heart, ArrowLeft, Loader2, Info, Package } from 'lucide-react';
import { doc, getDoc, collection, query, onSnapshot, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import GlassCard from '../../components/GlassCard';
import Button from '../../components/Button';

const InstitutionDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [institution, setInstitution] = useState(null);
  const [supplyNeeds, setSupplyNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, userData } = useAuth(); // Need user context to get donor ID/Email

  useEffect(() => {
    const fetchInstitution = async () => {
      try {
        const docRef = doc(db, 'institutions', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setInstitution({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.error("No such institution!");
          navigate('/viewer/dashboard');
        }
      } catch (err) {
        console.error('Error fetching institution:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInstitution();

    const q = query(collection(db, 'institutions', id, 'supplyNeeds'));
    const unsub = onSnapshot(q, (snap) => {
      const allNeeds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSupplyNeeds(allNeeds.filter(n => n.status === 'open'));
    });

    return () => unsub();
  }, [id, navigate]);

  const handleAcceptNeed = async (need) => {
    if (window.confirm(`Are you sure you want to fulfill this need: "${need.title}"?`)) {
      try {
        // Mark as fulfilled
        await updateDoc(doc(db, 'institutions', id, 'supplyNeeds', need.id), {
          status: 'fulfilled',
          fulfilledAt: serverTimestamp(),
          fulfilledBy: userData?.name || user?.displayName || user?.email || 'A Donor'
        });

        // Notify the institution
        await addDoc(collection(db, 'institutions', id, 'notifications'), {
          type: 'SUPPLY_ACCEPTED',
          title: 'Supply Need Accepted!',
          message: `${userData?.name || user?.email || 'A donor'} has opted to fulfill your request for: "${need.title}".`,
          read: false,
          createdAt: serverTimestamp()
        });

        // Create the Chat session in top-level collection
        const chatRef = await addDoc(collection(db, 'chats'), {
          needId: need.id,
          needTitle: need.title,
          donorId: user.uid,
          donorName: userData?.name || user?.displayName || 'A Donor',
          donorEmail: user.email,
          institutionName: institution.name,
          institutionId: id,
          lastMessage: 'Chat initiated. Say hello!',
          lastMessageTime: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        
        // Redirect directly into the chat room
        navigate(`/viewer/messages?chatId=${chatRef.id}`);
      } catch (err) {
        console.error('Error accepting need:', err);
        alert('Something went wrong. Please try again.');
      }
    }
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
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate('/viewer/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: '600' }}
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>

        <GlassCard style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ height: '200px', background: 'linear-gradient(135deg, var(--primary), #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid white', background: 'white', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-lg)' }}>
              {institution.logo ? <img src={institution.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Building2 size={60} color="var(--primary)" />}
            </div>
          </div>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>{institution.name}</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <MapPin size={18} /> {institution.address}
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Contact Details</p>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', marginBottom: '0.5rem' }}><Phone size={16} /> {institution.phone}</p>
                {institution.email && <p style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}><Mail size={16} /> {institution.email}</p>}
              </div>
              <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Institution Info</p>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', marginBottom: '0.5rem' }}><Building2 size={16} /> Type: {institution.type || 'Non-Profit'}</p>
                {institution.website && <p style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}><Globe size={16} /> {institution.website}</p>}
              </div>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={20} color="var(--primary)" /> About this Institution
              </h3>
              <p style={{ color: 'var(--text)', lineHeight: '1.6' }}>
                {institution.about || "This institution is dedicated to providing care and support to those in need. Your contributions help them maintain a high standard of care for their residents."}
              </p>
            </div>
          </div>
        </GlassCard>

        {supplyNeeds.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Package size={24} color="var(--primary)" /> Current Supply Needs
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {supplyNeeds.map(need => (
                <GlassCard key={need.id} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                     <div style={{ 
                       width: '36px', height: '36px', borderRadius: 'var(--radius-md)', 
                       background: 'var(--primary-light)',
                       display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                     }}>
                       <Package size={18} color="var(--primary)" />
                     </div>
                     <p style={{ fontWeight: '700', fontSize: '1.05rem', margin: 0 }}>{need.title}</p>
                   </div>
                   
                   <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 1rem 0', flex: 1, lineHeight: '1.5' }}>
                     {need.description}
                   </p>
                   
                   <Button 
                     variant="primary" 
                     fullWidth 
                     onClick={() => handleAcceptNeed(need)}
                     style={{ background: '#def7ec', color: '#03543f', borderColor: '#def7ec', fontWeight: '700' }}
                   >
                     Accept & I am willing to give
                   </Button>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.25rem' }}>Ways to Help</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <GlassCard style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
              <HandHelping size={28} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Donate Food</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Book a meal slot or distribute groceries.</p>
            <Button variant="primary" fullWidth onClick={() => navigate(`/viewer/institution/${id}/food`)}>Book a Slot</Button>
          </GlassCard>

          <GlassCard style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
              <Heart size={28} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Donate Funds</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Contribution via bank transfer or UPI.</p>
            <Button variant="outline" fullWidth onClick={() => navigate(`/viewer/institution/${id}/fund`)} style={{ borderColor: '#ec4899', color: '#ec4899' }}>Contribute Now</Button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default InstitutionDetailView;
