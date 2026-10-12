// SwiftSats Service Worker for PWA, Lockscreen Push & Background Notifications
const CACHE_NAME = 'swiftsats-pwa-v2';
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/favicon.png',
  '/logo192.png',
  '/logo512.png',
  '/apple-touch-icon.png',
  '/logo-emblem.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SwiftSats SW] Precache non-fatal warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Network-first navigation for instant live updates
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass API and WebSocket calls
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws') || request.method !== 'GET') {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const toCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, toCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});

// 🔔 Native Lockscreen Push Notification Handler (APNs / FCM / WebPush)
self.addEventListener('push', (event) => {
  let data = {
    title: '⚡ SwiftSats Alert',
    body: 'New transaction or payment activity on SwiftSats.',
    icon: '/logo192.png',
    badge: '/apple-touch-icon.png',
    data: { url: '/admin/orders' },
    tag: 'swiftsats-alert',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.message || payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: { url: payload.url || payload.link_url || '/admin/orders' },
        tag: payload.tag || 'swiftsats-alert',
      };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [250, 100, 250, 100, 250],
    data: data.data,
    tag: data.tag || 'swiftsats-push',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 👆 Notification Click Handler - Focuses or opens the relevant order view
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin/orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
