// MediKiosk Progressive Web App Service Worker (v2.0.0)
const CACHE_NAME = 'medikiosk-cache-v2';

const STATIC_ASSETS = [
  '/',
  '/kiosk',
  '/kiosk/emergency',
  '/patient/login',
  '/patient/register',
  '/offline.html',
  '/manifest.json',
  '/css/style.css',
  '/js/kioskApp.js',
  '/js/seniorMode.js',
  '/js/offlineSync.js',
  '/uploads/new_logo.png',
  '/uploads/logo.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js'
];

// Install Event — Pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Pre-cache item failed:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event — Clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event — Network first for HTML / API navigation, cache fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET requests or browser-extension schemes
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // API calls & authentication endpoints: network only with offline JSON error fallback
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/auth') || url.pathname.includes('/chat')) {
    event.respondWith(
      fetch(req).catch(() => {
        return new Response(JSON.stringify({ 
          success: false, 
          offline: true,
          error: 'Offline mode active. Your request will automatically sync once connection is restored.' 
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Static Assets (CSS, JS, Fonts, Images): Stale-While-Revalidate
  if (
    req.destination === 'style' ||
    req.destination === 'script' ||
    req.destination === 'image' ||
    req.destination === 'font'
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // HTML Page Navigation: Network First with Robust Offline Fallback
  if (req.mode === 'navigate' || req.destination === 'document' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // 1. Try matching the exact requested URL from cache
          const cachedResponse = await caches.match(req);
          if (cachedResponse) {
            return cachedResponse;
          }
          // 2. Try offline dedicated emergency & fallback page
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) {
            return offlinePage;
          }
          // 3. Try kiosk home fallback
          const kioskFallback = await caches.match('/kiosk');
          if (kioskFallback) {
            return kioskFallback;
          }
          // 4. Last resort inline HTML
          return new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline — MediKiosk</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"></head><body class="bg-light p-4 text-center"><div class="card p-4 mx-auto" style="max-width:440px"><h4 class="text-danger mb-2">MediKiosk Offline</h4><p class="text-muted small">You are currently offline. Emergency services are available at <strong>108</strong>.</p><a href="tel:108" class="btn btn-danger btn-sm mb-2">Call 108 Ambulance</a><button onclick="window.location.reload()" class="btn btn-primary btn-sm">Retry Connection</button></div></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Default Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      return cachedResponse || fetch(req).catch(() => caches.match('/offline.html'));
    })
  );
});
