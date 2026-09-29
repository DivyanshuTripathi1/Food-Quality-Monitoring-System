import React from 'react';
import { useApp } from '../context/AppContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠️',
    info: 'ℹ'
  };

  return (
    <div id="toastContainer" className="toast-container" aria-live="polite">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast toast-${t.type} ${t.show ? 'toast-show' : ''}`}
        >
          <span className="toast-icon">{iconMap[t.type] || 'ℹ'}</span>
          <span className="toast-msg">{t.message}</span>
          <button className="toast-close" onClick={() => removeToast(t.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
