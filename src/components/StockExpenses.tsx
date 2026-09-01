import React, { useState } from 'react';

import { Plus, ChevronDown, ChevronUp, Package, Wallet, CheckCircle2, X, Pencil, Trash2 } from 'lucide-react';
import type { Expense, ExpenseItem, StockItem } from '../types';
import { showToast } from './Toast';
import { Navbar } from './Navbar';

interface StockExpensesProps {
  
  expenses: Expense[];
  stock: StockItem[];
  onSaveTrip: (tripData: Omit<Expense, 'id'>) => Promise<void>;
  onUpdateTrip?: (id: string, tripData: Partial<Expense>) => Promise<void>;
  onDeleteTrip?: (id: string) => Promise<void>;
}

interface DynamicCatalogData {
  colors: string[];
  types: string[];
  widths?: string[];
}

const CATEGORIES = [
  { name: 'Pipe Cleaners', defaultPrice: 80, hasColors: true },
  { name: 'Wrapping Sheets', defaultPrice: 15, hasColors: true, hasTypes: true, hasDynamic: true },
  { name: 'Ribbons', defaultPrice: 0, hasColors: true, hasTypes: true, hasDynamic: true },
  { name: 'Sticks', defaultPrice: 0 },
  { name: 'Tissue Paper', defaultPrice: 0 },
  { name: 'Mesh Wrap', defaultPrice: 0, hasColors: true, hasTypes: true, hasDynamic: true },
  { name: 'Green Tape', defaultPrice: 0 },
  { name: 'Clear Tape', defaultPrice: 0 },
  { name: 'Glue Sticks', defaultPrice: 0 },
  { name: 'Pearls', defaultPrice: 0 },
  { name: 'Rope', defaultPrice: 0 },
  { name: 'Pollen', defaultPrice: 0 },
  { name: 'Clear Sheets', defaultPrice: 0 },
  { name: 'Cups', defaultPrice: 0 },
  { name: 'Eye Shadow', defaultPrice: 0 },
  { name: 'Other Item', defaultPrice: 0, hasCustom: true },
];

