const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add imports
content = content.replace(
  "import './App.css';",
  "import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';\nimport { Navbar } from './components/Navbar';\nimport './App.css';"
);

// 2. Remove PageView type
content = content.replace(
  "export type PageView = 'landing' | 'database' | 'calculator' | 'history' | 'expenses' | 'stockInventory' | 'analytics';\n",
  ""
);

// 3. Remove currentPage state
content = content.replace(
  "  const [currentPage, setCurrentPage] = useState<PageView>('landing');\n  ",
  ""
);

// 4. Add updateOrder function before handleEmergencyRestore
const updateOrderFunc = `  const updateOrder = async (updatedOrder: Partial<Order> & { id: string }) => {
    try {
      if (!updatedOrder.id) throw new Error("Order ID is missing");
      const orderRef = doc(db, 'orders', updatedOrder.id);
      
      const cleanData = JSON.parse(JSON.stringify(updatedOrder, (_key, value) => 
        value === undefined ? null : value
      ));
      
      await updateDoc(orderRef, cleanData);
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } as Order : o));
    } catch (error) {
      console.error("Error updating order in Firebase:", error);
      throw error; 
    }
  };

  const handleEmergencyRestore`;
content = content.replace("  const handleEmergencyRestore", updateOrderFunc);

// 5. Replace everything from `if (currentPage === 'landing') {` to the end of the file.
const targetStart = "  if (currentPage === 'landing') {";
const startIndex = content.indexOf(targetStart);
if (startIndex !== -1) {
  content = content.substring(0, startIndex);
}

const newReturnBlock = `  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <div className="page-content" style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<LandingPage flowers={flowers} orders={orders} expenses={expenses} />} />
            
            <Route path="/calculator" element={
              <OrderCalculator 
                flowers={flowers} 
                onSaveOrder={async (order: any) => {
                  try {
                    const { id, ...orderData } = order;
                    const cleanData = JSON.parse(JSON.stringify(orderData, (_key, value) => 
                      value === undefined ? null : value
                    ));
                    const docRef = await addDoc(collection(db, 'orders'), cleanData);
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
                      else if (lowName.includes('wrap') && !lowName.includes('mesh')) category = 'Wrapping Sheets';
                      else if (lowName.includes('mesh')) category = 'Mesh Wrap';
                      else if (lowName.includes('ribbon')) category = 'Ribbons';
                      
                      const existingStock = stock.find(s => s.name.toLowerCase() === item.name.toLowerCase());
                      
                      if (existingStock) {
                        await updateDoc(doc(db, 'stock', existingStock.id), {
                          count: existingStock.count + item.qty
                        });
                      } else {
                        await addDoc(collection(db, 'stock'), {
                          name: item.name,
                          category: category,
                          count: item.qty
                        });
                      }
                    }
                  } catch (e) { console.error(e); }
                }}
                onUpdateTrip={async (id: string, tripData: Partial<Expense>) => {
                  try { await updateDoc(doc(db, 'expenses', id), tripData); } catch (e) { console.error(e); }
                }}
                onDeleteTrip={async (id) => {
                  try { await deleteDoc(doc(db, 'expenses', id)); } catch (e) { console.error(e); }
                }}
              />
            } />
            
            <Route path="/stock" element={
              <StockInventory 
                stock={stock}
                onUpdateStock={async (id, count) => {
                  try { await updateDoc(doc(db, 'stock', id), { count }); } catch (e) { console.error(e); }
                }}
                onUpdateName={async (id, name) => {
                   try { await updateDoc(doc(db, 'stock', id), { name }); } catch (e) { console.error(e); }
                }}
                onDeleteStock={async (id) => {
                  try { await deleteDoc(doc(db, 'stock', id)); } catch (e) { console.error(e); }
                }}
                onMergeDuplicates={handleMergeDuplicatesStock}
                onAddStock={handleAddStock}
              />
            } />
            
            <Route path="/analytics" element={<MonthlyAnalytics orders={orders} expenses={expenses} />} />
            
            <Route path="/inventory" element={
              <div className="dashboard-container" style={{ paddingTop: '2rem' }}>
                <header className="dashboard-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="badge">Admin Hub</span>
                  </div>
                  <div className="header-actions">
                    <button className="flat-btn" onClick={handleEmergencyRestore} title="Emergency Restore Missing Orders">
                      <Download size={18} /> Emergency Sync
                    </button>
                    <button className="flat-btn" onClick={handleRemoveDuplicates} title="Remove Duplicate Orders">
                      <Trash2 size={18} /> Cleanup DB
                    </button>
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
                                    <input type="number" min="0" value={row.extraCosts} onChange={(e) => handleUpdateFlowerDatabase(row.id, 'extraCosts', e.target.value)} className="saas-input" style={{ width: '50px', textAlign: 'right', height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }} onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'} />
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
                            <th className="number-col">Pollen Qty</th>
                            <th className="number-col">Keychain Qty</th>
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
                            <tr><td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No items yet</td></tr>
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
                                    <input type="number" min="0" value={row.pollenQty} onChange={(e) => handleUpdateFlowerDatabase(row.id, 'pollenQty', e.target.value)} className="saas-input" style={{ width: '50px', textAlign: 'right', height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }} onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'} />
                                  </td>
                                  <td className="number-col">
                                    <input type="number" min="0" value={row.keychainQty || 1} onChange={(e) => handleUpdateFlowerDatabase(row.id, 'keychainQty', e.target.value)} className="saas-input" style={{ width: '50px', textAlign: 'right', height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }} onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'} />
                                  </td>
                                  <td className="number-col">
                                    <input type="number" min="0" value={row.extraCosts} onChange={(e) => handleUpdateFlowerDatabase(row.id, 'extraCosts', e.target.value)} className="saas-input" style={{ width: '50px', textAlign: 'right', height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }} onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'} />
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
                            <th className="number-col">Cups Qty</th>
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
                                    <input type="number" min="0" value={row.cupsQty || 1} onChange={(e) => handleUpdateFlowerDatabase(row.id, 'cupsQty', e.target.value)} className="saas-input" style={{ width: '50px', textAlign: 'right', height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }} onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'} />
                                  </td>
                                  <td className="number-col">
                                    <input type="number" min="0" value={row.extraCosts} onChange={(e) => handleUpdateFlowerDatabase(row.id, 'extraCosts', e.target.value)} className="saas-input" style={{ width: '50px', textAlign: 'right', height: '32px', padding: '0 0.5rem', backgroundColor: 'transparent', border: '1px solid transparent' }} onFocus={(e) => e.target.style.backgroundColor = 'white'} onBlur={(e) => e.target.style.backgroundColor = 'transparent'} />
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
            } />
          </Routes>
        </div>
      </div>
    </Router>
  );
`;
content += newReturnBlock;

fs.writeFileSync('src/App.tsx', content);
