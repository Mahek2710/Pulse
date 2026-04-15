import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const patientLinks = [
  { path: '/dashboard', label: 'Dashboard', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
      <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
    </svg>
  )},
  { path: '/intake', label: 'Check-in', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 3H4a1 1 0 00-1 1v9a1 1 0 001 1h8a1 1 0 001-1V4a1 1 0 00-1-1h-1"/>
      <rect x="5" y="1" width="6" height="3" rx="0.5"/><path d="M5 8h6M5 11h3"/>
    </svg>
  )},
  { path: '/reports', label: 'Reports', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5z"/>
      <path d="M9 1v4h4M5 8h6M5 11h4"/>
    </svg>
  )},
  { path: '/healthtwin', label: 'Health Twin', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 14s-5-3.5-5-7a5 5 0 0110 0c0 3.5-5 7-5 7z"/>
      <circle cx="8" cy="7" r="1.5"/>
    </svg>
  )},
];

const doctorLinks = [
  { path: '/doctor', label: 'Dashboard', icon: patientLinks[0].icon },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const links = user?.role === 'doctor' ? doctorLinks : patientLinks;

  return (
    <nav className="bg-white border-b border-gray-100 px-6 py-0 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <div className="flex items-center gap-2 py-4 cursor-pointer" onClick={() => navigate(user?.role === 'doctor' ? '/doctor' : '/dashboard')}>
          <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm">Pulse</span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map(link => {
            const active = location.pathname === link.path;
            return (
              <button key={link.path} onClick={() => navigate(link.path)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}>
                {link.icon}
                {link.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs font-medium text-gray-700">{user?.name}</p>
          <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
        </div>
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <button onClick={() => { logout(); navigate('/login'); }}
          className="text-xs text-gray-400 hover:text-gray-600 ml-1">
          Sign out
        </button>
      </div>
    </nav>
  );
}