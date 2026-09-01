import { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Plus, Download, Trash2, Search } from 'lucide-react';
import { UNIT_PRICES } from './constants';
import { isFlowerPot, isKeychain, normalizeCategory, type FlowerData, type Order, type Expense, type StockItem } from './types';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from './lib/firebase';
import { AddFlowerModal } from './components/AddFlowerModal';
import { LandingPage } from './components/LandingPage';
import { OrderCalculator } from './components/OrderCalculator';
import { OrderHistory } from './components/OrderHistory';
import { StockExpenses } from './components/StockExpenses';
import { StockInventory } from './components/StockInventory';
import { MonthlyAnalytics } from './components/MonthlyAnalytics';
import { Navbar } from './components/Navbar';
import { showToast } from './components/Toast';
import './App.css';

export type PageView = 'landing' | 'database' | 'calculator' | 'history' | 'expenses' | 'stockInventory' | 'analytics';

export const calculateProductCost = (product: Partial<FlowerData>) => {
  const pc = Number(product.pipeCleanerQty || 0) * UNIT_PRICES.PIPE_CLEANER;
  const pollen = Number(product.pollenQty || 0) * UNIT_PRICES.POLLEN;
  const extra = Number(product.extraCosts || 0);
  const foamBall = product.hasFoamBall ? 16.6 : 0;

  if (isKeychain(product.category)) {
    return pc + pollen + extra + foamBall + 2.5;
  }
  if (isFlowerPot(product.category)) {
    const cups = (product.cupsQty && Number(product.cupsQty) > 0) ? Number(product.cupsQty) : 1;
    return pc + extra + foamBall + (12.4 * cups);
  }
  const glue = Number(product.glueQty || 0) * UNIT_PRICES.GLUE_SET;
  return pc + pollen + extra + foamBall + glue;
};