export function StockExpenses({ expenses, stock, onSaveTrip, onUpdateTrip, onDeleteTrip }: StockExpensesProps) {

  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  
  // Modal states
  const [basket, setBasket] = useState<Omit<ExpenseItem, 'id'>[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Colors Setup
  const [colors, setColors] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('cheniart_category_colors');
    let parsed = saved ? JSON.parse(saved) : null;
    
    const oldPipeColors = localStorage.getItem('cheniart_pipe_colors');
    const defaultPipeColors = oldPipeColors ? JSON.parse(oldPipeColors) : [
      'white', 'red', 'green', 'light blue', 'lavender', 'peach pink', 
      'dark pink', 'light pink', 'brown', 'yellow', 'dark brown', 
      'maroon', 'beige', 'teal', 'turquoise', 'baby pink', 
      'bloody pink', 'dark red', 'dark orange', 'orange'
    ];

    const defaultWrappingColors = ['Clear', 'Pink', 'White', 'Red', 'Brown', 'Maroon', 'Purple', 'Yellow', 'Black', 'Blue'];

    if (!parsed) {
      parsed = {
        'Pipe Cleaners': defaultPipeColors,
        'Wrapping Sheets': defaultWrappingColors,
        'Ribbons': [],
        'Mesh Wrap': []
      };
    } else {
      // Restore Wrapping Papers colors
      if (!parsed['Wrapping Sheets'] || parsed['Wrapping Sheets'].length === 0) {
        parsed['Wrapping Sheets'] = defaultWrappingColors;
      } else {
        defaultWrappingColors.forEach(dc => {
          if (!parsed['Wrapping Sheets'].some((c: string) => c.toLowerCase() === dc.toLowerCase())) {
            parsed['Wrapping Sheets'].push(dc);
          }
        });
      }
      localStorage.setItem('cheniart_category_colors', JSON.stringify(parsed));
    }
    
    return parsed;
  });
  
  // Types Setup
  const [types, setTypes] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('cheniart_category_types');
    let parsed = saved ? JSON.parse(saved) : null;
    
    const defaultTypes = {
      'Wrapping Sheets': ['Newspaper', 'Waterproof', 'Glossy'],
      'Ribbons': ['Satin', 'Velvet', 'Organza'],
      'Mesh Wrap': ['Pearl', 'Plain', 'Dotted']
    };

    if (!parsed) {
      parsed = defaultTypes;
    } else {
      // Force Resync of Types to ensure defaults exist
      Object.entries(defaultTypes).forEach(([cat, defaults]) => {
        if (!parsed[cat]) parsed[cat] = [];
        defaults.forEach(dt => {
          if (!parsed[cat].some((t: string) => t.toLowerCase() === dt.toLowerCase())) {
            parsed[cat].push(dt);
          }
        });
      });
      localStorage.setItem('cheniart_category_types', JSON.stringify(parsed));
    }
    return parsed;
  });

  const [newColorInput, setNewColorInput] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState<number | ''>('');

  const [comboSelection, setComboSelection] = useState<any>({});
  const [newDynamicInput, setNewDynamicInput] = useState<any>({ field: '', value: '' });

  const [dynamicCatalogs, setDynamicCatalogs] = useState<Record<string, DynamicCatalogData>>(() => {
    const saved = localStorage.getItem('cheniart_dynamic_catalogs');
    if (saved) return JSON.parse(saved);
    return {
      'Wrapping Sheets': { colors: ['Clear', 'Pink', 'White', 'Red', 'Brown', 'Maroon', 'Purple', 'Yellow', 'Black', 'Blue'], types: ['Newspaper', 'Waterproof', 'Glossy'] },
      'Ribbons': { colors: ['White', 'Red', 'Pink', 'Gold', 'Silver', 'Blue'], widths: ['0.5 inch', '1 inch', '1.5 inch', '2 inch'] },
      'Mesh Wrap': { colors: ['White', 'Pink', 'Black', 'Gold', 'Silver'], types: ['Pearl', 'Plain', 'Dotted'] }
    };
  });

  const handleAddDynamicAttribute = (category: string, field: keyof DynamicCatalogData) => {
    if (!newDynamicInput.value?.trim()) return;
    const val = newDynamicInput.value.trim();
    
    const catData = dynamicCatalogs[category] || { colors: [], types: [] };
    const list = catData[field] || [];
    
    if (list.some((i: string) => i.toLowerCase() === val.toLowerCase())) {
      showToast(`⚠️ This already exists.`);
      return;
    }

    const next = {
      ...dynamicCatalogs,
      [category]: {
        ...catData,
        [field]: [...list, val]
      }
    };
    setDynamicCatalogs(next);
    localStorage.setItem('cheniart_dynamic_catalogs', JSON.stringify(next));
    setNewDynamicInput({ field: '', value: '' });
  };

  const handleDeleteDynamicAttribute = (category: string, field: keyof DynamicCatalogData, val: string) => {
    const catData = dynamicCatalogs[category];
    if (!catData) return;
    
    const next = {
      ...dynamicCatalogs,
      [category]: {
        ...catData,
        [field]: (catData[field] as string[]).filter(i => i !== val)
      }
    };
    setDynamicCatalogs(next);
    localStorage.setItem('cheniart_dynamic_catalogs', JSON.stringify(next));
  };
  
  // TypeSplitModal state
  const [splitModalColor, setSplitModalColor] = useState<{ category: string, color: string } | null>(null);
  const [splitQuantities, setSplitQuantities] = useState<Record<string, number>>({});
  const [newTypeInput, setNewTypeInput] = useState('');

  // Trip specifics
  const [tripDate, setTripDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddColor = (category: string) => {
    const val = newColorInput.trim();
    if (!val) return;
    
    const currentList = colors[category] || [];
    if (currentList.some(c => c.toLowerCase() === val.toLowerCase())) {
      showToast(`⚠️ This Color already exists. Please select it from the list.`);
      return;
    }

    const existingInStock = stock.find(s => s.category === category && s.name.toLowerCase().includes(val.toLowerCase()));
    if (existingInStock) {
      showToast(`⚠️ This Color already exists. Please select it from the list.`);
      return;
    }

    const next = { ...colors, [category]: [...currentList, val] };
    setColors(next);
    localStorage.setItem('cheniart_category_colors', JSON.stringify(next));
    setNewColorInput('');
  };

  const handleAddType = (category: string) => {
    const val = newTypeInput.trim();
    if (!val) return;

    const currentList = types[category] || [];
    if (currentList.some(t => t.toLowerCase() === val.toLowerCase())) {
      showToast(`⚠️ This Type already exists. Please select it from the list.`);
      return;
    }

    const existingInStock = stock.find(s => s.category === category && s.name.toLowerCase().includes(val.toLowerCase()));
    if (existingInStock) {
      showToast(`⚠️ This Type already exists. Please select it from the list.`);
      return;
    }

    const next = { ...types, [category]: [...currentList, val] };
    setTypes(next);
    localStorage.setItem('cheniart_category_types', JSON.stringify(next));
    setNewTypeInput('');
  };

  const handleDeleteType = (category: string, typeVal: string) => {
    const next = { ...types, [category]: (types[category] || []).filter(t => t !== typeVal) };
    setTypes(next);
    localStorage.setItem('cheniart_category_types', JSON.stringify(next));
    
    setSplitQuantities(prev => {
      const p = { ...prev };
      delete p[typeVal];
      return p;
    });
  };


  const handleAddToBasket = (name: string, defaultPrice: number, qty: number = 1) => {
    setBasket(prev => {
      const existing = prev.find(item => item.name === name);
      if (existing) {
        return prev.map(item => 
          item.name === name 
            ? { ...item, qty: item.qty + qty, subtotal: (item.qty + qty) * item.unitPrice }
            : item
        );
      }
      return [...prev, { name, qty, unitPrice: defaultPrice, subtotal: defaultPrice * qty }];
    });
  };

  const updateBasketItem = (index: number, field: 'qty' | 'unitPrice' | 'subtotal', value: string | number) => {
    setBasket(prev => {
      const newBasket = [...prev];
      const item = { ...newBasket[index] };
      const numValue = value === '' ? 0 : Number(value);
      
      // Update the specific field
      if (field === 'qty') item.qty = Math.round(numValue);
      else if (field === 'unitPrice') item.unitPrice = numValue;
      else if (field === 'subtotal') item.subtotal = Math.round(numValue);

      // Two-way calculation logic
      if (field === 'subtotal') {
        item.unitPrice = item.qty > 0 ? Number((item.subtotal / item.qty).toFixed(2)) : 0;
      } else {
        item.subtotal = Math.round(item.qty * item.unitPrice);
      }
      
      newBasket[index] = item;
      return newBasket;
    });
  };

  const removeBasketItem = (index: number) => {
    setBasket(prev => prev.filter((_, i) => i !== index));
  };

  const tripTotal = basket.reduce((sum, item) => sum + item.subtotal, 0);

  const handleEditTrip = (trip: Expense, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTripId(trip.id);
    setTripDate(trip.date);
    setBasket(trip.items);
    setIsModalOpen(true);
  };

  const handleDeleteTrip = async (trip: Expense, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this trip?")) {
      if (onDeleteTrip) {
        await onDeleteTrip(trip.id);
      }
    }
  };

  const handleSaveTrip = async () => {
    if (basket.length === 0 || isSaving) return;
    setIsSaving(true);
    
    const finalItems = basket.map(item => ({
      ...item,
      qty: Math.round(Number(item.qty)),
      unitPrice: Number(item.unitPrice),
      subtotal: Math.round(Number(item.qty) * Number(item.unitPrice))
    }));
    
    const finalTotal = finalItems.reduce((sum, item) => sum + item.subtotal, 0);

    const tripData = {
      date: tripDate,
      items: finalItems as ExpenseItem[],
      tripTotal: finalTotal
    };

    tripData.items = tripData.items.map(i => ({...i, id: i.id || Math.random().toString(36).substr(2, 9)}))

    if (editingTripId && onUpdateTrip) {
      await onUpdateTrip(editingTripId, tripData);
    } else {
      await onSaveTrip(tripData);
    }
    
    setEditingTripId(null);
    setBasket([]);
    setTripDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(false);
    setIsSaving(false);
  };

  const totalInvestment = expenses.reduce((sum, exp) => sum + (Number(exp.tripTotal) || 0), 0);

  return (
    <div className="dashboard-container">
      <Navbar />
      <header className="dashboard-header" style={{ justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="badge">Stock & Expenses</span>
        </div>
      </header>

      <main className="dashboard-content" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontFamily: '"Playfair Display", serif', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>Material Ledger</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Total Investment: <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>₹{Math.round(totalInvestment).toLocaleString('en-IN')}</span></p>
          </div>
          <button className="primary-btn" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Log New Trip
          </button>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Date</th>
                <th className="number-col">Items Count</th>
                <th className="number-col">Total Amount (₹)</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No trips logged yet. Log a shopping trip to see expenses here.
                  </td>
                </tr>
              ) : (
                expenses.map(trip => (
                  <React.Fragment key={trip.id}>
                    <tr 
                      onClick={() => setExpandedTripId(expandedTripId === trip.id ? null : trip.id)}
                      style={{ cursor: 'pointer', background: expandedTripId === trip.id ? 'var(--background)' : 'transparent' }}
                    >
                      <td style={{ color: 'var(--primary-color)' }}>
                        {expandedTripId === trip.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </td>
                      <td className="font-medium">{new Date(trip.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="number-col">{trip.items?.length || 0} items</td>
                      <td className="number-col font-bold" style={{ color: 'var(--primary-dark)' }}>₹{Math.round(Number(trip.tripTotal)).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'center', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button 
                          onClick={(e) => handleEditTrip(trip, e)} 
                          style={{ color: 'var(--primary-color)', background: 'rgba(122, 144, 120, 0.1)', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Edit Trip"
                        ><Pencil size={18} /></button>
                        <button 
                          onClick={(e) => handleDeleteTrip(trip, e)} 
                          style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Delete Trip"
                        ><Trash2 size={18} /></button>
                      </td>
                    </tr>
                    {expandedTripId === trip.id && (
                      <tr style={{ background: 'rgba(122, 144, 120, 0.05)' }}>
                        <td colSpan={5} style={{ padding: '1.5rem 2rem' }}>
                          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items Purchased</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {trip.items?.map(item => (
                              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed rgba(122,144,120,0.2)' }}>
                                <span style={{ fontWeight: 500 }}>{Math.round(item.qty)}x {item.name}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>@ ₹{item.unitPrice} = <strong style={{ color: 'var(--text-primary)' }}>₹{Math.round(item.subtotal)}</strong></span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Shopping Trip Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#F9F8F3] w-full max-w-5xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl relative flex flex-col">
            
            <div className="modal-header" style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'var(--surface-color)' }}>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0' }}>{editingTripId ? 'Edit Shopping Trip' : 'Log New Shopping Trip'}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label htmlFor="tripDate" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Date: </label>
                  <input 
                    type="date" 
                    id="tripDate"
                    value={tripDate} 
                    onChange={e => setTripDate(e.target.value)} 
                    className="saas-input"
                    style={{ padding: '0.25rem 0.5rem' }}
                  />
                </div>
              </div>
              <button 
                className="icon-btn" 
                onClick={() => {
                  setEditingTripId(null);
                  setBasket([]);
                  setTripDate(new Date().toISOString().split('T')[0]);
                  setIsModalOpen(false);
                }} 
                type="button"
              >
                <X size={24} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              
              {/* Left Side: Catalog */}
              <div style={{ flex: 1, borderRight: '1px solid rgba(0,0,0,0.05)', overflowY: 'auto', padding: '2rem', background: '#fcfbf9' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>Catalog</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat.name}
                      onClick={() => (cat.hasColors || cat.hasCustom) ? setActiveCategory(cat.name) : handleAddToBasket(cat.name, cat.defaultPrice)}
                      style={{
                        padding: '1rem', background: 'white', border: activeCategory === cat.name ? '2px solid var(--primary-color)' : '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{cat.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>₹{cat.defaultPrice}</div>
                    </button>
                  ))}
                </div>

                {/* Sub Menu for active categorical options */}
                {activeCategory && CATEGORIES.find(c => c.name === activeCategory)?.hasColors && (
                  <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'white', borderRadius: '12px', border: '1px solid var(--primary-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h4 style={{ margin: 0 }}>Select {activeCategory} Colors</h4>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          type="text" 
                          value={newColorInput} 
                          onChange={e => setNewColorInput(e.target.value)} 
                          onKeyDown={e => e.key === 'Enter' && handleAddColor(activeCategory)}
                          placeholder="New Color..." 
                          className="saas-input" 
                          style={{ width: '120px' }}
                        />
                        <button onClick={() => handleAddColor(activeCategory)} className="primary-btn" style={{ padding: '0.5rem' }}><Plus size={16} /></button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {(colors[activeCategory] || []).map(color => {
                        const inBasketAmt = basket.filter(i => i.name.startsWith(`${activeCategory.replace(/s$/, '')} (${color}`) || i.name === `Pipe Cleaner - ${color}`).reduce((sum, item) => sum + item.qty, 0);
                        return (
                          <div key={color} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                            <span style={{ fontWeight: 500 }}>{color}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              {CATEGORIES.find(c => c.name === activeCategory)?.hasTypes ? (
                                <button onClick={() => setSplitModalColor({ category: activeCategory, color })} style={{ background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.875rem' }}>Split / Add</button>
                              ) : (
                                <>
                                  <button onClick={() => {
                                    const index = basket.findIndex(i => i.name === `Pipe Cleaner - ${color}`);
                                    if (index !== -1) {
                                      if (basket[index].qty <= 1) removeBasketItem(index);
                                      else updateBasketItem(index, 'qty', basket[index].qty - 1);
                                    }
                                  }} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.1)', background: 'white', cursor: 'pointer' }}>-</button>
                                  
                                  <span style={{ width: '20px', textAlign: 'center', fontWeight: 'bold' }}>{inBasketAmt}</span>
                                  
                                  <button onClick={() => handleAddToBasket(`Pipe Cleaner - ${color}`, 80)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--primary-color)', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}>+</button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(() => {
                  const activeCatDef = CATEGORIES.find(c => c.name === activeCategory);
                  if (activeCatDef?.hasDynamic) {
                    const fields = activeCategory === 'Ribbons' ? ['colors', 'widths'] : ['types', 'colors'];
                    const fieldLabels = activeCategory === 'Ribbons' ? ['Colors', 'Widths'] : ['Types', 'Colors'];
                    
                    const canAddToBasket = fields.every(f => comboSelection[f]);
                    
                    return (
                      <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'white', borderRadius: '12px', border: '1px solid var(--primary-color)' }}>
                        <h4 style={{ margin: '0 0 1.5rem 0' }}>Build {activeCategory}</h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                          {fields.map((field, idx) => (
                            <div key={field}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h5 style={{ margin: 0, color: 'var(--text-secondary)' }}>{fieldLabels[idx]}</h5>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <input 
                                    type="text" 
                                    value={newDynamicInput.field === field ? newDynamicInput.value : ''} 
                                    onChange={e => setNewDynamicInput({ field, value: e.target.value })} 
                                    onKeyDown={e => e.key === 'Enter' && handleAddDynamicAttribute(activeCategory!, field as keyof DynamicCatalogData)}
                                    placeholder={`New ${fieldLabels[idx]}...`} 
                                    className="saas-input" 
                                    style={{ width: '100px', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                  />
                                  <button onClick={() => handleAddDynamicAttribute(activeCategory!, field as keyof DynamicCatalogData)} className="primary-btn" style={{ padding: '0.25rem 0.5rem' }}><Plus size={14} /></button>
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                                {(dynamicCatalogs[activeCategory!]?.[field as keyof DynamicCatalogData] || []).map((val: string) => (
                                  <div key={val} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: comboSelection[field] === val ? 'rgba(122, 144, 120, 0.1)' : 'rgba(0,0,0,0.02)', border: comboSelection[field] === val ? '1px solid var(--primary-color)' : '1px solid transparent', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setComboSelection((prev: any) => ({ ...prev, [field]: val }))}>
                                    <span style={{ fontSize: '0.875rem' }}>{val}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteDynamicAttribute(activeCategory!, field as keyof DynamicCatalogData, val); }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}><X size={14}/></button>
                                  </div>
                                ))}
                                {(!dynamicCatalogs[activeCategory!]?.[field as keyof DynamicCatalogData] || dynamicCatalogs[activeCategory!]?.[field as keyof DynamicCatalogData]?.length === 0) && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No {fieldLabels[idx].toLowerCase()} saved yet.</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {canAddToBasket ? (
                              <span>Selection: <strong>{activeCategory === 'Ribbons' ? `${comboSelection.colors} - ${comboSelection.widths}` : `${comboSelection.types} - ${comboSelection.colors}`}</strong></span>
                            ) : (
                              <span>Please select one from each list</span>
                            )}
                          </div>
                          <button 
                            className="primary-btn"
                            disabled={!canAddToBasket}
                            style={{ opacity: canAddToBasket ? 1 : 0.5 }}
                            onClick={() => {
                              const itemName = activeCategory === 'Ribbons' 
                                ? `Ribbon (${comboSelection.colors} - ${comboSelection.widths})`
                                : activeCategory === 'Mesh Wrap'
                                  ? `Mesh Wrap (${comboSelection.types} - ${comboSelection.colors})`
                                  : `Wrapping Paper (${comboSelection.types} - ${comboSelection.colors})`;
                                  
                              handleAddToBasket(itemName, activeCatDef.defaultPrice, 1);
                              setComboSelection({});
                            }}
                          >
                            Add to Basket
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {activeCategory === 'Other Item' && (
                  <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'white', borderRadius: '12px', border: '1px solid var(--primary-color)' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ margin: '0 0 1rem 0' }}>Add Custom Expense Item</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Item Name</label>
                          <input 
                            type="text" 
                            value={newColorInput} 
                            onChange={e => setNewColorInput(e.target.value)} 
                            placeholder="e.g. Scissors..." 
                            className="saas-input" 
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Unit Price (₹)</label>
                            <input 
                              type="number" 
                              min="0"
                              value={customItemPrice === '' ? '' : customItemPrice} 
                              onChange={e => setCustomItemPrice(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                              className="saas-input" 
                              style={{ width: '100%' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>&nbsp;</label>
                            <button 
                              onClick={() => {
                                if (newColorInput.trim() && customItemPrice !== '') {
                                  handleAddToBasket(newColorInput.trim(), customItemPrice, 1);
                                  setNewColorInput('');
                                  setCustomItemPrice('');
                                  setActiveCategory(null);
                                }
                              }} 
                              className="primary-btn" 
                              disabled={!newColorInput.trim() || customItemPrice === ''}
                              style={{ height: '36px', opacity: (!newColorInput.trim() || customItemPrice === '') ? 0.5 : 1, padding: '0 1rem' }}
                            >
                              Add to Basket
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right Side: Live Basket */}
              <div style={{ width: '480px', display: 'flex', flexDirection: 'column', background: 'white' }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={20} color="var(--primary-color)" />
                  <h3 style={{ margin: 0 }}>Current Basket</h3>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
                  {basket.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '4rem' }}>
                      <Wallet size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
                      <p>Your basket is empty.<br/>Click items in the catalog to add them.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {basket.map((item, index) => (
                        <div key={index} style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem', position: 'relative' }}>
                          <button 
                            onClick={() => removeBasketItem(index)}
                            style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'white', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '50%', color: '#ef4444', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                          ><X size={14}/></button>
                          
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem', paddingRight: '1rem' }}>{item.name}</div>
                          
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '80px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Qty</label>
                              <input type="number" min="1" step="1" value={item.qty === 0 ? '' : item.qty} onChange={e => updateBasketItem(index, 'qty', e.target.value)} className="saas-input" style={{ textAlign: 'center', fontSize: '1.125rem', padding: '0.75rem 0.5rem' }} />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Price (₹)</label>
                              <input type="number" min="0" step="0.01" value={item.unitPrice === 0 ? '' : item.unitPrice} onChange={e => updateBasketItem(index, 'unitPrice', e.target.value)} className="saas-input" style={{ fontSize: '1.125rem', padding: '0.75rem 0.5rem' }} />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '100px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Subtotal (₹)</label>
                              <input 
                                type="number" 
                                min="0" 
                                step="1"
                                value={item.subtotal === 0 ? '' : item.subtotal} 
                                onChange={e => updateBasketItem(index, 'subtotal', e.target.value)} 
                                className="saas-input" 
                                style={{ fontWeight: 'bold', color: 'var(--primary-dark)', textAlign: 'right', fontSize: '1.125rem', padding: '0.75rem 0.5rem' }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div style={{ padding: '2rem', borderTop: '1px solid rgba(0,0,0,0.05)', background: 'rgba(251, 248, 242, 0.5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Trip Total:</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>₹{tripTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <button 
                    onClick={handleSaveTrip} 
                    className="primary-btn" 
                    disabled={basket.length === 0 || isSaving}
                    style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    {isSaving ? 'Saving...' : <><CheckCircle2 size={20} /> Save Trip</>}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Type & Split Modal */}
      {splitModalColor && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#F9F8F3] w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl relative">
            <div className="p-6 md:p-8">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Split {splitModalColor.category} ({splitModalColor.color})</h3>
              <button className="icon-btn" onClick={() => { setSplitModalColor(null); setSplitQuantities({}); setNewTypeInput(''); }}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input 
                  type="text" 
                  value={newTypeInput} 
                  onChange={e => setNewTypeInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleAddType(splitModalColor.category)}
                  placeholder="New Type..." 
                  className="saas-input" 
                  style={{ flex: 1 }}
                />
                <button onClick={() => handleAddType(splitModalColor.category)} className="primary-btn" style={{ padding: '0.5rem 1rem' }}><Plus size={16} /></button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {(types[splitModalColor.category] || []).map(typeVal => {
                  const qty = splitQuantities[typeVal] || 0;
                  return (
                    <div key={typeVal} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 500 }}>{typeVal}</span>
                        <button onClick={() => handleDeleteType(splitModalColor.category, typeVal)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, display: 'flex', padding: 0 }}><X size={14}/></button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button onClick={() => setSplitQuantities(p => ({ ...p, [typeVal]: Math.max(0, qty - 1) }))} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.1)', background: 'white', cursor: 'pointer' }}>-</button>
                        <span style={{ width: '20px', textAlign: 'center', fontWeight: 'bold' }}>{qty}</span>
                        <button onClick={() => setSplitQuantities(p => ({ ...p, [typeVal]: qty + 1 }))} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--primary-color)', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                Total: <span style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>{Object.values(splitQuantities).reduce((a,b)=>a+b, 0)}</span>
              </div>
              <button 
                className="primary-btn" 
                disabled={Object.values(splitQuantities).reduce((a,b)=>a+b, 0) === 0}
                style={{ opacity: Object.values(splitQuantities).reduce((a,b)=>a+b, 0) === 0 ? 0.5 : 1 }}
                onClick={() => {
                  const catDef = CATEGORIES.find(c => c.name === splitModalColor.category);
                  const price = catDef?.defaultPrice || 0;
                  const catSingular = splitModalColor.category.replace(/s$/, ''); // e.g., Wrapping Paper, Ribbon
                  
                  Object.entries(splitQuantities).forEach(([typeVal, qty]) => {
                    if (qty > 0) {
                      const itemName = `${catSingular} (${splitModalColor.color} - ${typeVal})`;
                      handleAddToBasket(itemName, price, qty);
                    }
                  });
                  
                  setSplitModalColor(null);
                  setSplitQuantities({});
                }}
              >
                Add to Basket
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
