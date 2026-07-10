import { X, ArrowRight, User, Calendar, Globe, FileText } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Formateadores: traducen valores crudos a algo legible para un cliente.
   ───────────────────────────────────────────────────────────── */
const money = (v) => {
  const n = Number(v);
  if (v === null || v === undefined || v === '' || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n);
};

const date = (v) => {
  if (!v) return '—';
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); // YYYY-MM-DD[...]
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

const text = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const fromMap = (map, fallback = text) => (v) => (v == null || v === '' ? '—' : (map[v] ?? fallback(v)));

const TIPO_MOV      = { factura: 'Factura', pago: 'Pago', nota_credito: 'Nota de crédito', ajuste: 'Ajuste' };
const METODO        = { efectivo: 'Efectivo', transferencia: 'Transferencia' };
const DOCUMENTO     = { factura: 'Factura', remito: 'Remito' };
const TIPO_CAJA     = { saldo_inicial: 'Saldo inicial', saldo_cuenta: 'Saldo en cuenta', ingreso_extra: 'Ingreso extra', empleado: 'Empleado', gasto: 'Gasto' };
const MODO_VENC     = { dias: 'Días desde la emisión', dia_semana: 'Día fijo de la semana', dia_mes: 'Día fijo del mes' };
const METODO_DEF    = { efectivo: 'Efectivo', transferencia: 'Transferencia', ambas: 'El usuario elige' };
const DIA_SEMANA    = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/* ─────────────────────────────────────────────────────────────
   Definición de campos legibles por recurso. Cada entrada:
     { key, label, fmt }
   `fmt` puede recibir (valor, record, lookups). Devolver null en un def
   (desde la función movimiento) lo omite.
   ───────────────────────────────────────────────────────────── */
const subrubroName = (id, lookups) =>
  id == null ? '—' : (lookups?.subrubros?.[id]?.nombre || `#${id}`);

function movimientoDefs(rec) {
  const tipo = rec?.tipo;
  const fechaLabel = tipo === 'factura' || tipo === 'nota_credito'
    ? 'Fecha de emisión'
    : tipo === 'pago' ? 'Fecha de pago' : 'Fecha';
  return [
    { key: 'tipo',              label: 'Tipo',              fmt: fromMap(TIPO_MOV) },
    { key: 'subrubro_id',       label: 'Subrubro',          fmt: (v, r, l) => subrubroName(v, l) },
    { key: 'fecha',             label: fechaLabel,          fmt: date },
    { key: 'fecha_vencimiento', label: 'Vencimiento',       fmt: date },
    { key: 'monto',             label: 'Monto',             fmt: money },
    { key: 'pago',              label: 'Monto pagado',      fmt: money },
    { key: 'metodo_pago',       label: 'Método de pago',    fmt: fromMap(METODO) },
    { key: 'documento',         label: 'Comprobante',       fmt: fromMap(DOCUMENTO) },
    { key: 'concepto',          label: 'Concepto',          fmt: text },
    { key: 'percepcion_iva',    label: 'Percepción IVA',    fmt: money },
    { key: 'ingresos_brutos',   label: 'Ingresos brutos',   fmt: money },
    { key: 'pagado',            label: 'Estado',            fmt: (v) => (v ? 'Pagada' : 'Pendiente') },
    { key: 'facturas_vinculadas_ids', label: 'Facturas vinculadas', fmt: (v) => (v?.length ? v.map(id => `#${id}`).join(', ') : '—') },
  ];
}

