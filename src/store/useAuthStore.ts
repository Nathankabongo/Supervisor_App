import { create } from 'zustand';
import { apiService } from '../services/api';

interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('auth_token'),
  isAuthenticated: !!localStorage.getItem('auth_token'),
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiService.login(username, password);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Erreur de connexion',
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
      });
      throw error;
    }
  },

  signup: async (username: string, password: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiService.signup(username, password, name);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Erreur lors de l\'inscription',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await apiService.logout();
    } finally {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      set({ isAuthenticated: false, user: null, token: null });
      return;
    }

    try {
      const data = await apiService.verifyToken();
      set({
        isAuthenticated: data.valid,
        user: {
          id: data.user.userId,
          username: data.user.username,
          name: data.user.name || data.user.username,
          role: data.user.role,
        },
        token,
      });
    } catch {
      set({ isAuthenticated: false, user: null, token: null });
      localStorage.removeItem('auth_token');
    }
  },

  clearError: () => set({ error: null }),
}));
