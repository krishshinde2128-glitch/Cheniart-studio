import React, { useState } from 'react';
import { Navbar } from './Navbar';
import type { PopUpEvent, PopUpChecklistItem, PopUpSaleItem, FlowerData } from '../types';
import { Plus, Trash2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

const wordToNumber: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  a: 1, an: 1
};

function parseSmartInput(input: string) {
  const parts = input.split('-');
  const leftPart = parts[0].trim();
  const pricePart = parts[1] ? parseFloat(parts[1].trim()) : null;

  const tokens = leftPart.split(/\s+/);
  let qty = 1;
  let nameTokens = tokens;
  
  if (tokens.length > 0) {
    const firstToken = tokens[0].toLowerCase();
    if (!isNaN(Number(firstToken))) {
      qty = Number(firstToken);
      nameTokens = tokens.slice(1);
    } else if (wordToNumber[firstToken]) {
      qty = wordToNumber[firstToken];
      nameTokens = tokens.slice(1);
    }
  }

  const parsedName = nameTokens.join(' ').toLowerCase();
  return { qty, name: parsedName, price: pricePart };
}

interface PopUpsProps {
  popups: PopUpEvent[];
  flowers: FlowerData[];
  onUpdatePopup: (id: string, updates: Partial<PopUpEvent>) => Promise<void>;
  onAddPopup: (popupData: Omit<PopUpEvent, 'id'>) => Promise<void>;
  onDeletePopup: (id: string) => Promise<void>;
}

