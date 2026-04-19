import { create } from 'zustand';

const saved = localStorage.getItem('pulse_theme') || 'dark';
document.documentElement.setAttribute('data-theme', saved);

const useThemeStore = create((set) => ({
  theme: saved,
  toggle: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('pulse_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    return { theme: next };
  })
}));

export default useThemeStore;