import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import Button from '../components/Button';
import Input from '../components/Input';
import GlassCard from '../components/GlassCard';

const ViewerLoginView = () => {
  const navigate = useNavigate();
  const { login, signup, user, role, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Safe redirect based on loaded user & role
  React.useEffect(() => {
    // Only redirect if auth isn't in a mid-load state
    if (user && role && !authLoading) {
      if (role === 'viewer') {
        navigate('/viewer/dashboard');
      } else if (role === 'admin') {
        navigate('/dashboard');
      }
    }
  }, [user, role, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        const userCredential = await signup(email, password);
        const user = userCredential.user;
        
        // Create viewer record in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          email: email,
          role: 'viewer',
          createdAt: new Date().toISOString()
        });
        
        // Navigation is handled by the useEffect above
      } else {
        await login(email, password);
        // Navigation is handled by the useEffect above
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Authentication failed');
      setLoading(false); // only stop loading on error, let effect handle success redirect
    }
  };


  // Show a spinner while Firebase is resolving the current auth session
  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #e8f5ff 0%, #f0f4ff 100%)' }}>
        <div style={{ width: '44px', height: '44px', border: '4px solid #e0e0e0', borderTopColor: '#5ccbf4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

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
        <h2 style={{ fontSize: '1.50rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
          {isSignup ? 'Create Viewer Account' : 'Donor Login'}
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          {isSignup ? 'Join us to support institutions' : 'Welcome back, donor'}
        </p>
      </div>

      <GlassCard style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {error && (
            <div style={{
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

          <Input 
            id="email"
            label="Email Address"
            type="email"
            placeholder="donor@example.com"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input 
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" fullWidth disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                {isSignup ? 'Creating Account...' : 'Logging In...'}
              </span>
            ) : (isSignup ? 'Sign Up' : 'Log In')}
          </Button>

          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <button 
              type="button"
              onClick={() => { setIsSignup(!isSignup); setError(''); }}
              style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {isSignup ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
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

export default ViewerLoginView;
