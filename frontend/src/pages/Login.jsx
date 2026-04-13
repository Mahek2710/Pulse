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
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, { name: data.name, role: data.role, patientProfileId: data.patientProfileId });
      navigate(data.role === 'doctor' ? '/doctor' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Welcome to Pulse</h1>
        <p className="text-gray-500 text-sm mb-6">Sign in to your account</p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <input className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-3 outline-none focus:border-blue-400" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        <input type="password" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-5 outline-none focus:border-blue-400" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
        <button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="text-center text-sm text-gray-400 mt-4">No account? <Link to="/register" className="text-blue-600">Register</Link></p>
      </div>
    </div>
  );
}