function App() {

  const [flowers, setFlowers] = useState<FlowerData[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const qFlowers = query(collection(db, 'flowers'), orderBy('sellingPrice', 'asc'));
    const unsubFlowers = onSnapshot(qFlowers, (snapshot) => {
      const dbFlowers = snapshot.docs.map(d => {
        const data = d.data();
        const normCat = normalizeCategory(data.category);
        if (data.category && data.category !== normCat) {
          updateDoc(doc(db, 'flowers', d.id), { category: normCat }).catch(e => console.error("Error auto-migrating category:", e));
        }
        return { ...data, category: normCat, id: d.id } as FlowerData;
      });
      setFlowers(dbFlowers);
    }, (error) => console.error(error));

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const dbOrders = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Order));
      setOrders(dbOrders);
    }, (error) => console.error(error));

    const qExpenses = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      const dbExpenses = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Expense));
      setExpenses(dbExpenses);
    }, (error) => console.error(error));

    const qStock = query(collection(db, 'stock'), orderBy('name', 'asc'));
    const unsubStock = onSnapshot(qStock, (snapshot) => {
      const dbStock = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as StockItem));
      setStock(dbStock);
    }, (error) => console.error(error));

    return () => {
      unsubFlowers();
      unsubOrders();
      unsubExpenses();
      unsubStock();
    };
  }, []);

  const handleExportBackup = () => {
    try {
      const data = { flowers, orders, expenses, stock, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cheniart-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export backup', e);
      alert('Failed to export backup');
    }
  };

  const handleUpdateStockCount = async (id: string, newCount: number) => {
    try {
      await updateDoc(doc(db, 'stock', id), { count: Math.max(0, newCount) });
    } catch (e) {
      console.error("Error updating stock:", e);
    }
  };

  const handleDeleteStock = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'stock', id));
    } catch (e) {
      console.error("Error deleting stock:", e);
    }
  };

  const handleMergeDuplicatesStock = async () => {
    try {
      const mergedMap = new Map<string, StockItem>();
      const toDelete: string[] = [];

      stock.forEach(item => {
        const key = `${item.category}-${item.name.toLowerCase().trim()}`;
        if (mergedMap.has(key)) {
          const existing = mergedMap.get(key)!;
          existing.count += item.count;
          toDelete.push(item.id);
        } else {
          mergedMap.set(key, { ...item });
        }
      });

      // Update the main items
      for (const item of Array.from(mergedMap.values())) {
        await updateDoc(doc(db, 'stock', item.id), { count: item.count });
      }

      // Delete the duplicates
      for (const id of toDelete) {
        await deleteDoc(doc(db, 'stock', id));
      }

      alert(`Merged successfully! Deleted ${toDelete.length} duplicate entries.`);
    } catch (e) {
      console.error("Error merging duplicates:", e);
      alert('Failed to merge duplicates.');
    }
  };

  const updateOrder = async (updatedOrder: Partial<Order> & { id: string }) => {
    try {
      if (!updatedOrder.id) throw new Error("Order ID is missing");
      const orderRef = doc(db, 'orders', updatedOrder.id);

      // Clean data to prevent undefined fields from throwing Firestore errors
      const cleanData = JSON.parse(JSON.stringify(updatedOrder, (_key, value) =>
        value === undefined ? null : value
      ));

      await updateDoc(orderRef, cleanData);

      // Update local state if necessary (onSnapshot already handles it, but adding for completeness)
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } as Order : o));
    } catch (error) {
      console.error("Error updating order in Firebase:", error);
      throw error;
    }
  };

  const handleEmergencyRestore = async () => {
    try {
      const emergencyData = [
        { date: '2025-12-01T10:00:00.000Z', tripTotal: 330, items: [{ name: 'Restored Item', qty: 1, unitPrice: 330, totalPrice: 330 }] },
        { date: '2025-12-05T10:00:00.000Z', tripTotal: 1045, items: [{ name: 'Restored Item', qty: 1, unitPrice: 1045, totalPrice: 1045 }] },
        { date: '2025-12-10T10:00:00.000Z', tripTotal: 340, items: [{ name: 'Restored Item', qty: 1, unitPrice: 340, totalPrice: 340 }] },
        { date: '2025-12-15T10:00:00.000Z', tripTotal: 220, items: [{ name: 'Restored Item', qty: 1, unitPrice: 220, totalPrice: 220 }] },
        { date: '2025-12-20T10:00:00.000Z', tripTotal: 1413, items: [{ name: 'Restored Item', qty: 1, unitPrice: 1413, totalPrice: 1413 }] },
        { date: '2025-12-25T10:00:00.000Z', tripTotal: 1225, items: [{ name: 'Restored Item', qty: 1, unitPrice: 1225, totalPrice: 1225 }] },
        { date: '2025-12-28T10:00:00.000Z', tripTotal: 630, items: [{ name: 'Restored Item', qty: 1, unitPrice: 630, totalPrice: 630 }] },
        { date: '2026-01-05T10:00:00.000Z', tripTotal: 3514, items: [{ name: 'Restored Item', qty: 1, unitPrice: 3514, totalPrice: 3514 }] },
        { date: '2026-01-15T10:00:00.000Z', tripTotal: 400, items: [{ name: 'Restored Item', qty: 1, unitPrice: 400, totalPrice: 400 }] },
        { date: '2026-01-25T10:00:00.000Z', tripTotal: 845, items: [{ name: 'Restored Item', qty: 1, unitPrice: 845, totalPrice: 845 }] },
        { date: '2026-02-05T10:00:00.000Z', tripTotal: 575, items: [{ name: 'Restored Item', qty: 1, unitPrice: 575, totalPrice: 575 }] },
        { date: '2026-02-15T10:00:00.000Z', tripTotal: 415, items: [{ name: 'Restored Item', qty: 1, unitPrice: 415, totalPrice: 415 }] },
        { date: '2026-02-25T10:00:00.000Z', tripTotal: 65, items: [{ name: 'Restored Item', qty: 1, unitPrice: 65, totalPrice: 65 }] },
        { date: '2026-03-05T10:00:00.000Z', tripTotal: 790, items: [{ name: 'Restored Item', qty: 1, unitPrice: 790, totalPrice: 790 }] },
        { date: '2026-03-15T10:00:00.000Z', tripTotal: 480, items: [{ name: 'Restored Item', qty: 1, unitPrice: 480, totalPrice: 480 }] },
        { date: '2026-03-25T10:00:00.000Z', tripTotal: 3234, items: [{ name: 'Restored Item', qty: 1, unitPrice: 3234, totalPrice: 3234 }] },
        { date: '2026-04-05T10:00:00.000Z', tripTotal: 1300, items: [{ name: 'Restored Item', qty: 1, unitPrice: 1300, totalPrice: 1300 }] }
      ];

      for (const trip of emergencyData) {
        await addDoc(collection(db, 'expenses'), trip);
      }
      alert('17 Emergency trips restored successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to restore trips');
    }
  };

  const handleAddFlower = async (newFlower: FlowerData) => {
    try {
      const pQty = Number(newFlower.pipeCleanerQty) || 0;
      const polQty = Number(newFlower.pollenQty) || 0;
      const gQty = Number(newFlower.glueQty) || 0;
      const extC = Number(newFlower.extraCosts) || 0;
      const tMarg = Number(newFlower.targetMargin) || 0;

      let totalCost = calculateProductCost(newFlower);

      let sPrice = Number(newFlower.sellingPrice) || 0;
      if (tMarg > 0 && tMarg < 100) {
        sPrice = totalCost / (1 - (tMarg / 100));
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...productDataWithoutId } = newFlower;
      const finalData = {
        ...productDataWithoutId,
        category: normalizeCategory(newFlower.category),
        pipeCleanerQty: pQty,
        pollenQty: polQty,
        glueQty: gQty,
        extraCosts: extC,
        sellingPrice: sPrice,
        targetMargin: tMarg,
        totalCost: totalCost,
        actualMaterialCost: (newFlower as any).actualMaterialCost || undefined,
        isStockDeducted: (newFlower as any).isStockDeducted || false
      };

      // Clean data to prevent undefined fields from throwing Firestore errors
      const cleanData = JSON.parse(JSON.stringify(finalData, (_key, value) =>
        value === undefined ? null : value
      ));

      await addDoc(collection(db, 'flowers'), cleanData);
    } catch (e) {
      console.error("Error adding flower: ", e);
      throw e;
    }
  };

  const handleUpdateFlowerDatabase = async (id: string, field: keyof FlowerData, value: number | string) => {
    const f = flowers.find(fl => fl.id === id);
    if (!f) return;

    const updatedF = { ...f, [field]: field === 'name' || field === 'category' ? value : Number(value) || 0 };
    if (field === 'category') {
      updatedF.category = normalizeCategory(value as string);
    }

    // Compute raw cost immediately with new values
    const newCost = calculateProductCost(updatedF);

    if (field === 'targetMargin') {
      const tm = Number(value) || 0;
      if (tm < 100) updatedF.sellingPrice = newCost / (1 - (tm / 100));
    } else if (field === 'sellingPrice') {
      const sp = Number(value) || 0;
      if (sp > 0) updatedF.targetMargin = ((sp - newCost) / sp) * 100;
      else updatedF.targetMargin = 0;
    } else if (field !== 'name') {
      // Derived ingredient edit -> push existing margin to new selling price
      const tm = updatedF.targetMargin !== undefined ? updatedF.targetMargin :
        (updatedF.sellingPrice > 0 ? ((updatedF.sellingPrice - newCost) / updatedF.sellingPrice) * 100 : 0);

      if (tm < 100) updatedF.sellingPrice = newCost / (1 - (tm / 100));
      updatedF.targetMargin = tm; // lock the implied margin
    }

    try {
      await updateDoc(doc(db, 'flowers', id), updatedF);
    } catch (e) {
      console.error("Error updating flower: ", e);
    }
  };

  const handleDeleteFlower = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name} from the database? This cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'flowers', id));
      } catch (e) {
        console.error('Error deleting flower: ', e);
      }
    }
  };

  const handleAddStock = async (stockItem: Omit<StockItem, 'id'>, silent = false) => {
    try {
      const match = stock.find(s => s.name.toLowerCase() === stockItem.name.toLowerCase() && s.category === stockItem.category);
      if (match) {
        const newTotal = match.count + stockItem.count;
        await updateDoc(doc(db, 'stock', match.id), { count: newTotal });
        if (!silent) showToast(`Stock Updated: ${stockItem.name} total is now ${newTotal}.`);
      } else {
        await addDoc(collection(db, 'stock'), stockItem);
        if (!silent) showToast(`Added ${stockItem.name} to stock!`);
      }
    } catch (e) {
      console.error(e);
      if (!silent) showToast("Error adding to stock");
    }
  };

  // Math calculated properties
  const tableData = useMemo(() => {
    return flowers.map(flower => {
      const costPrice = calculateProductCost(flower);

      const profit = flower.sellingPrice - costPrice;
      const hasCustomMargin = flower.targetMargin !== undefined && flower.targetMargin !== null && (flower.targetMargin as any) !== "" && flower.targetMargin !== 0;
      const profitMargin = hasCustomMargin ? Number(flower.targetMargin) : (flower.sellingPrice > 0 ? (profit / flower.sellingPrice) * 100 : 0);

      return {
        ...flower,
        costPrice,
        profit,
        profitMargin
      };
    });
  }, [flowers]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage flowers={flowers} orders={orders} expenses={expenses} />} />
        <Route path="/calculator" element={
          <OrderCalculator
            flowers={flowers}
            onSaveOrder={async (order: any) => {
              try {
                console.log("Attempting to save order:", order);
                const { id, ...orderData } = order;

                // Clean data: Firestore doesn't like undefined
                const cleanData = JSON.parse(JSON.stringify(orderData, (_key, value) =>
                  value === undefined ? null : value
                ));

                const docRef = await addDoc(collection(db, 'orders'), cleanData);
                console.log("Order saved successfully with ID:", docRef.id);
                return docRef;
              } catch (e) {
                console.error("Error creating order: ", e);
                alert("Failed to save order. Please check console.");
                throw e;
              }
            }}
          />
        } />
        <Route path="/history" element={
          <OrderHistory
            orders={orders}
            flowers={flowers}
            onUpdateOrder={updateOrder}
            onDeleteOrder={async (id) => {
              try { await deleteDoc(doc(db, 'orders', id)); } catch (e) { console.error(e); }
            }}
            onAddOrder={async (orderData: any) => {
              try {
                const cleanData = JSON.parse(JSON.stringify(orderData, (_key, value) =>
                  value === undefined ? null : value
                ));
                const docRef = await addDoc(collection(db, 'orders'), cleanData);
                return docRef;
              } catch (e) { console.error(e); }
            }}
          />
        } />
        <Route path="/expenses" element={
          <StockExpenses
            stock={stock}
            expenses={expenses}
            onSaveTrip={async (tripData: Omit<Expense, 'id'>) => {
              try {
                await addDoc(collection(db, 'expenses'), tripData);

                for (const item of tripData.items) {
                  if (item.name === 'Historical Bill Consolidation' || item.name === 'Spreadsheet Balance Correction') continue;

                  let category: StockItem['category'] = 'Accessories';
                  const lowName = item.name.toLowerCase();

                  if (lowName.includes('pipe cleaner')) category = 'Pipe Cleaners';
                  else if (lowName.includes('wrapping paper') || lowName.includes('wrapping sheet')) category = 'Wrapping Sheets';
                  else if (lowName.includes('mesh wrap') || lowName.includes('pearl wrap')) category = 'Mesh Wrap';
                  else if (lowName.includes('ribbon')) category = 'Ribbons';

                  await handleAddStock({
                    name: item.name,
                    category,
                    count: item.qty
                  }, false);
                }
              } catch (e) {
                console.error("Error saving trip: ", e);
              }
            }}
            onUpdateTrip={async (id: string, tripData: Partial<Expense>) => {
              try { await updateDoc(doc(db, 'expenses', id), tripData); } catch (e) { console.error(e); }
            }}
            onDeleteTrip={async (id: string) => {
              try { await deleteDoc(doc(db, 'expenses', id)); } catch (e) { console.error(e); }
            }}
          />
        } />
        <Route path="/stock" element={
          <StockInventory
            stock={stock}
            onUpdateStock={handleUpdateStockCount}
            onDeleteStock={handleDeleteStock}
            onMergeDuplicates={handleMergeDuplicatesStock}
            onAddStock={handleAddStock}
          />
        } />
        <Route path="/analytics" element={<MonthlyAnalytics orders={orders} expenses={expenses} />} />

        {/* DATABASE PAGE */}
        <Route path="/inventory" element={
          <div className="dashboard-container">
            <Navbar />
            <header className="dashboard-header" style={{ justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="search-bar" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-color)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)', gap: '0.5rem' }}>
                  <Search size={16} style={{ color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', width: '200px' }}
                  />
                </div>
                <button
                  onClick={handleExportBackup}
                  className="ghost-btn"
                  style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                  title="Download JSON Backup"
                >
                  <Download size={16} /> Backup Database
                </button>
                {expenses.reduce((sum, exp) => sum + (Number(exp.tripTotal) || 0), 0) < 16800 && (
                  <button
                    onClick={handleEmergencyRestore}
                    className="ghost-btn"
                    style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', color: '#ef4444', border: '1px solid #ef4444' }}
                    title="Emergency Restore Expenses"
                  >
                    Restore Missing Data
                  </button>
                )}
                <span className="badge">Product Database</span>
              </div>
            </header>

            <main className="dashboard-content">

              {/* FLOWERS SECTION */}
              <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-dark)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🌸 Flowers
                </h2>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th className="number-col">PC Qty</th>
                        <th className="number-col">Pollen Qty</th>
                        <th className="number-col">Extra Costs (₹)</th>
                        <th className="number-col highlight-gray">Cost Price</th>
                        <th className="number-col editable-col" style={{ color: 'var(--primary-dark)', fontWeight: 800 }}>
                          Selling Price <span style={{ fontSize: '0.875rem', marginLeft: '4px', opacity: 0.8 }}>↑</span>
                        </th>
                        <th className="number-col highlight-gray">Profit (₹)</th>
                        <th className="number-col highlight-green" style={{ color: 'var(--primary-color)' }}>Target Margin %</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.filter(r => (!r.category || (!isKeychain(r.category) && !isFlowerPot(r.category))) && r.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                        <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No items yet</td></tr>
                      ) : (
                        tableData
                          .filter(r => (!r.category || (!isKeychain(r.category) && !isFlowerPot(r.category))) && r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((row) => (
                            <tr key={row.id}>
                              <td className="font-medium">
                                <input
                                  type="text" value={row.name}
                                  onChange={(e) => handleUpdateFlowerDatabase(row.id, 'name', e.target.value)}
                                  className="saas-input"
                                  style={{ width: '130px', fontWeight: 500, height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }}
                                  onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'}
                                />
                              </td>
                              <td>
                                <select
                                  value={normalizeCategory(row.category)}
                                  onChange={(e) => handleUpdateFlowerDatabase(row.id, 'category', e.target.value)}
                                  className="saas-input"
                                  style={{ width: '100px', height: '32px', padding: '0 0.2rem', backgroundColor: 'transparent', border: '1px solid transparent', fontSize: '0.85rem' }}
                                >
                                  <option value="Flowers">Flowers</option>
                                  <option value="Keychain">Keychain</option>
                                  <option value="Flower Pots">Pots</option>
                                </select>
                              </td>
                              <td className="number-col">
                                <input type="number" min="0" value={row.pipeCleanerQty} onChange={(e) => handleUpdateFlowerDatabase(row.id, 'pipeCleanerQty', e.target.value)} className="saas-input" style={{ width: '50px', textAlign: 'right', height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }} onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'} />
                              </td>
                              <td className="number-col">
                                <input type="number" min="0" value={row.pollenQty} onChange={(e) => handleUpdateFlowerDatabase(row.id, 'pollenQty', e.target.value)} className="saas-input" style={{ width: '50px', textAlign: 'right', height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }} onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'} />
                              </td>
                              <td className="number-col">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                  <span style={{ opacity: 0.5 }}>₹</span>
                                  <input type="number" min="0" step="0.1" value={row.extraCosts} onChange={(e) => handleUpdateFlowerDatabase(row.id, 'extraCosts', e.target.value)} className="saas-input" style={{ width: '70px', textAlign: 'right', height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }} onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'} />
                                </div>
                              </td>
                              <td className="number-col font-medium highlight-gray">₹{row.costPrice.toFixed(0)}</td>
                              <td className="number-col editable-col">
                                <div className="editable-wrapper" style={{ border: '2px solid rgba(122, 144, 120, 0.4)', borderRadius: '6px' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>₹</span>
                                  <input
                                    type="number" value={row.sellingPrice ? Number(row.sellingPrice).toFixed(0) : ''}
                                    onChange={(e) => handleUpdateFlowerDatabase(row.id, 'sellingPrice', e.target.value)}
                                    className="price-input" style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '1.05rem' }}
                                  />
                                </div>
                              </td>
                              <td className="number-col font-medium highlight-gray">₹{row.profit.toFixed(0)}</td>
                              <td className="number-col font-bold highlight-green">
                                <div className="editable-wrapper" style={{ backgroundColor: 'rgba(122, 144, 120, 0.1)', border: '1px solid rgba(122, 144, 120, 0.2)', padding: '0.1rem 0.5rem', borderRadius: '4px', width: 'fit-content', marginLeft: 'auto' }}>
                                  <input
                                    type="number" value={row.profitMargin != null && (row.profitMargin as any) !== "" ? Number(row.profitMargin).toFixed(1) : ''}
                                    onChange={(e) => handleUpdateFlowerDatabase(row.id, 'targetMargin', e.target.value)}
                                    className="price-input" style={{ width: '50px', backgroundColor: 'transparent', color: 'var(--primary-color)' }}
                                  />
                                  <span style={{ color: 'var(--primary-color)' }}>%</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button onClick={() => handleDeleteFlower(row.id, row.name)} style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }} title="Delete Flower">
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* KEYCHAINS SECTION */}
              <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-dark)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🔑 Keychains
                </h2>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th className="number-col">PC Qty</th>
                        <th className="number-col">Keychain Accessory</th>
                        <th className="number-col">Extra Costs (₹)</th>
                        <th className="number-col highlight-gray">Cost Price</th>
                        <th className="number-col editable-col" style={{ color: 'var(--primary-dark)', fontWeight: 800 }}>
                          Selling Price <span style={{ fontSize: '0.875rem', marginLeft: '4px', opacity: 0.8 }}>↑</span>
                        </th>
                        <th className="number-col highlight-gray">Profit (₹)</th>
                        <th className="number-col highlight-green" style={{ color: 'var(--primary-color)' }}>Target Margin %</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.filter(r => isKeychain(r.category) && r.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                        <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No items yet</td></tr>
                      ) : (
                        tableData
                          .filter(r => isKeychain(r.category) && r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((row) => (
                            <tr key={row.id}>
                              <td className="font-medium">
                                <input
                                  type="text" value={row.name}
                                  onChange={(e) => handleUpdateFlowerDatabase(row.id, 'name', e.target.value)}
                                  className="saas-input"
                                  style={{ width: '130px', fontWeight: 500, height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }}
                                  onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'}
                                />
                              </td>
                              <td>
                                <select
                                  value={normalizeCategory(row.category)}
                                  onChange={(e) => handleUpdateFlowerDatabase(row.id, 'category', e.target.value)}
                                  className="saas-input"
                                  style={{ width: '100px', height: '32px', padding: '0 0.2rem', backgroundColor: 'transparent', border: '1px solid transparent', fontSize: '0.85rem' }}
                                >
                                  <option value="Flowers">Flowers</option>
                                  <option value="Keychain">Keychain</option>
                                  <option value="Flower Pots">Pots</option>
                                </select>
                              </td>
                              <td className="number-col">
                                <input type="number" min="0" value={row.pipeCleanerQty} onChange={(e) => handleUpdateFlowerDatabase(row.id, 'pipeCleanerQty', e.target.value)} className="saas-input" style={{ width: '50px', textAlign: 'right', height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }} onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'} />
                              </td>
                              <td className="number-col">
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.3rem 0.5rem', background: 'rgba(0,0,0,0.04)', borderRadius: '4px' }}>
                                  Included (₹2.50)
                                </span>
                              </td>
                              <td className="number-col">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                  <span style={{ opacity: 0.5 }}>₹</span>
                                  <input type="number" min="0" step="0.1" value={row.extraCosts} onChange={(e) => handleUpdateFlowerDatabase(row.id, 'extraCosts', e.target.value)} className="saas-input" style={{ width: '70px', textAlign: 'right', height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }} onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'} />
                                </div>
                              </td>
                              <td className="number-col font-medium highlight-gray">₹{row.costPrice.toFixed(0)}</td>
                              <td className="number-col editable-col">
                                <div className="editable-wrapper" style={{ border: '2px solid rgba(122, 144, 120, 0.4)', borderRadius: '6px' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>₹</span>
                                  <input
                                    type="number" value={row.sellingPrice ? Number(row.sellingPrice).toFixed(0) : ''}
                                    onChange={(e) => handleUpdateFlowerDatabase(row.id, 'sellingPrice', e.target.value)}
                                    className="price-input" style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '1.05rem' }}
                                  />
                                </div>
                              </td>
                              <td className="number-col font-medium highlight-gray">₹{row.profit.toFixed(0)}</td>
                              <td className="number-col font-bold highlight-green">
                                <div className="editable-wrapper" style={{ backgroundColor: 'rgba(122, 144, 120, 0.1)', border: '1px solid rgba(122, 144, 120, 0.2)', padding: '0.1rem 0.5rem', borderRadius: '4px', width: 'fit-content', marginLeft: 'auto' }}>
                                  <input
                                    type="number" value={row.profitMargin != null && (row.profitMargin as any) !== "" ? Number(row.profitMargin).toFixed(1) : ''}
                                    onChange={(e) => handleUpdateFlowerDatabase(row.id, 'targetMargin', e.target.value)}
                                    className="price-input" style={{ width: '50px', backgroundColor: 'transparent', color: 'var(--primary-color)' }}
                                  />
                                  <span style={{ color: 'var(--primary-color)' }}>%</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button onClick={() => handleDeleteFlower(row.id, row.name)} style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }} title="Delete Flower">
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* FLOWER POTS SECTION */}
              <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-dark)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🪴 Flower Pots
                </h2>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th className="number-col">PC Qty</th>
                        <th className="number-col">Cup / Base</th>
                        <th className="number-col">Extra Costs (₹)</th>
                        <th className="number-col highlight-gray">Cost Price</th>
                        <th className="number-col editable-col" style={{ color: 'var(--primary-dark)', fontWeight: 800 }}>
                          Selling Price <span style={{ fontSize: '0.875rem', marginLeft: '4px', opacity: 0.8 }}>↑</span>
                        </th>
                        <th className="number-col highlight-gray">Profit (₹)</th>
                        <th className="number-col highlight-green" style={{ color: 'var(--primary-color)' }}>Target Margin %</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.filter(r => isFlowerPot(r.category) && r.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                        <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No items yet</td></tr>
                      ) : (
                        tableData
                          .filter(r => isFlowerPot(r.category) && r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((row) => (
                            <tr key={row.id}>
                              <td className="font-medium">
                                <input
                                  type="text" value={row.name}
                                  onChange={(e) => handleUpdateFlowerDatabase(row.id, 'name', e.target.value)}
                                  className="saas-input"
                                  style={{ width: '130px', fontWeight: 500, height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }}
                                  onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'}
                                />
                              </td>
                              <td>
                                <select
                                  value={normalizeCategory(row.category)}
                                  onChange={(e) => handleUpdateFlowerDatabase(row.id, 'category', e.target.value)}
                                  className="saas-input"
                                  style={{ width: '100px', height: '32px', padding: '0 0.2rem', backgroundColor: 'transparent', border: '1px solid transparent', fontSize: '0.85rem' }}
                                >
                                  <option value="Flowers">Flowers</option>
                                  <option value="Keychain">Keychain</option>
                                  <option value="Flower Pots">Pots</option>
                                </select>
                              </td>
                              <td className="number-col">
                                <input type="number" min="0" value={row.pipeCleanerQty} onChange={(e) => handleUpdateFlowerDatabase(row.id, 'pipeCleanerQty', e.target.value)} className="saas-input" style={{ width: '50px', textAlign: 'right', height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }} onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'} />
                              </td>
                              <td className="number-col">
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.3rem 0.5rem', background: 'rgba(0,0,0,0.04)', borderRadius: '4px' }}>
                                  Included (₹12.40)
                                </span>
                              </td>
                              <td className="number-col">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                  <span style={{ opacity: 0.5 }}>₹</span>
                                  <input type="number" min="0" step="0.1" value={row.extraCosts} onChange={(e) => handleUpdateFlowerDatabase(row.id, 'extraCosts', e.target.value)} className="saas-input" style={{ width: '70px', textAlign: 'right', height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }} onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'} />
                                </div>
                              </td>
                              <td className="number-col font-medium highlight-gray">₹{row.costPrice.toFixed(0)}</td>
                              <td className="number-col editable-col">
                                <div className="editable-wrapper" style={{ border: '2px solid rgba(122, 144, 120, 0.4)', borderRadius: '6px' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>₹</span>
                                  <input
                                    type="number" value={row.sellingPrice ? Number(row.sellingPrice).toFixed(0) : ''}
                                    onChange={(e) => handleUpdateFlowerDatabase(row.id, 'sellingPrice', e.target.value)}
                                    className="price-input" style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '1.05rem' }}
                                  />
                                </div>
                              </td>
                              <td className="number-col font-medium highlight-gray">₹{row.profit.toFixed(0)}</td>
                              <td className="number-col font-bold highlight-green">
                                <div className="editable-wrapper" style={{ backgroundColor: 'rgba(122, 144, 120, 0.1)', border: '1px solid rgba(122, 144, 120, 0.2)', padding: '0.1rem 0.5rem', borderRadius: '4px', width: 'fit-content', marginLeft: 'auto' }}>
                                  <input
                                    type="number" value={row.profitMargin != null && (row.profitMargin as any) !== "" ? Number(row.profitMargin).toFixed(1) : ''}
                                    onChange={(e) => handleUpdateFlowerDatabase(row.id, 'targetMargin', e.target.value)}
                                    className="price-input" style={{ width: '50px', backgroundColor: 'transparent', color: 'var(--primary-color)' }}
                                  />
                                  <span style={{ color: 'var(--primary-color)' }}>%</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button onClick={() => handleDeleteFlower(row.id, row.name)} style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }} title="Delete Flower">
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

            </main>

            <button className="fab-btn" onClick={() => setIsModalOpen(true)} title="Add New Product">
              <Plus size={24} />
            </button>

            <AddFlowerModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onAdd={handleAddFlower}
            />
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
