const CACHE_NAME = 'walkie-translator-v3';
const CORE_ASSETS = [
  './index.html',
  './style.css',
  './data.js',
  './app.js',
  './manifest.json',
  './icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Never intercept the Gemini API — always go straight to the network.
  if (event.request.url.includes('generativelanguage.googleapis.com')) return;

  // App shell files change every time you update the app, so they need
  // network-first treatment (like index.html did before) — otherwise you
  // could get a fresh index.html paired with a stale cached app.js/style.css,
  // which causes confusing mismatched-version bugs.
  const isAppShell =
    event.request.mode === 'navigate' ||
    event.request.url.endsWith('index.html') ||
    event.request.url.endsWith('style.css') ||
    event.request.url.endsWith('data.js') ||
    event.request.url.endsWith('app.js') ||
    event.request.url.endsWith('/');

  if (isAppShell) {
    // Network-first: always try to fetch the latest version first, so
    // updates you upload to GitHub show up right away. Only fall back to
    // the cached copy if there's no internet.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (icons, manifest) since they rarely change.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
