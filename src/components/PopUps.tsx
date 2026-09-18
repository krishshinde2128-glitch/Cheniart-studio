import { useState } from 'react';
import { Navbar } from './Navbar';
import type { PopUpEvent, PopUpChecklistItem, PopUpSaleItem, FlowerData } from '../types';
import { Plus, Trash2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { calculateProductCost } from '../App';

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

function findBestMatch<T>(parsedName: string, items: T[], itemNameKey: keyof T): T | undefined {
  if (!parsedName) return undefined;
  
  // exact match
  let match = items.find(i => String(i[itemNameKey]).toLowerCase() === parsedName);
  if (match) return match;
  
  // partial match
  match = items.find(i => String(i[itemNameKey]).toLowerCase().includes(parsedName) || parsedName.includes(String(i[itemNameKey]).toLowerCase()));
  
  // singular/plural fallback
  if (!match && parsedName.endsWith('s')) {
    const singular = parsedName.slice(0, -1);
    match = items.find(i => String(i[itemNameKey]).toLowerCase().includes(singular));
  }
  
  return match;
}

interface PopUpsProps {
  popups: PopUpEvent[];
  flowers: FlowerData[];
  onUpdatePopup: (id: string, updates: Partial<PopUpEvent>) => Promise<void>;
  onAddPopup: (popupData: Omit<PopUpEvent, 'id'>) => Promise<void>;
  onDeletePopup: (id: string) => Promise<void>;
}

export function PopUps({ popups, flowers, onUpdatePopup, onAddPopup, onDeletePopup }: PopUpsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', startDate: '', endDate: '', stallFee: 0 });

  const activePopups = popups.filter(p => p.status === 'Active');
  const pastPopups = popups.filter(p => p.status === 'Completed');

  const [expandedPastId, setExpandedPastId] = useState<string | null>(null);
  
  // Track which tab is active for each popup (e.g. { popupId: 'checklist' | 'sales' })
  const [activeTabs, setActiveTabs] = useState<Record<string, 'checklist' | 'sales'>>({});

  // States for active popup management - Smart Inputs
  const [smartChecklistInput, setSmartChecklistInput] = useState<Record<string, string>>({});
  const [smartSaleInput, setSmartSaleInput] = useState<Record<string, string>>({});

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
    let hasErrors = false;

    for (const line of lines) {
      const parsed = parseSmartInput(line);
      if (!parsed.name) continue;

      const flower = findBestMatch(parsed.name, flowers, 'name');
      if (!flower) {
        alert(`Could not find a product matching "${parsed.name}" in your database (from line: "${line}").`);
        hasErrors = true;
        continue;
      }

      const existingIndex = updatedChecklist.findIndex(i => i.flowerName === flower.name);
      if (existingIndex > -1) {
        updatedChecklist[existingIndex] = {
          ...updatedChecklist[existingIndex],
          initialQty: updatedChecklist[existingIndex].initialQty + parsed.qty,
          currentQty: updatedChecklist[existingIndex].currentQty + parsed.qty
        };
      } else {
        const newItem: PopUpChecklistItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          flowerName: flower.name,
          initialQty: parsed.qty,
          currentQty: parsed.qty,
          unitCost: calculateProductCost(flower),
          unitSellingPrice: flower.sellingPrice || 0
        };
        updatedChecklist.push(newItem);
      }
    }
    
    await onUpdatePopup(popup.id, { checklist: updatedChecklist });
    if (!hasErrors) {
      setSmartChecklistInput({ ...smartChecklistInput, [popup.id]: '' });
    }
  };

  const handleDeleteChecklistItem = async (popup: PopUpEvent, itemId: string) => {
    const updatedChecklist = popup.checklist.filter(i => i.id !== itemId);
    await onUpdatePopup(popup.id, { checklist: updatedChecklist });
  };

  const handleAddSale = async (popup: PopUpEvent) => {
    const inputStr = smartSaleInput[popup.id];
    if (!inputStr || !inputStr.trim()) return;

    const lines = inputStr.split('\n').map(l => l.trim()).filter(Boolean);
    let updatedChecklist = [...(popup.checklist || [])];
    let updatedSales = [...(popup.sales || [])];
    let hasErrors = false;

    for (const line of lines) {
      const parsed = parseSmartInput(line);
      if (!parsed.name) continue;

      const checkItemMatch = findBestMatch(parsed.name, updatedChecklist, 'flowerName');
      
      if (!checkItemMatch) {
        alert(`Could not find "${parsed.name}" in this pop-up's checklist (from line: "${line}")!`);
        hasErrors = true;
        continue;
      }

      if (checkItemMatch.currentQty < parsed.qty) {
        alert(`Not enough stock in checklist for "${checkItemMatch.flowerName}"! You only have ${checkItemMatch.currentQty} left (from line: "${line}").`);
        hasErrors = true;
        continue;
      }

      const checkItemIndex = updatedChecklist.findIndex(i => i.id === checkItemMatch.id);
      const unitPrice = parsed.price ?? checkItemMatch.unitSellingPrice;

      const newSale: PopUpSaleItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        flowerName: checkItemMatch.flowerName,
        qty: parsed.qty,
        unitPrice: unitPrice,
        totalPrice: unitPrice * parsed.qty,
        dayIndex: popup.currentDayIndex,
        timestamp: new Date().toISOString()
      };

      updatedChecklist[checkItemIndex] = {
        ...checkItemMatch,
        currentQty: checkItemMatch.currentQty - parsed.qty
      };

      updatedSales.push(newSale);
    }

    await onUpdatePopup(popup.id, { checklist: updatedChecklist, sales: updatedSales });
    if (!hasErrors) {
      setSmartSaleInput({ ...smartSaleInput, [popup.id]: '' });
    }
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
                  {(popup.checklist || []).map(item => (
                    <tr key={item.id} style={{ opacity: item.currentQty === 0 ? 0.6 : 1 }}>
                      <td className="font-medium">{item.flowerName}</td>
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
                  {(!popup.checklist || popup.checklist.length === 0) && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Checklist is empty. Pack some items!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* TAB: SALES LOGGER */}
          {activeTab === 'sales' && (
          <div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Log Sale</h3>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', padding: '1rem', backgroundColor: '#FBF8F2', borderRadius: '8px', border: '1px solid rgba(122, 144, 120, 0.2)' }}>
              <textarea 
                value={smartSaleInput[popup.id] || ''}
                onChange={(e) => setSmartSaleInput({...smartSaleInput, [popup.id]: e.target.value})}
                className="saas-input" 
                style={{ flex: 1, backgroundColor: 'white', minHeight: '60px', resize: 'vertical' }}
                placeholder="e.g. '1 sunflower - 150'\nPaste multiple lines to log a huge sale at once!"
              />
              <button onClick={() => handleAddSale(popup)} className="flat-btn" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--primary-dark)' }} disabled={!(smartSaleInput[popup.id]?.trim())}>
                Sell
              </button>
            </div>

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
                {[...todaysSales].reverse().map(sale => (
                  <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)', fontSize: '0.875rem' }}>
                    <div>
                      <span className="font-bold">{sale.qty}x</span> {sale.flowerName}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                    <div className="font-bold highlight-green">₹{sale.totalPrice}</div>
                  </div>
                ))}
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
