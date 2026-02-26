import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Loader2, Trash2, Camera, Image, CreditCard } from 'lucide-react';
import { doc, getDoc, setDoc, addDoc, deleteDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import Input from '../components/Input';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';

const API_URL = 'http://localhost:3001';

const ResidentFormView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = id && id !== 'new';
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const profileFileRef = useRef(null);
  const profileCameraRef = useRef(null);

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
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    if (isEditing) loadResident();
  }, [id]);

  const loadResident = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'residents', id));
      if (snap.exists()) {
        setFormData({ profileImage: '', aadhaarImage: '', ...snap.data() });
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

  // Upload image to server
  const uploadToServer = async (file, type) => {
    const formPayload = new FormData();
    formPayload.append('image', file);
    try {
      const res = await fetch(`${API_URL}/api/upload/${type}`, {
        method: 'POST',
        body: formPayload
      });
      const data = await res.json();
      if (data.success) return data.imageUrl;
      throw new Error(data.error || 'Upload failed');
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    }
  };

  const handleImageUpload = (field, type) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      return;
    }
    setUploading(field);
    setError('');
    try {
      const imageUrl = await uploadToServer(file, type);
      setFormData(prev => ({ ...prev, [field]: imageUrl }));
    } catch (err) {
      setError('Failed to upload image. Make sure the server is running.');
    } finally {
      setUploading('');
      setShowUploadMenu(false);
      setShowProfileMenu(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEditing) {
        await setDoc(doc(db, 'residents', id), formData, { merge: true });
      } else {
        await addDoc(collection(db, 'residents'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      navigate('/residents', { replace: true });
    } catch (err) {
      setError('Failed to save. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this resident?')) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'residents', id));
      navigate('/residents');
    } catch (err) {
      setError('Failed to delete.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease-out' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>
          {isEditing ? 'Edit Resident' : 'Add New Resident'}
        </h2>
        {isEditing && (
          <button onClick={handleDelete} style={{ color: 'var(--danger)' }}>
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
          
          {/* Profile Photo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', position: 'relative' }}>
            <div 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                width: '100px', height: '100px', borderRadius: '50%',
                backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.5rem', fontWeight: '600', overflow: 'hidden',
                cursor: 'pointer', border: '3px solid var(--primary)',
                position: 'relative', transition: 'var(--transition)'
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
                background: 'rgba(0,0,0,0.5)', padding: '4px 0',
                display: 'flex', justifyContent: 'center'
              }}>
                <Camera size={16} color="white" />
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Tap to add profile photo
            </p>

            {showProfileMenu && (
              <div style={{
                position: 'absolute', top: '115px', background: 'white',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)', overflow: 'hidden', zIndex: 20, width: '200px'
              }}>
                <button type="button" onClick={() => profileCameraRef.current?.click()}
                  style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text)' }}>
                  <Camera size={18} color="var(--primary)" /> Take Photo
                </button>
                <button type="button" onClick={() => profileFileRef.current?.click()}
                  style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text)' }}>
                  <Image size={18} color="var(--success)" /> Choose from Gallery
                </button>
                {formData.profileImage && (
                  <button type="button" onClick={() => { setFormData(prev => ({ ...prev, profileImage: '' })); setShowProfileMenu(false); }}
                    style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--danger)' }}>
                    <Trash2 size={18} /> Remove Photo
                  </button>
                )}
              </div>
            )}
            <input ref={profileCameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleImageUpload('profileImage', 'profile')} />
            <input ref={profileFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload('profileImage', 'profile')} />
          </div>

          <Input id="name" label="Full Name" icon={User} placeholder="e.g. John Doe" value={formData.name} onChange={handleChange} required />
          <Input id="email" label="Email Address" icon={Mail} type="email" placeholder="john.doe@example.com" value={formData.email} onChange={handleChange} />
          <Input id="phone" label="Phone Number" icon={Phone} type="tel" placeholder="+91 99999 00000" value={formData.phone} onChange={handleChange} />
          <Input id="address" label="Address" icon={MapPin} placeholder="123 Haven Street, Cityville" value={formData.address} onChange={handleChange} />

          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Status</label>
            <select id="status" value={formData.status} onChange={handleChange}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', outline: 'none', fontSize: '1rem', fontFamily: 'var(--font-sans)', cursor: 'pointer', boxSizing: 'border-box', marginBottom: '0.75rem' }}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="discharged">Discharged</option>
              <option value="died">Died</option>
            </select>
          </div>

          {/* Aadhaar Card Upload */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>
              <CreditCard size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Aadhaar Card
            </label>

            {formData.aadhaarImage ? (
              <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
                <img src={formData.aadhaarImage} alt="Aadhaar Card" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '220px', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, aadhaarImage: '' }))}
                    style={{ background: 'rgba(0,0,0,0.6)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div onClick={() => setShowUploadMenu(!showUploadMenu)}
                  style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: '2rem 1rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', transition: 'var(--transition)', marginTop: '0.5rem' }}>
                  {uploading === 'aadhaarImage' ? (
                    <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
                  ) : (
                    <CreditCard size={32} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
                  )}
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                    {uploading === 'aadhaarImage' ? 'Uploading...' : 'Tap to upload Aadhaar Card'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.6, marginTop: '0.25rem' }}>JPG, PNG — Max 5MB</p>
                </div>
                {showUploadMenu && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', overflow: 'hidden', zIndex: 20, marginTop: '4px' }}>
                    <button type="button" onClick={() => cameraInputRef.current?.click()}
                      style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text)' }}>
                      <Camera size={20} color="var(--primary)" /> Take Photo
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text)' }}>
                      <Image size={20} color="var(--success)" /> Choose from Gallery
                    </button>
                  </div>
                )}
              </div>
            )}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleImageUpload('aadhaarImage', 'aadhaar')} />
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload('aadhaarImage', 'aadhaar')} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" fullWidth onClick={() => navigate('/residents')}>Cancel</Button>
            <Button type="submit" variant="primary" fullWidth disabled={saving || !!uploading} style={{ opacity: (saving || uploading) ? 0.7 : 1 }}>
              {saving ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
                </span>
              ) : (isEditing ? 'Update' : 'Save')}
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
