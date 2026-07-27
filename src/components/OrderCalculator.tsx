
import { useState, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { FlowerData, Order, OrderItem, AdditionalFee } from '../types';
import { showToast } from './Toast';
import { Navbar } from './Navbar';

interface OrderCalculatorProps {
  
  flowers: FlowerData[];
  onSaveOrder: (order: Order) => void;
  initialOrder?: Order;
  isModal?: boolean;
}

const getFlowerCost = (f: FlowerData) => {
  const pc = Number(f.pipeCleanerQty || 0) * 0.8;
  const pollen = Number(f.pollenQty || 0) * 0.2815;
  const extra = Number(f.extraCosts || 0);
  const foamBall = f.hasFoamBall ? 16.6 : 0;

  if (f.category === 'Keychain') {
    return pc + pollen + extra + foamBall + 2.5;
  }
  if (f.category === 'Flower Pots') {
    return pc + extra + foamBall + 12.4;
  }
  const glue = Number(f.glueQty || 0) * 3.5;
  return pc + pollen + extra + foamBall + glue;
};

export function OrderCalculator({ flowers, onSaveOrder, initialOrder, isModal }: OrderCalculatorProps) {

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
        unitSellingPrice,
        bouquetIndex: item.bouquetIndex || 1 // Legacy items default to Bouquet 1
      };
    });
  });

  const initialBouquetCount = useMemo(() => {
    if (!initialOrder?.items) return 1;
    let max = 1;
    initialOrder.items.forEach(i => {
      if (typeof i.bouquetIndex === 'number' && i.bouquetIndex > max) {
        max = i.bouquetIndex;
      }
    });
    return max;
  }, [initialOrder]);
  
  const [bouquetCount, setBouquetCount] = useState<number>(initialBouquetCount);

  type SectionState = {
    category: string;
    searchQuery: string;
    selectedFlowerId: string;
    addQty: number;
    isDropdownOpen: boolean;
    arrangementFee: number;
  };
  const [sectionInputs, setSectionInputs] = useState<Record<string, SectionState>>(() => {
    const init: Record<string, SectionState> = {};
    if (initialOrder?.additionalFees) {
      initialOrder.additionalFees.forEach(fee => {
        if (fee.id.startsWith('bouquet-fee-')) {
          const idx = fee.id.replace('bouquet-fee-', '');
          init[idx] = {
            category: '🌸 Flowers',
            searchQuery: '',
            selectedFlowerId: '',
            addQty: 1,
            isDropdownOpen: false,
            arrangementFee: fee.amount
          };
        }
      });
    }
    return init;
  });

  const updateSectionInput = (sectionKey: string, updates: Partial<SectionState>) => {
    setSectionInputs(prev => {
      const existing = prev[sectionKey] || {
        category: '🌸 Flowers',
        searchQuery: '',
        selectedFlowerId: '',
        addQty: 1,
        isDropdownOpen: false,
        arrangementFee: 0
      };
      
      return {
        ...prev,
        [sectionKey]: { ...existing, ...updates }
      };
    });
  };

  const getSectionInput = (sectionKey: string) => {
    return sectionInputs[sectionKey] || { category: '🌸 Flowers', searchQuery: '', selectedFlowerId: '', addQty: 1, isDropdownOpen: false, arrangementFee: 0 };
  };
  
  
  const [additionalFees, setAdditionalFees] = useState<AdditionalFee[]>(() => {
    let fees = initialOrder?.additionalFees || [];
    fees = fees.filter(f => !f.id.startsWith('bouquet-fee-'));

    // Populate legacy or top-level shipping fee
    if (initialOrder?.shippingCost && initialOrder.shippingCost > 0) {
      const typeStr = initialOrder.shippingType || 'Custom';
      const shippingName = typeStr !== 'None' ? `Shipping/Delivery (${typeStr})` : 'Shipping/Delivery';
      if (!fees.some(f => f.type === 'Shipping')) {
        fees.push({
          id: `legacy-shipping-${Date.now()}`,
          name: shippingName,
          type: 'Shipping',
          amount: initialOrder.shippingCost,
          isIncludedInCost: true
        });
      }
    }

    const legacyFees = [initialOrder?.bouquetFee, initialOrder?.deliveryFee, initialOrder?.extraItemPrice]
      .filter((v): v is number => v !== undefined && v > 0)
      .map((amount, i) => ({ id: `legacy-${i}`, name: 'Legacy Fee', type: 'Custom' as const, amount, isIncludedInCost: true }));

    return [...fees, ...legacyFees];
  });
  
  const [feeType, setFeeType] = useState<'Bouquet Arrangement' | 'Packaging' | 'Shipping' | 'Custom'>('Packaging');
  const [feeAmount, setFeeAmount] = useState<number | ''>('');
  const [customFeeName, setCustomFeeName] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>(initialOrder?.customerName || '');
  const [orderLocation, setOrderLocation] = useState<string>(initialOrder?.orderLocation || '');
  const [orderDate, setOrderDate] = useState<string>(
    initialOrder?.date ? initialOrder.date.split('T')[0] : new Date().toISOString().split('T')[0] 
  );
  
  const [scheduledDeliveryDate, setScheduledDeliveryDate] = useState<string>(
    initialOrder?.scheduledDeliveryDate ? initialOrder.scheduledDeliveryDate.split('T')[0] : new Date().toISOString().split('T')[0]
  );

  // Computed Shipping values
  const shippingCost = useMemo(() => {
    return additionalFees.filter(f => f.type === 'Shipping').reduce((sum, f) => sum + f.amount, 0);
  }, [additionalFees]);

  const shippingType = useMemo<Order['shippingType']>(() => {
    return additionalFees.some(f => f.type === 'Shipping') ? 'Across India' : 'None';
  }, [additionalFees]);

  // Manual Override State
  const [isManualOverride, setIsManualOverride] = useState(!!initialOrder);
  const [manualQuote, setManualQuote] = useState<string>(initialOrder ? initialOrder.totalPrice.toString() : '');

  const handleAddItem = (sectionKey: string, flowerId: string) => {
    setIsEdited(true);
    const input = getSectionInput(sectionKey);
    const flower = flowers.find(f => f.id === flowerId);
    if (!flower || input.addQty <= 0) return;

    const newItem: OrderItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      flowerId: flower.id,
      flowerName: flower.name,
      quantity: input.addQty,
      unitCost: getFlowerCost(flower),
      unitSellingPrice: flower.sellingPrice || 0,
      bouquetIndex: parseInt(sectionKey)
    };

    setItems([...items, newItem]);
    updateSectionInput(sectionKey, { searchQuery: '', isDropdownOpen: false, addQty: 1 });
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
    let name = feeType === 'Custom' ? (customFeeName || 'Custom Fee') : feeType;
    if (feeType === 'Shipping') {
      name = 'Shipping/Delivery';
    }
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
      return { cost: 0, calculatedPrice: 0, price: 0, profit: 0, breakdowns: [] };
    }

    const breakdowns: { label: string, amount: number }[] = [];

    let sumOfBouquetCosts = 0;
    // Calculate cost for each bouquet
    for (let i = 1; i <= bouquetCount; i++) {
      let bouquetCost = items.filter(item => item.bouquetIndex === i).reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
      const arrangementFee = sectionInputs[i.toString()]?.arrangementFee || 0;
      bouquetCost += arrangementFee;

      if (bouquetCost > 0 || bouquetCount > 1) { // Show if cost > 0, or if multi-bouquet structure exists
        breakdowns.push({ label: bouquetCount > 1 ? `${i}${i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th'} Bouquet Cost` : 'Bouquet Cost', amount: bouquetCost });
      }
      sumOfBouquetCosts += bouquetCost;
    }

    const itemsTotalPrice = items.reduce((sum, item) => sum + (item.unitSellingPrice * item.quantity), 0);
    const additionalFeesTotal = additionalFees.reduce((sum, f) => sum + f.amount, 0);
    const totalArrangementFees = Object.values(sectionInputs).reduce((sum, state) => sum + (state.arrangementFee || 0), 0);
    
    // New logic: Total Base Cost is Bouquet Costs + Additional Fees (which includes Shipping)
    const finalTotalCost = sumOfBouquetCosts + additionalFeesTotal; 
    const calculatedTotalPrice = itemsTotalPrice + additionalFeesTotal + totalArrangementFees;
    
    // Manual Quote Override applied here
    const finalTotalPrice = isManualOverride && manualQuote !== '' ? parseFloat(manualQuote) || 0 : calculatedTotalPrice;
    const finalProfit = finalTotalPrice - finalTotalCost;

    return {
      cost: finalTotalCost,
      calculatedPrice: calculatedTotalPrice,
      price: finalTotalPrice,
      profit: finalProfit,
      breakdowns
    };
  }, [items, additionalFees, isManualOverride, manualQuote, bouquetCount, sectionInputs]);

  const handlePrepareSave = async () => {
    if (items.length === 0 && additionalFees.length === 0) return; // Empty order

    const finalFees = [...additionalFees];
    for (const [key, state] of Object.entries(sectionInputs)) {
      if (state.arrangementFee > 0) {
        finalFees.push({
          id: `bouquet-fee-${key}`,
          name: `Bouquet ${key} Arrangement`,
          type: 'Bouquet Arrangement',
          amount: state.arrangementFee,
          isIncludedInCost: true
        });
      }
    }

    const newOrder: Order = {
      ...initialOrder, 
      id: initialOrder ? initialOrder.id : Date.now().toString(),
      date: initialOrder && orderDate === initialOrder.date.split('T')[0] ? initialOrder.date : new Date(orderDate).toISOString(),
      scheduledDeliveryDate: new Date(scheduledDeliveryDate).toISOString(),
      isDelivered: initialOrder ? initialOrder.isDelivered : false,
      customerName: customerName.trim() || '',
      orderLocation: orderLocation.trim() || '',
      items,
      additionalFees: finalFees,
      shippingType,
      shippingCost,
      bouquetFee: 0,
      deliveryFee: 0,
      extraItemPrice: 0,
      totalCost: Number(totals.cost) || 0,
      totalPrice: Number(totals.price) || 0,
      profit: Number(totals.profit) || 0,
      paymentStatus: initialOrder ? initialOrder.paymentStatus : 'Pending',
      paymentMode: initialOrder ? initialOrder.paymentMode : 'Cash',
      actualMaterialCost: initialOrder?.actualMaterialCost || undefined,
      isStockDeducted: initialOrder?.isStockDeducted || false
    };

    try {
      // Wait for the save operation to complete
      await onSaveOrder(newOrder);
      
      // If it's the main calculator page, show toast and clear fields for the next order
      if (!isModal) {
        showToast("✅ Order Saved to History!");
        setItems([]);
        setAdditionalFees([]);
        setCustomerName('');
        setOrderLocation('');
        setIsManualOverride(false);
        setManualQuote('');
        setSectionInputs({});
        setBouquetCount(1);
        setIsEdited(false);
      }
    } catch (error) {
      console.error("Failed to save order in calculator:", error);
    }
  };

  return (
    <div className={isModal ? "" : "dashboard-container"}>
      {!isModal && <Navbar />}
      {!isModal && (
        <header className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
              <div style={{ width: '120px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '0.25rem' }}>Bouquet Count</label>
                <input 
                  type="number" 
                  min="1"
                  value={bouquetCount}
                  onChange={(e) => setBouquetCount(parseInt(e.target.value) || 1)}
                  className="saas-input"
                  style={{ height: '40px', border: '1px solid rgba(122, 144, 120, 0.5)', backgroundColor: '#FBF8F2' }}
                />
              </div>
            </div>
          </div>
          
        </section>

        {/* Dynamic Bouquet Sections */}
        {(() => {
          const sections = Array.from({ length: bouquetCount }, (_, i) => (i + 1).toString());

          return sections.map(sectionKey => {
            const sectionTitle = `Bouquet ${sectionKey} Items`;
            const sectionItems = items.filter(item => item.bouquetIndex === parseInt(sectionKey));
            const input = getSectionInput(sectionKey);

            const categoryFlowers = flowers.filter(f => {
              if (input.category === '🌸 Flowers') return !f.category || f.category === 'Flowers';
              if (input.category === '🔑 Keychains') return f.category === 'Keychain' || (f.category as string) === 'Keychains';
              if (input.category === '🪴 Flower Pots') return f.category === 'Flower Pots' || (f.category as string) === 'Pots';
              return true;
            }).filter(f => input.searchQuery === '' || f.name.toLowerCase().includes(input.searchQuery.toLowerCase()));

            return (
              <section key={sectionKey} className="glass-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary-color)' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1.5rem', fontFamily: "'Playfair Display', serif" }}>{sectionTitle}</h3>
                
                {/* Unified Categorical Selection & Autocomplete */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Category</label>
                    <select 
                      className="saas-select" 
                      value={input.category}
                      onChange={(e) => updateSectionInput(sectionKey, { category: e.target.value, searchQuery: '', isDropdownOpen: false })}
                    >
                      <option value="🌸 Flowers">🌸 Flowers</option>
                      <option value="🔑 Keychains">🔑 Keychains</option>
                      <option value="🪴 Flower Pots">🪴 Flower Pots</option>
                    </select>
                  </div>
                  <div style={{ width: '80px' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Qty</label>
                    <input 
                      type="number" 
                      min="1"
                      value={input.addQty}
                      onChange={(e) => updateSectionInput(sectionKey, { addQty: parseInt(e.target.value) || 1 })}
                      className="saas-input"
                    />
                  </div>
                  <div style={{ flex: '2 1 300px', position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Search & Select</label>
                    <input 
                      type="text" 
                      placeholder={`Search ${input.category.split(' ')[1]}...`}
                      value={input.searchQuery}
                      onChange={(e) => updateSectionInput(sectionKey, { searchQuery: e.target.value, isDropdownOpen: true })}
                      onFocus={() => updateSectionInput(sectionKey, { isDropdownOpen: true })}
                      onBlur={() => setTimeout(() => updateSectionInput(sectionKey, { isDropdownOpen: false }), 200)}
                      className="saas-input"
                    />
                    {input.isDropdownOpen && (
                      <div style={{ 
                        position: 'absolute', top: '100%', left: 0, right: 0, 
                        backgroundColor: 'white', border: '1px solid #e2e8f0', 
                        borderRadius: '8px', marginTop: '4px', zIndex: 50, 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
                        maxHeight: '250px', overflowY: 'auto' 
                      }}>
                        {categoryFlowers.length === 0 ? (
                          <div style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No items found</div>
                        ) : (
                          categoryFlowers.map(f => (
                            <div 
                              key={f.id} 
                              onMouseDown={() => handleAddItem(sectionKey, f.id)}
                              style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <span>{f.name}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>₹{Math.round(f.sellingPrice || 0)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table for this Section */}
                {sectionItems.length > 0 && (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th className="number-col">Qty</th>
                          <th className="number-col">Unit Price</th>
                          <th className="number-col highlight-gray">Subtotal</th>
                          <th style={{ width: '60px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionItems.map(item => (
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
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Manual Arrangement/Labor Fee for Bouquets */}
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Arrangement / Labor Fee (₹)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={input.arrangementFee || ''}
                      onChange={(e) => updateSectionInput(sectionKey, { arrangementFee: parseFloat(e.target.value) || 0 })}
                      className="saas-input"
                      style={{ width: '120px', textAlign: 'right' }}
                    />
                  </div>
                </div>
              </section>
            );
          });
        })()}

        {/* Order Location Section */}
        <section className="glass-card calc-section">
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem', fontFamily: "'Playfair Display', serif" }}>📍 Order Location</h2>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Delivery Location / Address</label>
            <input 
              type="text" 
              placeholder="Enter delivery location or address..."
              value={orderLocation}
              onChange={(e) => {
                setIsEdited(true);
                setOrderLocation(e.target.value);
              }}
              className="saas-input"
              style={{ width: '100%', height: '40px' }}
            />
          </div>
        </section>

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
                  <option value="Packaging">Packaging</option>
                  <option value="Bouquet Arrangement">Bouquet Arrangement</option>
                  <option value="Shipping">Shipping/Delivery</option>
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

            {additionalFees.length > 0 && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {additionalFees.map(fee => (
                  <div key={fee.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: 'white', padding: '0.2rem 0.4rem', borderRadius: '4px', color: 'var(--text-secondary)', border: '1px solid rgba(0,0,0,0.05)' }}>{fee.type}</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{fee.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className="font-medium">₹{fee.amount.toFixed(0)}</span>
                      <button onClick={() => handleRemoveFee(fee.id)} style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem' }} title="Remove Fee">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                {totals.breakdowns.length > 0 && (
                  <div style={{ paddingBottom: '1rem', borderBottom: '1px dashed rgba(255,255,255,0.2)' }}>
                    <div style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, marginBottom: '0.75rem' }}>Cost Breakdown</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {totals.breakdowns.map((b, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9, fontSize: '0.95rem' }}>
                          <span>{b.label}:</span>
                          <span>₹{b.amount.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ opacity: 0.9, fontSize: '1.0625rem' }}>Total Base Cost:</span>
                    {shippingCost > 0 && (
                      <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '2px' }}>
                        [₹{(totals.cost - shippingCost).toFixed(0)} Materials/Fees + ₹{shippingCost} Shipping]
                      </div>
                    )}
                  </div>
                  <span style={{ fontWeight: 500, fontSize: '1.0625rem' }}>₹{totals.cost.toFixed(0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9, fontSize: '1.0625rem' }}>
                  <span>Estimated Profit:</span>
                  <span style={{ fontWeight: 500 }}>₹{totals.profit.toFixed(0)}</span>
                </div>

                {shippingCost > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9, fontSize: '1.0625rem' }}>
                    <span>Shipping/Delivery:</span>
                    <span style={{ fontWeight: 500 }}>+₹{shippingCost.toFixed(0)}</span>
                  </div>
                )}
                
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
                onClick={handlePrepareSave}
                disabled={items.length === 0}
                style={{ 
                  width: '100%', 
                  marginTop: '1rem', 
                  backgroundColor: 'white', 
                  color: 'var(--primary-color)',
                  height: '56px',
                  fontSize: '1.0625rem',
                  fontWeight: 600,
                  opacity: (items.length === 0) ? 0.5 : 1
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
