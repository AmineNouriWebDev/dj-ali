/* Service Worker for DJ Ali PWA */
const CACHE_NAME = 'dj-ali-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/assets/favicon-32.png',
  '/assets/favicon-180.png',
  '/assets/favicon-500.png',
  '/assets/icon-192.png',
  '/assets/icon-192-maskable.png',
  '/assets/icon-512.png',
  '/assets/icon-512-maskable.png',
  '/assets/hero-bg.jpg',
  '/assets/hero-bg-mobile.jpg',
  '/assets/dj-ali-portrait.jpg'
];

// Install: precache essential offline assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clear old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: smart caching strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET requests (e.g. form submissions to webhook)
  if (req.method !== 'GET') {
    return;
  }

  // Skip analytics, tag manager, and external third-party requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigation requests (HTML): Network first, falling back to cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // Static assets (same origin): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {/* Ignore network errors for background revalidation */});

      return cachedResponse || fetchPromise;
    })
  );
});
