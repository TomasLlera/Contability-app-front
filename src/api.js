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

// Genera una clave de idempotencia única para una operación de alta. Se envía al
// backend (campo idempotency_key) para que reintentos de la MISMA alta —doble clic,
// reenvío de red, doble disparo de efectos— devuelvan el registro ya creado en lugar
// de duplicarlo. Generá una clave nueva por cada alta lógica distinta.
export const newIdemKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Extrae el mensaje de error legible de cualquier respuesta de Axios
export const getErrorMsg = (err) => {
  if (!err.response) return 'Sin conexión con el servidor';
  const data = err.response.data;
  if (typeof data === 'string' && data.length < 200) return data;
  return data?.error || data?.message || `Error ${err.response.status}`;
};

const INACTIVITY_MS = 60 * 60 * 1000; // 1 hora

export const authApi = {
  login: (usuario, password) =>
    axios.post(`${BASE}/auth/login`, { usuario, password }).then(r => {
      localStorage.setItem('token', r.data.token);
      localStorage.setItem('lastActivity', String(Date.now()));
      return r.data;
    }),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('lastActivity');
  },
  updateActivity: () => localStorage.setItem('lastActivity', String(Date.now())),
  checkInactivity: () => {
    const last = Number(localStorage.getItem('lastActivity') || 0);
    if (last && Date.now() - last > INACTIVITY_MS) {
      localStorage.removeItem('token');
      localStorage.removeItem('lastActivity');
      return true;
    }
    return false;
  },
  isLoggedIn: () => !!localStorage.getItem('token'),
  getRole: () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try { return JSON.parse(atob(token.split('.')[1])).role || 'admin'; } catch { return 'admin'; }
  },
  getUsuario: () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try { return JSON.parse(atob(token.split('.')[1])).usuario || null; } catch { return null; }
  },
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

export const categoriasApi = {
  getByRubro: (rubroId) => api.get(`/categorias/${rubroId}`).then(r => r.data),
  create: (rubroId, nombre, operacion, tipo_calculo, porcentaje_default) =>
    api.post(`/categorias/${rubroId}`, { nombre, operacion, tipo_calculo, porcentaje_default }).then(r => r.data),
  update: (id, nombre, operacion, tipo_calculo, porcentaje_default) =>
    api.put(`/categorias/${id}`, { nombre, operacion, tipo_calculo, porcentaje_default }),
  delete: (id) => api.delete(`/categorias/${id}`),
};

export const camposApi = {
  getByRubro: (rubroId) => api.get(`/campos/${rubroId}`).then(r => r.data),
  create: (rubroId, nombre, tipo, orden) => api.post(`/campos/${rubroId}`, { nombre, tipo, orden }).then(r => r.data),
  update: (id, nombre, tipo, orden) => api.put(`/campos/${id}`, { nombre, tipo, orden }),
  delete: (id) => api.delete(`/campos/${id}`),
};

export const subrubrosApi = {
  getByRubro: (rubroId) => api.get(`/subrubros/${rubroId}`).then(r => r.data),
  create: (rubroId, payload) =>
    api.post(
      `/subrubros/${rubroId}`,
      typeof payload === 'string' ? { nombre: payload } : payload
    ).then(r => r.data),
  // Acepta objeto con cualquier subset: { nombre, icon, monto_base, cuit, cbu, alias, razon_social, notas, dia_vencimiento }
  // Mantiene compat con la firma vieja: update(id, nombre, icon)
  update: (id, payloadOrNombre, iconLegacy) => {
    const payload = typeof payloadOrNombre === 'string'
      ? { nombre: payloadOrNombre, icon: iconLegacy }
      : payloadOrNombre;
    return api.put(`/subrubros/${id}`, payload);
  },
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
  getComparativa: () => api.get('/dashboard/comparativa').then(r => r.data),
  getComparativaCaja: () => api.get('/dashboard/comparativa-caja').then(r => r.data),
  getDeudasCobrar: () => api.get('/dashboard/deudas-cobrar').then(r => r.data),
};

// Descarga un blob desde una respuesta axios, detectando errores JSON devueltos como blob.
async function descargarBlob(res, filename) {
  const ct = res.data?.type || '';
  if (ct.includes('application/json')) {
    const txt = await res.data.text();
    let msg = 'No se pudo generar el archivo';
    try { msg = JSON.parse(txt).error || msg; } catch { /* usa msg por defecto */ }
    throw new Error(msg);
  }
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}

