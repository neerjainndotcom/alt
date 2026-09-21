/* ALT — offline keeper.
   Online it does nothing you would notice: the network is always tried
   first, so a new version is picked up the moment it is deployed. With no
   network it serves the last good copy of the app, so the shop can keep
   working on what is already on the device. */
const CACHE = 'alt-shell-v1';
const APP = 'app-shell';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url) } catch (_) { return }

  // Someone else's server (Firebase, Google) — leave it alone, except the
  // script libraries, which are kept so a bill PDF still prints offline.
  if (url.origin !== self.location.origin) {
    if (/^(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.gstatic\.com|fonts\.googleapis\.com)$/.test(url.host)) {
      e.respondWith((async () => {
        const c = await caches.open(CACHE);
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        try { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()) } catch (_) {}
        return res;
      })());
    }
    return;
  }

  // The app itself: network first, last good copy as the fallback.
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const isPage = req.mode === 'navigate' || /(\/|\.html)$/.test(url.pathname);
        const c = await caches.open(CACHE);
        try { c.put(isPage ? APP : req, res.clone()) } catch (_) {}
      }
      return res;
    } catch (err) {
      const c = await caches.open(CACHE);
      const hit = (await c.match(req)) || (await c.match(APP));
      if (hit) return hit;
      throw err;
    }
  })());
});
