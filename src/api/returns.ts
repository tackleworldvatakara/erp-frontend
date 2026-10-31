import apiClient from './client';
import {
  CustomerReturn,
  CreateReturnInput,
  ReturnStats,
  SaleReturnableInfo,
  ReturnStatus,
  RefundStatus,
} from '../types/return.types';

interface PaginatedReturns {
  data: CustomerReturn[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

export const returnsApi = {
  getReturns: async (params?: {
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedReturns> => {
    const res = await apiClient.get('/returns', { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  getReturn: async (id: string): Promise<CustomerReturn> => {
    const res = await apiClient.get(`/returns/${id}`);
    return res.data.data;
  },

  getReturnStats: async (): Promise<ReturnStats> => {
    const res = await apiClient.get('/returns/stats');
    return res.data.data;
  },

  getSaleReturnableInfo: async (saleIdentifier: string): Promise<SaleReturnableInfo> => {
    const res = await apiClient.get(`/returns/sale-info/${encodeURIComponent(saleIdentifier)}`);
    return res.data.data;
  },

  createReturn: async (data: CreateReturnInput): Promise<CustomerReturn> => {
    const res = await apiClient.post('/returns', data);
    return res.data.data;
  },

  updateReturnStatus: async (
    id: string,
    data: { status: ReturnStatus; refundStatus?: RefundStatus; notes?: string }
  ): Promise<CustomerReturn> => {
    const res = await apiClient.put(`/returns/${id}/status`, data);
    return res.data.data;
  },
};

