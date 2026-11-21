// Offline support for the home-screen app. The page is network-first so updates arrive as soon as she's online.
const CACHE = 'tpt-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const keep = (req, res) => { if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Fonts never change, so serve them from the cache once fetched.
  if (/fonts\.(googleapis|gstatic)\.com/.test(req.url)) { e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => keep(req, res)))); return; }
  if (new URL(req.url).origin !== location.origin) return;
  // Launches revalidate the page with the server so a new build shows up straight away.
  if (req.mode === 'navigate') { e.respondWith(fetch(req.url, { cache: 'no-cache' }).then(res => keep(req, res)).catch(() => caches.match('./index.html'))); return; }
  e.respondWith(fetch(req).then(res => keep(req, res)).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'))));
});
