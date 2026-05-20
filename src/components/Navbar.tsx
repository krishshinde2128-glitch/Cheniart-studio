import { useNavigate, useLocation } from 'react-router-dom';
import { Flower2 } from 'lucide-react';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { name: 'Home', path: '/' },
    { name: 'Inventory', path: '/inventory' },
    { name: 'Quote', path: '/calculator' },
    { name: 'Orders', path: '/history' },
    { name: 'Expenses', path: '/expenses' },
    { name: 'Live Stock', path: '/stock' },
    { name: 'Analytics', path: '/analytics' }
  ];

  return (
    <nav 
      style={{
        position: 'fixed',
        top: '1.5rem', // top-6
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100, // Increased to 100 to prevent dashboard-header (z-index 50) from obscuring it
        backgroundColor: 'rgba(255, 255, 255, 0.35)', // bg-white/35 for true transparency
        backdropFilter: 'blur(16px)', // backdrop-blur-lg
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.4)', // border-white/40
        borderRadius: '9999px', // rounded-full
        padding: '0.75rem 2rem', // py-3 px-8
        display: 'flex',
        alignItems: 'center',
        width: 'max-content', // w-max
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' // shadow-md
      }}
    >
      {/* Left Section: Studio Brand with Divider */}
      <div 
        onClick={() => navigate('/')}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          cursor: 'pointer',
          color: '#1e293b', // text-slate-800
          borderRight: '1px solid #cbd5e1', // border-r border-slate-300
          paddingRight: '1.5rem', // pr-6
          marginRight: '1.5rem' // mr-6
        }}
        title="Go to Dashboard"
      >
        <Flower2 size={20} strokeWidth={2} color="#1e293b" />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ 
            fontSize: '0.75rem', // text-xs
            fontFamily: '"Inter", "Nunito", "Montserrat", sans-serif', 
            letterSpacing: '0.1em', // tracking-widest
            fontWeight: 700, // font-bold
            color: '#1e293b', // text-slate-800
            textTransform: 'uppercase'
          }}>
            CHENIART
          </span>
          <span style={{ 
            fontSize: '0.75rem', 
            fontFamily: '"Inter", "Nunito", "Montserrat", sans-serif', 
            letterSpacing: '0.1em', 
            fontWeight: 700, 
            color: '#1e293b',
            textTransform: 'uppercase'
          }}>
            STUDIO
          </span>
        </div>
      </div>

      {/* Right Section: Navigation Links */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.name}
              onClick={() => navigate(tab.path)}
              style={{
                backgroundColor: 'transparent',
                // text-emerald-700 if active, text-slate-500 if inactive
                color: isActive ? '#047857' : '#64748b', 
                border: 'none',
                padding: '0', 
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 500, // font-semibold if active, font-medium if inactive
                fontSize: '0.875rem', // text-sm
                fontFamily: '"Inter", "Nunito", sans-serif',
                transition: 'color 0.2s ease', // transition-colors
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  // hover:text-slate-800
                  e.currentTarget.style.color = '#1e293b'; 
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  // Back to text-slate-500
                  e.currentTarget.style.color = '#64748b'; 
                }
              }}
            >
              {tab.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
