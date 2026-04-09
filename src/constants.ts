import type { FlowerData, Order } from './types';

export const UNIT_PRICES = {
  PIPE_CLEANER: 0.8,
  POLLEN: 0.2815,
  GLUE_SET: 3.5,
};

export const INITIAL_FLOWERS: FlowerData[] = [
  { id: '1', name: 'spiral leaves', pipeCleanerQty: 7, pollenQty: 0, glueQty: 1, extraCosts: 0, sellingPrice: 30 },
  { id: '2', name: 'flat leaves', pipeCleanerQty: 7, pollenQty: 0, glueQty: 1, extraCosts: 0, sellingPrice: 30 },
  { id: '3', name: 'daisies', pipeCleanerQty: 5, pollenQty: 0, glueQty: 1, extraCosts: 0.5, sellingPrice: 30 },
  { id: '4', name: 'babies breath', pipeCleanerQty: 6, pollenQty: 0, glueQty: 1, extraCosts: 0.5, sellingPrice: 30 },
  { id: '5', name: 'rose', pipeCleanerQty: 14, pollenQty: 0, glueQty: 1, extraCosts: 0, sellingPrice: 150 },
  { id: '6', name: 'tulips', pipeCleanerQty: 16, pollenQty: 0, glueQty: 1, extraCosts: 0, sellingPrice: 160 },
  { id: '7', name: 'lavander', pipeCleanerQty: 15, pollenQty: 0, glueQty: 2, extraCosts: 0, sellingPrice: 190 },
  { id: '8', name: 'hyacinth', pipeCleanerQty: 18, pollenQty: 4, glueQty: 1, extraCosts: 0.5, sellingPrice: 190 },
  { id: '9', name: 'chrysanthemum', pipeCleanerQty: 11, pollenQty: 1, glueQty: 1, extraCosts: 0.5, sellingPrice: 170 },
  { id: '10', name: 'hibiscus', pipeCleanerQty: 17, pollenQty: 1, glueQty: 1, extraCosts: 0, sellingPrice: 200 },
  { id: '11', name: 'lilies', pipeCleanerQty: 17, pollenQty: 1, glueQty: 1, extraCosts: 0, sellingPrice: 200 },
  { id: '12', name: 'small sunflower', pipeCleanerQty: 19, pollenQty: 0, glueQty: 1, extraCosts: 0, sellingPrice: 210 },
  { id: '13', name: 'normal sunflowers', pipeCleanerQty: 27, pollenQty: 0, glueQty: 1, extraCosts: 0, sellingPrice: 270 },
  { id: '14', name: 'orchids', pipeCleanerQty: 40, pollenQty: 0, glueQty: 1, extraCosts: 0, sellingPrice: 420 },
  { id: '15', name: 'stargazing lily', pipeCleanerQty: 36, pollenQty: 0, glueQty: 1, extraCosts: 0, sellingPrice: 350 },
  { id: '16', name: 'heart', pipeCleanerQty: 3, pollenQty: 0, glueQty: 0, extraCosts: 1, sellingPrice: 15 },
];

