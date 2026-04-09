import React, { useState } from 'react';
import { ChevronLeft, Plus, ChevronDown, ChevronUp, Package, Wallet, CheckCircle2, X, Pencil, Trash2 } from 'lucide-react';
import type { PageView } from '../App';
import type { Expense, ExpenseItem } from '../types';

interface StockExpensesProps {
  onNavigate: (page: PageView) => void;
  expenses: Expense[];
  onSaveTrip: (tripData: Omit<Expense, 'id'>) => Promise<void>;
  onUpdateTrip?: (id: string, tripData: Partial<Expense>) => Promise<void>;
  onDeleteTrip?: (id: string) => Promise<void>;
}

const CATEGORIES = [
  { name: 'Pipe Cleaners', defaultPrice: 80, hasColors: true },
  { name: 'Wrapping Papers', defaultPrice: 15 },
  { name: 'Ribbons', defaultPrice: 0 },
  { name: 'Sticks', defaultPrice: 0 },
  { name: 'Tissue Paper', defaultPrice: 0 },
  { name: 'Pearl Wrap', defaultPrice: 0 },
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

export function StockExpenses({ onNavigate, expenses, onSaveTrip, onUpdateTrip, onDeleteTrip }: StockExpensesProps) {
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  
  // Modal states
  const [basket, setBasket] = useState<Omit<ExpenseItem, 'id'>[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Pipe Cleaner Colors setup
  const [colors, setColors] = useState<string[]>(() => {
    const savedColors = localStorage.getItem('cheniart_pipe_colors');
    if (savedColors) return JSON.parse(savedColors);
    return [
      'white', 'red', 'green', 'light blue', 'lavender', 'peach pink', 
      'dark pink', 'light pink', 'brown', 'yellow', 'dark brown', 
      'maroon', 'beige', 'teal', 'turquoise', 'baby pink', 
      'bloody pink', 'dark red', 'dark orange', 'orange'
    ];
  });
  const [newColorInput, setNewColorInput] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState<number | ''>('');
  
  // Trip specifics
  const [tripDate, setTripDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddColor = () => {
    if (!newColorInput.trim() || colors.includes(newColorInput.trim())) return;
    const updatedColors = [...colors, newColorInput.trim()];
    setColors(updatedColors);
    localStorage.setItem('cheniart_pipe_colors', JSON.stringify(updatedColors));
    setNewColorInput('');
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

  const updateBasketItem = (index: number, field: 'qty' | 'unitPrice', value: number) => {
    setBasket(prev => {
      const newBasket = [...prev];
      const item = { ...newBasket[index] };
      item[field] = Number(value) || 0;
      item.subtotal = item.qty * item.unitPrice;
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
      qty: Number(item.qty),
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.qty) * Number(item.unitPrice)
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
      <header className="dashboard-header">
        <button className="nav-logo-btn" onClick={() => onNavigate('landing')} title="Back to Dashboard">
          <ChevronLeft size={24} strokeWidth={2} />
          <h1 className="nav-script-title">Dashboard</h1>
        </button>
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
                      <td className="number-col font-bold" style={{ color: 'var(--primary-dark)' }}>₹{Number(trip.tripTotal).toLocaleString('en-IN')}</td>
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
                                <span style={{ fontWeight: 500 }}>{item.qty}x {item.name}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>@ ₹{item.unitPrice} = <strong style={{ color: 'var(--text-primary)' }}>₹{item.subtotal}</strong></span>
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
        <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '2rem' }}>
          <div className="modal-content" style={{ width: '95%', maxWidth: '1000px', height: '90vh', minHeight: '600px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            
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
                {activeCategory === 'Pipe Cleaners' && (
                  <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'white', borderRadius: '12px', border: '1px solid var(--primary-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h4 style={{ margin: 0 }}>Select Pipe Cleaner Colors</h4>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          type="text" 
                          value={newColorInput} 
                          onChange={e => setNewColorInput(e.target.value)} 
                          onKeyDown={e => e.key === 'Enter' && handleAddColor()}
                          placeholder="New Color..." 
                          className="saas-input" 
                          style={{ width: '120px' }}
                        />
                        <button onClick={handleAddColor} className="primary-btn" style={{ padding: '0.5rem' }}><Plus size={16} /></button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {colors.map(color => {
                        const inBasketAmt = basket.find(i => i.name === `Pipe Cleaner - ${color}`)?.qty || 0;
                        return (
                          <div key={color} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                            <span style={{ fontWeight: 500 }}>{color}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <button onClick={() => {
                                const index = basket.findIndex(i => i.name === `Pipe Cleaner - ${color}`);
                                if (index !== -1) {
                                  if (basket[index].qty <= 1) removeBasketItem(index);
                                  else updateBasketItem(index, 'qty', basket[index].qty - 1);
                                }
                              }} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.1)', background: 'white', cursor: 'pointer' }}>-</button>
                              
                              <span style={{ width: '20px', textAlign: 'center', fontWeight: 'bold' }}>{inBasketAmt}</span>
                              
                              <button onClick={() => handleAddToBasket(`Pipe Cleaner - ${color}`, 80)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--primary-color)', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}>+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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
              <div style={{ width: '400px', display: 'flex', flexDirection: 'column', background: 'white' }}>
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
                          
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '80px' }}>
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Qty</label>
                              <input type="number" min="1" value={item.qty} onChange={e => updateBasketItem(index, 'qty', Number(e.target.value))} className="saas-input" style={{ textAlign: 'center' }} />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Price (₹)</label>
                              <input type="number" min="0" value={item.unitPrice} onChange={e => updateBasketItem(index, 'unitPrice', Number(e.target.value))} className="saas-input" />
                            </div>
                            
                            <div style={{ textAlign: 'right', minWidth: '80px', paddingBottom: '0.5rem' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Subtotal</div>
                              <div style={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}>₹{item.subtotal}</div>
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
      
    </div>
  );
}
