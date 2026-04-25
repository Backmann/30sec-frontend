import { create } from 'zustand';
import { api } from './api';

interface User {
  id: string;
  email: string;
  role: string;
  profile: {
    nickname: string;
    firstName: string;
    lastName: string;
    language: string;
    countryCode: string;
  } | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const result = await api.login(email, password);
      set({ user: result.user, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const result = await api.register(data);
      set({ user: result.user, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  googleLogin: async (credential) => {
    set({ loading: true, error: null });
    try {
      const result = await api.googleLogin(credential);
      set({ user: result.user, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },
  logout: () => {
    api.logout();
    set({ user: null });
  },

  loadUser: async () => {
    // Skip request if no token — avoids noisy 401 in console
    if (typeof window !== 'undefined' && !localStorage.getItem('accessToken')) {
      set({ user: null });
      return;
    }
    try {
      const user = await api.getMe();
      set({ user });
    } catch {
      set({ user: null });
    }
  },

  clearError: () => set({ error: null }),
}));
