
import { useState } from 'react';
import { Edit2, Minus, Plus, Search, Trash2 } from 'lucide-react';
import type { StockItem } from '../types';
import { showToast } from './Toast';
import { Navbar } from './Navbar';

interface StockInventoryProps {
  
  stock: StockItem[];
  onUpdateStock: (id: string, newCount: number) => Promise<void>;
  onDeleteStock?: (id: string) => Promise<void>;
  onMergeDuplicates?: () => Promise<void>;
  onAddStock: (stockItem: Omit<StockItem, 'id'>) => Promise<void>;
}

interface ParsedRow {
  id: string;
  qty: number;
  category: StockItem['category'] | 'Unknown';
  color: string;
  type: string;
  originalText: string;
}

export function StockInventory({ stock, onUpdateStock, onDeleteStock, onMergeDuplicates, onAddStock }: StockInventoryProps) {

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<'All' | 'Red' | 'Yellow' | 'Green'>('All');

  // Smart-Log Modal State
  const [isDirectEntryOpen, setIsDirectEntryOpen] = useState(false);
  const [smartLogText, setSmartLogText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [reviewMode, setReviewMode] = useState(false);

  const parseTextLog = () => {
    const lines = smartLogText.split('\n').filter(l => l.trim().length > 0);
    const rows: ParsedRow[] = lines.map((line, index) => {
      const lower = line.toLowerCase();
      
      // 1. Extract Quantity
      const qtyMatch = lower.match(/\d+/);
      const qty = qtyMatch ? parseInt(qtyMatch[0]) : 1;
      
      // 2. Category Detection
      let category: StockItem['category'] | 'Unknown' = 'Unknown';
      if (/\b(pc|pipe cleaner|pipe cleaners)\b/.test(lower)) {
        category = 'Pipe Cleaners';
      } else if (/\b(wrap|wrapping|wrapping paper|sheet|n|w|g|newspaper|waterproof|glossy)\b/.test(lower)) {
        category = 'Wrapping Sheets';
      } else if (/\b(glue|tape|tissue|stick|sticks|hook|hooks|accessories)\b/.test(lower)) {
        category = 'Accessories';
      }

      // 3. Type Detection
      let type = '';
      if (category === 'Wrapping Sheets' || category === 'Unknown') {
        if (/\b(n|newspaper)\b/.test(lower)) type = 'Newspaper';
        else if (/\b(w|waterproof)\b/.test(lower)) type = 'Waterproof';
        else if (/\b(g|glossy)\b/.test(lower)) type = 'Glossy';
      }
      
      // 4. Color / Name Detection
      let colorStr = line.replace(/\d+/g, '').replace(/\b(pc|pipe cleaner|pipe cleaners|wrap|wrapping|wrapping paper|sheet|newspaper|waterproof|glossy|glue|tape|tissue|stick|sticks|hook|hooks|accessories)\b/gi, '').trim();
      
      if (type === 'Newspaper') colorStr = colorStr.replace(/\bN\b/i, '').trim();
      if (type === 'Waterproof') colorStr = colorStr.replace(/\bW\b/i, '').trim();
      if (type === 'Glossy') colorStr = colorStr.replace(/\bG\b/i, '').trim();
      
      colorStr = colorStr.replace(/\b(packet|packets|unit|units|of)\b/gi, '').replace(/^[-,\s]+|[-,\s]+$/g, '').trim();

      let color = colorStr || (category === 'Accessories' ? 'Item' : 'Unknown');

      return {
        id: `row-${index}`,
        qty,
        category,
        color,
        type,
        originalText: line
      };
    });

    setParsedRows(rows);
    setReviewMode(true);
  };

  const handleFinalSave = async () => {
    // Validate rows
    const invalidRows = parsedRows.filter(r => 
      r.category === 'Unknown' || 
      r.color === 'Unknown' || 
      !r.color.trim() || 
      (r.category === 'Wrapping Sheets' && !r.type)
    );

    if (invalidRows.length > 0) {
      showToast('⚠️ Please fix the highlighted rows before saving.');
      return;
    }

    for (const row of parsedRows) {
      let finalName = row.color.trim();
      if (row.category === 'Pipe Cleaners') {
        finalName = `Pipe Cleaner - ${row.color.trim()}`;
      } else if (row.category === 'Wrapping Sheets') {
        finalName = `Wrapping Paper (${row.color.trim()}${row.type.trim() ? ` - ${row.type.trim()}` : ''})`;
      } else if (row.category === 'Mesh Wrap') {
        finalName = `Mesh Wrap (${row.color.trim()}${row.type.trim() ? ` - ${row.type.trim()}` : ''})`;
      } else if (row.category === 'Ribbons') {
        finalName = `Ribbon (${row.color.trim()}${row.type.trim() ? ` - ${row.type.trim()}` : ''})`;
      }

      await onAddStock({
        name: finalName,
        category: row.category as StockItem['category'],
        count: row.qty
      });
    }

    setIsDirectEntryOpen(false);
    setReviewMode(false);
    setSmartLogText('');
    setParsedRows([]);
  };

  const getStockStatus = (category: string, count: number): 'Red' | 'Yellow' | 'Green' => {
    if (category === 'Pipe Cleaners') {
      if (count <= 1) return 'Red';
      if (count === 2) return 'Yellow';
      return 'Green';
    }
    if (category === 'Wrapping Sheets' || category === 'Mesh Wrap' || category === 'Ribbons') {
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
    const val = parseFloat(editValue);
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
      <Navbar />
      <header className="dashboard-header" style={{ justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {onMergeDuplicates && (
            <button 
              onClick={async () => {
                if (window.confirm('Are you sure you want to merge all duplicate items? This will combine their counts and delete the extras.')) {
                  await onMergeDuplicates();
                }
              }}
              className="ghost-btn"
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
            >
              Merge Duplicates
            </button>
          )}
          <span className="badge">Stock Inventory</span>
        </div>
      </header>

      <main className="dashboard-content" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '2rem', fontFamily: '"Playfair Display", serif', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>Live Inventory</h2>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {['All', 'Pipe Cleaners', 'Wrapping Sheets', 'Mesh Wrap', 'Ribbons', 'Accessories'].map(cat => (
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
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                            <input 
                              type="number" 
                              min="0"
                              step={item.category === 'Pipe Cleaners' || item.category === 'Accessories' ? "0.01" : "1"}
                              value={editValue} 
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => handleSaveEdit(item.id)}
                              onKeyDown={e => e.key === 'Enter' && handleSaveEdit(item.id)}
                              autoFocus
                              className="saas-input"
                              style={{ width: '80px', textAlign: 'center', padding: '0.2rem', height: '32px' }}
                            />
                          </div>
                        ) : (
                          <span>{item.count} {item.category === 'Pipe Cleaners' ? 'Packets' : item.category === 'Wrapping Sheets' ? 'Sheets' : 'Units'}</span>
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
                          onClick={() => onUpdateStock(item.id, item.count + 1)}
                          style={{ 
                            background: 'rgba(0,0,0,0.05)', 
                            border: '1px solid rgba(0,0,0,0.1)', 
                            cursor: 'pointer', 
                            padding: '0.4rem', 
                            borderRadius: '6px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                          }}
                          title="Add 1"
                        >
                          <Plus size={16} />
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
                        {onDeleteStock && (
                          <button 
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to permanently delete "${item.name}"?`)) {
                                await onDeleteStock(item.id);
                              }
                            }}
                            style={{ 
                              color: '#dc2626', 
                              background: 'rgba(239, 68, 68, 0.1)', 
                              border: 'none', 
                              cursor: 'pointer', 
                              padding: '0.4rem', 
                              borderRadius: '6px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center' 
                            }}
                            title="Delete Item"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* FAB */}
        <button 
          onClick={() => setIsDirectEntryOpen(true)}
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 100,
            color: 'var(--primary-dark)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Plus size={28} />
        </button>

        {/* Smart-Log Modal */}
        {isDirectEntryOpen && (
          <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="modal-content" style={{ width: '90%', maxWidth: reviewMode ? '800px' : '500px', padding: '2rem' }}>
              <h3 style={{ margin: '0 0 1.5rem 0' }}>{reviewMode ? 'Review Parsed Log' : 'Smart-Log Entry'}</h3>
              
              {!reviewMode ? (
                <>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Paste multiple lines of inventory. E.g. "10 red N wrapping paper" or "1 packet blue PC".
                  </p>
                  <textarea 
                    className="saas-input"
                    value={smartLogText}
                    onChange={e => setSmartLogText(e.target.value)}
                    rows={10}
                    placeholder="10 red G wrapping paper&#10;1 packet blue PC&#10;5 glue sticks"
                    style={{ width: '100%', marginBottom: '2rem', fontFamily: 'monospace', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button className="secondary-btn" onClick={() => setIsDirectEntryOpen(false)}>Cancel</button>
                    <button className="primary-btn" onClick={parseTextLog} disabled={!smartLogText.trim()}>Process List</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '2rem' }}>
                    <table className="saas-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Color / Item</th>
                          <th>Type</th>
                          <th>Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((row, index) => {
                          const isConfusing = row.category === 'Unknown' || row.color === 'Unknown' || !row.color.trim() || (row.category === 'Wrapping Sheets' && !row.type);
                          return (
                            <tr key={row.id} style={{ background: isConfusing ? '#fef2f2' : 'transparent' }}>
                              <td>
                                <select 
                                  value={row.category}
                                  onChange={e => {
                                    const next = [...parsedRows];
                                    next[index].category = e.target.value as StockItem['category'] | 'Unknown';
                                    setParsedRows(next);
                                  }}
                                  style={{ padding: '0.25rem', border: isConfusing && row.category === 'Unknown' ? '1px solid #ef4444' : '1px solid #e5e7eb', borderRadius: '4px' }}
                                >
                                  <option value="Unknown">Select Category...</option>
                                  <option value="Pipe Cleaners">Pipe Cleaners</option>
                                  <option value="Wrapping Sheets">Wrapping Papers</option>
                                  <option value="Ribbons">Ribbons</option>
                                  <option value="Mesh Wrap">Mesh Wrap</option>
                                  <option value="Accessories">Accessories</option>
                                </select>
                              </td>
                              <td>
                                <input 
                                  type="text" 
                                  value={row.color}
                                  onChange={e => {
                                    const next = [...parsedRows];
                                    next[index].color = e.target.value;
                                    setParsedRows(next);
                                  }}
                                  style={{ width: '120px', padding: '0.25rem', border: isConfusing && (row.color === 'Unknown' || !row.color.trim()) ? '1px solid #ef4444' : '1px solid #e5e7eb', borderRadius: '4px' }}
                                />
                              </td>
                              <td>
                                {['Wrapping Sheets', 'Ribbons', 'Mesh Wrap', 'Unknown'].includes(row.category) ? (
                                  <input 
                                    type="text" 
                                    value={row.type}
                                    placeholder="Type"
                                    onChange={e => {
                                      const next = [...parsedRows];
                                      next[index].type = e.target.value;
                                      setParsedRows(next);
                                    }}
                                    style={{ width: '100px', padding: '0.25rem', border: isConfusing && row.category === 'Wrapping Sheets' && !row.type ? '1px solid #ef4444' : '1px solid #e5e7eb', borderRadius: '4px' }}
                                  />
                                ) : (
                                  <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
                                )}
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  min="1"
                                  value={row.qty}
                                  onChange={e => {
                                    const next = [...parsedRows];
                                    next[index].qty = Number(e.target.value) || 1;
                                    setParsedRows(next);
                                  }}
                                  style={{ width: '60px', padding: '0.25rem', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
                    <button className="secondary-btn" onClick={() => setReviewMode(false)}>Back to Edit Text</button>
                    <button className="primary-btn" onClick={handleFinalSave}>Final Save to Stock</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
