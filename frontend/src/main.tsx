import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register SwiftSats Service Worker for lockscreen & background push notifications
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[SwiftSats] ServiceWorker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[SwiftSats] ServiceWorker registration warning:', err);
      });
  });
}
