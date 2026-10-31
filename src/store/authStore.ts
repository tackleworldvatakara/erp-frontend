import { create } from 'zustand';
import { User, AuthState } from '../types/auth.types';
import authApi from '../api/auth';

const USER_KEY = 'erp_user';

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    set({
      user: response.user,
      accessToken: response.accessToken,
      isAuthenticated: true,
    });
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Proceed with local logout even if server call fails
    }
    localStorage.removeItem(USER_KEY);
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) {
        const user = JSON.parse(stored) as User;
        set({ user });
      }
      const { accessToken } = await authApi.refresh();
      // Store the token in state BEFORE calling me() so the request interceptor
      // in authAxios can attach it as a Bearer header
      set({ accessToken });
      const me = await authApi.me();
      set({
        user: me,
        accessToken,
        isAuthenticated: true,
      });
      localStorage.setItem(USER_KEY, JSON.stringify(me));
    } catch {
      localStorage.removeItem(USER_KEY);
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  setAccessToken: (token: string) => {
    set({ accessToken: token, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem(USER_KEY);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
