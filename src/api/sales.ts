import apiClient from './client';
import { Sale, CreateSaleInput, DashboardStats } from '../types/sale.types';

interface PaginatedSales {
  data: Sale[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

export const salesApi = {
  createSale: async (data: CreateSaleInput): Promise<Sale> => {
    const res = await apiClient.post('/sales', data);
    return res.data.data;
  },

  getSales: async (params?: {
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedSales> => {
    const res = await apiClient.get('/sales', { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  getSale: async (id: string): Promise<Sale> => {
    const res = await apiClient.get(`/sales/${id}`);
    return res.data.data;
  },

  cancelSale: async (id: string, reason: string): Promise<Sale> => {
    const res = await apiClient.post(`/sales/${id}/cancel`, { reason });
    return res.data.data;
  },

  getDashboardStats: async (): Promise<{ stats: DashboardStats; recentSales: Sale[] }> => {
    const res = await apiClient.get('/dashboard/stats');
    return res.data.data;
  },
};
