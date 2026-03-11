import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import GlassCard from '../components/GlassCard';

const LoginView = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'admin';
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
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
    } finally {
      setLoading(false);
    }
  };

  const { resetPassword } = useAuth();
  const [resetSent, setResetSent] = useState(false);

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
    } catch (err) {
      setError('Failed to send reset email. Check if email is valid.');
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
          {isSignup ? 'Create Account' : 'Welcome Back'}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {isSignup 
            ? `Sign up for a new ${role} account` 
            : `Log in to your ${role.charAt(0).toUpperCase() + role.slice(1)} account`}
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

          {!isSignup && (
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
          )}

          {isSignup && (
            <div style={{ position: 'relative' }}>
               <Lock size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '38px', zIndex: 1 }} />
                <Input 
                  id="password"
                  label="Create Password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                  required
                />
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth style={{ marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                {isSignup ? 'Creating Account...' : 'Logging In...'}
              </span>
            ) : (
              isSignup ? 'Sign Up' : 'Log In'
            )}
          </Button>

          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <button 
              type="button"
              onClick={() => { setIsSignup(!isSignup); setError(''); }}
              style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: '500' }}
            >
              {isSignup ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
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
