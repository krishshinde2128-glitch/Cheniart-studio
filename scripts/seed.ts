import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore/lite';

const firebaseConfig = {
  apiKey: "AIzaSyBNMw_JcnQ-NWPXXcYFUCB9zuXk1lxBU6k",
  authDomain: "cheniart-studio.firebaseapp.com",
  projectId: "cheniart-studio",
  storageBucket: "cheniart-studio.firebasestorage.app",
  messagingSenderId: "133954899211",
  appId: "1:133954899211:web:26a709e2f5d330309f660e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const flowersInput = [
  { name: 'spiral leaves', pc: 7, extras: 3.5, pollen: 0, margin: 70 },
  { name: 'flat leaves', pc: 7, extras: 3.5, pollen: 0, margin: 70 },
  { name: 'daisies', pc: 5, extras: 4, pollen: 0, margin: 73 },
  { name: 'babies breath', pc: 6, extras: 4, pollen: 0, margin: 71 },
  { name: 'rose', pc: 14, extras: 3.5, pollen: 0, margin: 90 },
  { name: 'tulips', pc: 16, extras: 3.5, pollen: 0, margin: 90 },
  { name: 'lavander', pc: 15, extras: 7, pollen: 0, margin: 90 },
  { name: 'hyacinth', pc: 18, extras: 4, pollen: 4, margin: 88 },
  { name: 'chrysanthemum', pc: 14, extras: 4, pollen: 1, margin: 90 },
  { name: 'hibiscus', pc: 17, extras: 3.5, pollen: 1, margin: 91 },
  { name: 'lilies', pc: 17, extras: 3.5, pollen: 1, margin: 91 },
  { name: 'small sunflower', pc: 19, extras: 3.5, pollen: 0, margin: 91 },
  { name: 'normal sunflowers', pc: 49, extras: 3.5, pollen: 0, margin: 91 },
  { name: 'orchids', pc: 40, extras: 3.5, pollen: 0, margin: 92 },
  { name: 'stargazing lily', pc: 36, extras: 3.5, pollen: 0, margin: 91 },
  { name: 'heart', pc: 3, extras: 1, pollen: 0, margin: 77 },
];

