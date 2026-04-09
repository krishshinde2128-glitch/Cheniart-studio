export interface FlowerData {
  id: string;
  name: string;
  pipeCleanerQty: number;
  pollenQty: number;
  glueQty: number;
  extraCosts: number;
  sellingPrice: number;
  targetMargin?: number;
  category?: 'Flowers' | 'Keychain' | 'Flower Pots';
  keychainQty?: number;
  cupsQty?: number;
}

export type PaymentStatus = 'Pending' | 'Paid';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer';

export interface OrderItem {
  id: string;
  flowerId: string; // Linked to FlowerData.id
  flowerName: string; // Stored here for easy historical reference in case flower is deleted
  quantity: number;
  unitCost: number; // Snapshot of cost at time of order
  unitSellingPrice: number; // Snapshot of price at time of order
}

export interface AdditionalFee {
  id: string;
  name: string;
  type: 'Bouquet Arrangement' | 'Delivery & Packaging' | 'Custom';
  amount: number;
  isIncludedInCost?: boolean;
}

export interface Order {
  id: string;
  date: string; // ISO date string
  customerName?: string;
  items: OrderItem[];
  additionalFees?: AdditionalFee[];
  // Legacy fields for backward compatibility
  bouquetFee?: number;
  deliveryFee?: number;
  extraItemName?: string;
  extraItemPrice?: number;
  
  totalCost: number;
  totalPrice: number;
  profit: number;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  scheduledDeliveryDate?: string;
  isDelivered?: boolean;
}

export interface ExpenseItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface Expense {
  id: string;
  date: string; // ISO date string
  items: ExpenseItem[];
  tripTotal: number;
}

export interface StockItem {
  id: string;
  name: string;
  category: 'Pipe Cleaners' | 'Wrapping Sheets' | 'Accessories';
  count: number;
}
