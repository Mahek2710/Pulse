import { create } from 'zustand';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('pulse_token') || null,
  user: JSON.parse(localStorage.getItem('pulse_user') || 'null'),

  login: (token, user) => {
    localStorage.setItem('pulse_token', token);
    localStorage.setItem('pulse_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('pulse_token');
    localStorage.removeItem('pulse_user');
    set({ token: null, user: null });
  }
}));

export default useAuthStore;