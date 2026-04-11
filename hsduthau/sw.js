// Service Worker - Theo dõi Gói Thầu PWA
const CACHE_NAME = 'goi-thau-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// Install: cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('SW: Some assets failed to cache', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for local, network-first for cloud API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Apps Script API — always network, no cache
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(fetch(event.request).catch(() =>
      new Response(JSON.stringify({ status: 'error', message: 'Offline - không có kết nối mạng' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    ));
    return;
  }

  // CDN libraries — cache-first
  if (url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        }).catch(() => cached || new Response('', { status: 503 }));
      })
    );
    return;
  }

  // Local files — cache-first, fallback to network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
