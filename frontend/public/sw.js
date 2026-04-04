// ✅ SERVICE WORKER — Kosmica v1
// Cache de assets estáticos → carga instantánea en visitas repetidas
const CACHE = 'kosmica-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalar: pre-cachear shell de la app
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activar: limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network-first para API, Cache-first para assets
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // No interceptar requests al backend/API
  if (url.hostname.includes('kosmica.com.co') && url.pathname.startsWith('/api')) return;
  if (url.hostname !== location.hostname) return;

  // Cache-first para JS/CSS/imágenes (assets con hash)
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'image') {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Network-first para HTML (siempre contenido fresco)
  if (request.destination === 'document') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
  }
});