export const INITIAL_ORDERS: Order[] = [
  { 
    id: 'h1', date: '2025-12-19T10:00:00.000Z', customerName: 'aryan mehra', 
    items: [{ id: '1', flowerId: 'custom', flowerName: 'rose', quantity: 1, unitCost: 0, unitSellingPrice: 100 }], 
    totalPrice: 100, profit: 85, totalCost: 15, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h2', date: '2026-01-07T10:00:00.000Z', customerName: 'drushti', 
    items: [{ id: '1', flowerId: 'custom', flowerName: 'lily', quantity: 1, unitCost: 0, unitSellingPrice: 200 }], 
    totalPrice: 200, profit: 182, totalCost: 18, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h3', date: '2026-01-07T11:00:00.000Z', customerName: 'maalu', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'lily', quantity: 2, unitCost: 0, unitSellingPrice: 100 },
      { id: '2', flowerId: 'custom', flowerName: 'tulip', quantity: 3, unitCost: 0, unitSellingPrice: 50 },
      { id: '3', flowerId: 'custom', flowerName: 'daisy', quantity: 8, unitCost: 0, unitSellingPrice: 10 },
      { id: '4', flowerId: 'custom', flowerName: 'babies breath', quantity: 2, unitCost: 0, unitSellingPrice: 25 },
      { id: '5', flowerId: 'custom', flowerName: 'leaves', quantity: 2, unitCost: 0, unitSellingPrice: 10 }
    ], 
    totalPrice: 500, profit: 321, totalCost: 179, paymentStatus: 'Paid', paymentMode: 'Cash' 
  },
  { 
    id: 'h4', date: '2026-01-08T10:00:00.000Z', customerName: 'arya', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'lily', quantity: 1, unitCost: 0, unitSellingPrice: 200 },
      { id: '2', flowerId: 'custom', flowerName: 'rose', quantity: 1, unitCost: 0, unitSellingPrice: 200 },
      { id: '3', flowerId: 'custom', flowerName: 'leaf', quantity: 1, unitCost: 0, unitSellingPrice: 30 },
      { id: '4', flowerId: 'custom', flowerName: 'babies breath', quantity: 1, unitCost: 0, unitSellingPrice: 40 }
    ], 
    totalPrice: 470, profit: 366, totalCost: 104, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h5', date: '2026-01-14T10:00:00.000Z', customerName: 'zeba', 
    items: [{ id: '1', flowerId: 'custom', flowerName: 'stargazer lily', quantity: 2, unitCost: 0, unitSellingPrice: 400 }], 
    totalPrice: 800, profit: 716, totalCost: 84, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h6', date: '2026-01-16T10:00:00.000Z', customerName: 'daanesh', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'lily', quantity: 1, unitCost: 0, unitSellingPrice: 200 },
      { id: '2', flowerId: 'custom', flowerName: 'tulip', quantity: 1, unitCost: 0, unitSellingPrice: 200 },
      { id: '3', flowerId: 'custom', flowerName: 'leaf', quantity: 1, unitCost: 0, unitSellingPrice: 40 },
      { id: '4', flowerId: 'custom', flowerName: 'babies breath', quantity: 1, unitCost: 0, unitSellingPrice: 50 }
    ], 
    totalPrice: 490, profit: 390, totalCost: 100, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h7', date: '2026-01-16T11:00:00.000Z', customerName: 'masi', 
    items: [{ id: '1', flowerId: 'custom', flowerName: 'rose bouquet', quantity: 1, unitCost: 0, unitSellingPrice: 120 }], 
    totalPrice: 120, profit: 100, totalCost: 20, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h8', date: '2026-01-23T10:00:00.000Z', customerName: 'prathmesh', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'tulips', quantity: 3, unitCost: 0, unitSellingPrice: 160 },
      { id: '2', flowerId: 'custom', flowerName: 'leafs', quantity: 2, unitCost: 0, unitSellingPrice: 30 }
    ], 
    totalPrice: 540, profit: 426, totalCost: 114, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h9', date: '2026-01-25T10:00:00.000Z', customerName: 'dodamma', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'lily', quantity: 1, unitCost: 0, unitSellingPrice: 50 },
      { id: '2', flowerId: 'custom', flowerName: 'tulip', quantity: 1, unitCost: 0, unitSellingPrice: 50 },
      { id: '3', flowerId: 'custom', flowerName: 'leaf', quantity: 1, unitCost: 0, unitSellingPrice: 10 },
      { id: '4', flowerId: 'custom', flowerName: 'babies breath', quantity: 1, unitCost: 0, unitSellingPrice: 10 }
    ], 
    totalPrice: 120, profit: 20, totalCost: 100, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h10', date: '2026-01-30T10:00:00.000Z', customerName: 'scarlet', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'lilies', quantity: 3, unitCost: 0, unitSellingPrice: 200 },
      { id: '2', flowerId: 'custom', flowerName: 'leaf', quantity: 2, unitCost: 0, unitSellingPrice: 75 }
    ], 
    totalPrice: 750, profit: 405, totalCost: 345, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h11', date: '2026-02-03T10:00:00.000Z', customerName: 'niharika', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'lilies', quantity: 2, unitCost: 0, unitSellingPrice: 200 },
      { id: '2', flowerId: 'custom', flowerName: 'rose', quantity: 1, unitCost: 0, unitSellingPrice: 200 },
      { id: '3', flowerId: 'custom', flowerName: 'leaves', quantity: 2, unitCost: 0, unitSellingPrice: 100 },
      { id: '4', flowerId: 'custom', flowerName: 'baby\'s breath', quantity: 1, unitCost: 0, unitSellingPrice: 40 }
    ], 
    totalPrice: 840, profit: 600, totalCost: 240, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h12', date: '2026-02-12T10:00:00.000Z', customerName: 'james', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'sunflower', quantity: 1, unitCost: 0, unitSellingPrice: 250 },
      { id: '2', flowerId: 'custom', flowerName: 'lavender', quantity: 1, unitCost: 0, unitSellingPrice: 200 },
      { id: '3', flowerId: 'custom', flowerName: 'forget me nots', quantity: 15, unitCost: 0, unitSellingPrice: 15 },
      { id: '4', flowerId: 'custom', flowerName: 'leaves', quantity: 1, unitCost: 0, unitSellingPrice: 25 }
    ], 
    totalPrice: 700, profit: 567, totalCost: 133, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h13', date: '2026-02-05T10:00:00.000Z', customerName: 'leisha', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'lilies', quantity: 3, unitCost: 0, unitSellingPrice: 200 },
      { id: '2', flowerId: 'custom', flowerName: 'leaves', quantity: 3, unitCost: 0, unitSellingPrice: 60 },
      { id: '3', flowerId: 'custom', flowerName: 'daisies', quantity: 8, unitCost: 0, unitSellingPrice: 15 }
    ], 
    totalPrice: 900, profit: 583, totalCost: 317, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h14', date: '2026-02-13T10:00:00.000Z', customerName: 'nigel sir', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'sunflower', quantity: 1, unitCost: 0, unitSellingPrice: 250 },
      { id: '2', flowerId: 'custom', flowerName: 'daisies', quantity: 6, unitCost: 0, unitSellingPrice: 40 },
      { id: '3', flowerId: 'custom', flowerName: 'baby\'s breath', quantity: 1, unitCost: 0, unitSellingPrice: 50 },
      { id: '4', flowerId: 'custom', flowerName: 'leaves', quantity: 2, unitCost: 0, unitSellingPrice: 30 }
    ], 
    totalPrice: 600, profit: 242, totalCost: 358, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h15', date: '2026-02-14T10:00:00.000Z', customerName: 'gwyneth', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'lily', quantity: 1, unitCost: 0, unitSellingPrice: 200 },
      { id: '2', flowerId: 'custom', flowerName: 'tulip', quantity: 1, unitCost: 0, unitSellingPrice: 200 },
      { id: '3', flowerId: 'custom', flowerName: 'leaf', quantity: 1, unitCost: 0, unitSellingPrice: 40 },
      { id: '4', flowerId: 'custom', flowerName: 'baby\'s breath', quantity: 1, unitCost: 0, unitSellingPrice: 50 }
    ], 
    totalPrice: 490, profit: 390, totalCost: 100, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h16', date: '2026-02-15T10:00:00.000Z', customerName: 'samit', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'lily', quantity: 1, unitCost: 0, unitSellingPrice: 200 },
      { id: '2', flowerId: 'custom', flowerName: 'leaf', quantity: 1, unitCost: 0, unitSellingPrice: 50 },
      { id: '3', flowerId: 'custom', flowerName: 'baby\'s breath', quantity: 1, unitCost: 0, unitSellingPrice: 70 }
    ], 
    totalPrice: 320, profit: 261, totalCost: 59, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h17', date: '2026-02-11T10:00:00.000Z', customerName: 'gwyneth', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'lilies', quantity: 2, unitCost: 0, unitSellingPrice: 250 },
      { id: '2', flowerId: 'custom', flowerName: 'tulips', quantity: 3, unitCost: 0, unitSellingPrice: 200 },
      { id: '3', flowerId: 'custom', flowerName: 'leaves', quantity: 2, unitCost: 0, unitSellingPrice: 100 },
      { id: '4', flowerId: 'custom', flowerName: 'daisies', quantity: 8, unitCost: 0, unitSellingPrice: 25 }
    ], 
    totalPrice: 1500, profit: 1332, totalCost: 168, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h18', date: '2026-02-18T10:00:00.000Z', customerName: 'akansha', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'lilies', quantity: 2, unitCost: 0, unitSellingPrice: 250 },
      { id: '2', flowerId: 'custom', flowerName: 'hibiscus', quantity: 1, unitCost: 0, unitSellingPrice: 250 },
      { id: '3', flowerId: 'custom', flowerName: 'tulips', quantity: 2, unitCost: 0, unitSellingPrice: 200 },
      { id: '4', flowerId: 'custom', flowerName: 'hearts', quantity: 2, unitCost: 0, unitSellingPrice: 50 },
      { id: '5', flowerId: 'custom', flowerName: 'stuff toy', quantity: 1, unitCost: 0, unitSellingPrice: 50 }
    ], 
    totalPrice: 1300, profit: 961, totalCost: 339, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h19', date: '2026-03-01T10:00:00.000Z', customerName: 'vanshika', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'sunflower keychain', quantity: 1, unitCost: 0, unitSellingPrice: 130 },
      { id: '2', flowerId: 'custom', flowerName: 'lily keychain', quantity: 1, unitCost: 0, unitSellingPrice: 130 }
    ], 
    totalPrice: 260, profit: 236, totalCost: 24, paymentStatus: 'Paid', paymentMode: 'Cash' 
  },
  { 
    id: 'h20', date: '2026-03-02T10:00:00.000Z', customerName: 'sanchit', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'sunflower', quantity: 1, unitCost: 0, unitSellingPrice: 150 },
      { id: '2', flowerId: 'custom', flowerName: 'leaf', quantity: 1, unitCost: 0, unitSellingPrice: 50 },
      { id: '3', flowerId: 'custom', flowerName: 'baby\'s breath', quantity: 1, unitCost: 0, unitSellingPrice: 50 }
    ], 
    totalPrice: 250, profit: 163, totalCost: 87, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h21', date: '2026-03-14T10:00:00.000Z', customerName: 'aryan m', 
    items: [{ id: '1', flowerId: 'custom', flowerName: 'sunflower keychain', quantity: 1, unitCost: 0, unitSellingPrice: 150 }], 
    totalPrice: 150, profit: 137, totalCost: 13, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h22', date: '2026-03-16T10:00:00.000Z', customerName: 'nilay', 
    items: [{ id: '1', flowerId: 'custom', flowerName: 'sunflower keychain', quantity: 1, unitCost: 0, unitSellingPrice: 120 }], 
    totalPrice: 120, profit: 107, totalCost: 13, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h23', date: '2026-01-24T10:00:00.000Z', customerName: 'masi', 
    items: [{ id: '1', flowerId: 'custom', flowerName: 'rose bouquet', quantity: 1, unitCost: 0, unitSellingPrice: 120 }], 
    totalPrice: 120, profit: 100, totalCost: 20, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h24', date: '2026-01-24T11:00:00.000Z', customerName: 'masi', 
    items: [{ id: '1', flowerId: 'custom', flowerName: 'rose bouquet', quantity: 1, unitCost: 0, unitSellingPrice: 120 }], 
    totalPrice: 120, profit: 100, totalCost: 20, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h25', date: '2026-02-08T10:00:00.000Z', customerName: 'didi', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'sunflower', quantity: 2, unitCost: 0, unitSellingPrice: 0 },
      { id: '2', flowerId: 'custom', flowerName: 'lily', quantity: 2, unitCost: 0, unitSellingPrice: 0 },
      { id: '3', flowerId: 'custom', flowerName: 'leaves', quantity: 3, unitCost: 0, unitSellingPrice: 0 },
      { id: '4', flowerId: 'custom', flowerName: 'daisies', quantity: 12, unitCost: 0, unitSellingPrice: 0 }
    ], 
    totalPrice: 0, profit: 0, totalCost: 0, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h26', date: '2026-02-11T12:00:00.000Z', customerName: 'masi', 
    items: [{ id: '1', flowerId: 'custom', flowerName: 'rose bouquet', quantity: 1, unitCost: 0, unitSellingPrice: 120 }], 
    totalPrice: 120, profit: 70, totalCost: 50, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h27', date: '2026-02-11T13:00:00.000Z', customerName: 'masi', 
    items: [{ id: '1', flowerId: 'custom', flowerName: 'rose bouquet', quantity: 1, unitCost: 0, unitSellingPrice: 120 }], 
    totalPrice: 120, profit: 70, totalCost: 50, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h28', date: '2026-02-11T14:00:00.000Z', customerName: 'masi', 
    items: [{ id: '1', flowerId: 'custom', flowerName: 'rose bouquet', quantity: 1, unitCost: 0, unitSellingPrice: 120 }], 
    totalPrice: 120, profit: 70, totalCost: 50, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h29', date: '2026-02-11T15:00:00.000Z', customerName: 'masi', 
    items: [{ id: '1', flowerId: 'custom', flowerName: 'rose bouquet', quantity: 1, unitCost: 0, unitSellingPrice: 120 }], 
    totalPrice: 120, profit: 63, totalCost: 57, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h30', date: '2026-03-01T11:00:00.000Z', customerName: 'daanesh', 
    items: [{ id: '1', flowerId: 'custom', flowerName: 'small lily keychain', quantity: 1, unitCost: 0, unitSellingPrice: 0 }], 
    totalPrice: 0, profit: 0, totalCost: 0, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h31', date: '2026-03-09T10:00:00.000Z', customerName: 'daanesh', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'sunflower keychain', quantity: 2, unitCost: 0, unitSellingPrice: 0 },
      { id: '2', flowerId: 'custom', flowerName: 'rose keychain', quantity: 1, unitCost: 0, unitSellingPrice: 0 }
    ], 
    totalPrice: 0, profit: -32, totalCost: 32, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h32', date: '2026-03-10T11:00:00.000Z', customerName: 'kanishk', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'lilly', quantity: 1, unitCost: 0, unitSellingPrice: 200 },
      { id: '2', flowerId: 'custom', flowerName: 'leaf', quantity: 1, unitCost: 0, unitSellingPrice: 0 },
      { id: '3', flowerId: 'custom', flowerName: 'baby\'s breath', quantity: 1, unitCost: 0, unitSellingPrice: 0 }
    ], 
    totalPrice: 200, profit: 121, totalCost: 79, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h33', date: '2026-03-10T12:00:00.000Z', customerName: 'kanishk', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'lilies', quantity: 3, unitCost: 0, unitSellingPrice: 200 },
      { id: '2', flowerId: 'custom', flowerName: 'leaves', quantity: 3, unitCost: 0, unitSellingPrice: 0 },
      { id: '3', flowerId: 'custom', flowerName: 'daisies', quantity: 8, unitCost: 0, unitSellingPrice: 0 }
    ], 
    totalPrice: 600, profit: 480, totalCost: 120, paymentStatus: 'Paid', paymentMode: 'UPI' 
  },
  { 
    id: 'h34', date: '2026-03-14T11:00:00.000Z', customerName: 'sayuj', 
    items: [
      { id: '1', flowerId: 'custom', flowerName: 'lilies', quantity: 2, unitCost: 0, unitSellingPrice: 200 },
      { id: '2', flowerId: 'custom', flowerName: 'tulip', quantity: 1, unitCost: 0, unitSellingPrice: 200 },
      { id: '3', flowerId: 'custom', flowerName: 'chrysanthemhem', quantity: 1, unitCost: 0, unitSellingPrice: 150 },
      { id: '4', flowerId: 'custom', flowerName: 'mini lilies', quantity: 5, unitCost: 0, unitSellingPrice: 20 },
      { id: '5', flowerId: 'custom', flowerName: 'leaves', quantity: 2, unitCost: 0, unitSellingPrice: 0 }
    ], 
    totalPrice: 850, profit: 735, totalCost: 115, paymentStatus: 'Paid', paymentMode: 'UPI' 
  }
];
