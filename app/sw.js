// Precaching service worker. Bump CACHE_VERSION on every deploy so clients
// pick up new content; old caches are cleared on activate.

const CACHE_VERSION = 'pmtrainer-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/tts.js',
  './js/engine/rng.js',
  './js/engine/storage.js',
  './js/engine/mastery.js',
  './js/engine/scheduler.js',
  './js/engine/check.js',
  './js/engine/progress.js',
  './js/ui/core.js',
  './js/ui/components.js',
  './js/ui/today.js',
  './js/ui/map.js',
  './js/ui/session.js',
  './js/ui/parent.js',
  './js/qa/tutor.js',
  './js/content/gen.js',
  './js/content/vis.js',
  './js/content/index.js',
  './js/content/c5a.js',
  './js/content/c5b.js',
  './js/content/c5c.js',
  './js/content/diagnostic.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // API calls etc. go straight to the network

  // Navigations: try the network (so updates arrive), fall back to cache offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Everything else: cache first, then network (updating the cache as we go).
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
          }
          return res;
        }),
    ),
  );
});