export function PopUps({ popups, onUpdatePopup, onAddPopup, onDeletePopup }: PopUpsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', startDate: '', endDate: '', stallFee: 0 });

  const activePopups = popups.filter(p => p.status === 'Active');
  const pastPopups = popups.filter(p => p.status === 'Completed');

  const [expandedPastId, setExpandedPastId] = useState<string | null>(null);
  
  // Track which tab is active for each popup (e.g. { popupId: 'checklist' | 'sales' })
  const [activeTabs, setActiveTabs] = useState<Record<string, 'checklist' | 'sales'>>({});

  // States for active popup management - Smart Inputs
  const [smartChecklistInput, setSmartChecklistInput] = useState<Record<string, string>>({});
  const [googleSheetUrls, setGoogleSheetUrls] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);

  // New Sale Logger State
  const [saleForms, setSaleForms] = useState<Record<string, {
    category: string;
    qty: number;
    search: string;
    selectedItemId: string | null;
    unitPrice: number;
    totalPrice: number;
    isDropdownOpen: boolean;
    cart: {
      id: string; // unique for cart item
      checklistItemId: string;
      flowerName: string;
      qty: number;
      unitPrice: number;
      totalPrice: number;
      unitCost: number;
    }[];
    finalQuote: number | null;
  }>>({});

  const getSaleForm = (popupId: string) => {
    return saleForms[popupId] || { 
      category: '', qty: 1, search: '', selectedItemId: null, 
      unitPrice: 0, totalPrice: 0, isDropdownOpen: false, 
      cart: [], finalQuote: null 
    };
  };

  const updateSaleForm = (popupId: string, updates: Partial<typeof saleForms[string]>) => {
    setSaleForms(prev => ({
      ...prev,
      [popupId]: { ...getSaleForm(popupId), ...updates }
    }));
  };

  const handleCreateEvent = async () => {
    if (!newEvent.name || !newEvent.startDate || !newEvent.endDate) return;
    await onAddPopup({
      name: newEvent.name,
      startDate: newEvent.startDate,
      endDate: newEvent.endDate,
      stallFee: newEvent.stallFee,
      status: 'Active',
      currentDayIndex: 1,
      checklist: [],
      sales: []
    });
    setIsCreating(false);
    setNewEvent({ name: '', startDate: '', endDate: '', stallFee: 0 });
  };

  const handleAddChecklistItem = async (popup: PopUpEvent) => {
    const inputStr = smartChecklistInput[popup.id];
    if (!inputStr || !inputStr.trim()) return;

    const lines = inputStr.split('\n').map(l => l.trim()).filter(Boolean);
    const updatedChecklist = [...(popup.checklist || [])];

    for (const line of lines) {
      const parsed = parseSmartInput(line);
      if (!parsed.name) continue;

      const existingIndex = updatedChecklist.findIndex(i => i.flowerName.toLowerCase() === parsed.name.toLowerCase());
      if (existingIndex > -1) {
        updatedChecklist[existingIndex] = {
          ...updatedChecklist[existingIndex],
          initialQty: updatedChecklist[existingIndex].initialQty + parsed.qty,
          currentQty: updatedChecklist[existingIndex].currentQty + parsed.qty
        };
      } else {
        const newItem: PopUpChecklistItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          flowerName: parsed.name,
          initialQty: parsed.qty,
          currentQty: parsed.qty,
          unitCost: 0, // Costs aren't known when typing manually unless added. Can be updated via Google Sheet.
          unitSellingPrice: parsed.price || 0
        };
        updatedChecklist.push(newItem);
      }
    }
    
    await onUpdatePopup(popup.id, { checklist: updatedChecklist });
    setSmartChecklistInput({ ...smartChecklistInput, [popup.id]: '' });
  };

  const handleImportGoogleSheet = async (popup: PopUpEvent) => {
    const url = googleSheetUrls[popup.id];
    if (!url) return;

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      alert("Invalid Google Sheets URL. Make sure it contains '/d/SPREADSHEET_ID'.");
      return;
    }
    const spreadsheetId = match[1];
    const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
    if (!apiKey) {
      alert("Google Sheets API Key is missing. Please follow the instructions to add VITE_GOOGLE_SHEETS_API_KEY to your .env file.");
      return;
    }

    setIsImporting(true);
    try {
      // Data is on Sheet1 from A2 to F
      // Format: Category | Product | Quantity | Price | Total Price | Cost of making 1
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A2:F?key=${apiKey}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      if (!data.values || data.values.length === 0) {
        alert("No data found in Sheet1 (Columns A to F).");
        setIsImporting(false);
        return;
      }

      const updatedChecklist = [...(popup.checklist || [])];

      const parseCurrency = (str: string) => {
        if (!str) return 0;
        return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
      };

      let currentCategory = 'Uncategorized';

      for (const row of data.values) {
        const rawCategory = row[0]?.trim();
        if (rawCategory) {
          currentCategory = rawCategory;
        }

        const name = row[1]?.trim();
        if (!name) continue; 

        const qty = parseInt(row[2]) || 0;
        const price = parseCurrency(row[3]); // Column D is Price (Selling Price)
        const cost = parseCurrency(row[5]); // Column F is Cost of making 1

        const existingIndex = updatedChecklist.findIndex(i => i.flowerName.toLowerCase() === name.toLowerCase() && i.category === currentCategory);
        if (existingIndex > -1) {
          updatedChecklist[existingIndex] = {
            ...updatedChecklist[existingIndex],
            initialQty: updatedChecklist[existingIndex].initialQty + qty,
            currentQty: updatedChecklist[existingIndex].currentQty + qty,
            unitCost: cost,
            unitSellingPrice: price
          };
        } else {
          updatedChecklist.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            flowerName: name,
            category: currentCategory,
            initialQty: qty,
            currentQty: qty,
            unitCost: cost,
            unitSellingPrice: price
          });
        }
      }

      await onUpdatePopup(popup.id, { checklist: updatedChecklist });
      setGoogleSheetUrls({ ...googleSheetUrls, [popup.id]: '' });
      alert("Successfully imported items from Google Sheet!");
    } catch (error: any) {
      alert("Error importing from Google Sheets: " + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteChecklistItem = async (popup: PopUpEvent, itemId: string) => {
    const updatedChecklist = popup.checklist.filter(i => i.id !== itemId);
    await onUpdatePopup(popup.id, { checklist: updatedChecklist });
  };

  const handleAddToCart = (popup: PopUpEvent) => {
    const form = getSaleForm(popup.id);
    if (!form.selectedItemId || form.qty < 1) return;

    const checkItemMatch = (popup.checklist || []).find(i => i.id === form.selectedItemId);
    if (!checkItemMatch) return;

    // Optional: check if requested qty exceeds stock (including what's already in cart)
    const qtyInCart = form.cart.filter(i => i.checklistItemId === form.selectedItemId).reduce((sum, i) => sum + i.qty, 0);
    if (checkItemMatch.currentQty < form.qty + qtyInCart) {
      alert(`Not enough stock for "${checkItemMatch.flowerName}"! You only have ${checkItemMatch.currentQty - qtyInCart} available to add.`);
      return;
    }

    const categorySuffix = (checkItemMatch.category && checkItemMatch.category !== 'Uncategorized' && !checkItemMatch.flowerName.toLowerCase().includes(checkItemMatch.category.toLowerCase()))
      ? ` ${checkItemMatch.category}`
      : '';

    const newCartItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      checklistItemId: checkItemMatch.id,
      flowerName: `${checkItemMatch.flowerName}${categorySuffix}`,
      qty: form.qty,
      unitPrice: form.unitPrice,
      totalPrice: form.totalPrice,
      unitCost: checkItemMatch.unitCost
    };

    updateSaleForm(popup.id, { 
      cart: [...form.cart, newCartItem],
      qty: 1, search: '', selectedItemId: null, unitPrice: 0, totalPrice: 0, isDropdownOpen: false 
    });
  };

  const handleRemoveFromCart = (popupId: string, cartItemId: string) => {
    const form = getSaleForm(popupId);
    updateSaleForm(popupId, {
      cart: form.cart.filter(i => i.id !== cartItemId)
    });
  };

  const handleAddSale = async (popup: PopUpEvent) => {
    const form = getSaleForm(popup.id);
    if (form.cart.length === 0) return;

    let updatedChecklist = [...(popup.checklist || [])];
    let updatedSales = [...(popup.sales || [])];

    const totalBasePrice = form.cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const finalOrderQuote = form.finalQuote !== null ? form.finalQuote : totalBasePrice;
    const ratio = totalBasePrice > 0 ? (finalOrderQuote / totalBasePrice) : 1;

    const orderId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const timestamp = new Date().toISOString();

    for (const cartItem of form.cart) {
      const checkItemIndex = updatedChecklist.findIndex(i => i.id === cartItem.checklistItemId);
      if (checkItemIndex === -1) continue;

      const checkItemMatch = updatedChecklist[checkItemIndex];

      // Final check for stock
      if (checkItemMatch.currentQty < cartItem.qty) {
        alert(`Not enough stock for "${checkItemMatch.flowerName}"!`);
        return; // Abort whole order
      }

      const adjustedTotalPrice = cartItem.totalPrice * ratio;
      const adjustedUnitPrice = cartItem.qty > 0 ? (adjustedTotalPrice / cartItem.qty) : 0;

      const newSale: PopUpSaleItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        checklistItemId: checkItemMatch.id,
        flowerName: cartItem.flowerName,
        qty: cartItem.qty,
        unitPrice: adjustedUnitPrice,
        totalPrice: adjustedTotalPrice,
        dayIndex: popup.currentDayIndex,
        timestamp,
        orderId
      };

      updatedChecklist[checkItemIndex] = {
        ...checkItemMatch,
        currentQty: checkItemMatch.currentQty - cartItem.qty
      };

      updatedSales.push(newSale);
    }

    await onUpdatePopup(popup.id, { checklist: updatedChecklist, sales: updatedSales });
    // Reset form after successful order
    updateSaleForm(popup.id, { cart: [], finalQuote: null });
  };


  const handleDeleteOrder = async (popup: PopUpEvent, items: PopUpSaleItem[]) => {
    if (!window.confirm("Are you sure you want to delete this entire order? Stock will be restored.")) return;

    const saleIdsToDelete = new Set(items.map(i => i.id));
    const updatedSales = popup.sales?.filter(s => !saleIdsToDelete.has(s.id)) || [];
    let updatedChecklist = [...(popup.checklist || [])];

    items.forEach(saleToDelete => {
      const checkItemIndex = updatedChecklist.findIndex(i => 
        saleToDelete.checklistItemId
          ? i.id === saleToDelete.checklistItemId
          : i.flowerName === saleToDelete.flowerName
      );
      if (checkItemIndex > -1) {
        updatedChecklist[checkItemIndex] = {
          ...updatedChecklist[checkItemIndex],
          currentQty: updatedChecklist[checkItemIndex].currentQty + saleToDelete.qty
        };
      }
    });

    await onUpdatePopup(popup.id, { sales: updatedSales, checklist: updatedChecklist });
  };

  const handleEndDay = async (popup: PopUpEvent) => {
    if (window.confirm(`Are you sure you want to end Day ${popup.currentDayIndex}?`)) {
      await onUpdatePopup(popup.id, { currentDayIndex: popup.currentDayIndex + 1 });
    }
  };

  const handleEndPopup = async (popup: PopUpEvent) => {
    if (window.confirm("Are you sure you want to end this Pop-up Event? This will calculate final profits and move it to past events.")) {
      await onUpdatePopup(popup.id, { status: 'Completed' });
    }
  };

  const renderActivePopup = (popup: PopUpEvent) => {
    const todaysSales = popup.sales?.filter(s => s.dayIndex === popup.currentDayIndex) || [];
    const todaysTotal = todaysSales.reduce((sum, s) => sum + s.totalPrice, 0);
    const eventTotalSales = (popup.sales || []).reduce((sum, s) => sum + s.totalPrice, 0);
    
    const activeTab = activeTabs[popup.id] || 'sales';

    return (
      <section key={popup.id} className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: '0 0 0.25rem 0', fontFamily: "'Playfair Display', serif" }}>{popup.name}</h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {new Date(popup.startDate).toLocaleDateString()} - {new Date(popup.endDate).toLocaleDateString()}
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
              <span className="badge">Day {popup.currentDayIndex}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#991b1b', backgroundColor: '#fee2e2', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Stall Fee: ₹{popup.stallFee}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => handleEndDay(popup)} className="flat-btn" style={{ backgroundColor: 'white', border: '1px solid var(--primary-color)', color: 'var(--primary-color)' }}>
              End Day {popup.currentDayIndex}
            </button>
            <button onClick={() => handleEndPopup(popup)} className="flat-btn">
              <CheckCircle size={18} /> End Pop-up
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => setActiveTabs({...activeTabs, [popup.id]: 'sales'})}
            style={{ 
              background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
              borderBottom: activeTab === 'sales' ? '2px solid var(--primary-color)' : '2px solid transparent',
              color: activeTab === 'sales' ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'sales' ? 600 : 400
            }}
          >
            Sales Log
          </button>
          <button 
            onClick={() => setActiveTabs({...activeTabs, [popup.id]: 'checklist'})}
            style={{ 
              background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
              borderBottom: activeTab === 'checklist' ? '2px solid var(--primary-color)' : '2px solid transparent',
              color: activeTab === 'checklist' ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'checklist' ? 600 : 400
            }}
          >
            Checklist
          </button>
        </div>

        <div>
          {/* TAB: CHECKLIST */}
          {activeTab === 'checklist' && (
          <div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Inventory Checklist</h3>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <textarea 
                value={smartChecklistInput[popup.id] || ''}
                onChange={(e) => setSmartChecklistInput({...smartChecklistInput, [popup.id]: e.target.value})}
                className="saas-input" 
                style={{ flex: 1, minHeight: '60px', resize: 'vertical' }}
                placeholder="e.g. '10 sunflowers'\nOr paste multiple lines!"
              />
              <button onClick={() => handleAddChecklistItem(popup)} className="flat-btn" style={{ padding: '0.5rem 1rem' }} disabled={!(smartChecklistInput[popup.id]?.trim())}>
                Add
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center', backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#166534', marginBottom: '0.25rem' }}>Import from Google Sheet</div>
                <input 
                  type="text" 
                  value={googleSheetUrls[popup.id] || ''}
                  onChange={(e) => setGoogleSheetUrls({...googleSheetUrls, [popup.id]: e.target.value})}
                  className="saas-input" 
                  style={{ width: '100%', backgroundColor: 'white' }}
                  placeholder="Paste Google Sheet link here..."
                />
              </div>
              <button onClick={() => handleImportGoogleSheet(popup)} className="flat-btn" style={{ padding: '0.5rem 1rem', backgroundColor: '#166534', marginTop: '1.25rem' }} disabled={isImporting || !(googleSheetUrls[popup.id]?.trim())}>
                {isImporting ? 'Importing...' : 'Import'}
              </button>
            </div>

            <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="data-table" style={{ fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: 'center' }}>Total Packed</th>
                    <th style={{ textAlign: 'center' }}>Available</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const checklist = popup.checklist || [];
                    if (checklist.length === 0) {
                      return <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Checklist is empty. Pack some items!</td></tr>;
                    }
                    
                    const grouped = checklist.reduce((acc, item) => {
                      const cat = item.category || 'Uncategorized';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(item);
                      return acc;
                    }, {} as Record<string, PopUpChecklistItem[]>);

                    return Object.entries(grouped).map(([category, items]) => (
                      <React.Fragment key={category}>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <td colSpan={5} style={{ fontWeight: 'bold', padding: '0.5rem 1rem', color: '#374151' }}>{category}</td>
                        </tr>
                        {items.map(item => (
                          <tr key={item.id} style={{ opacity: item.currentQty === 0 ? 0.6 : 1 }}>
                            <td className="font-medium" style={{ paddingLeft: '2rem' }}>{item.flowerName}</td>
                            <td style={{ textAlign: 'center' }}>{item.initialQty}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: item.currentQty === 0 ? '#ef4444' : 'inherit' }}>{item.currentQty}</td>
                            <td style={{ textAlign: 'right' }}>₹{item.unitSellingPrice}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button onClick={() => handleDeleteChecklistItem(popup, item.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* TAB: SALES LOGGER */}
          {activeTab === 'sales' && (
          <div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Log Sale</h3>
            
            {(() => {
              const form = getSaleForm(popup.id);
              const categories = Array.from(new Set((popup.checklist || []).map(i => i.category || 'Uncategorized')));
              // Automatically select first category if none selected
              if (!form.category && categories.length > 0) {
                setTimeout(() => updateSaleForm(popup.id, { category: categories[0] }), 0);
              }

              const availableItems = (popup.checklist || []).filter(i => 
                (i.category || 'Uncategorized') === form.category &&
                i.currentQty > 0 &&
                i.flowerName.toLowerCase().includes(form.search.toLowerCase())
              );

              return (
                <div style={{ backgroundColor: '#FBF8F2', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(122, 144, 120, 0.2)', marginBottom: '1.5rem' }}>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 2fr', gap: '1rem', alignItems: 'end', marginBottom: '1.5rem' }}>
                    
                    {/* CATEGORY */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Category</label>
                      <select 
                        value={form.category} 
                        onChange={(e) => updateSaleForm(popup.id, { category: e.target.value, selectedItemId: null, search: '' })}
                        className="saas-input"
                        style={{ width: '100%', backgroundColor: 'white', cursor: 'pointer' }}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* QTY */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Qty</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={form.qty} 
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value) || 1;
                          updateSaleForm(popup.id, { qty: newQty, totalPrice: form.unitPrice * newQty });
                        }}
                        className="saas-input"
                        style={{ width: '100%', backgroundColor: 'white' }}
                      />
                    </div>

                    {/* SEARCH & SELECT */}
                    <div style={{ position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Search & Select Item</label>
                      <input 
                        type="text" 
                        value={form.selectedItemId ? (popup.checklist || []).find(i => i.id === form.selectedItemId)?.flowerName : form.search}
                        onChange={(e) => {
                          updateSaleForm(popup.id, { search: e.target.value, selectedItemId: null, isDropdownOpen: true });
                        }}
                        onFocus={() => updateSaleForm(popup.id, { isDropdownOpen: true })}
                        placeholder="Search items..."
                        className="saas-input"
                        style={{ width: '100%', backgroundColor: 'white' }}
                      />
                      {form.isDropdownOpen && availableItems.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', marginTop: '4px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                          {availableItems.map(item => (
                            <div 
                              key={item.id} 
                              style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                              onClick={() => {
                                updateSaleForm(popup.id, { 
                                  selectedItemId: item.id, 
                                  search: '', 
                                  isDropdownOpen: false,
                                  unitPrice: item.unitSellingPrice,
                                  totalPrice: item.unitSellingPrice * form.qty
                                });
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <span>{item.flowerName}{item.category && item.category !== 'Uncategorized' && !item.flowerName.toLowerCase().includes(item.category.toLowerCase()) ? ` ${item.category}` : ''}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>₹{item.unitSellingPrice}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {form.isDropdownOpen && availableItems.length === 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', marginTop: '4px', zIndex: 10, padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No items match your search.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PRICE EDITOR */}
                  {form.selectedItemId && (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', marginTop: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Unit Price (Editable)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>₹</span>
                          <input 
                            type="number" 
                            value={form.unitPrice} 
                            onChange={(e) => {
                              const p = parseFloat(e.target.value) || 0;
                              updateSaleForm(popup.id, { unitPrice: p, totalPrice: p * form.qty });
                            }}
                            className="saas-input"
                            style={{ padding: '0.25rem 0.5rem', width: '100px' }}
                          />
                        </div>
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Price (Editable)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>₹</span>
                          <input 
                            type="number" 
                            value={form.totalPrice} 
                            onChange={(e) => {
                              const t = parseFloat(e.target.value) || 0;
                              updateSaleForm(popup.id, { totalPrice: t });
                            }}
                            className="saas-input"
                            style={{ padding: '0.25rem 0.5rem', width: '100px' }}
                          />
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleAddToCart(popup)} 
                        className="flat-btn" 
                        style={{ padding: '0.5rem 1.5rem', backgroundColor: 'var(--primary-dark)' }}
                      >
                        Add to Order
                      </button>
                    </div>
                  )}
                  
                  {/* ORDER SUMMARY (CART) */}
                  {form.cart.length > 0 && (
                    <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#6b7e65', borderRadius: '12px', color: 'white' }}>
                      <h4 style={{ fontSize: '1.25rem', fontFamily: "'Playfair Display', serif", marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem' }}>
                        Order Summary
                      </h4>
                      
                      {/* Cart Items */}
                      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {form.cart.map(item => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                            <div>
                              <span style={{ fontWeight: 600 }}>{item.qty}x</span> {item.flowerName}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.5rem', borderRadius: '6px' }}>
                                <span style={{ marginRight: '0.25rem' }}>₹</span>
                                <input 
                                  type="number"
                                  value={item.totalPrice}
                                  onChange={(e) => {
                                    const newPrice = parseFloat(e.target.value) || 0;
                                    updateSaleForm(popup.id, {
                                      cart: form.cart.map(c => c.id === item.id ? { ...c, totalPrice: newPrice } : c)
                                    });
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: 'white', width: '60px', outline: 'none', textAlign: 'right' }}
                                />
                              </div>
                              <button onClick={() => handleRemoveFromCart(popup.id, item.id)} style={{ color: '#ffb3b3', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {(() => {
                        const totalBaseCost = form.cart.reduce((sum, item) => sum + item.totalPrice, 0);
                        const totalUnitCosts = form.cart.reduce((sum, item) => sum + (item.unitCost * item.qty), 0);
                        const finalQuote = form.finalQuote !== null ? form.finalQuote : totalBaseCost;
                        const estimatedProfit = finalQuote - totalUnitCosts;

                        return (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'rgba(255,255,255,0.9)' }}>
                              <span>Total Base Cost:</span>
                              <span>₹{totalBaseCost}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                              <span>Estimated Profit:</span>
                              <span>₹{estimatedProfit.toFixed(0)}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                              <span style={{ fontSize: '1.125rem', fontWeight: 500 }}>Total Quote:</span>
                              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                                <span style={{ marginRight: '0.5rem', fontWeight: 600 }}>₹</span>
                                <input 
                                  type="number"
                                  value={finalQuote}
                                  onChange={(e) => updateSaleForm(popup.id, { finalQuote: parseFloat(e.target.value) || 0 })}
                                  style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', fontWeight: 700, width: '100px', outline: 'none', textAlign: 'right' }}
                                />
                              </div>
                            </div>

                            <button 
                              onClick={() => handleAddSale(popup)} 
                              className="flat-btn" 
                              style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.9)', color: '#6b7e65', padding: '1rem', fontSize: '1.125rem', fontWeight: 600 }}
                            >
                              Save Final Quote & Log Sale
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '8px', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Day {popup.currentDayIndex} Sales</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{todaysTotal}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Event Sales</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{eventTotalSales}</div>
              </div>
            </div>

            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Today's Log</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {todaysSales.length === 0 && <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No sales logged yet today.</div>}
                {(() => {
                  const groupedSalesMap = new Map<string, { orderId: string, items: PopUpSaleItem[], timestamp: string, totalPrice: number }>();
                  todaysSales.forEach(sale => {
                    const oId = sale.orderId || sale.id;
                    if (!groupedSalesMap.has(oId)) {
                      groupedSalesMap.set(oId, { orderId: oId, items: [], timestamp: sale.timestamp, totalPrice: 0 });
                    }
                    const group = groupedSalesMap.get(oId)!;
                    group.items.push(sale);
                    group.totalPrice += sale.totalPrice;
                  });
                  const groupedSales = Array.from(groupedSalesMap.values());
                  console.log("Grouped Sales for UI:", groupedSales);

                  return [...groupedSales].reverse().map(group => (
                    <div key={group.orderId} style={{ display: 'flex', flexDirection: 'column', padding: '0.75rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span>
                            {group.items.map((sale, index) => {
                              const checkItem = popup.checklist?.find(i => i.id === sale.checklistItemId);
                              const cat = checkItem?.category;
                              const displayName = (cat && cat !== 'Uncategorized' && !sale.flowerName.toLowerCase().includes(cat.toLowerCase())) 
                                ? `${sale.flowerName} ${cat}` 
                                : sale.flowerName;
                              return (
                                <React.Fragment key={sale.id}>
                                  <span className="font-bold">{sale.qty}x</span> {displayName}
                                  {index < group.items.length - 1 ? ', ' : ''}
                                </React.Fragment>
                              );
                            })}
                          </span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{new Date(group.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span className="font-bold highlight-green" style={{ fontSize: group.items.length > 1 ? '1.1rem' : 'inherit' }}>₹{group.totalPrice.toFixed(0)}</span>
                          <button 
                            onClick={() => handleDeleteOrder(popup, group.items)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
                            title={group.items.length > 1 ? "Delete Order" : "Delete Sale"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

          </div>
          )}
        </div>
      </section>
    );
  };

  const renderPastPopup = (popup: PopUpEvent) => {
    const isExpanded = expandedPastId === popup.id;
    const totalSales = (popup.sales || []).reduce((sum, s) => sum + s.totalPrice, 0);
    const itemsSoldValueCost = (popup.checklist || []).reduce((sum, item) => sum + ((item.initialQty - item.currentQty) * item.unitCost), 0);
    
    // Profit = Total Sales - Stall Fee - Cost of items ACTUALLY sold
    const profit = totalSales - popup.stallFee - itemsSoldValueCost;

    return (
      <div key={popup.id} className="glass-card" style={{ padding: '1.5rem', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setExpandedPastId(isExpanded ? null : popup.id)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>{popup.name}</h3>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {new Date(popup.startDate).toLocaleDateString()} - {new Date(popup.endDate).toLocaleDateString()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Sales</div>
              <div style={{ fontWeight: 600 }}>₹{totalSales}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Profit</div>
              <div style={{ fontWeight: 700, color: profit >= 0 ? '#059669' : '#dc2626' }}>₹{profit.toFixed(0)}</div>
            </div>
            {isExpanded ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
          </div>
        </div>

        {isExpanded && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.1)', cursor: 'default' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Financial Breakdown</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>Total Sales:</span><span>₹{totalSales}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>Stall Fee:</span><span style={{ color: '#ef4444' }}>-₹{popup.stallFee}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px dashed rgba(0,0,0,0.1)' }}>
                  <span title="Cost of items actually sold">Cost of Sold Goods:</span><span style={{ color: '#ef4444' }}>-₹{itemsSoldValueCost.toFixed(0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Net Profit:</span><span style={{ color: profit >= 0 ? '#059669' : '#dc2626' }}>₹{profit.toFixed(0)}</span>
                </div>
              </div>
              
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Inventory Summary</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-secondary)', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                        <th style={{ padding: '0.25rem 0' }}>Item</th>
                        <th style={{ padding: '0.25rem 0', textAlign: 'center' }}>Taken</th>
                        <th style={{ padding: '0.25rem 0', textAlign: 'center' }}>Sold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(popup.checklist || []).map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding: '0.35rem 0' }}>{item.flowerName}</td>
                          <td style={{ padding: '0.35rem 0', textAlign: 'center' }}>{item.initialQty}</td>
                          <td style={{ padding: '0.35rem 0', textAlign: 'center', fontWeight: 600 }}>{item.initialQty - item.currentQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button onClick={() => { if(window.confirm('Delete this event log completely?')) onDeletePopup(popup.id); }} style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Delete Event Record</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <Navbar />
      <header className="dashboard-header" style={{ justifyContent: 'flex-end' }}>
        <span className="badge">Pop-ups & Events</span>
      </header>

      <main className="dashboard-content">
        
        {/* Create Event Section */}
        {activePopups.length === 0 && !isCreating && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
            <button onClick={() => setIsCreating(true)} className="flat-btn" style={{ fontSize: '1.125rem', padding: '1rem 2rem' }}>
              <Plus size={20} /> Start New Pop-up Event
            </button>
          </div>
        )}

        {isCreating && (
          <section className="glass-card" style={{ marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1.5rem', fontFamily: "'Playfair Display', serif" }}>New Pop-up Details</h2>
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Event Name / Location</label>
                <input type="text" value={newEvent.name} onChange={e => setNewEvent({...newEvent, name: e.target.value})} className="saas-input" placeholder="e.g. Phoenix Mall Market" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Start Date</label>
                  <input type="date" value={newEvent.startDate} onChange={e => setNewEvent({...newEvent, startDate: e.target.value})} className="saas-input" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>End Date</label>
                  <input type="date" value={newEvent.endDate} onChange={e => setNewEvent({...newEvent, endDate: e.target.value})} className="saas-input" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Stall Fee (₹)</label>
                <input type="number" min="0" value={newEvent.stallFee || ''} onChange={e => setNewEvent({...newEvent, stallFee: parseFloat(e.target.value) || 0})} className="saas-input" placeholder="0" />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button onClick={handleCreateEvent} className="flat-btn" style={{ flex: 1 }}>Create Event</button>
                <button onClick={() => setIsCreating(false)} className="flat-btn" style={{ backgroundColor: 'transparent', border: '1px solid rgba(0,0,0,0.2)', color: 'var(--text-secondary)' }}>Cancel</button>
              </div>
            </div>
          </section>
        )}

        {/* Active Popups */}
        {activePopups.map(renderActivePopup)}

        {/* Past Popups */}
        {pastPopups.length > 0 && (
          <section>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1.5rem', fontFamily: "'Playfair Display', serif" }}>Past Events</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pastPopups.map(renderPastPopup)}
            </div>
          </section>
        )}

        {activePopups.length === 0 && pastPopups.length === 0 && !isCreating && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <p>No pop-ups recorded yet. Start one to track your event sales and inventory!</p>
          </div>
        )}

      </main>
    </div>
  );
}
