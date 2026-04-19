import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import ThemeToggle from './ThemeToggle'; // ✅ added

const patientLinks = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/intake',    label: 'Check-in' },
  { path: '/reports',   label: 'Reports' },
  { path: '/healthtwin', label: 'Health Twin' },
];

const doctorLinks = [
  { path: '/doctor', label: 'Dashboard' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const links = user?.role === 'doctor' ? doctorLinks : patientLinks;

  return (
    <nav style={{
      background: '#0a0a0a',
      borderBottom: '1px solid #1a1a1a',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '52px',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          onClick={() => navigate(user?.role === 'doctor' ? '/doctor' : '/dashboard')}
        >
          <div style={{
            width: 24,
            height: 24,
            background: '#c8f135',
            borderRadius: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="#0a0a0a" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.3px'
          }}>
            Pulse
          </span>
        </div>

        <div style={{ display: 'flex', gap: 2 }}>
          {links.map(link => {
            const active = location.pathname === link.path;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                style={{
                  background: active ? '#161616' : 'transparent',
                  color: active ? '#c8f135' : '#555',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'color 0.15s'
                }}
              >
                {link.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        
        {/* ✅ Theme toggle added here */}
        <ThemeToggle />

        <span style={{ fontSize: 12, color: '#444' }}>
          {user?.name}
        </span>

        <div style={{
          width: 28,
          height: 28,
          background: '#161616',
          border: '1px solid #1e1e1e',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: '#c8f135'
        }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>

        <button
          onClick={() => { logout(); navigate('/login'); }}
          style={{
            background: 'none',
            border: 'none',
            color: '#333',
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}