export interface RecipeItem {
  id: string;
  name: string; // Color, Type, or Accessory name
  qty: number;
}

export interface ProductRecipe {
  pipeCleaners: RecipeItem[];
  wrapping: RecipeItem[];
  accessories: RecipeItem[];
}

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
  hasFoamBall?: boolean;
  recipe?: ProductRecipe;
}

export const isFlowerPot = (category?: string | null): boolean => {
  if (!category) return false;
  const c = category.toLowerCase().trim();
  return c === 'flower pots' || c === 'pots' || c === 'flower pot' || c === 'pot';
};

export const isKeychain = (category?: string | null): boolean => {
  if (!category) return false;
  const c = category.toLowerCase().trim();
  return c === 'keychain' || c === 'keychains';
};

export const normalizeCategory = (category?: string | null): 'Flowers' | 'Keychain' | 'Flower Pots' => {
  if (isFlowerPot(category)) return 'Flower Pots';
  if (isKeychain(category)) return 'Keychain';
  return 'Flowers';
};

export type PaymentStatus = 'Pending' | 'Paid' | 'Half Payment';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer';

export interface OrderItem {
  id: string;
  flowerId: string; // Linked to FlowerData.id
  flowerName: string; // Stored here for easy historical reference in case flower is deleted
  quantity: number;
  unitCost: number; // Snapshot of cost at time of order
  unitSellingPrice: number; // Snapshot of price at time of order
  bouquetIndex?: number;
}

export interface AdditionalFee {
  id: string;
  name: string;
  type: 'Bouquet Arrangement' | 'Packaging' | 'Shipping' | 'Custom';
  amount: number;
  isIncludedInCost?: boolean;
}

export interface Order {
  id: string;
  date: string; // ISO date string
  customerName?: string;
  orderLocation?: string;
  items: OrderItem[];
  additionalFees?: AdditionalFee[];
  // Legacy fields for backward compatibility
  bouquetFee?: number;
  deliveryFee?: number;
  extraItemName?: string;
  extraItemPrice?: number;
  
  shippingType?: 'None' | 'Maharashtra & Gujarat' | 'Across India';
  shippingCost?: number;
  
  totalCost: number;
  totalPrice: number;
  profit: number;
  actualMaterialCost?: number; // Cost of materials confirmed in usage pop-up
  isStockDeducted?: boolean; // Whether stock was deducted for this order
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
  category: 'Pipe Cleaners' | 'Wrapping Sheets' | 'Accessories' | 'Mesh Wrap' | 'Ribbons';
  count: number;
}
