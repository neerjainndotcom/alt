// ALT Stock — app keeper
// Iska ek hi kaam hai: app ko Android par asli "installed app" banana.
// Iske bina Android sirf ek shortcut banata hai, aur shortcut browser ka
// data saaf hote hi gayab ho jaata hai.
//
// Ye kabhi purana version nahi dikhata: har cheez pehle net se maangi
// jaati hai. Cache sirf tab kaam aata hai jab net bilkul na ho.
//
// 2026-10-05 -- ek badi galti theek ki: app hamesha "?_cb=<time>" lagakar
// khulti hai, aur cache ki chaabi me query bhi ginti thi. Isliye HAR
// version ek nayi 2 MB copy cache me daal deta tha, aur wo copies kabhi
// hatti nahi thi. Browser ki jagah bhar jaati thi -- aur jagah bharne par
// browser poora data uda deta hai (logout, aadha safed screen, jaam).
// Ab chaabi se query hata di gayi hai: ek hi copy rehti hai. Cache ka naam
// bhi badla hai, isliye purana bhara hua cache apne aap hat jaata hai.
// -----------------------------------------------------------------------
var CACHE = 'alt-offline-v2';

// Cache ki chaabi -- query ke bina. "index.html?_cb=123" aur
// "index.html?_cb=456" dono ek hi chaabi par jaate hain.
function keyOf(req) {
  try {
    var u = new URL(req.url);
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch (_) { return req.url }
}

self.addEventListener('install', function (e) { self.skipWaiting() });

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      // Purane naam ke saare cache hata do -- yahi purani jama-khori saaf karta hai.
      return Promise.all(ks.map(function (k) { return k === CACHE ? null : caches.delete(k) }));
    }).then(function () {
      // Naye cache me bhi agar query wali chaabiyan reh gayi hon to hata do.
      return caches.open(CACHE).then(function (c) {
        return c.keys().then(function (rs) {
          return Promise.all(rs.map(function (r) {
            return r.url.indexOf('?') >= 0 ? c.delete(r) : null;
          }));
        });
      }).catch(function () {});
    }).then(function () { return self.clients.claim() })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (req.url.indexOf('http') !== 0) return;
  // Firebase aur baaki API kabhi cache nahi -- wo hamesha taaza chahiye.
  if (/firebaseio|googleapis|google\.com|gstatic/.test(req.url)) return;

  var key = keyOf(req);

  e.respondWith(
    fetch(req).then(function (res) {
      try {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(key, copy) }).catch(function () {});
        }
      } catch (_) {}
      return res;
    }).catch(function () {
      // Net nahi hai -- jo aakhri baar mila tha wahi de do.
      return caches.match(key).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') {
          var base = new URL('./index.html', req.url).toString();
          return caches.match(base).then(function (h2) {
            return h2 || caches.match(new URL('./', req.url).toString()).then(function (h3) {
              return h3 || new Response('', { status: 504, statusText: 'offline' });
            });
          });
        }
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});
