import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { FlowerData } from '../types';

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
      });
      
      setSuccessMessage(`✅ ${formData.name} added!`);
      setFormData({ name: '', category: 'Flowers', pipeCleanerQty: 0, pollenQty: 0, glueQty: 0, extraCosts: 3.5, sellingPrice: 0, targetMargin: '' });
      
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
              <option value="Flower Pots">Flower Pots</option>
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
