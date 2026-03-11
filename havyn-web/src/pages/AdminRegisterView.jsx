import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, User, Phone, MapPin, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import Button from '../components/Button';
import Input from '../components/Input';
import GlassCard from '../components/GlassCard';

const AdminRegisterView = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  
  const [formData, setFormData] = useState({
    institutionName: '',
    email: '',
    adminName: '',
    password: '',
    confirmPassword: '',
    contactNumber: '',
    district: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);

    try {
      // 1. Create auth user
      const userCredential = await signup(formData.email, formData.password);
      const user = userCredential.user;

      // 2. Create institution record
      const institutionId = `INST-${Date.now()}`;
      await setDoc(doc(db, 'institutions', institutionId), {
        name: formData.institutionName,
        email: formData.email,
        adminName: formData.adminName,
        contact: formData.contactNumber,
        district: formData.district,
        adminUid: user.uid,
        createdAt: new Date().toISOString()
      });

      // 3. Create user record with role
      await setDoc(doc(db, 'users', user.uid), {
        email: formData.email,
        role: 'admin',
        institutionId: institutionId,
        createdAt: new Date().toISOString()
      });

      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--surface) 100%)',
        position: 'relative'
      }}
    >
      <button 
        onClick={() => navigate('/role')}
        style={{ position: 'absolute', top: '2rem', left: '2rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <ArrowLeft size={24} />
      </button>

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>HAYVN</h1>
        <h2 style={{ fontSize: '1.50rem', color: 'var(--text)', marginBottom: '0.5rem' }}>Admin Registration</h2>
        <p style={{ color: 'var(--text-muted)' }}>Register your institution to get started</p>
      </div>

      <GlassCard style={{ width: '100%', maxWidth: '600px', padding: '2.5rem' }}>
        <form onSubmit={handleSubmit} className="mobile-1-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          
          {error && (
            <div style={{
              gridColumn: '1 / -1',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#fef2f2',
              color: 'var(--danger)',
              fontSize: '0.875rem',
              border: '1px solid #fecaca'
            }}>
              {error}
            </div>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <Input 
              id="institutionName"
              label="Institution Name"
              placeholder="e.g. Hope Orphanage"
              icon={Building2}
              value={formData.institutionName}
              onChange={handleChange}
              required
            />
          </div>

          <Input 
            id="adminName"
            label="Admin Full Name"
            placeholder="John Doe"
            icon={User}
            value={formData.adminName}
            onChange={handleChange}
            required
          />

          <Input 
            id="email"
            label="Email Address"
            type="email"
            placeholder="admin@institution.com"
            icon={Mail}
            value={formData.email}
            onChange={handleChange}
            required
          />

          <Input 
            id="contactNumber"
            label="Contact Number"
            placeholder="+91 9876543210"
            icon={Phone}
            value={formData.contactNumber}
            onChange={handleChange}
            required
          />

          <Input 
            id="district"
            label="District"
            placeholder="e.g. Ernakulam"
            icon={MapPin}
            value={formData.district}
            onChange={handleChange}
            required
          />

          <Input 
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            value={formData.password}
            onChange={handleChange}
            required
          />

          <Input 
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Creating Account...
                </span>
              ) : 'Register Institution'}
            </Button>
          </div>

          <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Already registered?{' '}
              <button 
                type="button"
                onClick={() => navigate('/login?role=admin')}
                style={{ color: 'var(--primary)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Log In
              </button>
            </p>
          </div>
        </form>
      </GlassCard>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminRegisterView;
