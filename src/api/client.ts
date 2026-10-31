/// <reference types="vite/client" />
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  pendingRequests.forEach((cb) => cb(token));
  pendingRequests = [];
}

// Store accessor functions injected at init to break circular dependency.
// Call `initApiClientStore` once in App.tsx before making any API calls.
type StoreAccessor = {
  getToken: () => string | null;
  setToken: (t: string) => void;
  clearAuth: () => void;
};

let storeAccessor: StoreAccessor | null = null;

export function initApiClientStore(accessor: StoreAccessor): void {
  storeAccessor = accessor;
}

// Request interceptor — attach Bearer access token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = storeAccessor?.getToken() ?? null;
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — refresh token on 401
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const url = originalRequest?.url ?? '';
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/setup');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve) => {
          pendingRequests.push((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshResponse = await apiClient.post<{
          success: boolean;
          data: { accessToken: string };
        }>('/auth/refresh');
        const newToken = refreshResponse.data.data.accessToken;

        storeAccessor?.setToken(newToken);
        onRefreshed(newToken);

        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch {
        storeAccessor?.clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
