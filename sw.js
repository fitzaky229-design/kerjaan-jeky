/* Kerjaan Jeky — service worker: menyimpan tampilan aplikasi di HP agar bisa dibuka tanpa sinyal. */
const CACHE = 'kerjaan-jeky-v1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Tampilan aplikasi: pakai salinan di HP dulu (cepat & bisa tanpa sinyal), lalu perbarui diam-diam saat ada sinyal.
   Permintaan ke server Google (data) tidak disentuh. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const kunci = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const simpanan = await cache.match(kunci, { ignoreSearch: req.mode === 'navigate' });
      const ambilBaru = fetch(req).then(res => {
        if (res && res.ok) cache.put(kunci, res.clone());
        return res;
      }).catch(() => null);
      if (simpanan) { e.waitUntil(ambilBaru); return simpanan; }
      const baru = await ambilBaru;
      return baru || new Response('Tidak ada sinyal dan aplikasi belum tersimpan di HP. Buka sekali saat ada sinyal.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })
  );
});
