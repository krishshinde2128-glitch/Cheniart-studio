import { useState } from 'react';
import { ChevronLeft, Edit2, Minus, Search } from 'lucide-react';
import type { PageView } from '../App';
import type { StockItem } from '../types';

interface StockInventoryProps {
  onNavigate: (page: PageView) => void;
  stock: StockItem[];
  onUpdateStock: (id: string, newCount: number) => Promise<void>;
}

export function StockInventory({ onNavigate, stock, onUpdateStock }: StockInventoryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<'All' | 'Red' | 'Yellow' | 'Green'>('All');

  const getStockStatus = (category: string, count: number): 'Red' | 'Yellow' | 'Green' => {
    if (category === 'Pipe Cleaners') {
      if (count <= 1) return 'Red';
      if (count === 2) return 'Yellow';
      return 'Green';
    }
    if (category === 'Wrapping Sheets') {
      if (count <= 5) return 'Red';
      if (count <= 15) return 'Yellow';
      return 'Green';
    }
    if (count === 0) return 'Red';
    return 'Green';
  };

  const getStockColor = (category: string, count: number) => {
    const status = getStockStatus(category, count);
    if (status === 'Red') return { bg: 'rgba(239, 68, 68, 0.15)', text: '#dc2626' };
    if (status === 'Yellow') return { bg: 'rgba(245, 158, 11, 0.15)', text: '#d97706' };
    return { bg: 'rgba(16, 185, 129, 0.15)', text: '#059669' };
  };

  const handleSaveEdit = async (id: string) => {
    const val = parseInt(editValue, 10);
    if (!isNaN(val) && val >= 0) {
      await onUpdateStock(id, val);
    }
    setEditingId(null);
  };

  const filteredStock = stock.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeStatus === 'All' || getStockStatus(item.category, item.count) === activeStatus;
    return matchesCategory && matchesSearch && matchesStatus;
  });

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <button className="nav-logo-btn" onClick={() => onNavigate('landing')} title="Back to Dashboard">
          <ChevronLeft size={24} strokeWidth={2} />
          <h1 className="nav-script-title">Dashboard</h1>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="badge">Stock Inventory</span>
        </div>
      </header>

      <main className="dashboard-content" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '2rem', fontFamily: '"Playfair Display", serif', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>Live Inventory</h2>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {['All', 'Pipe Cleaners', 'Wrapping Sheets', 'Accessories'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '20px',
                      border: activeCategory === cat ? 'none' : '1px solid rgba(0,0,0,0.1)',
                      background: activeCategory === cat ? 'var(--primary-color)' : 'white',
                      color: activeCategory === cat ? 'white' : 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontWeight: activeCategory === cat ? 600 : 400
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end', flex: '1', minWidth: '300px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text"
                  placeholder="Search materials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="saas-input"
                  style={{ width: '100%', paddingLeft: '38px', borderRadius: '20px', height: '40px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.3rem', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <button
                  onClick={() => setActiveStatus('All')}
                  style={{ padding: '0.3rem 0.8rem', borderRadius: '14px', border: 'none', background: activeStatus === 'All' ? 'var(--dark-bg)' : 'transparent', color: activeStatus === 'All' ? 'white' : 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s ease' }}
                >
                  All
                </button>
                <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.1)', margin: '0 0.2rem' }} />
                <button
                  onClick={() => setActiveStatus('Red')}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', border: activeStatus === 'Red' ? '2.5px solid rgba(0,0,0,0.3)' : '2px solid transparent', background: '#dc2626', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  title="Low Stock"
                />
                <button
                  onClick={() => setActiveStatus('Yellow')}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', border: activeStatus === 'Yellow' ? '2.5px solid rgba(0,0,0,0.3)' : '2px solid transparent', background: '#f59e0b', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  title="Refill Soon"
                />
                <button
                  onClick={() => setActiveStatus('Green')}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', border: activeStatus === 'Green' ? '2.5px solid rgba(0,0,0,0.3)' : '2px solid transparent', background: '#10b981', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  title="In Stock"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Material Name</th>
                <th>Category</th>
                <th style={{ textAlign: 'center' }}>Stock Status</th>
                <th className="number-col">Count</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Quick Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <Search size={48} style={{ opacity: 0.2, margin: '0 auto 1rem', display: 'block' }} />
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>No items found</p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.7 }}>Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredStock.map(item => {
                  const colors = getStockColor(item.category, item.count);
                  const isEditing = editingId === item.id;
                  
                  return (
                    <tr key={item.id}>
                      <td className="font-medium">{item.name}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.category}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          background: colors.bg,
                          color: colors.text,
                          padding: '0.3rem 0.8rem',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'inline-block',
                          minWidth: '100px'
                        }}>
                          {item.count === 0 ? 'Out of Stock' : item.count <= 2 ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="number-col font-bold" style={{ fontSize: '1.2rem' }}>
                        {isEditing ? (
                          <input 
                            type="number" 
                            min="0"
                            value={editValue} 
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item.id)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveEdit(item.id)}
                            autoFocus
                            className="saas-input"
                            style={{ width: '60px', textAlign: 'center', padding: '0.2rem', height: '32px' }}
                          />
                        ) : (
                          item.count
                        )}
                      </td>
                      <td style={{ textAlign: 'center', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button 
                          onClick={() => onUpdateStock(item.id, item.count - 1)}
                          disabled={item.count <= 0}
                          style={{ 
                            background: item.count > 0 ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.02)', 
                            border: '1px solid rgba(0,0,0,0.1)', 
                            cursor: item.count > 0 ? 'pointer' : 'not-allowed', 
                            padding: '0.4rem', 
                            borderRadius: '6px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            opacity: item.count > 0 ? 1 : 0.5
                          }}
                          title="Deduct 1"
                        >
                          <Minus size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingId(item.id);
                            setEditValue(item.count.toString());
                          }}
                          style={{ 
                            color: 'var(--primary-color)', 
                            background: 'rgba(122, 144, 120, 0.1)', 
                            border: 'none', 
                            cursor: 'pointer', 
                            padding: '0.4rem', 
                            borderRadius: '6px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}
                          title="Manual Override"
                        >
                          <Edit2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
