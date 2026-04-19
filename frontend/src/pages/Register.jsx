import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'patient'
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/register', form);

      login(data.token, {
        name: data.name,
        role: data.role,
        patientProfileId: data.patientProfileId
      });

      navigate(data.role === 'doctor' ? '/doctor' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
          <h1 className="p-title">Create your account</h1>
          <p className="p-subtitle">Join Pulse today</p>
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
            placeholder="Full name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />

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

        {/* Role selector */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {['patient', 'doctor'].map(r => (
            <button
              key={r}
              onClick={() => setForm({ ...form, role: r })}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 10,
                fontSize: 13,
                textTransform: 'capitalize',
                border: `1px solid ${
                  form.role === r ? 'var(--accent)' : 'var(--border)'
                }`,
                background:
                  form.role === r ? 'var(--accent-dim)' : 'var(--bg-card2)',
                color:
                  form.role === r ? 'var(--accent)' : 'var(--text2)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="p-btn-primary"
          style={{ width: '100%', marginTop: 18, padding: '10px 0' }}
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--text2)',
          marginTop: 16
        }}>
          Have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}