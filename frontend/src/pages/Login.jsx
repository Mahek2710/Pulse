import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setLoading(true); 
    setError('');

    try {
      const { data } = await api.post('/auth/login', form);

      login(data.token, {
        name: data.name,
        role: data.role,
        patientProfileId: data.patientProfileId
      });

      navigate(data.role === 'doctor' ? '/doctor' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }}>

      <div className="p-card" style={{ width: '100%', maxWidth: 420 }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 className="p-title">Welcome to Pulse</h1>
          <p className="p-subtitle">Sign in to your account</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--danger-dim)',
            border: '1px solid var(--danger)',
            borderRadius: 10,
            padding: '10px 12px',
            marginBottom: 14
          }}>
            <span className="p-danger-text" style={{ fontSize: 13 }}>
              {error}
            </span>
          </div>
        )}

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            className="p-input"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />

          <input
            type="password"
            className="p-input"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
        </div>

        {/* Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="p-btn-primary"
          style={{ width: '100%', marginTop: 16, padding: '10px 0' }}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--text2)',
          marginTop: 16
        }}>
          No account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            Register
          </Link>
        </p>

      </div>
    </div>
  );
}