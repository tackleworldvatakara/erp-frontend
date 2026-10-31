import apiClient from './client';

export interface Category {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    const res = await apiClient.get('/categories');
    return res.data.data;
  },
  create: async (data: { name: string; description?: string }): Promise<Category> => {
    const res = await apiClient.post('/categories', data);
    return res.data.data;
  },
  update: async (id: string, data: { name: string; description?: string }): Promise<Category> => {
    const res = await apiClient.put(`/categories/${id}`, data);
    return res.data.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};
