/// <reference types="vite/client" />
import axios from 'axios';
import { LoginResponse, User, SetupRequest } from '../types/auth.types';

// Use a separate axios instance for auth calls to avoid circular dependency
// with the main apiClient (which imports authStore, which imports this module)
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

export const authAxios = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Token getter injected from App.tsx via initAuthAxiosStore() to break the
 * circular dependency: authStore → authApi → authAxios → authStore.
 * The request interceptor reads this lazily so it is resolved at call time,
 * not at module parse time.
 */
let getAccessToken: (() => string | null) | null = null;

export function initAuthAxiosStore(getter: () => string | null): void {
  getAccessToken = getter;
}

// Attach Bearer token on every request if a token getter has been registered
authAxios.interceptors.request.use((reqConfig) => {
  const token = getAccessToken?.() ?? null;
  if (token && reqConfig.headers) {
    reqConfig.headers['Authorization'] = `Bearer ${token}`;
  }
  return reqConfig;
});

interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

async function post<T>(url: string, data?: unknown): Promise<T> {
  const res = await authAxios.post<ApiSuccess<T>>(url, data);
  return res.data.data;
}

async function get<T>(url: string): Promise<T> {
  const res = await authAxios.get<ApiSuccess<T>>(url);
  return res.data.data;
}

const authApi = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    post<LoginResponse>('/auth/login', { email, password }),

  logout: (): Promise<void> => post<void>('/auth/logout'),

  refresh: (): Promise<{ accessToken: string }> =>
    post<{ accessToken: string }>('/auth/refresh'),

  /**
   * me() must only be called after checkAuth() has stored the access token via
   * set({ accessToken }) — the request interceptor above attaches it as Bearer.
   */
  me: (): Promise<User> =>
    get<{ user: User }>('/auth/me').then((d) => d.user),

  setup: (data: SetupRequest): Promise<{ message: string; user: User }> =>
    post<{ user: User }>('/auth/setup', data).then((d) => ({
      message: 'Admin created successfully',
      user: d.user,
    })),
};

export default authApi;
