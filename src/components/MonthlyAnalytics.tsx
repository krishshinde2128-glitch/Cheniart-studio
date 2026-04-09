import { useState, useMemo } from 'react';
import { ChevronLeft, TrendingUp, DollarSign, ShoppingBag, Package, Download } from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import type { Order, Expense } from '../types';
import type { PageView } from '../App';

interface MonthlyAnalyticsProps {
  onNavigate: (page: PageView) => void;
  orders: Order[];
  expenses: Expense[];
}

type TimeFilter = 'Current Month' | 'Last 3 Months' | 'YTD' | 'All Time';

function getMonthKey(dateObj: Date) {
  return dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function MonthlyAnalytics({ onNavigate, orders, expenses }: MonthlyAnalyticsProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('Current Month');

  const { filteredOrders, filteredExpenses, chartData } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let startDate = new Date();
    
    if (timeFilter === 'Current Month') {
      startDate = new Date(currentYear, currentMonth, 1);
    } else if (timeFilter === 'Last 3 Months') {
      startDate = new Date(currentYear, currentMonth - 2, 1);
    } else if (timeFilter === 'YTD') {
      startDate = new Date(currentYear, 0, 1);
    } else if (timeFilter === 'All Time') {
      let earliestDate = now;
      orders.forEach(o => {
        const d = new Date(o.date);
        if (d < earliestDate) earliestDate = d;
      });
      expenses.forEach(e => {
        const d = new Date(e.date);
        if (d < earliestDate) earliestDate = d;
      });
      startDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    }

    // Filter data
    const validOrders = orders.filter(o => o.paymentStatus === 'Paid' && new Date(o.date) >= startDate);
    const validExpenses = expenses.filter(e => new Date(e.date) >= startDate);

    // Grouping by Month
    const monthlyMap: Record<string, { name: string, dateVal: number, revenue: number, profit: number, spent: number, orders: number }> = {};

    // Get a sorted range of months based on start date and now to ensure blank months appear
    let tempDate = new Date(startDate);
    while (tempDate <= now) {
      const key = getMonthKey(tempDate);
      if (!monthlyMap[key]) {
        monthlyMap[key] = { name: key, dateVal: tempDate.getTime(), revenue: 0, profit: 0, spent: 0, orders: 0 };
      }
      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    validOrders.forEach(o => {
      const key = getMonthKey(new Date(o.date));
      if (monthlyMap[key]) {
        monthlyMap[key].revenue += Number(o.totalPrice) || 0;
        monthlyMap[key].profit += Number(o.profit) || (Number(o.totalPrice) - Number(o.totalCost)) || 0;
        monthlyMap[key].orders += 1;
      }
    });

    validExpenses.forEach(e => {
      const key = getMonthKey(new Date(e.date));
      if (monthlyMap[key]) {
        monthlyMap[key].spent += Number(e.tripTotal) || 0;
      }
    });

    const chartData = Object.values(monthlyMap).sort((a, b) => a.dateVal - b.dateVal);

    return { filteredOrders: validOrders, filteredExpenses: validExpenses, chartData };
  }, [timeFilter, orders, expenses]);

  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
    const totalProfit = filteredOrders.reduce((sum, o) => sum + (Number(o.profit) || (Number(o.totalPrice) - Number(o.totalCost)) || 0), 0);
    const totalSpent = filteredExpenses.reduce((sum, e) => sum + (Number(e.tripTotal) || 0), 0);
    const totalOrders = filteredOrders.length;

    return { totalRevenue, totalProfit, totalSpent, totalOrders };
  }, [filteredOrders, filteredExpenses]);

  const handleDownloadCSV = () => {
    const sortedData = chartData;
    // Generate CSV string
    const headers = ['Month', 'Revenue', 'Sales Profit', 'Cash Spent', 'Orders'];
    const rows = sortedData.map(row => 
      [row.name, row.revenue, row.profit, row.spent, row.orders].join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `monthly_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            className="nav-logo-btn" 
            onClick={() => onNavigate('landing')}
            title="Back to Dashboard"
          >
            <ChevronLeft size={24} strokeWidth={2} />
            <h1 className="nav-script-title">Dashboard</h1>
          </button>
          <span className="badge" style={{ backgroundColor: 'white' }}>Monthly Analytics</span>
        </div>
        <div>
          <select 
            className="saas-select" 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            style={{ backgroundColor: 'var(--surface-color)', width: '180px' }}
          >
            <option value="Current Month">Current Month</option>
            <option value="Last 3 Months">Last 3 Months</option>
            <option value="YTD">Year to Date (YTD)</option>
            <option value="All Time">All Time</option>
          </select>
        </div>
      </header>

      <main className="dashboard-content" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <h2 style={{ fontSize: '2rem', fontFamily: '"Playfair Display", serif', color: 'var(--text-primary)', marginBottom: '2rem' }}>
          Performance Over Time
        </h2>
        
        {/* STATS OVERVIEW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
            <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: 'rgba(122, 144, 120, 0.1)' }}>
              <DollarSign size={24} color="var(--primary-dark)" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Revenue</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>₹{Math.round(stats.totalRevenue).toLocaleString('en-IN')}</div>
            </div>
          </div>
          
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
            <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: 'rgba(122, 144, 120, 0.1)' }}>
              <TrendingUp size={24} color="var(--primary-color)" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Profit</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>₹{Math.round(stats.totalProfit).toLocaleString('en-IN')}</div>
            </div>
          </div>
          
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
            <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
              <ShoppingBag size={24} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Spent</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>₹{Math.round(stats.totalSpent).toLocaleString('en-IN')}</div>
            </div>
          </div>
          
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
            <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: 'rgba(122, 144, 120, 0.1)' }}>
              <Package size={24} color="var(--primary-dark)" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Orders</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.totalOrders}</div>
            </div>
          </div>
        </div>

        {/* CHARTS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}>
          
          {/* Revenue Graph */}
          <div className="glass-card" style={{ padding: '1.5rem', height: '380px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Revenue Trend</h3>
            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(122,144,120,0.05)' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="var(--primary-dark)" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profit Graph */}
          <div className="glass-card" style={{ padding: '1.5rem', height: '380px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Profit Growth</h3>
            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Profit']}
                  />
                  <Line type="monotone" dataKey="profit" stroke="var(--primary-color)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Spending Analysis */}
          <div className="glass-card" style={{ padding: '1.5rem', height: '380px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Material Spending</h3>
            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(239,68,68,0.05)' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Spent']}
                  />
                  <Bar dataKey="spent" fill="#ef4444" opacity={0.8} radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Order Volume */}
          <div className="glass-card" style={{ padding: '1.5rem', height: '380px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Order Volume</h3>
            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(122,144,120,0.05)' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                    formatter={(val: any) => [val, 'Orders Completed']}
                  />
                  <Bar dataKey="orders" fill="#52525B" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* MONTHLY HISTORY TABLE */}
        <section className="glass-card" style={{ marginTop: '3rem', padding: '1.5rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📊 Detailed Monthly Breakdown
            </h2>
            <button 
              onClick={handleDownloadCSV}
              className="flat-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
            >
              <Download size={16} /> Download CSV
            </button>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="number-col">Revenue</th>
                  <th className="number-col">Sales Profit</th>
                  <th className="number-col">Cash Spent</th>
                  <th className="number-col">Orders</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map(row => (
                  <tr key={row.name}>
                    <td className="font-medium">{row.name}</td>
                    <td className="number-col">₹{Math.round(row.revenue).toLocaleString('en-IN')}</td>
                    <td className="number-col" style={{ color: 'var(--primary-color)', fontWeight: 500 }}>₹{Math.round(row.profit).toLocaleString('en-IN')}</td>
                    <td className="number-col" style={{ color: '#ef4444' }}>₹{Math.round(row.spent).toLocaleString('en-IN')}</td>
                    <td className="number-col">{row.orders}</td>
                  </tr>
                ))}
                {chartData.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No data available for the selected time range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
