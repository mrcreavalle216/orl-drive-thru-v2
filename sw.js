// ─── Service Worker: ORL Drive Thru v2 ──────────────────────
// Cache-first for static assets, network-only for API calls
// Bump CACHE_VERSION to bust the cache on deploy

const CACHE_VERSION = 'orl-v2-2026-08-04';

const PRECACHE_URLS = [
  '/',
  '/styles.css',
  '/app.js',
  '/agents.js',
  '/charts.js',
  '/chat-widget.js',
  '/particles.js',
  '/tour.js',
  '/pdf-gen.js',
  '/images/logo.png',
  '/images/stella.png',
  '/images/iris.png',
  '/images/nora.png',
  '/images/sage.png',
  '/images/paige.png',
  '/images/knox.png',
  '/images/atlas.png',
  '/images/maven.png'
];

// Install: precache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(PRECACHE_URLS))
    .then(() => self.skipWaiting())
  );
});

// Activate: purge old cache versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static, network-only for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache API calls or POST requests
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    return;
  }

  // Never cache external resources (CDN scripts handle their own caching)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Cache-first, falling back to network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
