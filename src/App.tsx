import { useState, useMemo, useEffect } from 'react';
import { Plus, Flower2, Download, Trash2, Search } from 'lucide-react';
import { UNIT_PRICES } from './constants';
import type { FlowerData, Order, Expense, StockItem } from './types';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from './lib/firebase';
import { AddFlowerModal } from './components/AddFlowerModal';
import { LandingPage } from './components/LandingPage';
import { OrderCalculator } from './components/OrderCalculator';
import { OrderHistory } from './components/OrderHistory';
import { StockExpenses } from './components/StockExpenses';
import { StockInventory } from './components/StockInventory';
import { MonthlyAnalytics } from './components/MonthlyAnalytics';
import './App.css';

export type PageView = 'landing' | 'database' | 'calculator' | 'history' | 'expenses' | 'stockInventory' | 'analytics';

export const calculateProductCost = (product: Partial<FlowerData>) => {
  const pc = Number(product.pipeCleanerQty || 0) * UNIT_PRICES.PIPE_CLEANER;
  const pollen = Number(product.pollenQty || 0) * UNIT_PRICES.POLLEN;
  const extra = Number(product.extraCosts || 0);

  if (product.category === 'Keychain') {
    return pc + pollen + extra + 2.5;
  }
  if (product.category === 'Flower Pots') {
    return pc + extra + 12.4;
  }
  const glue = Number(product.glueQty || 0) * UNIT_PRICES.GLUE_SET;
  return pc + pollen + extra + glue;
};

function App() {
  const [currentPage, setCurrentPage] = useState<PageView>('landing');
  
  const [flowers, setFlowers] = useState<FlowerData[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const qFlowers = query(collection(db, 'flowers'), orderBy('sellingPrice', 'asc'));
    const unsubFlowers = onSnapshot(qFlowers, (snapshot) => {
      const dbFlowers = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as FlowerData));
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
        pipeCleanerQty: pQty,
        pollenQty: polQty,
        glueQty: gQty,
        extraCosts: extC,
        sellingPrice: sPrice,
        targetMargin: tMarg,
        totalCost: totalCost
      };

      await addDoc(collection(db, 'flowers'), finalData);
    } catch (e) {
      console.error("Error adding flower: ", e);
      throw e;
    }
  };

  const handleUpdateFlowerDatabase = async (id: string, field: keyof FlowerData, value: number | string) => {
    const f = flowers.find(fl => fl.id === id);
    if (!f) return;
    
    const updatedF = { ...f, [field]: field === 'name' || field === 'category' ? value : Number(value) || 0 };
    
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

  // Math calculated properties
  const tableData = useMemo(() => {
    return flowers.map(flower => {
      const costPrice = calculateProductCost(flower);
      
      const profit = flower.sellingPrice - costPrice;
      const profitMargin = flower.targetMargin !== undefined ? flower.targetMargin : (flower.sellingPrice > 0 ? (profit / flower.sellingPrice) * 100 : 0);

      return {
        ...flower,
        costPrice,
        profit,
        profitMargin
      };
    });
  }, [flowers]);

  if (currentPage === 'landing') {
    return <LandingPage onNavigate={setCurrentPage} flowers={flowers} orders={orders} expenses={expenses} />;
  }

  if (currentPage === 'calculator') {
    return <OrderCalculator 
      onNavigate={setCurrentPage} 
      flowers={flowers} 
      onSaveOrder={async (order) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, ...orderData } = order;
          await addDoc(collection(db, 'orders'), orderData);
        } catch (e) {
          console.error("Error creating order: ", e);
        }
      }} 
    />;
  }

  if (currentPage === 'history') {
    return <OrderHistory 
      onNavigate={setCurrentPage} 
      orders={orders} 
      flowers={flowers} 
      onUpdateOrder={async (id, newData) => {
        try { await updateDoc(doc(db, 'orders', id), newData); } catch (e) { console.error(e); }
      }}
      onDeleteOrder={async (id) => {
        try { await deleteDoc(doc(db, 'orders', id)); } catch (e) { console.error(e); }
      }}
    />;
  }

  if (currentPage === 'expenses') {
    return <StockExpenses 
      onNavigate={setCurrentPage} 
      expenses={expenses}
      onSaveTrip={async (tripData: Omit<Expense, 'id'>) => {
        try {
          await addDoc(collection(db, 'expenses'), tripData);
          
          for (const item of tripData.items) {
            if (item.name === 'Historical Bill Consolidation' || item.name === 'Spreadsheet Balance Correction') continue;
            
            const existingStock = stock.find(s => s.name.toLowerCase() === item.name.toLowerCase());
            if (existingStock) {
              await updateDoc(doc(db, 'stock', existingStock.id), { count: existingStock.count + item.qty });
            } else {
              let category: StockItem['category'] = 'Accessories';
              const lowName = item.name.toLowerCase();
              if (lowName.includes('pipe') || lowName.includes('pc')) category = 'Pipe Cleaners';
              else if (lowName.includes('wrap') || lowName.includes('sheet')) category = 'Wrapping Sheets';
              
              await addDoc(collection(db, 'stock'), {
                name: item.name,
                category,
                count: item.qty
              });
            }
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
    />;
  }

  if (currentPage === 'stockInventory') {
    return (
      <StockInventory 
        onNavigate={setCurrentPage} 
        stock={stock} 
        onUpdateStock={handleUpdateStockCount} 
      />
    );
  }

  if (currentPage === 'analytics') {
    return <MonthlyAnalytics onNavigate={setCurrentPage} orders={orders} expenses={expenses} />;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <button 
          className="nav-logo-btn" 
          onClick={() => setCurrentPage('landing')}
          title="Back to Dashboard"
        >
          <Flower2 size={24} strokeWidth={2} />
          <h1 className="nav-script-title">Cheniart Studio</h1>
        </button>
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
                {tableData.filter(r => (!r.category || r.category === 'Flowers') && r.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No items yet</td></tr>
                ) : (
                  tableData
                    .filter(r => (!r.category || r.category === 'Flowers') && r.name.toLowerCase().includes(searchQuery.toLowerCase()))
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
                            value={row.category || 'Flowers'} 
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
                              type="number" value={row.profitMargin ? Number(row.profitMargin).toFixed(1) : ''}
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
                {tableData.filter(r => r.category === 'Keychain' && r.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No items yet</td></tr>
                ) : (
                  tableData
                    .filter(r => r.category === 'Keychain' && r.name.toLowerCase().includes(searchQuery.toLowerCase()))
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
                            value={row.category || 'Flowers'} 
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
                              type="number" value={row.profitMargin ? Number(row.profitMargin).toFixed(1) : ''}
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
                {tableData.filter(r => r.category === 'Flower Pots' && r.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No items yet</td></tr>
                ) : (
                  tableData
                    .filter(r => r.category === 'Flower Pots' && r.name.toLowerCase().includes(searchQuery.toLowerCase()))
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
                            value={row.category || 'Flowers'} 
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
                              type="number" value={row.profitMargin ? Number(row.profitMargin).toFixed(1) : ''}
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
  );
}

export default App;
