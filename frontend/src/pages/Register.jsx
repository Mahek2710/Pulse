import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, { name: data.name, role: data.role, patientProfileId: data.patientProfileId });
      navigate(data.role === 'doctor' ? '/doctor' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Create your account</h1>
        <p className="text-gray-500 text-sm mb-6">Join Pulse today</p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <input className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-3 outline-none focus:border-blue-400" placeholder="Full name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <input className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-3 outline-none focus:border-blue-400" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        <input type="password" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-3 outline-none focus:border-blue-400" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
        <div className="flex gap-2 mb-5">
          {['patient', 'doctor'].map(r => (
            <button key={r} onClick={() => setForm({...form, role: r})}
              className={`flex-1 py-2 rounded-lg text-sm capitalize border transition-colors ${form.role === r ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:border-blue-300'}`}>
              {r}
            </button>
          ))}
        </div>
        <button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Creating account...' : 'Create account'}
        </button>
        <p className="text-center text-sm text-gray-400 mt-4">Have an account? <Link to="/login" className="text-blue-600">Sign in</Link></p>
      </div>
    </div>
  );
}