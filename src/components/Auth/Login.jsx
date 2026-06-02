import { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { loginWithEmail, signUpWithEmail, loginWithGoogle, loginWithGoogleRedirect, getGoogleRedirectResult, resetPassword } from '../../firebase/auth';

const inputStyle = (theme, error) => ({
  width: '100%',
  padding: '14px 16px 14px 42px',
  fontSize: '15px',
  border: `2px solid ${error ? '#ef4444' : (theme === 'premium' ? 'rgba(139, 92, 246, 0.3)' : '#d1d5db')}`,
  borderRadius: '8px',
  outline: 'none',
  background: theme === 'premium' ? 'rgba(0, 0, 0, 0.3)' : '#ffffff',
  color: theme === 'premium' ? '#f3f4f6' : '#333333',
  transition: 'all 0.2s ease',
  boxSizing: 'border-box',
});

const btnStyle = (theme, disabled) => ({
  width: '100%',
  padding: '14px',
  fontSize: '15px',
  fontWeight: 'bold',
  color: '#ffffff',
  background: disabled
    ? '#6b7280'
    : (theme === 'premium'
      ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'
      : '#337ab7'),
  border: 'none',
  borderRadius: '8px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s ease',
  opacity: disabled ? 0.6 : 1,
});

export default function Login({ theme, onSuccess }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Handle Google redirect result (when redirected back after sign-in)
  useEffect(() => {
    getGoogleRedirectResult().then((user) => {
      if (user) onSuccess?.();
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        if (!name.trim()) { setError('Please enter your name.'); setLoading(false); return; }
        await signUpWithEmail(email, password, name.trim());
      }
      onSuccess?.();
    } catch (err) {
      const msg = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
      }[err.code] || err.message;
      setError(msg);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      onSuccess?.();
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') return;
      // If popup fails (e.g. COOP policy), fall back to redirect
      setError('Popup blocked. Redirecting to Google...');
      loginWithGoogleRedirect();
    }
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!email) { setError('Enter your email first.'); return; }
    setLoading(true);
    try {
      await resetPassword(email);
      setForgotSent(true);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const cardBg = theme === 'premium' ? 'rgba(18, 14, 38, 0.85)' : '#ffffff';
  const cardBorder = theme === 'premium' ? 'rgba(139, 92, 246, 0.3)' : '#d1d5db';
  const textColor = theme === 'premium' ? '#f3f4f6' : '#333';
  const mutedColor = theme === 'premium' ? '#94a3b8' : '#666';

  if (forgotSent) {
    return (
      <div className={`app-wrapper theme-${theme}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: theme === 'premium' ? 'linear-gradient(135deg, #0a071b 0%, #0e0a25 50%, #05030f 100%)' : '#f4f3ec' }}>
        <div style={{ width: '100%', maxWidth: '420px', padding: '40px', background: cardBg, border: `2px solid ${cardBorder}`, borderRadius: '12px', textAlign: 'center' }}>
          <h2 style={{ color: textColor, marginBottom: '16px' }}>Check your inbox</h2>
          <p style={{ color: mutedColor, marginBottom: '24px' }}>A password reset link has been sent to <strong>{email}</strong></p>
          <button onClick={() => { setForgotSent(false); setMode('login'); }} style={btnStyle(theme, false)}>Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-wrapper theme-${theme}`} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
      background: theme === 'premium' ? 'linear-gradient(135deg, #0a071b 0%, #0e0a25 50%, #05030f 100%)' : '#f4f3ec',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '40px 32px', background: cardBg, border: `2px solid ${cardBorder}`, borderRadius: '12px', boxShadow: theme === 'premium' ? '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(139,92,246,0.2)' : '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/icon-512.png" alt="SSC Logo" style={{ width: '72px', height: '72px', borderRadius: '50%', marginBottom: '16px', border: `3px solid ${theme === 'premium' ? '#8b5cf6' : '#337ab7'}` }} />
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '4px', color: textColor }}>Super Mocks</h1>
          <p style={{ fontSize: '13px', color: mutedColor }}>SSC CGL Exam Simulator</p>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)}
                style={{ ...inputStyle(theme, false), paddingLeft: '16px' }} disabled={loading} />
            </div>
          )}
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: mutedColor, pointerEvents: 'none' }} />
            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)}
              style={inputStyle(theme, false)} disabled={loading} required />
          </div>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: mutedColor, pointerEvents: 'none' }} />
            <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle(theme, false), paddingRight: '40px' }} disabled={loading} required minLength={6} />
            <span onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: mutedColor }}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', marginBottom: '14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#ef4444', fontSize: '13px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading || !email || !password} style={{ ...btnStyle(theme, loading || !email || !password), marginBottom: '12px' }}>
            {loading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ position: 'relative', margin: '16px 0', textAlign: 'center' }}>
          <span style={{ background: cardBg, padding: '0 12px', color: mutedColor, fontSize: '12px', position: 'relative', zIndex: 1 }}>or continue with</span>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: theme === 'premium' ? 'rgba(139,92,246,0.2)' : '#e0e0e0' }} />
        </div>

        <button onClick={handleGoogle} disabled={loading}
          style={{
            width: '100%', padding: '12px', fontSize: '14px', fontWeight: 'bold', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: loading ? 'not-allowed' : 'pointer',
            background: theme === 'premium' ? 'rgba(255,255,255,0.05)' : '#fff',
            color: textColor, border: `2px solid ${cardBorder}`, borderRadius: '8px', opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s ease', marginBottom: '16px',
          }}>
          <span style={{ width: '20px', height: '20px' }}>
            <svg viewBox="0 0 48 48" width="20" height="20">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
          </span>
          Google
        </button>

        {mode === 'login' && (
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <button onClick={handleForgot} disabled={loading}
              style={{ background: 'none', border: 'none', color: theme === 'premium' ? '#8b5cf6' : '#337ab7', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}>
              Forgot password?
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', color: mutedColor, fontSize: '13px' }}>
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <button onClick={() => { setMode('signup'); setError(''); }} style={{ background: 'none', border: 'none', color: theme === 'premium' ? '#8b5cf6' : '#337ab7', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}>
                Sign up
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(''); }} style={{ background: 'none', border: 'none', color: theme === 'premium' ? '#8b5cf6' : '#337ab7', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
