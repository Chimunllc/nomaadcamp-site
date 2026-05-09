/**
 * NOMAAD Camp, Service Worker
 *
 * Conservative caching strategy:
 *  - HTML (navigation): NETWORK-FIRST  (always fresh, fallback to cache offline)
 *  - Static assets:     CACHE-FIRST    (fast, updated in background)
 *  - 3rd-party APIs:    SKIP           (Mapbox, Google, n8n bypass SW)
 *
 * Rollback: бүх registered SW-уудыг хаахын тулд index.html-аас
 * <script>navigator.serviceWorker.register('/sw.js')</script> хэсгийг арилгана.
 */

const CACHE_VERSION = 'nomaad-v1.9.2-nda-shorter';
const STATIC_CACHE  = `nomaad-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `nomaad-runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/style.css',
  '/main.js',
  '/nomaad-logo.svg',
  '/nomaad-logo-light.svg',
  '/favicon.svg',
  '/images/hero/hero-01.jpg',
  '/images/icons/icon-192.png',
  '/images/icons/icon-512.png'
];

// ─── INSTALL: pre-cache critical assets ─────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: clean up old cache versions ──────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('nomaad-') && !k.endsWith(CACHE_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── FETCH: route by request type ───────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Skip non-GET, non-http(s)
  if (req.method !== 'GET') return;
  if (!req.url.startsWith('http')) return;

  const url = new URL(req.url);

  // Skip cross-origin (Mapbox, Google Analytics, fonts.googleapis, n8n, etc.)
  if (url.origin !== self.location.origin) return;

  // Skip Netlify functions / API endpoints if any
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return;

  // ── HTML / Navigation: network-first (always fresh) ────────
  const accept = req.headers.get('accept') || '';
  if (req.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          // Save successful response to cache for offline fallback
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // ── Static assets: cache-first (fast, update in background) ──
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Stale-while-revalidate: update cache in background
        fetch(req)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
            }
          })
          .catch(() => {});
        return cached;
      }
      // Not in cache, fetch and store
      return fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
          }
          return response;
        })
        .catch(() => caches.match('/'));
    })
  );
});

// ─── MESSAGE: external "skip waiting" support ───────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
