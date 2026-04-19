import useThemeStore from '../store/themeStore';

export default function ThemeToggle() {
  const { theme, toggle } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button onClick={toggle} style={{
      display: 'flex', alignItems: 'center', gap: 7,
      background: 'var(--bg-card2)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '5px 10px 5px 5px', cursor: 'pointer'
    }}>
      <div style={{
        width: 34, height: 18, borderRadius: 20,
        background: isDark ? 'var(--accent)' : 'var(--border2)',
        position: 'relative', transition: 'background .2s', flexShrink: 0
      }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: isDark ? 'var(--bg)' : '#fff',
          position: 'absolute', top: 3,
          left: isDark ? 3 : 19,
          transition: 'left .2s'
        }}/>
      </div>
      <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>
        {isDark ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}