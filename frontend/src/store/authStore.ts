import { create } from 'zustand';
import { UserPublic, getRoleChecks, LoginResponse } from '../types';
import { authApi } from '../api/auth.api';

type Lang = 'zh' | 'en';

interface AuthState {
  token: string | null;
  user: UserPublic | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  lang: Lang;

  login: (username: string, password: string) => Promise<void>;
  userLogin: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setLang: (lang: Lang) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: null,
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('token'),
  lang: (localStorage.getItem('lang') as Lang) || 'zh',

  // 共享登录后状态设置逻辑
  _handleLoginResponse: (res: LoginResponse) => {
    const { token, user } = res;
    localStorage.setItem('token', token);
    const rc = getRoleChecks(user.role);
    const defaultLang = rc.isOverseasAgent ? 'en' : 'zh';
    localStorage.setItem('lang', defaultLang);
    set({ token, user, isAuthenticated: true, isLoading: false, lang: defaultLang });
  },

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await authApi.login({ username, password });
      (useAuthStore.getState() as any)._handleLoginResponse(res);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  userLogin: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await authApi.userLogin({ username, password });
      (useAuthStore.getState() as any)._handleLoginResponse(res);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true });
    } catch (err: any) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('token');
        set({ token: null, user: null, isAuthenticated: false });
      }
    }
  },

  setLang: (lang: Lang) => {
    localStorage.setItem('lang', lang);
    set({ lang });
  },
}));
