import { create } from 'zustand';
import api from '../lib/axios';

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  isCheckingAuth: true,
  isLoading: false,

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true, isLoading: false, isCheckingAuth: false });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isAuthenticated: false, isCheckingAuth: false });
      return;
    }
    try {
      const res = await api.get('/users/profile');
      set({ user: res.data, isAuthenticated: true, isCheckingAuth: false });
    } catch (err) {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, isCheckingAuth: false });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/users/login', credentials);
      const { token, ...userData } = res.data;
      localStorage.setItem('token', token);
      set({ user: userData, token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/users/register', data);
      const { token, ...userData } = res.data;
      localStorage.setItem('token', token);
      set({ user: userData, token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  }
}));

export default useAuthStore;
