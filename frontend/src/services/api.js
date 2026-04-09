// ============================================================
//  src/services/api.js — Kosmica con MercadoPago
//  ✅ v3: caché + retry automático + timeout generoso
//  ✅ v4: + reviewAPI (sistema de reseñas de productos)
// ============================================================
import axios from 'axios';

// En desarrollo: CRA proxy reenvía /api → localhost:8080
// En producción: REACT_APP_API_URL viene de Render (ej: https://kosmica-backend.onrender.com)
// Protección: si por algún motivo viene sin protocolo, lo agregamos
let API_URL = process.env.REACT_APP_API_URL || "";
if (API_URL && !API_URL.startsWith("http")) {
  API_URL = "https://" + API_URL;
}

const api = axios.create({
  baseURL: `${API_URL}/api`,
  // ✅ 55s: suficiente para que Render despierte desde el primer intento
  timeout: 55000,
  headers: { 'Content-Type': 'application/json' },
});

// ✅ RETRY AUTOMÁTICO: si falla por timeout, intenta una vez más
api.interceptors.response.use(
  r => r,
  async err => {
    const config = err.config;
    // Solo reintenta en timeout/red, máximo 1 vez, solo GET
    if (
      !config._retried &&
      config.method === 'get' &&
      (err.code === 'ECONNABORTED' || !err.response)
    ) {
      config._retried = true;
      return api(config);
    }
    const msg = err.response?.data?.error
      || err.response?.data?.message
      || err.message
      || 'Error de conexión';
    return Promise.reject(new Error(msg));
  }
);

// ✅ CACHÉ EN MEMORIA: segunda visita a la misma categoría carga instantáneo
const cache = new Map();
const CACHE_TTL = 90_000; // 90 segundos

function cached(key, fetcher) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.time < CACHE_TTL) return Promise.resolve(entry.data);
  return fetcher().then(data => {
    cache.set(key, { data, time: Date.now() });
    return data;
  });
}

// ── Productos ─────────────────────────────────────────────
export const productAPI = {
  getAll:        ()               => api.get('/products').then(r => r.data),
  getByCategory: (cat, p=0, s=50) =>
    // Sin caché — siempre trae datos frescos del servidor para ver cambios del admin
    api.get(`/products?category=${cat}&page=${p}&size=${s}`).then(r => r.data),
  getFeatured:   () => api.get('/products/featured').then(r => r.data),
  search:        (q, p=0, s=50)   => api.get(`/products/search?q=${encodeURIComponent(q)}&page=${p}&size=${s}`).then(r => r.data),
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
  getAll:        (p=0, s=20)  => api.get(`/orders?page=${p}&size=${s}`).then(r => r.data).then(d => Array.isArray(d) ? d : (d.content || [])),
  updateStatus:  (id, status) => api.patch(`/orders/${id}/status`, { status }).then(r => r.data),
};

// ── Referidos "Invita y Gana" ─────────────────────────────
export const referralAPI = {
  /** Registrarse y obtener código (crea si no existe) */
  register:     (name, email, phone = "")  => api.post('/referrals/register', { name, email, phone }).then(r => r.data),
  /** Consultar código activo de un usuario ya registrado */
  getMyCode:    (email)              => api.get(`/referrals/my-code/${encodeURIComponent(email)}`).then(r => r.data),
  /** Validar si un código puede ser usado por el receptor */
  validate:     (code, redeemerEmail)=> api.get(`/referrals/validate/${code}?redeemerEmail=${encodeURIComponent(redeemerEmail)}`).then(r => r.data),
  /** Historial de uso del código de un usuario */
  history:      (email)              => api.get(`/referrals/history/${encodeURIComponent(email)}`).then(r => r.data),
};

// ── ✅ NUEVO: Reseñas de productos ────────────────────────
export const reviewAPI = {
  /**
   * Obtener reseñas paginadas de un producto
   * @param {number} productId
   * @param {number} page  - página (default 0)
   * @param {number} size  - tamaño (default 10)
   */
  getByProduct: (productId, page = 0, size = 10) =>
    api.get(`/products/${productId}/reviews?page=${page}&size=${size}`).then(r => r.data),

  /**
   * Obtener estadísticas: promedio y distribución de estrellas
   * @param {number} productId
   */
  getStats: (productId) =>
    api.get(`/products/${productId}/reviews/stats`).then(r => r.data),

  /**
   * Crear una reseña para un producto
   * @param {number} productId
   * @param {{ userName, userEmail, rating, comment }} data
   */
  create: (productId, data) =>
    api.post(`/products/${productId}/reviews`, data).then(r => r.data),

  /**
   * Eliminar reseña (admin)
   */
  delete: (productId, reviewId) =>
    api.delete(`/products/${productId}/reviews/${reviewId}`),

  /**
   * Moderar reseña (admin)
   */
  moderate: (productId, reviewId, approved) =>
    api.patch(`/products/${productId}/reviews/${reviewId}/moderate`, { approved }).then(r => r.data),
};

export default api;

// ── Cloudinary: optimización automática de imágenes ──────
// w_   → ancho exacto que necesita la UI (evita descargar imágenes gigantes)
// q_auto → Cloudinary elige la calidad óptima automáticamente
// f_auto → entrega WebP en Chrome/Android, AVIF donde se soporta, JPEG como fallback
// dpr_auto → adapta resolución a pantallas Retina sin código extra
export function imgUrl(url, width = 400) {
  if (!url) return url;
  if (!url.includes('cloudinary.com')) return url;
  // Evitar doble transformación si ya tiene parámetros
  if (url.includes('/upload/w_')) return url;
  return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto,dpr_auto/`);
}

// Variante para tarjetas pequeñas (lista de productos)
export function imgThumb(url) { return imgUrl(url, 400); }

// Variante para modal/detalle de producto (imagen grande)
export function imgFull(url)  { return imgUrl(url, 900); }

// Variante para miniaturas del carrito
export function imgCart(url)  { return imgUrl(url, 120); }
