// ✅ SERVICE WORKER — Kosmica v3
// Auto-actualización inmediata + cache inteligente + push notifications

const CACHE_VERSION = 'kosmica-v3';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const IMAGE_CACHE   = `${CACHE_VERSION}-images`;
const ALL_CACHES    = [STATIC_CACHE, IMAGE_CACHE];

const PRECACHE_URLS = ['/', '/index.html', '/manifest.json'];

// ── INSTALAR: pre-cachear shell + forzar activación inmediata ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(c => c.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // ← activa de inmediato, sin esperar que cierren pestañas
  );
});

// ── ACTIVAR: borrar TODOS los caches viejos y tomar control ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !ALL_CACHES.includes(k)) // elimina cualquier versión anterior
          .map(k => {
            console.log('[SW] Eliminando cache viejo:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim()) // ← toma control de todas las pestañas abiertas
      .then(() => {
        // Notifica a todos los clientes que hay nueva versión
        self.clients.matchAll().then(clients =>
          clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }))
        );
      })
  );
});

// ── FETCH: estrategia por tipo de recurso ──
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // 1. Ignorar requests al backend/API — nunca cachear
  if (url.pathname.startsWith('/api')) return;

  // 2. Ignorar recursos externos (analytics, pixels, fonts de Google)
  if (url.hostname !== location.hostname &&
      !url.hostname.includes('cloudinary.com')) return;

  // 3. IMÁGENES de Cloudinary → Cache-first con expiración 7 días
  if (url.hostname.includes('cloudinary.com') ||
      request.destination === 'image') {
    e.respondWith(cacheFirstWithExpiry(request, IMAGE_CACHE, 7 * 24 * 60 * 60 * 1000));
    return;
  }

  // 4. JS / CSS / íconos → Stale-while-revalidate
  //    Responde con cache inmediato y actualiza en segundo plano
  if (request.destination === 'script' ||
      request.destination === 'style'  ||
      request.destination === 'font') {
    e.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // 5. HTML → Network-first: siempre intenta traer versión fresca
  //    Si no hay red, cae al cache
  if (request.destination === 'document') {
    e.respondWith(
      fetch(request)
        .then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(STATIC_CACHE).then(c => c.put(request, clone));
          }
          return resp;
        })
        .catch(() => caches.match('/index.html'))
    );
  }
});

// ── Stale-While-Revalidate ──
// Responde con lo cacheado (rápido) y actualiza en segundo plano
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(resp => {
    if (resp.ok) cache.put(request, resp.clone());
    return resp;
  }).catch(() => null);

  return cached || fetchPromise;
}

// ── Cache-first con expiración por tiempo ──
// Para imágenes: sirve del cache si no expiró, si no trae de red
async function cacheFirstWithExpiry(request, cacheName, maxAge) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const dateHeader = cached.headers.get('date');
    if (dateHeader) {
      const age = Date.now() - new Date(dateHeader).getTime();
      if (age < maxAge) return cached; // fresco → servir del cache
    } else {
      return cached; // sin fecha → confiar en el cache
    }
  }

  // Sin cache o expirado → traer de red y cachear
  try {
    const resp = await fetch(request);
    if (resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch {
    return cached || new Response('', { status: 408 });
  }
}

// ── PUSH NOTIFICATIONS ──
// Muestra la notificación cuando llega un push del servidor
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || '¡Kosmica tiene algo para ti! 💜';
  const options = {
    body:  data.body  || 'Entra a ver las últimas novedades ✨',
    icon:  '/icon-192.png',
    badge: '/icon-192.png',
    data:  { url: data.url || '/' },
    actions: [
      { action: 'open',    title: 'Ver ahora' },
      { action: 'dismiss', title: 'Después' },
    ],
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Al hacer clic en la notificación — abrir la app ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});
