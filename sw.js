// ALT Stock — app keeper
// Iska ek hi kaam hai: app ko Android par asli "installed app" banana.
// Iske bina Android sirf ek shortcut banata hai, aur shortcut browser ka
// data saaf hote hi gayab ho jaata hai.
//
// Ye kabhi purana version nahi dikhata: har cheez pehle net se maangi
// jaati hai. Cache sirf tab kaam aata hai jab net bilkul na ho.
// -----------------------------------------------------------------------
var CACHE = 'alt-offline-v1';

self.addEventListener('install', function (e) { self.skipWaiting() });

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) { return k === CACHE ? null : caches.delete(k) }));
    }).then(function () { return self.clients.claim() })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (req.url.indexOf('http') !== 0) return;
  // Firebase aur baaki API kabhi cache nahi -- wo hamesha taaza chahiye.
  if (/firebaseio|googleapis|google\.com|gstatic/.test(req.url)) return;

  e.respondWith(
    fetch(req).then(function (res) {
      try {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy) }).catch(function () {});
        }
      } catch (_) {}
      return res;
    }).catch(function () {
      // Net nahi hai -- jo aakhri baar mila tha wahi de do.
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./');
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});