const SCHEMAS = {
  movimiento: movimientoDefs,
  caja: () => [
    { key: 'tipo',        label: 'Tipo',       fmt: fromMap(TIPO_CAJA) },
    { key: 'fecha',       label: 'Fecha',      fmt: date },
    { key: 'concepto',    label: 'Concepto',   fmt: text },
    { key: 'monto',       label: 'Monto',      fmt: money },
    { key: 'metodo',      label: 'Método',     fmt: fromMap(METODO) },
    { key: 'subrubro_id', label: 'Subrubro',   fmt: (v, r, l) => subrubroName(v, l) },
    { key: 'confirmado',  label: 'Estado',     fmt: (v) => (v === false ? 'Pendiente' : 'Confirmado') },
  ],
  subrubro: () => [
    { key: 'nombre',        label: 'Nombre',                 fmt: text },
    { key: 'razon_social',  label: 'Razón social',           fmt: text },
    { key: 'cuit',          label: 'CUIT',                   fmt: text },
    { key: 'cbu',           label: 'CBU',                    fmt: text },
    { key: 'alias',         label: 'Alias',                  fmt: text },
    { key: 'monto_base',    label: 'Monto base',             fmt: money },
    { key: 'modo_vencimiento',      label: 'Modo de vencimiento',    fmt: fromMap(MODO_VENC) },
    { key: 'dia_vencimiento',       label: 'Plazo (días)',           fmt: text },
    { key: 'dia_semana_vencimiento',label: 'Día de la semana',       fmt: (v) => (v == null ? '—' : DIA_SEMANA[v] ?? v) },
    { key: 'dia_mes_vencimiento',   label: 'Día del mes',            fmt: text },
    { key: 'metodo_pago_default',   label: 'Método de pago por defecto', fmt: fromMap(METODO_DEF) },
    { key: 'notas',         label: 'Notas',                  fmt: text },
  ],
  rubro:     () => [{ key: 'nombre', label: 'Nombre', fmt: text }],
  local:     () => [{ key: 'nombre', label: 'Nombre', fmt: text }],
  categoria: () => [
    { key: 'nombre',       label: 'Nombre',      fmt: text },
    { key: 'operacion',    label: 'Operación',   fmt: text },
    { key: 'tipo_calculo', label: 'Cálculo',     fmt: text },
    { key: 'porcentaje_default', label: 'Porcentaje', fmt: text },
  ],
  campo: () => [
    { key: 'nombre', label: 'Nombre', fmt: text },
    { key: 'tipo',   label: 'Tipo',   fmt: text },
    { key: 'orden',  label: 'Orden',  fmt: text },
  ],
  producto: () => [
    { key: 'nombre',   label: 'Nombre',   fmt: text },
    { key: 'cantidad', label: 'Cantidad', fmt: text },
    { key: 'precio',   label: 'Precio',   fmt: money },
  ],
  user: () => [
    { key: 'usuario', label: 'Usuario', fmt: text },
    { key: 'rol',     label: 'Rol',     fmt: text },
    { key: 'role',    label: 'Rol',     fmt: text },
  ],
};

/* Título amigable según recurso + record. */
function titulo(recurso, rec, id) {
  if (recurso === 'movimiento') {
    const t = TIPO_MOV[rec?.tipo] || 'Movimiento';
    return rec?.tipo === 'pago' ? 'Pago a proveedor' : `${t} #${id ?? '—'}`;
  }
  if (recurso === 'caja') return 'Movimiento de Caja';
  const label = { subrubro: 'Subrubro', rubro: 'Rubro', local: 'Local', categoria: 'Categoría', campo: 'Campo', producto: 'Producto', user: 'Usuario' }[recurso] || recurso;
  const nombre = rec?.nombre || rec?.usuario;
  return nombre ? `${label}: ${nombre}` : `${label} #${id ?? '—'}`;
}

