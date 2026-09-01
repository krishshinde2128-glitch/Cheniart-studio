import React, { useState, useMemo } from 'react';

import { Trash2, ArrowUpDown, ChevronDown, ChevronUp, Edit3, Plus, RefreshCw } from 'lucide-react';
import type { Order, PaymentStatus, PaymentMode, FlowerData } from '../types';
import { OrderCalculator } from './OrderCalculator';
import { showToast } from './Toast';
import { Navbar } from './Navbar';

interface OrderHistoryProps {
  
  orders: Order[];
  onUpdateOrder: (updatedOrder: Partial<Order> & { id: string }) => Promise<void>;
  onDeleteOrder: (id: string) => Promise<void>;
  onAddOrder: (orderData: Omit<Order, 'id'>) => Promise<any>;
  flowers: FlowerData[];
}

export function OrderHistory({ orders, onUpdateOrder, onDeleteOrder, onAddOrder, flowers }: OrderHistoryProps) {

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showPending, setShowPending] = useState(false);
  const [showHalfPayments, setShowHalfPayments] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editOrderModal, setEditOrderModal] = useState<Order | null>(null);

  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [repeatOrderPrompt, setRepeatOrderPrompt] = useState<Order | null>(null);
  const [repeatCustomerName, setRepeatCustomerName] = useState('');
  const [repeatPrice, setRepeatPrice] = useState('');
  const [repeatPaymentStatus, setRepeatPaymentStatus] = useState<PaymentStatus>('Pending');

  const [editingCell, setEditingCell] = useState<{ id: string, field: keyof Order } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const startEdit = (e: React.MouseEvent, order: Order, field: keyof Order, initialValue: any) => {
    e.stopPropagation();
    setEditingCell({ id: order.id, field });
    setEditValue(String(initialValue));
  };

  const handleInlineSave = async (e?: React.FocusEvent | React.KeyboardEvent) => {
    if (e && e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') {
      if ((e as React.KeyboardEvent).key === 'Escape') setEditingCell(null);
      return;
    }
    if (!editingCell) return;
    
    const targetOrder = orders.find(o => o.id === editingCell.id);
    if (!targetOrder) return;

    if (editingCell.field === 'totalPrice') {
      const newPrice = parseFloat(editValue) || 0;
      await onUpdateOrder({ id: editingCell.id, totalPrice: newPrice, profit: newPrice - targetOrder.totalCost });
    } else if (editingCell.field === 'date') {
      await onUpdateOrder({ id: editingCell.id, date: new Date(editValue).toISOString() });
    } else if (editingCell.field === 'customerName') {
      await onUpdateOrder({ id: editingCell.id, customerName: editValue });
    }
      
    setEditingCell(null);
  };

  const sortedOrders = useMemo(() => {
    let result = [...orders];
    if (showPending || showHalfPayments) {
      result = result.filter(o => 
        (showPending && o.paymentStatus === 'Pending') || 
        (showHalfPayments && o.paymentStatus === 'Half Payment')
      );
    }
    return result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [orders, sortOrder, showPending, showHalfPayments]);
  const handleDelete = async (order: Order) => {
    const flowerNames = order.items.map(i => i.flowerName).join(', ');
    if (window.confirm(`Are you sure you want to delete this order for ${flowerNames}?`)) {
      await onDeleteOrder(order.id);
    }
  };

  const handleStatusChange = async (id: string, newStatus: PaymentStatus) => {
    await onUpdateOrder({ id, paymentStatus: newStatus });
  };

  const handleModeChange = async (id: string, newMode: PaymentMode) => {
    await onUpdateOrder({ id, paymentMode: newMode });
  };
  return (
    <div className="dashboard-container">
      <Navbar />
      <header className="dashboard-header" style={{ justifyContent: 'flex-end' }}>
        <span className="badge">Order History</span>
      </header>
      <main className="dashboard-content">

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <p>No orders placed yet. Create one via the Order Calculator.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Filter Controls */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingBottom: '0.5rem' }}>
              <button
                onClick={() => setShowHalfPayments(!showHalfPayments)}
                style={{
                  backgroundColor: showHalfPayments ? '#fffbeb' : 'white',
                  color: showHalfPayments ? '#d97706' : 'var(--text-secondary)',
                  border: `1px solid ${showHalfPayments ? '#fcd34d' : 'rgba(0,0,0,0.1)'}`,
                  padding: '0.6rem 1.25rem',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: showHalfPayments ? '0 2px 8px rgba(217, 119, 6, 0.15)' : 'none'
                }}
              >
                Show Half Payments
              </button>
              <button
                onClick={() => setShowPending(!showPending)}
                style={{
                  backgroundColor: showPending ? '#fef2f2' : 'white',
                  color: showPending ? '#ef4444' : 'var(--text-secondary)',
                  border: `1px solid ${showPending ? '#fca5a5' : 'rgba(0,0,0,0.1)'}`,
                  padding: '0.6rem 1.25rem',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: showPending ? '0 2px 8px rgba(239, 68, 68, 0.15)' : 'none'
                }}
              >
                Show Pending
              </button>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th 
                      style={{ cursor: 'pointer', userSelect: 'none', width: '110px' }}
                      onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        Date
                        <ArrowUpDown size={14} style={{ opacity: 0.5 }} />
                      </div>
                    </th>
                    <th style={{ width: '140px' }}>Name</th>
                    <th style={{ minWidth: '220px', maxWidth: '320px' }}>Order Details</th>
                    <th style={{ width: '140px' }}>Delivery Status</th>
                    <th className="number-col" style={{ width: '110px' }}>Total Charged</th>
                    <th className="number-col highlight-gray" style={{ width: '90px' }}>Profit</th>
                    <th style={{ width: '120px' }}>Payment Status</th>
                    <th style={{ width: '120px' }}>Payment Mode</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                  </tr>
              </thead>
              <tbody>
                {sortedOrders.map(order => (
                  <React.Fragment key={order.id}>
                    <tr 
                      style={{ 
                        cursor: 'pointer', 
                        transition: 'all 0.2s',
                        backgroundColor: (showPending && order.paymentStatus === 'Pending') ? 'rgba(239, 68, 68, 0.03)' : (showHalfPayments && order.paymentStatus === 'Half Payment') ? 'rgba(217, 119, 6, 0.03)' : 'transparent',
                        boxShadow: (showPending && order.paymentStatus === 'Pending') ? 'inset 3px 0 0 #ef4444' : (showHalfPayments && order.paymentStatus === 'Half Payment') ? 'inset 3px 0 0 #d97706' : 'none'
                      }} 
                      onClick={() => setExpandedOrderId(prev => prev === order.id ? null : order.id)}
                    >
                      <td 
                        className="font-medium" 
                        onClick={(e) => startEdit(e, order, 'date', order.date.split('T')[0])} 
                        style={{ cursor: 'pointer' }}
                        title="Click to edit Date"
                      >
                        {editingCell?.id === order.id && editingCell.field === 'date' ? (
                          <input 
                            type="date"
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={handleInlineSave}
                            onKeyDown={handleInlineSave}
                            onClick={e => e.stopPropagation()}
                            className="saas-input"
                            style={{ height: '32px', padding: '0 0.5rem', width: '130px' }}
                          />
                        ) : (
                          new Date(order.date).toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: 'short',
                            year: '2-digit'
                          })
                        )}
                      </td>
                      <td 
                        className="font-medium" 
                        style={{ textTransform: 'capitalize', position: 'relative', cursor: 'pointer' }}
                        onClick={(e) => startEdit(e, order, 'customerName', order.customerName || '')}
                        title="Click to edit Name"
                      >
                        {editingCell?.id === order.id && editingCell.field === 'customerName' ? (
                          <input 
                            type="text"
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={handleInlineSave}
                            onKeyDown={handleInlineSave}
                            onClick={e => e.stopPropagation()}
                            className="saas-input"
                            style={{ height: '32px', padding: '0 0.5rem', width: '100px' }}
                          />
                        ) : (
                          <div className="tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span>{order.customerName || 'N/A'}</span>
                              {order.orderLocation && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'none', marginTop: '2px', fontWeight: 'normal' }}>
                                  📍 {order.orderLocation}
                                </span>
                              )}
                            </div>
                            {expandedOrderId === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          
                          {/* Hover Tooltip */}
                          <div className="hover-tooltip" style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: '#7A9078',
                            color: '#FBF8F2',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            opacity: 0,
                            visibility: 'hidden',
                            transition: 'opacity 0.2s',
                            zIndex: 10,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            marginBottom: '0.5rem'
                          }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {order.items.map(item => (
                                <span key={item.id}>{item.quantity}x {item.flowerName}</span>
                              ))}
                              {order.additionalFees && order.additionalFees.map(fee => (
                                <span key={fee.id}>+ {fee.name}</span>
                              ))}
                              {!order.additionalFees && (
                                <>
                                  {!!order.bouquetFee && order.bouquetFee > 0 && <span>+ Bouquet</span>}
                                  {!!order.deliveryFee && order.deliveryFee > 0 && <span>+ Delivery</span>}
                                  {!!order.extraItemPrice && order.extraItemPrice > 0 && <span>+ Extra</span>}
                                </>
                              )}
                            </div>
                            {/* Little triangle arrow pointing down */}
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              borderWidth: '5px',
                              borderStyle: 'solid',
                              borderColor: '#7A9078 transparent transparent transparent'
                            }} />
                            </div>
                          </div>
                        )}
                      </td>
                      <td onClick={(e) => { e.stopPropagation(); setEditOrderModal(order); }} style={{ cursor: 'pointer', maxWidth: '300px', whiteSpace: 'normal', wordBreak: 'break-word' }} title="Click to edit full Order Details">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                          <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {order.items.length > 0 ? (
                              <>
                                {order.items.slice(0, 5).map(i => i.quantity > 1 ? `${i.quantity} ${i.flowerName}` : i.flowerName).join(', ')}
                                {order.items.length > 5 && (
                                  <span 
                                    style={{ 
                                      display: 'inline-block',
                                      marginLeft: '0.35rem', 
                                      backgroundColor: 'rgba(122, 144, 120, 0.15)', 
                                      color: 'var(--primary-dark)', 
                                      padding: '0.1rem 0.45rem', 
                                      borderRadius: '9999px',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    +{order.items.length - 5} more
                                  </span>
                                )}
                              </>
                            ) : (
                              '0 flowers'
                            )}
                          </span>
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()} style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>
                        {order.isDelivered ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(122, 144, 120, 0.1)', color: 'var(--primary-color)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', fontWeight: 600, width: 'max-content' }}>
                            <span>✅ Delivered</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                              {new Date(order.scheduledDeliveryDate || order.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                            </span>
                            <button 
                              onClick={async () => {
                                if (window.confirm('Are you sure this order is delivered?')) {
                                  await onUpdateOrder({ id: order.id, isDelivered: true });
                                }
                              }}
                              style={{ 
                                backgroundColor: 'transparent', 
                                border: '1.5px solid var(--primary-color)', 
                                borderRadius: '6px', 
                                width: '22px', 
                                height: '22px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                cursor: 'pointer', 
                                color: 'var(--primary-color)',
                                opacity: 0.8,
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-color)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.opacity = '1'; }}
                              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--primary-color)'; e.currentTarget.style.opacity = '0.8'; }}
                              title="Mark as Delivered"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                          </div>
                        )}
                      </td>
                      <td 
                        className="number-col font-medium" 
                        onClick={(e) => startEdit(e, order, 'totalPrice', order.totalPrice)}
                        style={{ cursor: 'pointer', minWidth: '100px' }}
                        title="Click to override Total Charged (Recalculates Profit)"
                      >
                        {editingCell?.id === order.id && editingCell.field === 'totalPrice' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                            <span>₹</span>
                            <input 
                              type="number"
                              autoFocus
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={handleInlineSave}
                              onKeyDown={handleInlineSave}
                              onClick={e => e.stopPropagation()}
                              className="saas-input"
                              style={{ height: '32px', padding: '0 0.5rem', width: '80px', textAlign: 'right' }}
                            />
                          </div>
                        ) : (
                          `₹${order.totalPrice.toFixed(0)}`
                        )}
                      </td>
                      <td className="number-col font-medium highlight-gray">₹{order.profit.toFixed(0)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select 
                          value={order.paymentStatus}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as PaymentStatus)}
                          className={`price-input ${order.paymentStatus === 'Pending' ? 'status-pending' : 'status-paid'}`}
                          style={{ 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            border: 'none',
                            backgroundColor: order.paymentStatus === 'Pending' ? '#fee2e2' : order.paymentStatus === 'Half Payment' ? '#fef3c7' : 'var(--primary-color)',
                            color: order.paymentStatus === 'Pending' ? '#991b1b' : order.paymentStatus === 'Half Payment' ? '#d97706' : 'white',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Half Payment">Half Payment</option>
                          <option value="Paid">Paid</option>
                        </select>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          value={order.paymentMode}
                          onChange={(e) => handleModeChange(order.id, e.target.value as PaymentMode)}
                          className="price-input"
                          style={{ padding: '0.25rem 0.5rem', backgroundColor: 'transparent', border: '1px solid rgba(0,0,0,0.1)' }}
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setRepeatOrderPrompt(order); 
                              setRepeatCustomerName(order.customerName || '');
                              setRepeatPrice(order.totalPrice.toString());
                              setRepeatPaymentStatus('Pending');
                            }}
                            style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
                            title="Repeat Order"
                          >
                            <RefreshCw size={18} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditOrderModal(order); }}
                            style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
                            title="Edit Order Details"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(order)}
                            style={{ color: '#D9534F', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
                            title="Delete Order"
                          >
                            <Trash2 size={18} color="#D9534F" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Row View */}
                    {expandedOrderId === order.id && (
                      <tr>
                        <td colSpan={8} style={{ padding: 0 }}>
                          <div style={{ 
                            backgroundColor: 'white', 
                            borderBottom: '1px solid rgba(0,0,0,0.05)',
                            padding: '2rem',
                            boxShadow: 'inset 0 4px 6px -4px rgba(0,0,0,0.05)'
                          }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 2fr) 1fr', gap: '3rem' }}>
                              
                              {/* Left: Line Items List */}
                              <div>
                                <h4 style={{ fontSize: '1rem', color: 'var(--primary-color)', margin: '0 0 1rem 0', fontFamily: "'Playfair Display', serif" }}>Order Items Breakdown</h4>
                                <table className="data-table" style={{ fontSize: '0.875rem', backgroundColor: '#FBF8F2', borderRadius: '8px', overflow: 'hidden' }}>
                                  <thead style={{ backgroundColor: '#7A9078', color: 'white' }}>
                                    <tr>
                                      <th style={{ padding: '0.5rem 1rem', color: 'rgba(255,255,255,0.9)' }}>Item</th>
                                      <th style={{ padding: '0.5rem 1rem', color: 'rgba(255,255,255,0.9)', textAlign: 'right' }}>Qty</th>
                                      <th style={{ padding: '0.5rem 1rem', color: 'rgba(255,255,255,0.9)', textAlign: 'right' }}>Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {order.items.map(item => (
                                      <tr key={item.id}>
                                        <td style={{ padding: '0.5rem 1rem' }}>{item.flowerName}</td>
                                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>{item.quantity}</td>
                                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: 500 }}>₹{(item.unitSellingPrice * item.quantity).toFixed(0)}</td>
                                      </tr>
                                    ))}
                                    {order.additionalFees && order.additionalFees.map(fee => (
                                      <tr key={fee.id}>
                                        <td style={{ padding: '0.5rem 1rem' }}>
                                          <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.3rem', borderRadius: '4px', marginRight: '0.5rem' }}>FEE</span>
                                          {fee.name}
                                        </td>
                                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>-</td>
                                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: 500 }}>₹{fee.amount.toFixed(0)}</td>
                                      </tr>
                                    ))}

                                    {!!order.shippingCost && order.shippingCost > 0 && (
                                      <tr>
                                        <td style={{ padding: '0.5rem 1rem' }}>
                                          <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.3rem', borderRadius: '4px', marginRight: '0.5rem' }}>SHIPPING</span>
                                          {order.shippingType}
                                        </td>
                                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>-</td>
                                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: 500 }}>₹{order.shippingCost.toFixed(0)}</td>
                                      </tr>
                                    )}
                                    
                                    {/* Legacy fee fallback rendering */}
                                    {!order.additionalFees && (
                                      <>
                                        {!!order.bouquetFee && order.bouquetFee > 0 && (
                                          <tr>
                                            <td style={{ padding: '0.5rem 1rem' }}><span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.3rem', borderRadius: '4px', marginRight: '0.5rem' }}>FEE</span>Bouquet Arrangement</td>
                                            <td style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: 500 }}>₹{order.bouquetFee.toFixed(0)}</td>
                                          </tr>
                                        )}
                                        {!!order.deliveryFee && order.deliveryFee > 0 && (
                                          <tr>
                                            <td style={{ padding: '0.5rem 1rem' }}><span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.3rem', borderRadius: '4px', marginRight: '0.5rem' }}>FEE</span>Delivery & Packaging</td>
                                            <td style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: 500 }}>₹{order.deliveryFee.toFixed(0)}</td>
                                          </tr>
                                        )}
                                        {!!order.extraItemPrice && order.extraItemPrice > 0 && (
                                          <tr>
                                            <td style={{ padding: '0.5rem 1rem' }}><span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.3rem', borderRadius: '4px', marginRight: '0.5rem' }}>FEE</span>{order.extraItemName || 'Custom'}</td>
                                            <td style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: 500 }}>₹{order.extraItemPrice.toFixed(0)}</td>
                                          </tr>
                                        )}
                                      </>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              
                              {/* Right: Summary Totals Box */}
                              <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '1.5rem', borderRadius: '8px', height: 'fit-content' }}>
                                <h4 style={{ fontSize: '1.125rem', margin: '0 0 1.25rem 0', fontFamily: "'Playfair Display', serif" }}>Totals Summary</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  {order.orderLocation && (
                                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.875rem', opacity: 0.9, borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                                      <span style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase' }}>Delivery Location:</span>
                                      <span style={{ fontWeight: 500 }}>📍 {order.orderLocation}</span>
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', opacity: 0.9 }}>
                                    <span>Base Costs:</span>
                                    <span>₹{order.totalCost.toFixed(0)}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', opacity: 0.9 }}>
                                    <span>Net Profit Margin:</span>
                                    <span>₹{order.profit.toFixed(0)}</span>
                                  </div>
                                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', margin: '0.5rem 0' }}></div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 600 }}>
                                    <span>Total Value:</span>
                                    <span>₹{order.totalPrice.toFixed(0)}</span>
                                  </div>
                                </div>
                              </div>
                              
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </main>

      {/* Edit Order Full Modal */}
      {editOrderModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setEditOrderModal(null)}>
          <div 
            className="bg-[#F9F8F3] w-full max-w-[1400px] max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl relative"
            onClick={e => e.stopPropagation()} 
          >
            <div className="p-6 md:p-8">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontFamily: "'Playfair Display', serif", margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Edit Order Details</h2>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ID: {editOrderModal.id}</div>
              </div>
              <button 
                onClick={() => setEditOrderModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '2rem', color: 'var(--text-secondary)', lineHeight: 1, padding: '0.5rem' }}
              >&times;</button>
            </div>
            
            <OrderCalculator 
              flowers={flowers} 
              initialOrder={editOrderModal}
              isModal={true}
              onSaveOrder={async (updatedOrder) => {
                try {
                  await onUpdateOrder(updatedOrder);
                  setEditOrderModal(null);
                  showToast("✅ Order Updated!");
                } catch (error) {
                  console.error("Failed to update order:", error);
                  showToast("❌ Failed to update order. Check console.");
                }
              }} 
            />
            </div>
          </div>
        </div>
      )}

      {/* Repeat Order Modal */}
      {repeatOrderPrompt && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setRepeatOrderPrompt(null)}>
          <div 
            className="bg-[#F9F8F3] w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl relative"
            onClick={e => e.stopPropagation()} 
          >
            <div className="p-6 md:p-8">
            <h2 style={{ fontSize: '1.5rem', fontFamily: "'Playfair Display', serif", margin: '0 0 1.5rem 0', color: 'var(--primary-color)' }}>Repeat Order</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>New Customer Name</label>
              <input 
                type="text" 
                value={repeatCustomerName} 
                onChange={e => setRepeatCustomerName(e.target.value)} 
                className="saas-input" 
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>New Price (₹)</label>
              <input 
                type="number" 
                value={repeatPrice} 
                onChange={e => setRepeatPrice(e.target.value)} 
                className="saas-input" 
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Payment Status</label>
              <select 
                value={repeatPaymentStatus} 
                onChange={e => setRepeatPaymentStatus(e.target.value as PaymentStatus)} 
                className="saas-select" 
                style={{ width: '100%' }}
              >
                <option value="Pending">Pending</option>
                <option value="Half Payment">Half Payment</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setRepeatOrderPrompt(null)} 
                className="flat-btn" 
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  const duplicatedOrder: Omit<Order, 'id'> = {
                    date: new Date().toISOString(),
                    customerName: repeatCustomerName,
                    orderLocation: repeatOrderPrompt.orderLocation || '',
                    items: repeatOrderPrompt.items,
                    additionalFees: repeatOrderPrompt.additionalFees,
                    shippingType: repeatOrderPrompt.shippingType,
                    shippingCost: repeatOrderPrompt.shippingCost,
                    bouquetFee: repeatOrderPrompt.bouquetFee,
                    deliveryFee: repeatOrderPrompt.deliveryFee,
                    extraItemName: repeatOrderPrompt.extraItemName,
                    extraItemPrice: repeatOrderPrompt.extraItemPrice,
                    totalCost: repeatOrderPrompt.totalCost,
                    totalPrice: parseFloat(repeatPrice) || repeatOrderPrompt.totalPrice,
                    profit: (parseFloat(repeatPrice) || repeatOrderPrompt.totalPrice) - repeatOrderPrompt.totalCost,
                    paymentStatus: repeatPaymentStatus,
                    paymentMode: 'Cash',
                    isDelivered: false
                  };
                  await onAddOrder(duplicatedOrder);
                  setRepeatOrderPrompt(null);
                }} 
                className="primary-btn" 
                style={{ flex: 1 }}
              >
                Duplicate Order
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add FAB */}
      <button 
        className="fab-btn" 
        onClick={() => setIsQuickAddModalOpen(true)} 
        title="Quick Add Order"
        style={{
          backgroundColor: 'var(--primary-color)',
          color: 'white',
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(122, 144, 120, 0.4)',
          cursor: 'pointer',
          border: 'none',
          zIndex: 100,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(122, 144, 120, 0.5)'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(122, 144, 120, 0.4)'; }}
      >
        <Plus size={28} />
      </button>

      {/* Quick Add Modal */}
      {isQuickAddModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsQuickAddModalOpen(false)}>
          <div 
            className="bg-[#F9F8F3] w-full max-w-[1400px] max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl relative"
            onClick={e => e.stopPropagation()} 
          >
            <div className="p-6 md:p-8">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontFamily: "'Playfair Display', serif", margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Quick Add Order</h2>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Create a new quote/order directly to history</div>
              </div>
              <button 
                onClick={() => setIsQuickAddModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '2rem', color: 'var(--text-secondary)', lineHeight: 1, padding: '0.5rem' }}
              >&times;</button>
            </div>
            
            <OrderCalculator 
              flowers={flowers} 
              isModal={true}
              onSaveOrder={async (order) => {
                const { id, ...orderData } = order;
                await onAddOrder(orderData);
                setIsQuickAddModalOpen(false);
              }} 
            />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
