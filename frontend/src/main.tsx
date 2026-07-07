import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ── PWA: 注册 Service Worker ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {/* service worker registration failure is non-critical */});
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
