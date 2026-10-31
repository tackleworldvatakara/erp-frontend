import apiClient from './client';

export interface ShopSettings {
  _id: string;
  shopName: string;
  phone?: string;
  email?: string;
  gstin?: string;
  invoicePrefix: string;
  lowStockDefault: number;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
}

export const settingsApi = {
  getShop: async (): Promise<ShopSettings> => {
    const res = await apiClient.get('/settings/shop');
    return res.data.data;
  },
  updateShop: async (data: Partial<ShopSettings>): Promise<ShopSettings> => {
    const res = await apiClient.put('/settings/shop', data);
    return res.data.data;
  },
  updateProfile: async (data: { name: string }): Promise<{ name: string; email: string; role: string }> => {
    const res = await apiClient.put('/settings/profile', data);
    return res.data.data;
  },
  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    await apiClient.put('/settings/change-password', data);
  },
};
