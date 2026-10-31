import apiClient from './client';

export interface AppUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'sales';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export const usersApi = {
  getAll: async (): Promise<AppUser[]> => {
    const res = await apiClient.get('/users');
    return res.data.data;
  },
  create: async (data: { name: string; email: string; password: string; role: 'admin' | 'sales' }): Promise<AppUser> => {
    const res = await apiClient.post('/users', data);
    return res.data.data;
  },
  update: async (id: string, data: { name?: string; role?: 'admin' | 'sales'; isActive?: boolean }): Promise<AppUser> => {
    const res = await apiClient.put(`/users/${id}`, data);
    return res.data.data;
  },
  resetPassword: async (id: string, newPassword: string): Promise<void> => {
    await apiClient.post(`/users/${id}/reset-password`, { newPassword });
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
