
// ── Linn County EMS Protocols — Service Worker ───────────────
// Bump CACHE_VERSION any time you deploy updated files so users
// get fresh content on next visit.
const CACHE_VERSION = 'linn-ems-v7';

const APP_ASSETS = [
  './',
  './index.html',
  './quiz.html',
  './airway-academy.html',
  './styles.css',
  './data.js',
  './app.js'
];

// Google Fonts CSS + the font files themselves are cached
// separately using a stale-while-revalidate strategy.
const FONT_HOST = 'https://fonts.gstatic.com';
// Match the stylesheet host, not one exact URL — the protocol app and the
// Airway & RSI Academy each request a different css2 family list.
const FONT_CSS_HOST = 'https://fonts.googleapis.com';
const FONTS_CACHE = 'linn-ems-fonts-v1';

// ── INSTALL: pre-cache all local app files ────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: delete old caches, claim clients ────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION && k !== FONTS_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first for app files, stale-while-revalidate
//          for fonts, network-first for everything else ────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (url.startsWith('chrome-extension://')) return;

  // Font files (gstatic) — cache-first, very long TTL
  if (url.startsWith(FONT_HOST) || url.startsWith(FONT_CSS_HOST)) {
    event.respondWith(
      caches.open(FONTS_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          const networkFetch = fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // App assets — cache-first, then update cache in background
  if (APP_ASSETS.some(a => url.endsWith(a.replace('./', '')) || url.endsWith('/'))) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(cache =>
        cache.match(event.request).then(cached => {
          const networkFetch = fetch(event.request)
            .then(response => {
              if (response.ok) cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => cached); // offline fallback
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Everything else — network with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
