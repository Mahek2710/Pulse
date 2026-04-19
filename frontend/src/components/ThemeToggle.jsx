import useThemeStore from '../store/themeStore';

export default function ThemeToggle() {
  const { theme, toggle } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: 'var(--bg-card2)',
        border: '1px solid var(--border)',
        borderRadius: 50,
        padding: 3,
        cursor: 'pointer',
        transition: 'border-color .2s'
      }}
    >
      {/* moon */}
      <span style={{
        width: 28, height: 28, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
        background: isDark ? 'var(--bg-card)' : 'transparent',
        boxShadow: isDark ? 'var(--shadow)' : 'none',
        transition: 'background .2s, box-shadow .2s'
      }}>
        🌙
      </span>
      {/* sun */}
      <span style={{
        width: 28, height: 28, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
        background: !isDark ? 'var(--bg-card)' : 'transparent',
        boxShadow: !isDark ? 'var(--shadow)' : 'none',
        transition: 'background .2s, box-shadow .2s'
      }}>
        ☀️
      </span>
    </button>
  );
}