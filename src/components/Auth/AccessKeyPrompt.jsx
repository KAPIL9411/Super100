import { useState } from 'react';
import { AlertCircle, Lock, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SkeletonButton } from '../SkeletonLoader.jsx';

const ACCESS_KEY = import.meta.env.VITE_ACCESS_KEY;

export default function AccessKeyPrompt({ theme }) {
  const { logout, updateProfile } = useAuth();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!key.trim()) { setError('Please enter the access key.'); return; }
    if (key !== ACCESS_KEY) { setError('Invalid access key.'); setKey(''); return; }
    setLoading(true);
    try {
      await updateProfile({ accessKeyVerified: true });
    } catch (err) {
      setError('Failed to verify. Try again.');
    }
    setLoading(false);
  };

  const textColor = theme === 'premium' ? '#f3f4f6' : '#333';
  const mutedColor = theme === 'premium' ? '#94a3b8' : '#666';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px',
      background: theme === 'premium' ? 'linear-gradient(135deg, #0a071b 0%, #0e0a25 50%, #05030f 100%)' : '#f4f3ec'
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', padding: '40px 32px',
        background: theme === 'premium' ? 'rgba(18, 14, 38, 0.85)' : '#ffffff',
        border: `2px solid ${theme === 'premium' ? 'rgba(139, 92, 246, 0.3)' : '#d1d5db'}`,
        borderRadius: '12px', textAlign: 'center',
        boxShadow: theme === 'premium' ? '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(139,92,246,0.2)' : '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <img src="/ssc_logo.jpg" alt="SSC Logo" style={{
          width: '72px', height: '72px', borderRadius: '50%', marginBottom: '16px',
          border: `3px solid ${theme === 'premium' ? '#8b5cf6' : '#337ab7'}`
        }} />
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '4px', color: textColor }}>Enter Access Key</h2>
        <p style={{ fontSize: '13px', color: mutedColor, marginBottom: '24px' }}>
          This platform requires a one-time access key
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: mutedColor, pointerEvents: 'none' }} />
            <input
              type="password" placeholder="Enter access key" value={key}
              onChange={(e) => { setKey(e.target.value); setError(''); }}
              style={{
                width: '100%', padding: '14px 16px 14px 42px', fontSize: '15px',
                border: `2px solid ${error ? '#ef4444' : (theme === 'premium' ? 'rgba(139, 92, 246, 0.3)' : '#d1d5db')}`,
                borderRadius: '8px', outline: 'none', boxSizing: 'border-box',
                background: theme === 'premium' ? 'rgba(0,0,0,0.3)' : '#fff',
                color: textColor, fontFamily: 'monospace', letterSpacing: '2px', textAlign: 'center',
                transition: 'all 0.2s ease'
              }}
              autoFocus disabled={loading}
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '10px 12px', marginBottom: '14px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '6px', color: '#ef4444', fontSize: '13px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading || !key}
            style={{
              width: '100%', padding: '14px', fontSize: '15px', fontWeight: 'bold', color: '#fff',
              background: loading ? '#6b7280' : (theme === 'premium' ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' : '#337ab7'),
              border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1, transition: 'all 0.2s ease', marginBottom: '12px'
            }}
          >
            {loading ? <SkeletonButton height="20px" /> : 'Verify Access Key'}
          </button>
        </form>

        <button onClick={logout}
          style={{
            background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
            fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px',
            textDecoration: 'underline'
          }}
        >
          <LogOut size={14} /> Sign out
        </button>

        <div style={{ marginTop: '20px', padding: '12px', background: theme === 'premium' ? 'rgba(139,92,246,0.05)' : '#f8f9fa', borderRadius: '8px', border: `1px solid ${theme === 'premium' ? 'rgba(139,92,246,0.2)' : '#e0e0e0'}` }}>
          <p style={{ fontSize: '11px', color: mutedColor, margin: 0, lineHeight: '1.5' }}>
            This is a one-time verification. After entering the correct key, you won't be asked again.
          </p>
        </div>
      </div>
    </div>
  );
}
