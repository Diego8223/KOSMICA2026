// ============================================================
//  src/services/api.js — Kosmica con MercadoPago
//  ✅ OPTIMIZADO: wake-up automático + retry + caché
// ============================================================
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  // ✅ 60s para el primer request — Render tarda ~30-50s en despertar
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  r => r,
  err => {
    const msg = err.response?.data?.error
      || err.response?.data?.message
      || err.message
      || 'Error de conexión';
    return Promise.reject(new Error(msg));
  }
);

// ✅ CACHÉ EN MEMORIA — segunda visita a la misma categoría carga instantáneo
const cache = new Map();
const CACHE_TTL = 60_000;

function cached(key, fetcher) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.time < CACHE_TTL) return Promise.resolve(entry.data);
  return fetcher().then(data => {
    cache.set(key, { data, time: Date.now() });
    return data;
  });
}

// ✅ WAKE-UP: despierta el backend en silencio al abrir la página
let wakeUpDone = false;
export async function wakeUpBackend(onStatus) {
  if (wakeUpDone) { onStatus?.('ready'); return; }
  try {
    onStatus?.('waking');
    await axios.get(`${API_URL}/api/health`, { timeout: 65000 });
    wakeUpDone = true;
    onStatus?.('ready');
  } catch {
    wakeUpDone = true;
    onStatus?.('ready');
  }
}

// ── Productos ─────────────────────────────────────────────
export const productAPI = {
  getAll:        ()               => api.get('/products').then(r => r.data),
  getByCategory: (cat, p=0, s=12) =>
    cached(`cat:${cat}:${p}`, () =>
      api.get(`/products?category=${cat}&page=${p}&size=${s}`).then(r => r.data)
    ),
  getFeatured:   ()               => cached('featured', () => api.get('/products/featured').then(r => r.data)),
  search:        (q, p=0, s=12)   => api.get(`/products/search?q=${encodeURIComponent(q)}&page=${p}&size=${s}`).then(r => r.data),
  getById:       (id)             => cached(`prod:${id}`, () => api.get(`/products/${id}`).then(r => r.data)),
  create:        (data)           => { cache.clear(); return api.post('/products', data).then(r => r.data); },
  update:        (id, data)       => { cache.clear(); return api.put(`/products/${id}`, data).then(r => r.data); },
  delete:        (id)             => { cache.clear(); return api.delete(`/products/${id}`); },

  uploadImage: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/products/upload/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / e.total)),
    }).then(r => r.data);
  },

  uploadVideo: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/products/upload/video', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / e.total)),
    }).then(r => r.data);
  },
};

// ── Pedidos con MercadoPago ───────────────────────────────
export const orderAPI = {
  createPaymentIntent: (amount, currency = 'COP', items = null) =>
    api.post('/orders/payment-intent', { amount, currency, items }).then(r => r.data),
  createOrder:   (data)       => api.post('/orders', data).then(r => r.data),
  getByNumber:   (number)     => api.get(`/orders/${number}`).then(r => r.data),
  getByCustomer: (email)      => api.get(`/orders/customer/${email}`).then(r => r.data),
  getAll:        (p=0, s=20)  => api.get(`/orders?page=${p}&size=${s}`).then(r => r.data),
  updateStatus:  (id, status) => api.patch(`/orders/${id}/status`, { status }).then(r => r.data),
};

export default api;
