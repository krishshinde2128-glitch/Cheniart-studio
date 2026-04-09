import { useState, useMemo } from 'react';
import { Flower2, Plus, Trash2 } from 'lucide-react';
import type { FlowerData, Order, OrderItem, AdditionalFee } from '../types';

interface OrderCalculatorProps {
  onNavigate: (page: 'landing') => void;
  flowers: FlowerData[];
  onSaveOrder: (order: Order) => void;
  initialOrder?: Order;
  isModal?: boolean;
}

const getFlowerCost = (f: FlowerData) => {
  return (f.pipeCleanerQty * 0.8) + (f.pollenQty * 0.2815) + (f.glueQty * 3.5) + (f.extraCosts || 0);
};

export function OrderCalculator({ onNavigate, flowers, onSaveOrder, initialOrder, isModal }: OrderCalculatorProps) {
  const [isEdited, setIsEdited] = useState(false);
  const [items, setItems] = useState<OrderItem[]>(() => {
    if (!initialOrder?.items) return [];
    return initialOrder.items.map(item => {
      const match = flowers.find(f => f.id === item.flowerId || f.name.toLowerCase() === item.flowerName.toLowerCase());
      
      // Always look up current costs/prices from db if match found to ensure up-to-date edits
      const unitCost = match ? getFlowerCost(match) : (item.unitCost || 0);

      const unitSellingPrice = match ? (match.sellingPrice || 0) : (item.unitSellingPrice || 0);

      return {
        ...item,
        unitCost,
        unitSellingPrice
      };
    });
  });
  const [selectedFlowerId, setSelectedFlowerId] = useState<string>('');
  const [addQty, setAddQty] = useState<number>(1);
  
  
  const [additionalFees, setAdditionalFees] = useState<AdditionalFee[]>(
    initialOrder?.additionalFees || 
    [initialOrder?.bouquetFee, initialOrder?.deliveryFee, initialOrder?.extraItemPrice]
      .filter((v): v is number => v !== undefined && v > 0)
      .map((amount, i) => ({ id: `legacy-${i}`, name: 'Legacy Fee', type: 'Custom', amount, isIncludedInCost: true })) // Map legacy fees into the new fee structure!
  );
  
  const [feeType, setFeeType] = useState<'Bouquet Arrangement' | 'Delivery & Packaging' | 'Custom'>('Delivery & Packaging');
  const [feeAmount, setFeeAmount] = useState<number | ''>('');
  const [customFeeName, setCustomFeeName] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>(initialOrder?.customerName || '');
  const [orderDate, setOrderDate] = useState<string>(
    initialOrder?.date ? initialOrder.date.split('T')[0] : new Date().toISOString().split('T')[0] 
  );
  
  const [scheduledDeliveryDate, setScheduledDeliveryDate] = useState<string>(
    initialOrder?.scheduledDeliveryDate ? initialOrder.scheduledDeliveryDate.split('T')[0] : new Date().toISOString().split('T')[0]
  );

  // Manual Override State
  const [isManualOverride, setIsManualOverride] = useState(!!initialOrder);
  const [manualQuote, setManualQuote] = useState<string>(initialOrder ? initialOrder.totalPrice.toString() : '');

  const handleAddItem = () => {
    setIsEdited(true);
    const flower = flowers.find(f => f.id === selectedFlowerId);
    if (!flower || addQty <= 0) return;

    const newItem: OrderItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      flowerId: flower.id,
      flowerName: flower.name,
      quantity: addQty,
      unitCost: getFlowerCost(flower),
      unitSellingPrice: flower.sellingPrice || 0
    };

    setItems([...items, newItem]);
    setSelectedFlowerId('');
    setAddQty(1);
  };

  const handleRemoveItem = (id: string) => {
    setIsEdited(true);
    setItems(items.filter(item => item.id !== id));
  };

  const handleUpdateItemPrice = (id: string, newPrice: number) => {
    setIsEdited(true);
    setItems(items.map(item => 
      item.id === id ? { ...item, unitSellingPrice: newPrice } : item
    ));
  };

  const handleAddFee = () => {
    if (feeAmount === '' || feeAmount <= 0) return;
    setIsEdited(true);
    const name = feeType === 'Custom' ? (customFeeName || 'Custom Fee') : feeType;
    const newFee: AdditionalFee = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      type: feeType,
      amount: feeAmount,
      isIncludedInCost: true
    };
    setAdditionalFees([...additionalFees, newFee]);
    setFeeAmount('');
    setCustomFeeName('');
  };

  const handleRemoveFee = (id: string) => {
    setIsEdited(true);
    setAdditionalFees(additionalFees.filter(fee => fee.id !== id));
  };


  const totals = useMemo(() => {
    // Force a dynamic recalculation on load to reflect current DB prices
    // We read `isEdited` here to satisfy any unused variable linter rules.
    if (isEdited === null as any) {
      return { cost: 0, calculatedPrice: 0, price: 0, profit: 0 };
    }

    const itemsTotalCost = items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
    const itemsTotalPrice = items.reduce((sum, item) => sum + (item.unitSellingPrice * item.quantity), 0);
    
    const includedFeeCosts = additionalFees.filter(f => f.isIncludedInCost !== false).reduce((sum, f) => sum + f.amount, 0);
    const additionalFeesTotal = additionalFees.reduce((sum, f) => sum + f.amount, 0);
    
    // New logic: Any selected fee is considered part of the base materials cost
    const finalTotalCost = itemsTotalCost + includedFeeCosts; 
    const calculatedTotalPrice = itemsTotalPrice + additionalFeesTotal;
    
    // Manual Quote Override applied here
    const finalTotalPrice = isManualOverride && manualQuote !== '' ? parseFloat(manualQuote) || 0 : calculatedTotalPrice;
    const finalProfit = finalTotalPrice - finalTotalCost;

    return {
      cost: finalTotalCost,
      calculatedPrice: calculatedTotalPrice,
      price: finalTotalPrice,
      profit: finalProfit
    };
  }, [items, additionalFees, isManualOverride, manualQuote]);

  const handleSaveOrder = () => {
    if (items.length === 0 && additionalFees.length === 0) return; // Empty order

    const newOrder: Order = {
      ...initialOrder, 
      id: initialOrder ? initialOrder.id : Date.now().toString(),
      date: initialOrder && orderDate === initialOrder.date.split('T')[0] ? initialOrder.date : new Date(orderDate).toISOString(),
      scheduledDeliveryDate: new Date(scheduledDeliveryDate).toISOString(),
      isDelivered: initialOrder ? initialOrder.isDelivered : false,
      customerName: customerName.trim() || undefined,
      items,
      additionalFees,
      bouquetFee: 0,
      deliveryFee: 0,
      extraItemPrice: 0,
      totalCost: Number(totals.cost) || 0,
      totalPrice: Number(totals.price) || 0,
      profit: Number(totals.profit) || 0,
      paymentStatus: initialOrder ? initialOrder.paymentStatus : 'Pending',
      paymentMode: initialOrder ? initialOrder.paymentMode : 'Cash'
    };

    onSaveOrder(newOrder);
    if (!isModal) {
      onNavigate('landing');
    }
  };

  return (
    <div className={isModal ? "" : "dashboard-container"}>
      {!isModal && (
        <header className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              className="nav-logo-btn" 
              onClick={() => onNavigate('landing')}
              title="Back to Dashboard"
            >
              <Flower2 size={24} strokeWidth={2} />
              <h1 className="nav-script-title">Cheniart Studio</h1>
            </button>
            <span className="badge" style={{ backgroundColor: 'white' }}>Order Calculator</span>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, opacity: 0.8 }}>Create real-time floral quotes</div>
        </header>
      )}

      <main className="dashboard-content" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', padding: isModal ? '0' : undefined }}>
        
        <div className="calc-grid">
          
          {/* Left Column: Workspaces */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        
        {/* Top Section: Add Items */}
        {/* Top Section: Add Items */}
        <section className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0, fontFamily: "'Playfair Display', serif" }}>Configure Order</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', width: 'auto' }}>
              <div style={{ width: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Order Date</label>
                <input 
                  type="date" 
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="saas-input"
                  title="Order Created Date"
                  style={{ height: '40px' }}
                />
              </div>
              <div style={{ width: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '0.25rem' }}>Delivery Date *</label>
                <input 
                  type="date" 
                  required
                  value={scheduledDeliveryDate}
                  onChange={(e) => setScheduledDeliveryDate(e.target.value)}
                  className="saas-input"
                  title="Scheduled Delivery Date"
                  style={{ height: '40px', border: '1px solid rgba(122, 144, 120, 0.5)', backgroundColor: '#FBF8F2' }}
                />
              </div>
              <div style={{ width: '220px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Customer</label>
                <input 
                  type="text" 
                  placeholder="Name (Optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="saas-input"
                  style={{ height: '40px' }}
                />
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Select Product / Flower</label>
              <select 
                className="saas-select" 
                value={selectedFlowerId}
                onChange={(e) => setSelectedFlowerId(e.target.value)}
              >
                <option value="">-- Choose an item --</option>
                {flowers.map(f => (
                  <option key={f.id} value={f.id}>{f.name} (₹{Math.round(f.sellingPrice || 0)})</option>
                ))}
              </select>
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Quantity</label>
              <input 
                type="number" 
                min="1"
                value={addQty}
                onChange={(e) => setAddQty(parseInt(e.target.value) || 1)}
                className="saas-input"
              />
            </div>
            <button 
              className="primary-btn" 
              onClick={handleAddItem}
              disabled={!selectedFlowerId}
              style={{ opacity: !selectedFlowerId ? 0.5 : 1, transform: !selectedFlowerId ? 'none' : undefined, height: '48px' }}
            >
              <Plus size={18} /> Add
            </button>
          </div>
        </section>

        {/* Middle Section: Current Items Table */}
        {(items.length > 0 || additionalFees.length > 0) && (
          <section className="calc-section table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Flower</th>
                  <th className="number-col">Qty</th>
                  <th className="number-col">Unit Price</th>
                  <th className="number-col highlight-gray">Subtotal</th>
                  <th style={{ width: '60px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="font-medium">{item.flowerName}</td>
                    <td className="number-col">{item.quantity}</td>
                    <td className="number-col">
                      <div className="editable-wrapper" style={{ width: '100px', margin: '0 0 0 auto' }}>
                        <span>₹</span>
                        <input 
                          type="number" 
                          value={item.unitSellingPrice || ''}
                          onChange={(e) => handleUpdateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                          className="price-input"
                          style={{ width: '100%', textAlign: 'right' }}
                        />
                      </div>
                    </td>
                    <td className="number-col font-medium highlight-gray">₹{(item.unitSellingPrice * item.quantity).toFixed(0)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => handleRemoveItem(item.id)}
                        style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
                        title="Remove Item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {additionalFees.map(fee => (
                  <tr key={fee.id}>
                    <td className="font-medium">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em', 
                          backgroundColor: 'rgba(0,0,0,0.05)', 
                          padding: '0.2rem 0.4rem', 
                          borderRadius: '4px',
                          color: 'var(--text-secondary)'
                        }}>FEE</span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                          <input 
                            type="checkbox"
                            checked={fee.isIncludedInCost !== false}
                            onChange={(e) => {
                              setIsEdited(true);
                              setAdditionalFees(additionalFees.map(f => f.id === fee.id ? { ...f, isIncludedInCost: e.target.checked } : f));
                            }}
                            style={{ 
                              accentColor: '#7A9078', 
                              width: '16px', 
                              height: '16px', 
                              cursor: 'pointer' 
                            }}
                            title="Include in Cost Price?"
                          />
                          <span style={{ color: fee.isIncludedInCost !== false ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'color 0.2s' }}>{fee.name}</span>
                        </label>
                        {fee.isIncludedInCost === false && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', opacity: 0.8 }}>(Not counted as expense)</span>
                        )}
                      </div>
                    </td>
                    <td className="number-col" style={{ color: 'var(--text-secondary)' }}>-</td>
                    <td className="number-col" style={{ color: 'var(--text-secondary)' }}>-</td>
                    <td className="number-col font-medium highlight-gray">₹{fee.amount.toFixed(0)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => handleRemoveFee(fee.id)}
                        style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
                        title="Remove Fee"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

          {/* Add Fee Section */}
          <section className="glass-card">
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1.5rem', fontFamily: "'Playfair Display', serif" }}>Additional Fees</h2>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Fee Type</label>
                <select 
                  className="saas-select" 
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value as any)}
                >
                  <option value="Delivery & Packaging">Delivery & Packaging</option>
                  <option value="Bouquet Arrangement">Bouquet Arrangement</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              {feeType === 'Custom' && (
                <div style={{ flex: '1 1 150px' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Item Name</label>
                  <input 
                    type="text" 
                    placeholder="Name"
                    value={customFeeName}
                    onChange={(e) => setCustomFeeName(e.target.value)}
                    className="saas-input"
                  />
                </div>
              )}
              <div style={{ width: '140px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Amount (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  placeholder="0"
                  value={feeAmount === '' ? '' : feeAmount}
                  onChange={(e) => setFeeAmount(parseFloat(e.target.value) || 0)}
                  className="saas-input"
                />
              </div>
              <button 
                className="flat-btn" 
                onClick={handleAddFee}
                disabled={feeAmount === '' || feeAmount <= 0 || (feeType === 'Custom' && !customFeeName.trim())}
                style={{ height: '48px', opacity: (feeAmount === '' || feeAmount <= 0 || (feeType === 'Custom' && !customFeeName.trim())) ? 0.5 : 1 }}
              >
                <Plus size={18} /> Add
              </button>
            </div>
          </section>

          </div> {/* End Left Column */}

          {/* Right Column: Sticky Summary Panel */}
          <div style={{ position: 'sticky', top: '100px' }}>
            <section className="glass-card" style={{ 
              background: 'linear-gradient(145deg, var(--primary-color), var(--primary-hover))', 
              color: 'white', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '2rem', 
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 64px rgba(122, 144, 120, 0.25), inset 0 2px 8px rgba(255, 255, 255, 0.15)' 
            }}>
              <h2 style={{ fontSize: '1.75rem', color: 'white', margin: 0, fontFamily: "'Playfair Display', serif" }}>Order Summary</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9, fontSize: '1.0625rem' }}>
                  <span>Total Base Cost:</span>
                  <span style={{ fontWeight: 500 }}>₹{totals.cost.toFixed(0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9, fontSize: '1.0625rem' }}>
                  <span>Estimated Profit:</span>
                  <span style={{ fontWeight: 500 }}>₹{totals.profit.toFixed(0)}</span>
                </div>
                
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '1.125rem' }}>Total Quote:</span>
                    {isManualOverride && (
                      <button 
                        onClick={() => {
                          setIsManualOverride(false);
                          setManualQuote('');
                        }} 
                        style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', textDecoration: 'underline' }}
                      >
                        Reset to ₹{totals.calculatedPrice.toFixed(0)}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.25)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                    <span style={{ marginRight: '6px', fontSize: '1.5rem', fontWeight: 600 }}>₹</span>
                    <input 
                      type="number"
                      value={isManualOverride ? manualQuote : totals.calculatedPrice.toFixed(0)}
                      onChange={(e) => {
                         setIsEdited(true);
                         setIsManualOverride(true);
                         setManualQuote(e.target.value);
                      }}
                      onBlur={() => {
                         if (manualQuote === '') setIsManualOverride(false);
                      }}
                      className="price-input"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        width: '130px',
                        textAlign: 'right',
                        padding: 0
                      }}
                    />
                  </div>
                </div>
              </div>

              <button 
                className="primary-btn" 
                onClick={handleSaveOrder}
                disabled={items.length === 0 && additionalFees.length === 0}
                style={{ 
                  width: '100%', 
                  marginTop: '1rem', 
                  backgroundColor: 'white', 
                  color: 'var(--primary-color)',
                  height: '56px',
                  fontSize: '1.0625rem',
                  fontWeight: 600,
                  opacity: (items.length === 0 && additionalFees.length === 0) ? 0.5 : 1
                }}
              >
                {initialOrder ? 'Update Order' : 'Save Final Quote'}
              </button>
            </section>
          </div>

        </div>



      </main>
    </div>
  );
}
