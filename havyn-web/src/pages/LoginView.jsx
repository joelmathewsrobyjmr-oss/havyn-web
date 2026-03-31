import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import GlassCard from '../components/GlassCard';

const LoginView = () => {
  const [searchParams] = useSearchParams();
  const urlRole = searchParams.get('role') || 'admin';
  const navigate = useNavigate();
  const { user, role: authRole, loading: authLoading, login, resetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Safe redirect based on loaded user & role
  React.useEffect(() => {
    // Only redirect if auth isn't in a mid-load state
    if (user && authRole && !authLoading) {
      if (authRole === 'viewer') {
        navigate('/viewer/dashboard');
      } else if (authRole === 'admin') {
        navigate('/dashboard');
      }
    }
  }, [user, authRole, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Navigation is now handled exclusively by the useEffect below
    } catch (err) {
      let message = 'Something went wrong. Please try again.';
      switch (err.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Invalid email or password.';
          break;
        case 'auth/email-already-in-use':
          message = 'An account with this email already exists.';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters.';
          break;
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.';
          break;
        default:
          message = err.message;
      }
      setError(message);
      setLoading(false); // Stop loading only on error
    }
  };



  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await resetPassword(email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch {
      setError('Failed to send reset email. Check if email is valid.');
    } finally {
      setLoading(false);
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
        position: 'relative',
        animation: 'fadeIn 0.5s ease-out'
      }}
    >
      <button 
        onClick={() => navigate('/role')}
        style={{ position: 'absolute', top: '2rem', left: '2rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <ArrowLeft size={24} />
      </button>

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
          Welcome Back
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Log in to your {urlRole.charAt(0).toUpperCase() + urlRole.slice(1)} account
        </p>
      </div>

      <GlassCard style={{ width: '100%', maxWidth: '400px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
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

          {resetSent && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#f0fdf4',
              color: 'var(--success)',
              fontSize: '0.875rem',
              border: '1px solid #bbfcbd'
            }}>
              Password reset link sent to {email}.
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <Mail size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '38px', zIndex: 1 }} />
            <Input 
              id="email"
              label="Email Address"
              type="email"
              placeholder="admin@havyn.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ paddingLeft: '40px' }}
              required
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '38px', zIndex: 1 }} />
            <Input 
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '40px' }}
              required
            />
            <button 
              type="button"
              onClick={handleResetPassword}
              style={{ position: 'absolute', right: 0, top: '4px', background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Forgot Password?
            </button>
          </div>

          <Button type="submit" variant="primary" fullWidth style={{ marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Logging In...
              </span>
            ) : (
              'Log In'
            )}
          </Button>

          {urlRole === 'admin' && (
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button 
                type="button"
                onClick={() => navigate('/admin/register')}
                style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Don't have an account? Register your institution
              </button>
            </div>
          )}
        </form>
      </GlassCard>
      
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

export default LoginView;