const ordersInput = [
  { date: '2025-12-19T10:00:00.000Z', name: 'aryan mehra', items: 'single rose', total: 100, profit: 85, status: 'Paid' },
  { date: '2026-01-07T10:00:00.000Z', name: 'drushti', items: 'single lily', total: 200, profit: 182, status: 'Paid' },
  { date: '2026-01-07T11:00:00.000Z', name: 'maalu', items: '2 lily, 3 tulip, 8 daisy, 2 babies breath, 2 leaves', total: 500, profit: 321, status: 'Paid' },
  { date: '2026-01-08T10:00:00.000Z', name: 'arya', items: '1 lily, 1 rose, 1 leaf, 1 babies breath', total: 470, profit: 366, status: 'Paid' },
  { date: '2026-01-14T10:00:00.000Z', name: 'zeba', items: '2 stargazer lily', total: 800, profit: 716, status: 'Paid' },
  { date: '2026-01-16T10:00:00.000Z', name: 'daanesh', items: '1 lily, 1 tulip, 1 leaf, 1 babies breath', total: 490, profit: 390, status: 'Paid' },
  { date: '2026-01-16T11:00:00.000Z', name: 'masi', items: 'rose bouquet', total: 120, profit: 100, status: 'Paid' },
  { date: '2026-01-23T10:00:00.000Z', name: 'prathmesh', items: '3 tulips, 2 leafs', total: 540, profit: 426, status: 'Paid' },
  { date: '2026-01-24T10:00:00.000Z', name: 'masi', items: 'rose bouquet (x2)', repeat: 2, total: 120, profit: 100, status: 'Paid' },
  { date: '2026-01-30T10:00:00.000Z', name: 'scarlet', items: '3 lilies, 2 leaf', total: 750, profit: 405, status: 'Paid' },
  { date: '2026-02-03T10:00:00.000Z', name: 'niharika', items: '2 lilies, 1 rose, 2 leaves, 1 baby\'s breath', total: 840, profit: 600, status: 'Paid' },
  { date: '2026-02-05T10:00:00.000Z', name: 'leisha', items: '3 lilies, 3 leaves, 8 daisies', total: 900, profit: 583, status: 'Paid' },
  { date: '2026-02-11T10:00:00.000Z', name: 'masi', items: 'rose bouquet (x4)', repeat: 4, total: 120, profit: 70, status: 'Paid' },
  { date: '2026-02-11T11:00:00.000Z', name: 'gwyneth', items: '2 lilies, 3 tulips, 2 leaves, 8 daisies', total: 1500, profit: 1332, status: 'Paid' },
  { date: '2026-02-12T10:00:00.000Z', name: 'james', items: '1 sunflower, 1 lavender, 15 forget me nots, 1 leaves', total: 700, profit: 567, status: 'Paid' },
  { date: '2026-02-13T10:00:00.000Z', name: 'nigel sir', items: '1 sunflower, 6 daisies, 1 baby\'s breath, 2 leaves', total: 600, profit: 242, status: 'Paid' },
  { date: '2026-02-14T10:00:00.000Z', name: 'gwyneth', items: '1 lily, 1 tulip, 1 leaf, 1 baby\'s breath', total: 490, profit: 390, status: 'Paid' },
  { date: '2026-02-18T10:00:00.000Z', name: 'akansha', items: '2 lilies, 1 hibiscus, 2 tulips, 2 hearts, 1 stuff toy', total: 1300, profit: 961, status: 'Paid' },
  { date: '2026-03-01T10:00:00.000Z', name: 'vanshika', items: 'sunflower keychain, lily keychain', total: 260, profit: 236, status: 'Paid' },
  { date: '2026-03-09T10:00:00.000Z', name: 'masi', items: 'rose bouquet', total: 120, profit: 100, status: 'Paid' },
  { date: '2026-03-10T10:00:00.000Z', name: 'kanishk', items: '3 lilies, 3 leaves, 8 daisies', total: 600, profit: 480, status: 'Paid' },
  { date: '2026-03-14T10:00:00.000Z', name: 'aryan m', items: 'sunflower keychain', total: 100, profit: 87, status: 'Paid' },
  { date: '2026-03-14T11:00:00.000Z', name: 'sayuj', items: '2 lilies, 1 tulip, 1 chrysanthemem, 5 mini lilies, 2 leaves', total: 850, profit: 735, status: 'Paid' },
  { date: '2026-03-16T10:00:00.000Z', name: 'nilay', items: 'sunflower keychain', total: 120, profit: 107, status: 'Paid' },
  { date: '2026-03-20T10:00:00.000Z', name: 'masi', items: 'rose bouquet (x3)', repeat: 3, total: 120, profit: 100, status: 'Paid' },
];

async function seed() {
  console.log("Starting Flower Database Backfill...");
  const flowerRef = collection(db, 'flowers');
  for (const f of flowersInput) {
    const cost = (f.pc * 0.8) + (f.pollen * 0.2815) + f.extras;
    const sp = cost / (1 - (f.margin / 100));

    await addDoc(flowerRef, {
      name: f.name,
      pipeCleanerQty: f.pc,
      pollenQty: f.pollen,
      glueQty: 0,
      extraCosts: f.extras,
      targetMargin: f.margin,
      sellingPrice: sp
    });
    console.log(`Seeded flower: ${f.name}`);
  }

  console.log("\nStarting Order History Backfill...");
  const ordersRef = collection(db, 'orders');
  
  for (const o of ordersInput) {
    const repeats = (o as any).repeat || 1;
    
    // Parse items gracefully
    const splitItems = o.items.split(',').map(s => s.trim().replace('(x2)', '').replace('(x3)', '').replace('(x4)', '').trim());
    const orderItems = splitItems.map(str => {
      const parts = str.split(' ');
      let qty = 1;
      let name = str;
      if (!isNaN(parseInt(parts[0]))) {
        qty = parseInt(parts[0]);
        name = parts.slice(1).join(' ');
      }
      return {
        id: Math.random().toString(36).substr(2, 9),
        flowerId: 'historical',
        flowerName: name,
        quantity: qty,
        unitCostPrice: 0,
        unitSellingPrice: 0
      };
    });

    for (let i = 0; i < repeats; i++) {
        await addDoc(ordersRef, {
            customerName: o.name,
            date: o.date,
            items: orderItems,
            totalCost: o.total - o.profit,
            totalPrice: o.total,
            profit: o.profit,
            paymentMode: 'UPI',
            paymentStatus: o.status,
            isDelivered: true,
            additionalFees: []
        });
        console.log(`Seeded Order: ${o.name} for ${o.total}`);
    }
  }

  console.log("Migration Complete!");
  process.exit(0);
}

seed().catch(console.error);
