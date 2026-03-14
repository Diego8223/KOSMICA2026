// ============================================================
//  src/services/api.js  — LuxShop v2
//  Todas las llamadas al backend Java van aquí
// ============================================================
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  r => r,
  err => {
    const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error de conexión';
    return Promise.reject(new Error(msg));
  }
);

// ── Productos ─────────────────────────────────────────────
export const productAPI = {
  getAll:        ()             => api.get('/products').then(r => r.data),
  getByCategory: (cat,p=0,s=12)=> api.get(`/products?category=${cat}&page=${p}&size=${s}`).then(r=>r.data),
  getFeatured:   ()             => api.get('/products/featured').then(r=>r.data),
  search:        (q,p=0,s=12)  => api.get(`/products/search?q=${encodeURIComponent(q)}&page=${p}&size=${s}`).then(r=>r.data),
  getById:       (id)           => api.get(`/products/${id}`).then(r=>r.data),
  create:        (data)         => api.post('/products', data).then(r=>r.data),
  update:        (id,data)      => api.put(`/products/${id}`, data).then(r=>r.data),
  delete:        (id)           => api.delete(`/products/${id}`),

  uploadImage: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/products/upload/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    }).then(r => r.data);
  },

  uploadVideo: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/products/upload/video', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    }).then(r => r.data);
  },
};

// ── Pedidos ───────────────────────────────────────────────
export const orderAPI = {
  createPaymentIntent: (amount, currency='usd') =>
    api.post('/orders/payment-intent', { amount, currency }).then(r=>r.data),
  createOrder:  (data)      => api.post('/orders', data).then(r=>r.data),
  getByNumber:  (number)    => api.get(`/orders/${number}`).then(r=>r.data),
  getByCustomer:(email)     => api.get(`/orders/customer/${email}`).then(r=>r.data),
  getAll:       (p=0,s=20)  => api.get(`/orders?page=${p}&size=${s}`).then(r=>r.data),
  updateStatus: (id,status) => api.patch(`/orders/${id}/status`, { status }).then(r=>r.data),
};

export default api;
