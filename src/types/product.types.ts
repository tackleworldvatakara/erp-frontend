export type ProductUnit = 'piece' | 'pair' | 'box' | 'kg' | 'meter' | 'liter' | 'set' | 'roll';
export type ProductStatus = 'active' | 'inactive' | 'archived';

export interface ProductVariant {
  color: string;
  quantity: number;
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  category?: string;
  brand?: string;
  unit: ProductUnit;
  purchaseCost: number;
  sellingPrice: number;
  currentStock: number;
  minStockThreshold: number;
  variants: ProductVariant[];
  status: ProductStatus;
  hasSalesHistory?: boolean;
  description?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSearchResult {
  _id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  currentStock: number;
  unit: ProductUnit;
  brand?: string;
  variants: ProductVariant[];
}

export interface CreateProductInput {
  name: string;
  sku: string;
  category?: string;
  brand?: string;
  unit: ProductUnit;
  purchaseCost: number;
  sellingPrice: number;
  currentStock: number;
  minStockThreshold: number;
  variants?: ProductVariant[];
  description?: string;
}

export type UpdateProductInput = Partial<CreateProductInput> & { status?: 'active' | 'inactive' };