export const reportesApi = {
  subrubrosMensual: async (rubroId, nombre, { mes, subrubroId = null, orden = 'saldo' }) => {
    const params = { mes, orden };
    if (subrubroId) params.subrubroId = subrubroId;
    const res = await api.get(`/reportes/subrubros-mensual/${rubroId}`, { params, responseType: 'blob' });
    const safe = String(nombre).replace(/[^\w\-]+/g, '_').slice(0, 40);
    await descargarBlob(res, `analisis_${safe}_${mes}.xlsx`);
  },
  cajaMensual: async ({ mes }) => {
    const res = await api.get('/reportes/caja-mensual', { params: { mes }, responseType: 'blob' });
    await descargarBlob(res, `caja_${mes}.xlsx`);
  },
  ventasSistema: async ({ desde, hasta }) => {
    const res = await api.get('/reportes/ventas-sistema', { params: { desde, hasta }, responseType: 'blob' });
    await descargarBlob(res, desde === hasta ? `ventas_sistema_${desde}.xlsx` : `ventas_sistema_${desde}_a_${hasta}.xlsx`);
  },
  tarjetas: async ({ desde, hasta }) => {
    const res = await api.get('/reportes/tarjetas', { params: { desde, hasta }, responseType: 'blob' });
    await descargarBlob(res, desde === hasta ? `tarjetas_${desde}.xlsx` : `tarjetas_${desde}_a_${hasta}.xlsx`);
  },
};

