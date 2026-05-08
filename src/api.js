import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: BASE });

// --- Token refresh queue ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(r => r, async err => {
  const original = err.config;

  if (err.response?.status === 401) {
    // No reintentar el refresh ni el login en sí
    if (original.url?.includes('/auth/')) {
      localStorage.removeItem('token');
      window.location.href = '/';
      return Promise.reject(err);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
        .then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${BASE}/auth/refresh`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newToken = res.data.token;
      localStorage.setItem('token', newToken);
      api.defaults.headers.Authorization = `Bearer ${newToken}`;
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      localStorage.removeItem('token');
      window.location.href = '/';
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }

  return Promise.reject(err);
});

// Extrae el mensaje de error legible de cualquier respuesta de Axios
export const getErrorMsg = (err) => {
  if (!err.response) return 'Sin conexión con el servidor';
  const data = err.response.data;
  if (typeof data === 'string' && data.length < 200) return data;
  return data?.error || data?.message || `Error ${err.response.status}`;
};

export const authApi = {
  login: (usuario, password) =>
    axios.post(`${BASE}/auth/login`, { usuario, password }).then(r => {
      localStorage.setItem('token', r.data.token);
      return r.data;
    }),
  logout: () => localStorage.removeItem('token'),
  isLoggedIn: () => !!localStorage.getItem('token'),
  // Renueva el token si le quedan menos de 3 días de vida
  refreshIfNeeded: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const secsLeft = payload.exp - Date.now() / 1000;
      if (secsLeft > 3 * 24 * 3600) return; // todavía fresco
      const res = await axios.post(`${BASE}/auth/refresh`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      localStorage.setItem('token', res.data.token);
    } catch {
      // Si falla el refresh silencioso no cerramos sesión, el interceptor lo hará si llega un 401
    }
  },
};

export const localesApi = {
  getAll: () => api.get('/locales').then(r => r.data),
  create: (nombre, icon) => api.post('/locales', { nombre, icon }).then(r => r.data),
  update: (id, nombre, icon) => api.put(`/locales/${id}`, { nombre, icon }),
  delete: (id) => api.delete(`/locales/${id}`),
};

export const rubrosApi = {
  getAll: () => api.get('/rubros').then(r => r.data),
  create: (localId, nombre) => api.post('/rubros', { nombre, local_id: localId }).then(r => r.data),
  update: (id, nombre, icon) => api.put(`/rubros/${id}`, { nombre, icon }),
  delete: (id) => api.delete(`/rubros/${id}`),
  getImportConfig: (id) => api.get(`/rubros/${id}/import-config`).then(r => r.data),
  saveImportConfig: (id, mapping, mode) => api.put(`/rubros/${id}/import-config`, { mapping, mode }).then(r => r.data),
  clearAllMovimientos: (id) => api.delete(`/rubros/${id}/movimientos`).then(r => r.data),
};

export const camposApi = {
  getByRubro: (rubroId) => api.get(`/campos/${rubroId}`).then(r => r.data),
  create: (rubroId, nombre, tipo, orden) => api.post(`/campos/${rubroId}`, { nombre, tipo, orden }).then(r => r.data),
  update: (id, nombre, tipo, orden) => api.put(`/campos/${id}`, { nombre, tipo, orden }),
  delete: (id) => api.delete(`/campos/${id}`),
};

export const subrubrosApi = {
  getByRubro: (rubroId) => api.get(`/subrubros/${rubroId}`).then(r => r.data),
  create: (rubroId, nombre) => api.post(`/subrubros/${rubroId}`, { nombre }).then(r => r.data),
  update: (id, nombre, icon) => api.put(`/subrubros/${id}`, { nombre, icon }),
  delete: (id) => api.delete(`/subrubros/${id}`),
  clearMovimientos: (id) => api.delete(`/movimientos/${id}/movimientos`).then(r => r.data),
};

export const dashboardApi = {
  getResumen: () => api.get('/dashboard/resumen').then(r => r.data),
  getTendencia: (rubroId, meses = 6) =>
    api.get(`/dashboard/tendencia/${rubroId}`, { params: { meses } }).then(r => r.data),
  getTendenciaSubrubro: (subrubroId, meses = 6) =>
    api.get(`/dashboard/tendencia-subrubro/${subrubroId}`, { params: { meses } }).then(r => r.data),
  getComparacion: (rubroId) =>
    api.get(`/dashboard/comparacion/${rubroId}`).then(r => r.data),
};

export const movimientosApi = {
  getBySubrubro: (subrubroId, anio, mes) =>
    api.get(`/movimientos/${subrubroId}`, { params: { anio, mes } }).then(r => r.data),
  create: (subrubroId, data) => api.post(`/movimientos/${subrubroId}`, data).then(r => r.data),
  update: (id, data) => api.put(`/movimientos/${id}`, data).then(r => r.data),
  pagoVinculado: (subrubroId, data) =>
    api.post(`/movimientos/${subrubroId}/pago-vinculado`, data).then(r => r.data),
  actualizarPagoVinculado: (id, data) =>
    api.put(`/movimientos/${id}/pago-vinculado`, data).then(r => r.data),
  delete: (id) => api.delete(`/movimientos/${id}`),
  getVencimientos: (dias = 30) => api.get('/movimientos/vencimientos/proximos', { params: { dias } }).then(r => r.data),
  search: (q, limit = 25) => api.get('/movimientos/search', { params: { q, limit } }).then(r => r.data),
  exportExcel: (subrubroId, nombre, desde = null, hasta = null) => {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const query = params.toString() ? `?${params}` : '';
    const a = document.createElement('a');
    a.href = `${BASE}/movimientos/export/${subrubroId}${query}`;
    a.download = `${nombre}.xlsx`;
    a.click();
  },
  importExcel: (rubroId, file, mapping, mode = 'skip_duplicates', sheets = null, skipRows = 0, fechaDesde = null, fechaHasta = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('mode', mode);
    formData.append('skipRows', String(skipRows));
    if (sheets) formData.append('sheets', JSON.stringify(sheets));
    if (fechaDesde) formData.append('fechaDesde', fechaDesde);
    if (fechaHasta) formData.append('fechaHasta', fechaHasta);
    return api.post(`/movimientos/import/${rubroId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

export const cajaApi = {
  getByFecha: (fecha) => api.get('/caja', { params: { fecha } }).then(r => r.data),
  getRango: (desde, hasta) => api.get('/caja/rango', { params: { desde, hasta } }).then(r => r.data),
  create: (data) => api.post('/caja', data).then(r => r.data),
  update: (id, data) => api.put(`/caja/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/caja/${id}`).then(r => r.data),
};
