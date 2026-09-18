import React, { useState } from 'react';
import { X } from 'lucide-react';
import { isFlowerPot, isKeychain, type FlowerData } from '../types';
import { showToast } from './Toast';

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
    extraCosts: number | string;
    hasFoamBall: boolean;
    sellingPrice: number;
  }>({
    name: '',
    category: 'Flowers',
    pipeCleanerQty: 0,
    pollenQty: 0,
    glueQty: 0,
    extraCosts: '',
    hasFoamBall: false,
    sellingPrice: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const liveCost = (Number(formData.pipeCleanerQty) * 0.8) + 
                   (!isFlowerPot(formData.category) ? Number(formData.pollenQty) * 0.2815 : 0) +
                   (isKeychain(formData.category) ? 2.5 : 0) +
                   (isFlowerPot(formData.category) ? 12.4 : 0) +
                   (Number(formData.extraCosts) || 0) +
                   (formData.hasFoamBall ? 16.6 : 0);

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
        extraCosts: Number(formData.extraCosts) || 0,
        hasFoamBall: formData.hasFoamBall,
        sellingPrice: Number(formData.sellingPrice)
      });
      
      showToast(`✅ ${formData.name} added!`);
      setSuccessMessage(`✅ ${formData.name} added!`);
      setFormData({ name: '', category: 'Flowers', pipeCleanerQty: 0, pollenQty: 0, glueQty: 0, extraCosts: '', hasFoamBall: false, sellingPrice: 0 });
      
      setTimeout(() => {
        setSuccessMessage('');
        setIsSubmitting(false);
        onClose();
      }, 500); // reduced timeout since we have toast
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to add product. Check console.");
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value as 'Flowers' | 'Keychain' | 'Flower Pots';
    setFormData(prev => ({
      ...prev,
      category: newCategory,
      extraCosts: '',
      hasFoamBall: false
    }));
  };




  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#F9F8F3] w-full max-w-3xl rounded-2xl shadow-2xl relative border border-[rgba(122,144,120,0.2)]">
        <div style={{ padding: '1.75rem 2rem' }}>
          <div className="modal-header" style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0, fontFamily: "'Playfair Display', serif" }}>Add New Product</h2>
            <button className="icon-btn" onClick={onClose} type="button">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} style={{ margin: 0, padding: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem 1.5rem' }}>
              
              {/* Row 1: Product Name & Category */}
              <div className="form-group">
                <label htmlFor="name" style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Product Name *</label>
                <input 
                  required
                  id="name"
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="e.g. Rose, Tulip..."
                  className="saas-input"
                  style={{ height: '40px', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="category" style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
                <select 
                  id="category" 
                  name="category" 
                  value={formData.category} 
                  onChange={handleCategoryChange} 
                  className="saas-input" 
                  style={{ height: '40px', width: '100%', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)' }}
                >
                  <option value="Flowers">🌸 Flowers</option>
                  <option value="Keychain">🔑 Keychain</option>
                  <option value="Flower Pots">🪴 Flower Pots</option>
                </select>
              </div>

              {/* Row 2: Pipe Cleaner Qty & Pollen Qty / Category Note */}
              <div className="form-group">
                <label htmlFor="pipeCleanerQty" style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pipe Cleaner Qty</label>
                <input 
                  required 
                  type="number" 
                  min="0" 
                  id="pipeCleanerQty" 
                  name="pipeCleanerQty" 
                  value={formData.pipeCleanerQty} 
                  onChange={handleChange}
                  className="saas-input"
                  style={{ height: '40px', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)' }}
                />
              </div>
              
              <div className="form-group">
                {!isFlowerPot(formData.category) ? (
                  <>
                    <label htmlFor="pollenQty" style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pollen Qty</label>
                    <input 
                      required 
                      type="number" 
                      min="0" 
                      step="1" 
                      id="pollenQty" 
                      name="pollenQty" 
                      value={formData.pollenQty} 
                      onChange={handleChange}
                      className="saas-input"
                      style={{ height: '40px', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)' }}
                    />
                  </>
                ) : (
                  <>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Base Material</label>
                    <div style={{ height: '40px', display: 'flex', alignItems: 'center', padding: '0 0.75rem', backgroundColor: 'rgba(0, 0, 0, 0.03)', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
                      Cup / Base Included: ₹12.40
                    </div>
                  </>
                )}
              </div>

              {/* Row 3: Extra Costs & Foam Ball / Keychain Note */}
              <div className="form-group">
                <label htmlFor="extraCosts" style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Extra Costs (₹)</label>
                <input 
                  required 
                  type="number" 
                  min="0" 
                  step="0.1" 
                  id="extraCosts" 
                  name="extraCosts" 
                  value={formData.extraCosts} 
                  onChange={handleChange} 
                  placeholder="0"
                  className="saas-input"
                  style={{ height: '40px', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)' }}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.75rem', backgroundColor: formData.hasFoamBall ? 'rgba(122, 144, 120, 0.12)' : 'rgba(0,0,0,0.02)', borderRadius: '8px', border: formData.hasFoamBall ? '1px solid var(--primary-color)' : '1px solid rgba(0,0,0,0.08)', transition: 'all 0.2s' }}>
                  <label htmlFor="hasFoamBall" style={{ margin: 0, cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="checkbox" 
                      id="hasFoamBall" 
                      name="hasFoamBall" 
                      checked={formData.hasFoamBall} 
                      onChange={handleChange}
                      style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--primary-dark)', cursor: 'pointer' }}
                    />
                    Include Foam Ball (+₹16.6)
                  </label>
                  {isKeychain(formData.category) && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>+₹2.50 key ring</span>
                  )}
                </div>
              </div>

              {/* Row 4: Live Cost Display & Selling Price Input */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ height: '44px', padding: '0 1rem', backgroundColor: 'rgba(122, 144, 120, 0.12)', borderRadius: '8px', border: '1px solid rgba(122, 144, 120, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary-dark)' }}>Live Base Cost:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>₹{liveCost.toFixed(1)}</span>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="sellingPrice" style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Selling Price (₹) *</label>
                <input 
                  required 
                  type="number" 
                  min="0" 
                  id="sellingPrice" 
                  name="sellingPrice" 
                  value={formData.sellingPrice} 
                  onChange={handleChange}
                  className="saas-input"
                  style={{ height: '44px', padding: '0 0.75rem', borderRadius: '8px', border: '2px solid rgba(122, 144, 120, 0.5)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary-dark)' }}
                />
              </div>

            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              {successMessage && <span style={{ color: 'var(--primary-color)', fontWeight: 500, marginRight: 'auto' }}>{successMessage}</span>}
              <button type="button" className="ghost-btn" onClick={onClose} disabled={isSubmitting} style={{ height: '40px', padding: '0 1.25rem' }}>Cancel</button>
              <button type="submit" className="primary-btn" disabled={isSubmitting} style={{ height: '40px', padding: '0 1.5rem' }}>
                {isSubmitting ? 'Adding...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
