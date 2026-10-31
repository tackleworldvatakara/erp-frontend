import apiClient from './client';

export interface SummaryReport {
  period: { start: string; end: string };
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  discount: number;
  orders: number;
  avgOrderValue: number;
  itemsSold: number;
  revenueGrowth: number | null;
  prevRevenue: number;
}

export interface TrendPoint {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  sku: string;
  qtySold: number;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
}

export interface PaymentBreakdown {
  method: string;
  total: number;
  count: number;
}

export interface StockValuationItem {
  name: string;
  sku: string;
  currentStock: number;
  purchaseCost: number;
  sellingPrice: number;
  costValue: number;
  saleValue: number;
  isLowStock: boolean;
}

export interface StockValuation {
  items: StockValuationItem[];
  totalCostValue: number;
  totalSaleValue: number;
  potentialProfit: number;
}

const params = (period: string, startDate?: string, endDate?: string) => ({
  period,
  ...(startDate && { startDate }),
  ...(endDate && { endDate }),
});

export const reportsApi = {
  getSummary: async (period: string, startDate?: string, endDate?: string): Promise<SummaryReport> => {
    const res = await apiClient.get('/reports/summary', { params: params(period, startDate, endDate) });
    return res.data.data;
  },
  getTrend: async (period: string, startDate?: string, endDate?: string): Promise<TrendPoint[]> => {
    const res = await apiClient.get('/reports/trend', { params: params(period, startDate, endDate) });
    return res.data.data;
  },
  getTopProducts: async (period: string, startDate?: string, endDate?: string): Promise<TopProduct[]> => {
    const res = await apiClient.get('/reports/top-products', { params: params(period, startDate, endDate) });
    return res.data.data;
  },
  getPaymentBreakdown: async (period: string, startDate?: string, endDate?: string): Promise<PaymentBreakdown[]> => {
    const res = await apiClient.get('/reports/payment-breakdown', { params: params(period, startDate, endDate) });
    return res.data.data;
  },
  getStockValuation: async (): Promise<StockValuation> => {
    const res = await apiClient.get('/reports/stock-valuation');
    return res.data.data;
  },
};
