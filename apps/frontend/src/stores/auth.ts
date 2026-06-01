// =============================================================================
// Rollinhead Dashboard — Zustand Auth Store
// =============================================================================

import { create } from 'zustand';
import { api } from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  publisher?: {
    id: string;
    companyName: string;
    status: string;
  } | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<User | null>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post('/auth/login', { email, password });
      
      // Save token locally
      if (typeof window !== 'undefined' && data.accessToken) {
        localStorage.setItem('rollinhead_token', data.accessToken);
      }

      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return data.user;
    } catch (err: any) {
      set({
        error: err.message || 'Login failed. Please check credentials.',
        isLoading: false,
      });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout API failed:', err);
    } finally {
      // Clear token locally
      if (typeof window !== 'undefined') {
        localStorage.removeItem('rollinhead_token');
      }

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    
    // Quick exit if no local token is present to avoid redundant 401s on initial load
    const token = typeof window !== 'undefined' ? localStorage.getItem('rollinhead_token') : null;
    if (!token) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return null;
    }

    try {
      const user = await api.get('/auth/me');
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      return user;
    } catch (err) {
      // Clear invalid/expired token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('rollinhead_token');
      }

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return null;
    }
  },
}));
