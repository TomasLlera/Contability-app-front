import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/';
  }
  return Promise.reject(err);
});

export const authApi = {
  login: (usuario, password) =>
    axios.post(`${BASE}/auth/login`, { usuario, password }).then(r => {
      localStorage.setItem('token', r.data.token);
      return r.data;
    }),
  logout: () => localStorage.removeItem('token'),
  isLoggedIn: () => !!localStorage.getItem('token'),
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
};

export const movimientosApi = {
  getBySubrubro: (subrubroId, anio, mes) =>
    api.get(`/movimientos/${subrubroId}`, { params: { anio, mes } }).then(r => r.data),
  create: (subrubroId, data) => api.post(`/movimientos/${subrubroId}`, data).then(r => r.data),
  update: (id, data) => api.put(`/movimientos/${id}`, data).then(r => r.data),
  // Pago o nota de crédito vinculado a facturas específicas
  pagoVinculado: (subrubroId, data) =>
    api.post(`/movimientos/${subrubroId}/pago-vinculado`, data).then(r => r.data),
  actualizarPagoVinculado: (id, data) =>
    api.put(`/movimientos/${id}/pago-vinculado`, data).then(r => r.data),
  delete: (id) => api.delete(`/movimientos/${id}`),
  getVencimientos: (dias = 30) => api.get('/movimientos/vencimientos/proximos', { params: { dias } }).then(r => r.data),
  exportExcel: (subrubroId, nombre) => {
    const a = document.createElement('a');
    a.href = `${BASE}/movimientos/export/${subrubroId}`;
    a.download = `${nombre}.xlsx`;
    a.click();
  },
  importExcel: (rubroId, file, mapping, mode = 'skip_duplicates', sheets = null, skipRows = 0) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('mode', mode);
    formData.append('skipRows', String(skipRows));
    if (sheets) formData.append('sheets', JSON.stringify(sheets));
    return api.post(`/movimientos/import/${rubroId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};
