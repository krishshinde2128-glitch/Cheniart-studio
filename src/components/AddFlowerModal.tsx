import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { FlowerData, ProductRecipe } from '../types';

interface AddFlowerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (flower: FlowerData) => Promise<void> | void;
}

export function AddFlowerModal({ isOpen, onClose, onAdd }: AddFlowerModalProps) {
  const [formData, setFormData] = useState<{
    name: string;
    category: 'Flowers' | 'Keychain' | 'Flower Pots';
    pipeCleanerQty: number;
    pollenQty: number;
    glueQty: number;
    extraCosts: number;
    sellingPrice: number;
    targetMargin: string;
  }>({
    name: '',
    category: 'Flowers',
    pipeCleanerQty: 0,
    pollenQty: 0,
    glueQty: 0,
    extraCosts: 3.5,
    sellingPrice: 0,
    targetMargin: '',
  });
  const [recipe, setRecipe] = useState<ProductRecipe>({
    pipeCleaners: [],
    wrapping: [],
    accessories: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const liveCost = (Number(formData.pipeCleanerQty) * 0.8) + 
                   (formData.category !== 'Flower Pots' ? Number(formData.pollenQty) * 0.2815 : 0) +
                   (formData.category === 'Keychain' ? 2.5 : 0) +
                   (formData.category === 'Flower Pots' ? 12.4 : 0) +
                   Number(formData.extraCosts);

  useEffect(() => {
    const tm = Number(formData.targetMargin);
    if (tm > 0 && tm < 100) {
      const sp = liveCost / (1 - (tm / 100));
      setFormData(prev => ({ ...prev, sellingPrice: parseFloat(sp.toFixed(0)) }));
    }
  }, [liveCost, formData.targetMargin]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      await onAdd({
        id: Date.now().toString(),
        name: formData.name,
        category: formData.category,
        pipeCleanerQty: Number(formData.pipeCleanerQty),
        pollenQty: Number(formData.pollenQty),
        glueQty: Number(formData.glueQty),
        extraCosts: Number(formData.extraCosts),
        sellingPrice: Number(formData.sellingPrice),
        targetMargin: formData.targetMargin ? Number(formData.targetMargin) : undefined,
        recipe: {
          pipeCleaners: recipe.pipeCleaners.length > 0 ? recipe.pipeCleaners : [{ id: '1', name: 'Standard Color', qty: Number(formData.pipeCleanerQty) }].filter(i => i.qty > 0),
          wrapping: recipe.wrapping,
          accessories: recipe.accessories.length > 0 ? recipe.accessories : [
            { id: '2', name: 'Pollen', qty: Number(formData.pollenQty) },
            { id: '3', name: 'Glue Stick', qty: Number(formData.glueQty) }
          ].filter(i => i.qty > 0)
        }
      });
      
      setSuccessMessage(`✅ ${formData.name} added!`);
      setFormData({ name: '', category: 'Flowers', pipeCleanerQty: 0, pollenQty: 0, glueQty: 0, extraCosts: 3.5, sellingPrice: 0, targetMargin: '' });
      setRecipe({ pipeCleaners: [], wrapping: [], accessories: [] });
      
      setTimeout(() => {
        setSuccessMessage('');
        setIsSubmitting(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value as 'Flowers' | 'Keychain' | 'Flower Pots';
    setFormData(prev => ({
      ...prev,
      category: newCategory,
      extraCosts: 3.5
    }));
  };

  const handleAddRecipeItem = (category: keyof ProductRecipe) => {
    setRecipe(prev => ({
      ...prev,
      [category]: [...prev[category], { id: Date.now().toString() + Math.random().toString(36).substr(2, 5), name: '', qty: 1 }]
    }));
  };

  const handleUpdateRecipeItem = (category: keyof ProductRecipe, id: string, field: 'name' | 'qty', value: string | number) => {
    setRecipe(prev => ({
      ...prev,
      [category]: prev[category].map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleRemoveRecipeItem = (category: keyof ProductRecipe, id: string) => {
    setRecipe(prev => ({
      ...prev,
      [category]: prev[category].filter(item => item.id !== id)
    }));
  };


  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add New Product</h2>
          <button className="icon-btn" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">Product Name</label>
            <input 
              required
              id="name"
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="e.g. Rose, Tulip..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select id="category" name="category" value={formData.category} onChange={handleCategoryChange} className="saas-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}>
              <option value="Flowers">Flowers</option>
              <option value="Keychain">Keychain</option>
              <option value="Flower Pots">Pots</option>
            </select>
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="pipeCleanerQty">Pipe Cleaner Qty</label>
              <input required type="number" min="0" id="pipeCleanerQty" name="pipeCleanerQty" value={formData.pipeCleanerQty} onChange={handleChange} />
            </div>
            
            {formData.category !== 'Flower Pots' && (
              <div className="form-group">
                <label htmlFor="pollenQty">Pollen Qty</label>
                <input required type="number" min="0" step="1" id="pollenQty" name="pollenQty" value={formData.pollenQty} onChange={handleChange} />
              </div>
            )}

            {formData.category === 'Keychain' && (
              <div className="form-group full-width" style={{ marginTop: '0.25rem', padding: '0.75rem', backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Keychain Accessory Cost: ₹2.50</span>
              </div>
            )}

            {/* Recipe Builder Section */}
            <div className="form-group full-width" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(122, 144, 120, 0.05)', borderRadius: '8px', border: '1px solid rgba(122, 144, 120, 0.2)' }}>
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Standard Recipe Builder
              </h3>
              
              {/* Pipe Cleaners */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Pipe Cleaners</label>
                  <button type="button" onClick={() => handleAddRecipeItem('pipeCleaners')} className="flat-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Plus size={14} /> Add Color
                  </button>
                </div>
                {recipe.pipeCleaners.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="text" placeholder="Color (e.g. Red)" value={item.name} onChange={e => handleUpdateRecipeItem('pipeCleaners', item.id, 'name', e.target.value)} className="saas-input" style={{ flex: 2 }} required />
                    <input type="number" min="0" step="0.5" placeholder="Qty" value={item.qty} onChange={e => handleUpdateRecipeItem('pipeCleaners', item.id, 'qty', Number(e.target.value))} className="saas-input" style={{ flex: 1 }} required />
                    <button type="button" onClick={() => handleRemoveRecipeItem('pipeCleaners', item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>

              {/* Wrapping */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Wrapping</label>
                  <button type="button" onClick={() => handleAddRecipeItem('wrapping')} className="flat-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Plus size={14} /> Add Wrapping
                  </button>
                </div>
                {recipe.wrapping.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="text" placeholder="Type (e.g. Transparent)" value={item.name} onChange={e => handleUpdateRecipeItem('wrapping', item.id, 'name', e.target.value)} className="saas-input" style={{ flex: 2 }} required />
                    <input type="number" min="0" step="0.5" placeholder="Qty" value={item.qty} onChange={e => handleUpdateRecipeItem('wrapping', item.id, 'qty', Number(e.target.value))} className="saas-input" style={{ flex: 1 }} required />
                    <button type="button" onClick={() => handleRemoveRecipeItem('wrapping', item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>

              {/* Accessories */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Accessories</label>
                  <button type="button" onClick={() => handleAddRecipeItem('accessories')} className="flat-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Plus size={14} /> Add Accessory
                  </button>
                </div>
                {recipe.accessories.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="text" placeholder="Name (e.g. Glue Stick, Tape)" value={item.name} onChange={e => handleUpdateRecipeItem('accessories', item.id, 'name', e.target.value)} className="saas-input" style={{ flex: 2 }} required />
                    <input type="number" min="0" step="0.1" placeholder="Qty (decimals supported)" value={item.qty} onChange={e => handleUpdateRecipeItem('accessories', item.id, 'qty', Number(e.target.value))} className="saas-input" style={{ flex: 1 }} required />
                    <button type="button" onClick={() => handleRemoveRecipeItem('accessories', item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
            </div>

            {formData.category === 'Flower Pots' && (
              <div className="form-group full-width" style={{ marginTop: '0.25rem', padding: '0.75rem', backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Cup / Base Cost: ₹12.40</span>
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="extraCosts">Extra Costs (₹)</label>
              <input required type="number" min="0" step="0.1" id="extraCosts" name="extraCosts" value={formData.extraCosts} onChange={handleChange} />
            </div>

            <div className="form-group full-width" style={{ marginTop: '0.25rem', padding: '0.75rem', backgroundColor: 'rgba(122, 144, 120, 0.1)', borderRadius: '8px', border: '1px solid rgba(122, 144, 120, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>Live Base Cost:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>₹{liveCost.toFixed(1)}</span>
              </div>
            </div>
            
            <div className="form-group full-width">
              <label htmlFor="sellingPrice">Selling Price (₹)</label>
              <input required type="number" min="0" id="sellingPrice" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} />
            </div>

            <div className="form-group full-width">
              <label htmlFor="targetMargin">Target Margin % (Optional)</label>
              <input type="number" min="0" max="99" id="targetMargin" name="targetMargin" value={formData.targetMargin} onChange={handleChange} placeholder="e.g. 50" />
            </div>
          </div>
          
          <div className="modal-footer">
            {successMessage && <span style={{ color: 'var(--primary-color)', fontWeight: 500, marginRight: 'auto' }}>{successMessage}</span>}
            <button type="button" className="ghost-btn" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
