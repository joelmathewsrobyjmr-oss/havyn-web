import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Loader2, Trash2, Camera, Image, CreditCard } from 'lucide-react';
import { doc, getDoc, setDoc, addDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';

const ResidentFormView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { institutionId, user } = useAuth();
  const isEditing = id && id !== 'new';
  const profileFileRef = useRef(null);
  const profileCameraRef = useRef(null);
  const aadhaarFileRef = useRef(null);
  const aadhaarCameraRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
    profileImage: '',
    aadhaarImage: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const [showAadhaarMenu, setShowAadhaarMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Pending files to upload after getting resident ID (for new residents)
  const [pendingFiles, setPendingFiles] = useState({ profile: null, aadhaar: null });

  useEffect(() => {
    if (isEditing && institutionId) loadResident();
  }, [id, institutionId]);

  const loadResident = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'institutions', institutionId, 'residents', id));
      if (snap.exists()) {
        setFormData(snap.data());
      } else {
        setError('Resident not found.');
      }
    } catch (err) {
      setError('Failed to load resident data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { id: fieldId, value } = e.target;
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const uploadFile = async (file, path) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleImageUpload = (field, type) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB.');
      return;
    }
    setError('');

    if (isEditing) {
      setUploading(field);
      try {
        const path = `institutions/${institutionId}/residents/${id}/${type}_${Date.now()}`;
        const imageUrl = await uploadFile(file, path);
        
        // Update Firestore immediately for existing resident
        await setDoc(doc(db, 'institutions', institutionId, 'residents', id), { [field]: imageUrl }, { merge: true });
        setFormData(prev => ({ ...prev, [field]: imageUrl }));
      } catch (err) {
        setError('Failed to upload image.');
        console.error(err);
      } finally {
        setUploading('');
        setShowAadhaarMenu(false);
        setShowProfileMenu(false);
      }
    } else {
      // New resident: store file locally for uploading during save
      setPendingFiles(prev => ({ ...prev, [type]: file }));
      // Show preview
      const reader = new FileReader();
      reader.onload = (ev) => setFormData(prev => ({ ...prev, [field]: ev.target.result }));
      reader.readAsDataURL(file);
      setShowAadhaarMenu(false);
      setShowProfileMenu(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!institutionId) return setError('Institution ID not found');
    
    setSaving(true);
    setError('');
    
    try {
      let residentId = id;
      const finalData = { ...formData };

      if (isEditing) {
        await setDoc(doc(db, 'institutions', institutionId, 'residents', id), {
          ...finalData,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid
        }, { merge: true });
        
        // Log activity
        await addDoc(collection(db, 'activityLogs'), {
          institutionId,
          userId: user.uid,
          action: 'UPDATE_RESIDENT',
          residentId: id,
          timestamp: serverTimestamp()
        });
      } else {
        // Prepare data (clear base64 previews)
        if (finalData.profileImage?.startsWith('data:')) finalData.profileImage = '';
        if (finalData.aadhaarImage?.startsWith('data:')) finalData.aadhaarImage = '';

        // Add to Firestore
        const docRef = await addDoc(collection(db, 'institutions', institutionId, 'residents'), {
          ...finalData,
          createdAt: serverTimestamp(),
          createdBy: user.uid
        });
        residentId = docRef.id;

        // Upload pending files
        const updates = {};
        if (pendingFiles.profile) {
          const path = `institutions/${institutionId}/residents/${residentId}/profile_${Date.now()}`;
          updates.profileImage = await uploadFile(pendingFiles.profile, path);
        }
        if (pendingFiles.aadhaar) {
          const path = `institutions/${institutionId}/residents/${residentId}/aadhaar_${Date.now()}`;
          updates.aadhaarImage = await uploadFile(pendingFiles.aadhaar, path);
        }

        if (Object.keys(updates).length > 0) {
          await setDoc(doc(db, 'institutions', institutionId, 'residents', residentId), updates, { merge: true });
        }

        // Log activity
        await addDoc(collection(db, 'activityLogs'), {
          institutionId,
          userId: user.uid,
          action: 'CREATE_RESIDENT',
          residentId: residentId,
          timestamp: serverTimestamp()
        });
      }
      navigate('/residents');
    } catch (err) {
      setError('Failed to save resident.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this resident? All data and photos will be permanently removed.')) return;
    
    setSaving(true);
    try {
      // 1. Delete Firestore record
      await deleteDoc(doc(db, 'institutions', institutionId, 'residents', id));
      
      // 2. Log activity
      await addDoc(collection(db, 'activityLogs'), {
        institutionId,
        userId: user.uid,
        action: 'DELETE_RESIDENT',
        residentId: id,
        timestamp: serverTimestamp()
      });

      navigate('/residents');
    } catch (err) {
      setError('Failed to delete resident.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease-out' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>
          {isEditing ? 'Edit Resident Profile' : 'Register New Resident'}
        </h2>
        {isEditing && (
          <button onClick={handleDelete} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
          backgroundColor: '#fef2f2', color: 'var(--danger)',
          fontSize: '0.875rem', border: '1px solid #fecaca', marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      <GlassCard>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          
          {/* Profile Photo Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', position: 'relative' }}>
            <div 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                width: '110px', height: '110px', borderRadius: '50%',
                backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.5rem', fontWeight: '600', overflow: 'hidden',
                cursor: 'pointer', border: '3px solid var(--primary)',
                position: 'relative', transition: 'var(--transition)',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              {uploading === 'profileImage' ? (
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
              ) : formData.profileImage ? (
                <img src={formData.profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                formData.name ? formData.name.charAt(0).toUpperCase() : <User size={40} />
              )}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(0,0,0,0.6)', padding: '6px 0',
                display: 'flex', justifyContent: 'center', backdropFilter: 'blur(4px)'
              }}>
                <Camera size={16} color="white" />
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontWeight: '500' }}>
              Profile Photo
            </p>

            {showProfileMenu && (
              <div style={{
                position: 'absolute', top: '125px', background: 'white',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)', overflow: 'hidden', zIndex: 20, width: '220px'
              }}>
                <button type="button" onClick={() => profileCameraRef.current?.click()}
                  style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text)' }}
                  className="hover:bg-gray-50 transition">
                  <Camera size={18} color="var(--primary)" /> Take Photo
                </button>
                <button type="button" onClick={() => profileFileRef.current?.click()}
                  style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text)' }}
                  className="hover:bg-gray-50 transition">
                  <Image size={18} color="var(--success)" /> Choose from Gallery
                </button>
                {formData.profileImage && (
                  <button type="button" onClick={() => { setFormData(prev => ({ ...prev, profileImage: '' })); setShowProfileMenu(false); }}
                    style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--danger)' }}
                    className="hover:bg-red-50 transition">
                    <Trash2 size={18} /> Remove Photo
                  </button>
                )}
              </div>
            )}
            <input ref={profileCameraRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handleImageUpload('profileImage', 'profile')} />
            <input ref={profileFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload('profileImage', 'profile')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <Input id="name" label="Full Name" icon={User} placeholder="e.g. John Doe" value={formData.name} onChange={handleChange} required />
            <Input id="email" label="Email Address (Optional)" icon={Mail} type="email" placeholder="john.doe@example.com" value={formData.email} onChange={handleChange} />
            <Input id="phone" label="Phone Number" icon={Phone} type="tel" placeholder="+91 99999 00000" value={formData.phone} onChange={handleChange} />
            <Input id="address" label="Home Address" icon={MapPin} placeholder="123 Haven Street, Cityville" value={formData.address} onChange={handleChange} />
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Resident Status</label>
            <select id="status" value={formData.status} onChange={handleChange}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', outline: 'none', fontSize: '1rem', fontFamily: 'inherit', cursor: 'pointer', boxSizing: 'border-box', marginBottom: '1rem' }}>
              <option value="active">Active (Currently Living)</option>
              <option value="inactive">Inactive</option>
              <option value="discharged">Discharged</option>
              <option value="died">Deceased</option>
            </select>
          </div>

          {/* Aadhaar Photo Section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'block' }}>
              <CreditCard size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Aadhaar/Identity Card
            </label>

            {formData.aadhaarImage ? (
              <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', marginTop: '0.5rem', boxShadow: 'var(--shadow-sm)' }}>
                <img src={formData.aadhaarImage} alt="Identity Card" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '250px', objectFit: 'contain', background: '#f8fafc' }} />
                <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, aadhaarImage: '' }))}
                    style={{ background: 'rgba(220, 38, 38, 0.9)', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div onClick={() => setShowAadhaarMenu(!showAadhaarMenu)}
                  style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '2.5rem 1rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', transition: 'var(--transition)', marginTop: '0.5rem' }}
                  className="hover:bg-white/20">
                  {uploading === 'aadhaarImage' ? (
                    <Loader2 size={36} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
                  ) : (
                    <Camera size={36} color="var(--text-muted)" style={{ marginBottom: '0.75rem', opacity: 0.6 }} />
                  )}
                  <p style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '500', margin: 0 }}>
                    {uploading === 'aadhaarImage' ? 'Uploading...' : 'Tap to upload ID document'}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', opacity: 0.5, marginTop: '0.5rem' }}>Front-side photo of Aadhaar Card (Max 10MB)</p>
                </div>
                {showAadhaarMenu && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', overflow: 'hidden', zIndex: 20, marginTop: '8px' }}>
                    <button type="button" onClick={() => aadhaarCameraRef.current?.click()}
                      style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text)' }}
                      className="hover:bg-gray-50 transition">
                      <Camera size={20} color="var(--primary)" /> Take Photo
                    </button>
                    <button type="button" onClick={() => aadhaarFileRef.current?.click()}
                      style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text)' }}
                      className="hover:bg-gray-50 transition">
                      <Image size={20} color="var(--success)" /> Choose from Gallery
                    </button>
                  </div>
                )}
              </div>
            )}
            <input ref={aadhaarCameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleImageUpload('aadhaarImage', 'aadhaar')} />
            <input ref={aadhaarFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload('aadhaarImage', 'aadhaar')} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="outline" fullWidth onClick={() => navigate('/residents')}>Discard</Button>
            <Button type="submit" variant="primary" fullWidth disabled={saving || !!uploading} style={{ opacity: (saving || uploading) ? 0.7 : 1 }}>
              {saving ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...
                </span>
              ) : (isEditing ? 'Update Profile' : 'Save Resident')}
            </Button>
          </div>
        </form>
      </GlassCard>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ResidentFormView;
