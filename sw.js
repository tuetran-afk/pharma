const CACHE = 'theodoi-hd-v1';
const STATIC = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Chỉ xử lý đúng scope /pharma/ — không can thiệp vào subfolder như /pharma/hsduthau/
  const isOwnScope = url.pathname === '/pharma/' || url.pathname === '/pharma/index.html';
  if (!isOwnScope && url.pathname.startsWith('/pharma/') && !url.hostname.includes('cdnjs')) {
    return; // Để browser tự xử lý, không intercept
  }

  const isIndex = isOwnScope;

  if (isIndex) {
    // index.html: network trước, cache làm fallback offline
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('/pharma/index.html'))
    );
    return;
  }

  // CDN scripts: cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (e.request.url.includes('cdnjs.cloudflare.com')) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('/pharma/index.html');
      });
    })
  );
});