export const backupApi = {
  exportZip: async () => {
    const res = await api.get('/backup/export', { responseType: 'blob' });
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
    await descargarBlob(res, `backup_${fecha}.zip`);
  },
  importFile: (file, mode = 'merge') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('mode', mode);
    return api.post('/backup/import', fd).then(r => r.data);
  },
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
  // tipo: 'factura' (default, boletas a pagar) | 'deuda' (deudas a cobrar)
  getVencimientos: (dias = 30, tipo = undefined) => api.get('/movimientos/vencimientos/proximos', { params: { dias, tipo } }).then(r => r.data),
  search: (q, limit = 25) => api.get('/movimientos/search', { params: { q, limit } }).then(r => r.data),
  exportExcel: async (subrubroId, nombre, desde = null, hasta = null) => {
    const params = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    const res = await api.get(`/movimientos/export/${subrubroId}`, { params, responseType: 'blob' });
    // Si el backend devolvió un error como blob (p. ej. JSON de error), lo detectamos
    // acá en vez de descargar un .xlsx corrupto.
    const ct = res.data?.type || '';
    if (ct.includes('application/json')) {
      const txt = await res.data.text();
      let msg = 'No se pudo generar el Excel';
      try { msg = JSON.parse(txt).error || msg; } catch { /* usa msg por defecto */ }
      throw new Error(msg);
    }
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre}.xlsx`;
    // El ancla debe estar en el DOM para que .click() dispare la descarga en Firefox
    // y en algunos builds de Chromium.
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Revocar en el próximo tick: hacerlo de forma síncrona puede abortar la descarga
    // antes de que el navegador la inicie.
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  },
  importExcel: (rubroId, file, mapping, mode = 'skip_duplicates', sheets = null, skipRows = 0, fechaDesde = null, fechaHasta = null, documento = 'factura') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('mode', mode);
    formData.append('skipRows', String(skipRows));
    if (sheets) formData.append('sheets', JSON.stringify(sheets));
    if (fechaDesde) formData.append('fechaDesde', fechaDesde);
    if (fechaHasta) formData.append('fechaHasta', fechaHasta);
    formData.append('documento', documento);
    return api.post(`/movimientos/import/${rubroId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

export const usersApi = {
  getAll: () => api.get('/users').then(r => r.data),
  create: (usuario, password, role) => api.post('/users', { usuario, password, role }).then(r => r.data),
  update: (id, data) => api.put(`/users/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/users/${id}`).then(r => r.data),
  changePassword: (id, password) => api.put(`/users/${id}/password`, { password }).then(r => r.data),
};

export const stockApi = {
  getProductos: () => api.get('/stock/productos').then(r => r.data),
  createProducto: (data) => api.post('/stock/productos', data).then(r => r.data),
  updateProducto: (id, data) => api.put(`/stock/productos/${id}`, data).then(r => r.data),
  deleteProducto: (id) => api.delete(`/stock/productos/${id}`).then(r => r.data),
  getMovimientos: (productoId) => api.get(`/stock/movimientos/${productoId}`).then(r => r.data),
  createMovimiento: (data) => api.post('/stock/movimientos', data).then(r => r.data),
  getAlertas: () => api.get('/stock/alertas').then(r => r.data),
  bulkUpdatePrecios: (ids, campo, tipo, valor) =>
    api.put('/stock/productos/bulk-precio', { ids, campo, tipo, valor }).then(r => r.data),
  exportProductos: async () => {
    const res = await api.get('/stock/export-productos', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = 'productos.xlsx'; a.click();
    URL.revokeObjectURL(url);
  },
  importProductos: (file) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/stock/import-productos', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  getGraficas: (vista = 'mes', anio) =>
    api.get('/stock/graficas', { params: { vista, anio } }).then(r => r.data),
};

export const ivaApi = {
  // Config de columnas
  getConfig: () => api.get('/iva/config').then(r => r.data),
  saveConfig: (mapping) => api.put('/iva/config', { mapping }).then(r => r.data),
  // Compras
  getCompras: () => api.get('/iva/compras').then(r => r.data),
  getLotes: () => api.get('/iva/compras/lotes').then(r => r.data),
  importCompras: (file, sheet = null, { dryRun = false, incluirDuplicados = false } = {}) => {
    const fd = new FormData(); fd.append('file', file);
    if (sheet) fd.append('sheet', sheet);
    if (dryRun) fd.append('dryRun', 'true');
    if (incluirDuplicados) fd.append('incluirDuplicados', 'true');
    return api.post('/iva/compras/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  createCompra: (data) => api.post('/iva/compras', data).then(r => r.data),
  deleteCompra: (id) => api.delete(`/iva/compras/${id}`).then(r => r.data),
  clearCompras: (lote) => api.delete('/iva/compras', { params: lote ? { lote } : {} }).then(r => r.data),
  // Ventas (carga manual)
  getVentas: () => api.get('/iva/ventas').then(r => r.data),
  createVenta: (data) => api.post('/iva/ventas', data).then(r => r.data),
  updateVenta: (id, data) => api.put(`/iva/ventas/${id}`, data).then(r => r.data),
  deleteVenta: (id) => api.delete(`/iva/ventas/${id}`).then(r => r.data),
  // Cruce mensual
  getResumen: () => api.get('/iva/resumen').then(r => r.data),
  exportResumenExcel: async () => {
    const res = await api.get('/iva/export-resumen', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = 'iva-cruce.xlsx'; a.click();
    URL.revokeObjectURL(url);
  },
  exportResumenPdf: async () => {
    const res = await api.get('/iva/export-resumen-pdf', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = 'iva-cruce.pdf'; a.click();
    URL.revokeObjectURL(url);
  },
};

// Registro → Venta Sistema (ventas propias) y Tarjetas (QR/débito/crédito/prepaga)
export const registroApi = {
  ventas: {
    getMes: (mes) => api.get(`/registro/ventas-sistema/mes/${mes}`).then(r => r.data),
    getDia: (fecha) => api.get(`/registro/ventas-sistema/dia/${fecha}`).then(r => r.data),
    create: (data) => api.post('/registro/ventas-sistema', data).then(r => r.data),
    update: (id, data) => api.put(`/registro/ventas-sistema/${id}`, data).then(r => r.data),
    delete: (id) => api.delete(`/registro/ventas-sistema/${id}`).then(r => r.data),
  },
  tarjetas: {
    getMes: (mes) => api.get(`/registro/tarjetas/mes/${mes}`).then(r => r.data),
    getDia: (fecha) => api.get(`/registro/tarjetas/dia/${fecha}`).then(r => r.data),
    create: (data) => api.post('/registro/tarjetas', data).then(r => r.data),
    update: (id, data) => api.put(`/registro/tarjetas/${id}`, data).then(r => r.data),
    delete: (id) => api.delete(`/registro/tarjetas/${id}`).then(r => r.data),
  },
};

export const appConfigApi = {
  get: () => api.get('/config').then(r => r.data),
  update: (data) => api.put('/config', data).then(r => r.data),
  testEmail: () => api.post('/config/test-email').then(r => r.data),
};

export const cotizacionesApi = {
  get: (refresh = false) => api.get('/cotizaciones', { params: refresh ? { refresh: 1 } : {} }).then(r => r.data),
};

export const auditApi = {
  list: (params = {}) => api.get('/audit', { params }).then(r => r.data),
  get: (id) => api.get(`/audit/${id}`).then(r => r.data),
};

export const cajaApi = {
  getByFecha: (fecha) => api.get('/caja', { params: { fecha } }).then(r => r.data),
  getRango: (desde, hasta) => api.get('/caja/rango', { params: { desde, hasta } }).then(r => r.data),
  create: (data) => api.post('/caja', data).then(r => r.data),
  update: (id, data) => api.put(`/caja/${id}`, data).then(r => r.data),
  delete: (id, fecha) => api.delete(`/caja/${id}`, { params: { fecha } }).then(r => r.data),
  getConfig: () => api.get('/caja/config').then(r => r.data),
  saveConfig: (data) => api.put('/caja/config', data).then(r => r.data),
  autoSync: (fecha) => api.post('/caja/auto-sync', null, { params: { fecha } }).then(r => r.data),
  getFacturasPendientes: (subrubro_id) => api.get('/caja/facturas-pendientes', { params: { subrubro_id } }).then(r => r.data),
};