const ACCION_META = {
  create: { label: 'CREADO',    cls: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  update: { label: 'EDITADO',   cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  delete: { label: 'ELIMINADO', cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  login:        { label: 'INGRESO',       cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
  logout:       { label: 'SALIDA',        cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
  login_failed: { label: 'LOGIN FALLIDO', cls: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' },
};

const isEmpty = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

/* Expande campos_extra en defs propias (label = nombre del campo custom). */
function extraDefs(...records) {
  const keys = new Set();
  for (const r of records) {
    if (r?.campos_extra && typeof r.campos_extra === 'object') {
      for (const k of Object.keys(r.campos_extra)) keys.add(k);
    }
  }
  return [...keys].map(k => ({
    key: `campos_extra.${k}`,
    label: k.charAt(0).toUpperCase() + k.slice(1),
    fmt: text,
    getVal: (rec) => rec?.campos_extra?.[k],
  }));
}

function readVal(rec, def) {
  return def.getVal ? def.getVal(rec) : rec?.[def.key];
}

// Claves internas que nunca se muestran (ni en el fallback genérico).
const HIDDEN = new Set(['_id', 'id', '__v', 'idempotency_key', 'created_at', 'updated_at', 'campos_extra', 'caja_mov_id', '_ajuste_pago_id', 'pago_mov_id', 'movimiento_id', 'origen', 'auto_sync', 'es_especial', 'rubro_id', 'icon', 'password', 'password_hash', 'token']);

// Para recursos sin schema definido: deriva defs de las claves del propio registro.
function genericDefs(...records) {
  const keys = new Set();
  for (const r of records) {
    if (r && typeof r === 'object') for (const k of Object.keys(r)) if (!HIDDEN.has(k)) keys.add(k);
  }
  return [...keys].map(k => ({ key: k, label: k.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()), fmt: text }));
}

/* Construye la lista de defs para un recurso combinando el schema + campos_extra. */
function buildDefs(recurso, ...records) {
  const schema = SCHEMAS[recurso];
  const base = schema ? schema(records.find(Boolean) || {}) : genericDefs(...records);
  return [...base, ...extraDefs(...records)];
}

/* Panel de una sola columna: los campos con valor de un record. */
function InfoPanel({ recurso, rec, lookups, tone = 'neutral', proveedor }) {
  const defs = buildDefs(recurso, rec);
  const rows = defs
    .map(d => ({ label: d.label, value: d.fmt(readVal(rec, d), rec, lookups), raw: readVal(rec, d) }))
    .filter(r => !isEmpty(r.raw) && r.value !== '—');

  if (proveedor) rows.splice(1, 0, { label: 'Proveedor', value: proveedor });
  if (rows.length === 0) return <p className="text-sm text-slate-400">Sin datos registrados.</p>;

  const cell = tone === 'green' ? 'bg-green-50 dark:bg-green-950/30'
    : tone === 'red' ? 'bg-red-50 dark:bg-red-950/30'
    : 'bg-slate-50 dark:bg-slate-800/60';

  return (
    <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      {rows.map((r, i) => (
        <div key={r.label} className={`flex gap-3 px-3.5 py-2 text-sm ${i % 2 ? cell : ''}`}>
          <span className="w-44 shrink-0 font-medium text-slate-500 dark:text-slate-400">{r.label}</span>
          <span className="flex-1 break-words text-slate-800 dark:text-slate-100">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/* Tabla Antes → Después, resaltando lo que cambió. */
function DiffPanel({ recurso, before, after, lookups }) {
  const defs = buildDefs(recurso, before || {}, after || {});
  const rows = defs.map(d => {
    const bRaw = readVal(before, d);
    const aRaw = readVal(after, d);
    const changed = JSON.stringify(bRaw ?? null) !== JSON.stringify(aRaw ?? null);
    return {
      label: d.label,
      antes: d.fmt(bRaw, before, lookups),
      despues: d.fmt(aRaw, after, lookups),
      changed,
      both: isEmpty(bRaw) && isEmpty(aRaw),
    };
  }).filter(r => !r.both);

  if (rows.length === 0) return <p className="text-sm text-slate-400">Sin datos comparables.</p>;

  return (
    <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      <div className="grid grid-cols-[11rem_1fr_1.25rem_1fr] items-center gap-x-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
        <span>Campo</span><span>Antes</span><span /><span>Después</span>
      </div>
      {rows.map(r => (
        <div key={r.label} className={`grid grid-cols-[11rem_1fr_1.25rem_1fr] items-center gap-x-2 px-3.5 py-2 text-sm border-b border-slate-100 dark:border-slate-700/60 last:border-0 ${r.changed ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}`}>
          <span className={`font-medium ${r.changed ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>{r.label}</span>
          <span className={`break-words ${r.changed ? 'text-red-600 dark:text-red-400 line-through decoration-red-300/60' : 'text-slate-400 dark:text-slate-500'}`}>{r.antes}</span>
          <span className="flex justify-center text-slate-300 dark:text-slate-600">{r.changed ? <ArrowRight size={13} /> : ''}</span>
          <span className={`break-words ${r.changed ? 'text-green-600 dark:text-green-400 font-medium' : 'text-slate-500 dark:text-slate-300'}`}>{r.despues}</span>
        </div>
      ))}
    </div>
  );
}

export default function AuditDetailModal({ item, onClose, lookups }) {
  if (!item) return null;
  const diff = item.diff || {};
  const before = diff.before || null;
  const after = diff.response || null;
  const recurso = item.recurso;
  const meta = ACCION_META[item.accion] || { label: (item.accion || '').toUpperCase(), cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' };

  // "Después" en updates: preferir la respuesta; si no vino, reconstruir con before + payload.
  const afterUpdate = after || (before && diff.payload ? { ...before, ...diff.payload } : (diff.payload || null));
  // Record de referencia para el panel de información contextual.
  const refRec = after || afterUpdate || before || diff.payload || {};
  const proveedor = (recurso === 'movimiento' || recurso === 'caja')
    ? (lookups?.subrubros?.[refRec?.subrubro_id]?.razon_social || null)
    : null;

  const esGenerico = !SCHEMAS[recurso];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full tracking-wide ${meta.cls}`}>{meta.label}</span>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">{titulo(recurso, refRec, item.recurso_id)}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3 text-xs border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-start gap-1.5"><User size={13} className="mt-0.5 text-slate-400 shrink-0" /><div><p className="text-slate-400 mb-0.5">Usuario</p><p className="font-medium text-slate-700 dark:text-slate-200">{item.usuario}</p></div></div>
          <div className="flex items-start gap-1.5"><Calendar size={13} className="mt-0.5 text-slate-400 shrink-0" /><div><p className="text-slate-400 mb-0.5">Fecha y hora</p><p className="font-medium text-slate-700 dark:text-slate-200">{new Date(item.fecha).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p></div></div>
          <div className="flex items-start gap-1.5"><FileText size={13} className="mt-0.5 text-slate-400 shrink-0" /><div><p className="text-slate-400 mb-0.5">Recurso</p><p className="font-medium text-slate-700 dark:text-slate-200 capitalize">{recurso}</p></div></div>
          <div className="flex items-start gap-1.5"><Globe size={13} className="mt-0.5 text-slate-400 shrink-0" /><div><p className="text-slate-400 mb-0.5">IP</p><p className="font-medium text-slate-700 dark:text-slate-200 font-mono">{item.ip || '—'}</p></div></div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Panel de información contextual del dato (solo para recursos conocidos) */}
          {!esGenerico && !isEmpty(refRec) && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                {recurso === 'movimiento' ? (refRec?.tipo === 'pago' ? 'Información del pago' : 'Información de la factura')
                  : recurso === 'caja' ? 'Información del movimiento' : 'Información'}
              </p>
              <InfoPanel recurso={recurso} rec={refRec} lookups={lookups}
                tone={item.accion === 'delete' ? 'red' : item.accion === 'create' ? 'green' : 'neutral'}
                proveedor={proveedor} />
            </div>
          )}

          {/* Cambios (updates) */}
          {item.accion === 'update' && (before || afterUpdate) && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Cambios realizados</p>
              <DiffPanel recurso={recurso} before={before} after={afterUpdate} lookups={lookups} />
              {!before && (
                <p className="text-xs text-slate-400 mt-2">No se registró el estado previo (registro anterior a esta versión). Se muestran los valores resultantes.</p>
              )}
            </div>
          )}

          {/* Creación / Eliminación: para recursos genéricos mostramos el panel crudo */}
          {item.accion === 'create' && esGenerico && (
            <div>
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">Datos creados</p>
              <InfoPanel recurso={recurso} rec={after || diff.payload || {}} lookups={lookups} tone="green" />
            </div>
          )}
          {item.accion === 'delete' && esGenerico && (
            <div>
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2">Datos eliminados</p>
              <InfoPanel recurso={recurso} rec={before || diff.payload || {}} lookups={lookups} tone="red" />
            </div>
          )}
          {item.accion === 'create' && !esGenerico && (
            <p className="text-xs text-slate-400">Registro nuevo — no hay estado anterior.</p>
          )}
          {item.accion === 'delete' && !esGenerico && (
            <p className="text-xs text-slate-400">Los valores mostrados corresponden al estado del registro antes de eliminarlo.</p>
          )}

          {/* Login / logout */}
          {['login', 'logout', 'login_failed'].includes(item.accion) && diff.payload && (
            <InfoPanel recurso={recurso} rec={diff.payload} lookups={lookups} />
          )}

          {/* Respaldo técnico */}
          {diff.payload && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Ver datos técnicos (JSON enviado)</summary>
              <pre className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 overflow-x-auto text-slate-600 dark:text-slate-300">{JSON.stringify(diff.payload, null, 2)}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
