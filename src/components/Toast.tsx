import { createRoot } from 'react-dom/client';
import { Package } from 'lucide-react';

export const showToast = (message: string) => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const root = createRoot(div);
  
  root.render(
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: '#059669',
      color: 'white',
      padding: '1rem 1.5rem',
      borderRadius: '8px',
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      fontWeight: 500,
      transition: 'opacity 0.3s ease-in-out',
      animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <Package size={20} />
      {message}
    </div>
  );

  setTimeout(() => {
    root.unmount();
    div.remove();
  }, 5000);
};
