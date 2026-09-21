// Gloomhollow service worker — caches the game so it launches offline.
// Bump CACHE whenever you upload a new index.html.
const CACHE = 'gloomhollow-v63';
const CORE = ['./', './index.html', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png', './icons/icon-180.png', './icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Fonts: cache-first, fetched once then kept forever.
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(e.request); if (hit) return hit;
      try { const res = await fetch(e.request); if (res.ok) c.put(e.request, res.clone()); return res; }
      catch (err) { return new Response('', { status: 503 }); }
    }));
    return;
  }
  // Game files: network-first so updates land, cache fallback so it works offline.
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html'))));
  }
});
