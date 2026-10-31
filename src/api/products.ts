import apiClient from './client';
import { Product, ProductSearchResult, CreateProductInput, UpdateProductInput } from '../types/product.types';

interface PaginatedProducts {
  data: Product[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

export interface GetProductsParams {
  search?: string;
  status?: string;
  category?: string;
  brand?: string;
  unit?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export const productsApi = {
  getProducts: async (params?: GetProductsParams): Promise<PaginatedProducts> => {
    const res = await apiClient.get('/products', { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  searchProducts: async (q: string): Promise<ProductSearchResult[]> => {
    const res = await apiClient.get('/products/search', { params: { q } });
    return res.data.data;
  },

  getProduct: async (id: string): Promise<Product> => {
    const res = await apiClient.get(`/products/${id}`);
    return res.data.data;
  },

  createProduct: async (data: CreateProductInput): Promise<Product> => {
    const res = await apiClient.post('/products', data);
    return res.data.data;
  },

  updateProduct: async (id: string, data: UpdateProductInput): Promise<Product> => {
    const res = await apiClient.put(`/products/${id}`, data);
    return res.data.data;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },

  getLowStock: async (): Promise<Product[]> => {
    const res = await apiClient.get('/products/low-stock');
    return res.data.data;
  },
};
