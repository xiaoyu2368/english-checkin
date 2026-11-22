/* 打卡页离线缓存：导航走 network-first（保证更新），静态资源 cache-first（保证离线） */
const CACHE = 'checkin-pwa-v1';
const CORE = ['./', './index.html', './manifest.json', './manifest.webmanifest',
              './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    for (const u of CORE) { try { await c.add(u); } catch (_) {} }
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        if (!r.ok) return caches.match('./index.html').then(hit => hit || r);
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put('./index.html', cp));
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(resp => {
      if (resp.ok && new URL(req.url).origin === self.location.origin) {
        const cp = resp.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
      }
      return resp;
    }).catch(() => caches.match(req)))
  );
});
