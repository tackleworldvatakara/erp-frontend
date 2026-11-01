export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type SaleStatus = 'draft' | 'confirmed' | 'cancelled' | 'returned';

export interface BillItem {
  productId: string;
  productName: string;
  sku: string;
  variantColor?: string;
  quantity: number;
  unitPrice: number;
  maxUnitPrice: number;
  discountAmount: number;
  lineTotal: number;
  unit: string;
  currentStock: number;
}

export interface CreateSaleInput {
  customerName?: string;
  customerPhone?: string;
  items: Array<{
    productId: string;
    variantColor?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
  }>;
  commonDiscount?: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  notes?: string;
}

export interface SaleItem {
  product: string;
  productName: string;
  sku: string;
  variantColor?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  discountAmount: number;
  lineTotal: number;
}

export interface Sale {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  cancellationReason?: string;
  cancelledAt?: string;
  notes?: string;
  createdAt: string;
}

export interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  monthSales: number;
  monthRevenue: number;
  totalProducts: number;
  lowStockCount: number;
}
