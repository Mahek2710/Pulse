import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import ThemeToggle from './ThemeToggle';

const patientLinks = [
  { path: '/dashboard',  label: 'Dashboard'   },
  { path: '/intake',     label: 'Check-in'    },
  { path: '/reports',    label: 'Reports'     },
  { path: '/healthtwin', label: 'Health Twin' },
];

const doctorLinks = [
  { path: '/doctor', label: 'Dashboard' },
];

export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuthStore();
  const links = user?.role === 'doctor' ? doctorLinks : patientLinks;

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 52,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>

        {/* logo */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          onClick={() => navigate(user?.role === 'doctor' ? '/doctor' : '/dashboard')}
        >
          <div style={{
            width: 26, height: 26, background: 'var(--accent)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>
            Pulse
          </span>
        </div>

        {/* nav links */}
        <div style={{ display: 'flex', gap: 2 }}>
          {links.map(link => {
            const active = location.pathname === link.path;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`p-nav-link${active ? ' active' : ''}`}
              >
                {link.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ThemeToggle />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text2)', letterSpacing: '-0.1px' }}>
            {user?.name}
          </span>
          <div style={{
            width: 28, height: 28,
            background: 'var(--accent-dim)',
            border: '1px solid var(--border)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.3px'
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12, fontFamily: 'inherit' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}