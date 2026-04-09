import { Package, Flower2, ChevronRight, Calculator, History, Wallet } from 'lucide-react';
import type { FlowerData, Order, Expense } from '../types';
import type { PageView } from '../App';
import './LandingPage.css';

interface LandingPageProps {
  onNavigate: (page: PageView) => void;
  flowers: FlowerData[];
  orders: Order[];
  expenses: Expense[];
}

export function LandingPage({ onNavigate, flowers, orders, expenses }: LandingPageProps) {
  const totalTypes = flowers.length;
  
  // Calculate average profit margin
  const validFlowers = flowers.filter(f => f.sellingPrice && f.sellingPrice > 0);
  const totalMargin = validFlowers.reduce((sum, flower) => {
    const costPrice = (flower.pipeCleanerQty * 0.8) + (flower.pollenQty * 0.2815) + (flower.glueQty * 3.5) + flower.extraCosts;
    const profit = flower.sellingPrice! - costPrice;
    return sum + ((profit / flower.sellingPrice!) * 100);
  }, 0);
  
  const avgMargin = validFlowers.length > 0 ? (totalMargin / validFlowers.length).toFixed(1) : '0.0';

  // Calculate Studio revenue and profit (Only Paid)
  const paidOrders = orders.filter(o => o.paymentStatus === 'Paid');
  const pendingOrders = orders.filter(o => o.paymentStatus === 'Pending');

  const totalRevenue = paidOrders.reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0);
  const totalProfit = paidOrders.reduce((sum, order) => {
    const profit = Number(order.profit) || (Number(order.totalPrice) - Number(order.totalCost)) || 0;
    return sum + profit;
  }, 0);
  const totalPendingAmount = pendingOrders.reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0);

  const totalInvestment = expenses.reduce((sum, exp) => sum + (Number(exp.tripTotal) || 0), 0);

  return (
    <div className="landing-container">
      
      {/* Glassmorphic Navbar */}
      <nav className="glass-navbar">
        <a href="#" className="nav-brand" onClick={(e) => { e.preventDefault(); }}>
          <Flower2 size={24} strokeWidth={1.5} />
          <span className="nav-title">Cheniart Studio</span>
        </a>
        <div className="nav-links">
          <a className="nav-link" onClick={() => onNavigate('database')}>Inventory</a>
          <a className="nav-link" onClick={() => onNavigate('calculator')}>Quote</a>
          <a className="nav-link" onClick={() => onNavigate('history')}>Orders</a>
          <a className="nav-link" onClick={() => onNavigate('expenses')}>Expenses</a>
          <a className="nav-link" onClick={() => onNavigate('stockInventory')}>Live Stock</a>
          <a className="nav-link" onClick={() => onNavigate('analytics')}>Analytics</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-graphic">
          <Flower2 size={48} strokeWidth={1} />
        </div>
        <h1 className="hero-title">Studio Dashboard</h1>
        <p className="hero-subtitle">Manage materials, calculate precision quotes, and track your creative studio's financial health beautifully.</p>
      </section>

      {/* Premium Modular Grid */}
      <main className="saas-grid">
        
        {/* Primary Feature: Inventory */}
        <div className="feature-card saas-grid-primary">
          <div className="icon-container">
            <Package size={32} strokeWidth={1.5} />
          </div>
          <div className="card-content">
            <h2 className="card-title">Product Inventory & Costs</h2>
            <p className="card-description">Control raw materials, automate cost price calculations, and monitor your profit margins for every single physical creation.</p>
            
            <div className="stat-widget-dock">
              <div className="stat-widget">
                <span className="widget-val">{totalTypes}</span>
                <span className="widget-lbl">Tracked</span>
              </div>
              <div className="stat-widget">
                <span className="widget-val">{avgMargin}%</span>
                <span className="widget-lbl">Avg Margin</span>
              </div>
            </div>

            <button className="arrow-btn" onClick={() => onNavigate('database')}>
              Open Database <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Feature: Quote Calculator */}
        <div className="feature-card">
          <div className="icon-container">
            <Calculator size={28} strokeWidth={1.5} />
          </div>
          <div className="card-content">
            <h2 className="card-title">Order Calculator</h2>
            <p className="card-description">Build real-time quotes dynamically by pulling directly from your live inventory costs.</p>
            <button className="arrow-btn" onClick={() => onNavigate('calculator')}>
              Create Quote <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Feature: Order History */}
        <div className="feature-card">
          <div className="icon-container">
            <History size={28} strokeWidth={1.5} />
          </div>
          <div className="card-content">
            <h2 className="card-title">Order History</h2>
            <p className="card-description">Track finalized orders, monitor live studio profit, and manage payment statuses elegantly.</p>
            
            <div className="stat-widget-dock" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%' }}>
              <div className="stat-widget" style={{ justifyContent: 'center' }}>
                <span className="widget-val">₹{Math.round(totalRevenue).toLocaleString('en-IN')}</span>
                <span className="widget-lbl">Revenue</span>
              </div>
              <div className="stat-widget" style={{ justifyContent: 'center', position: 'relative' }}>
                <span className="widget-val">₹{Math.round(totalProfit).toLocaleString('en-IN')}</span>
                <span className="widget-lbl">Profit</span>
                {totalPendingAmount > 0 && (
                  <div style={{ position: 'absolute', bottom: '-1.4rem', left: '50%', transform: 'translateX(-50%)', fontSize: '0.75rem', color: '#ef4444', fontWeight: 500, opacity: 0.85, whiteSpace: 'nowrap' }}>
                    ₹{Math.round(totalPendingAmount).toLocaleString('en-IN')} Pending
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button className="arrow-btn" onClick={() => onNavigate('history')} style={{ margin: 0 }}>
                View Orders <ChevronRight size={18} />
              </button>
              
              <div className="stat-widget" style={{ margin: 0, height: '100%' }}>
                <span className="widget-val">{orders.length}</span>
                <span className="widget-lbl">Total Orders</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature: Stock & Expenses */}
        <div className="feature-card">
          <div className="icon-container">
            <Wallet size={28} strokeWidth={1.5} />
          </div>
          <div className="card-content">
            <h2 className="card-title">Stock & Expenses</h2>
            <p className="card-description">Log shopping trips, track material investments, and maintain a detailed ledger of Studio costs.</p>
            
            <div className="stat-widget-dock" style={{ width: '100%' }}>
              <div className="stat-widget" style={{ justifyContent: 'center', flex: 1 }}>
                <span className="widget-val">₹{Math.round(totalInvestment).toLocaleString('en-IN')}</span>
                <span className="widget-lbl">Total Investment</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginTop: 'auto' }}>
              <button className="arrow-btn" onClick={() => onNavigate('expenses')} style={{ margin: 0 }}>
                Log Expenses <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Feature: Live Inventory */}
        <div className="feature-card">
          <div className="icon-container">
            <Package size={28} strokeWidth={1.5} />
          </div>
          <div className="card-content">
            <h2 className="card-title">Live Stock Tracker</h2>
            <p className="card-description">Visually trace hardware material quantities dynamically utilizing automated sync mapping alongside color-coded indicators.</p>
            <button className="arrow-btn" onClick={() => onNavigate('stockInventory')} style={{ marginTop: 'auto' }}>
              Open Inventory <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Feature: Analytics */}
        <div className="feature-card">
          <div className="icon-container">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          </div>
          <div className="card-content">
            <h2 className="card-title">Monthly Analytics</h2>
            <p className="card-description">Visualize performance with comprehensive data dashboards, revenue trends, and tracking insight into business growth over time.</p>
            <button className="arrow-btn" onClick={() => onNavigate('analytics')} style={{ marginTop: 'auto' }}>
              View Analytics <ChevronRight size={18} />
            </button>
          </div>
        </div>

      </main>

      <footer className="landing-footer">
        <p>Cheniart Studio © 2026 • Premium SaaS Edition</p>
      </footer>
    </div>
  );
}
