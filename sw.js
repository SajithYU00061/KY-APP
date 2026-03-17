// KY活動表 Service Worker — v1
// Caches all assets for full offline use on iPhone & Android

const CACHE_NAME = 'ky-app-v1';
const ASSETS = [
  './',
  './index.html',
  './app.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700;800;900&family=Noto+Sans+JP:wght@400;500;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Install: cache everything
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(() => {
        // If external resources fail (offline install), cache what we can
        return cache.addAll(['./index.html', './app.html', './manifest.json']);
      }))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first strategy (offline-first)
self.addEventListener('fetch', event => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension')) return;

  // For Google Sheets API calls — network only (needs internet)
  if (event.request.url.includes('script.google.com') ||
      event.request.url.includes('sheets.googleapis.com')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // For fonts and CDN — stale-while-revalidate
  if (event.request.url.includes('googleapis.com') ||
      event.request.url.includes('cloudflare.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  // Everything else — cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Background sync for queued submissions (when back online)
self.addEventListener('sync', event => {
  if (event.tag === 'ky-sync') {
    event.waitUntil(syncPendingSubmissions());
  }
});

async function syncPendingSubmissions() {
  // Notify all clients to flush their pending queue
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_REQUESTED' }));
}
