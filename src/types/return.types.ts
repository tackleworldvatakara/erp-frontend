export type ReturnItemCondition = 'resellable' | 'damaged' | 'supplier_return';
export type ReturnStatus = 'draft' | 'approved' | 'rejected' | 'completed';
export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface CustomerReturnItem {
  saleItem: string;
  product: {
    _id: string;
    name: string;
    sku: string;
    unit?: string;
    sellingPrice?: number;
  };
  quantity: number;
  unitPrice: number;
  returnReason?: string;
  condition: ReturnItemCondition;
}

export interface CustomerReturn {
  _id: string;
  returnNumber: string;
  originalSale: {
    _id: string;
    invoiceNumber: string;
    customerName?: string;
    invoiceDate: string;
    grandTotal: number;
    paymentMethod: string;
  };
  customer?: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  returnDate: string;
  items: CustomerReturnItem[];
  totalRefund: number;
  refundMethod: string;
  refundStatus: RefundStatus;
  status: ReturnStatus;
  notes?: string;
  approvedBy?: {
    _id: string;
    name: string;
  };
  createdBy?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ReturnStats {
  totalReturns: number;
  totalRefundAmount: number;
  totalItemsReturned: number;
  resellableRestockedQty: number;
  completedCount: number;
  pendingCount: number;
}

export interface ReturnableSaleItem {
  saleItemId: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  unitPrice: number;
  soldQuantity: number;
  previouslyReturned: number;
  returnableQuantity: number;
  discount: number;
  lineTotal: number;
}

export interface SaleReturnableInfo {
  sale: {
    _id: string;
    invoiceNumber: string;
    invoiceDate: string;
    customerName?: string;
    customer?: {
      _id: string;
      name: string;
      phone?: string;
    };
    grandTotal: number;
    paymentMethod: string;
    status: string;
  };
  items: ReturnableSaleItem[];
  isFullyReturned: boolean;
}

export interface CreateReturnItemInput {
  saleItem?: string;
  product: string;
  quantity: number;
  unitPrice: number;
  returnReason?: string;
  condition: ReturnItemCondition;
}

export interface CreateReturnInput {
  originalSale: string;
  customer?: string;
  returnDate?: string;
  items: CreateReturnItemInput[];
  refundMethod?: string;
  notes?: string;
  status?: ReturnStatus;
  refundStatus?: RefundStatus;
}

