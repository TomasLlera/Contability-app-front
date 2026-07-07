import { X, ArrowRight } from 'lucide-react';

// Formatea un valor de campo para mostrarlo en el diff.
const fmtVal = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

// Campos internos que no aportan al diff legible.
const IGNORE = new Set(['__v', 'updated_at']);

const ACCION_META = {
  create:       { label: 'Creación',       cls: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  update:       { label: 'Edición',        cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  delete:       { label: 'Eliminación',    cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  login:        { label: 'Ingreso',        cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
  logout:       { label: 'Salida',         cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
  login_failed: { label: 'Login fallido',  cls: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' },
};

function keysOf(...objs) {
  const set = new Set();
  for (const o of objs) {
    if (o && typeof o === 'object') for (const k of Object.keys(o)) if (!IGNORE.has(k)) set.add(k);
  }
  return [...set].sort();
}

function SingleColumn({ data, tone }) {
  const keys = keysOf(data);
  if (keys.length === 0) return <p className="text-sm text-slate-400">Sin datos registrados.</p>;
  const cellTone = tone === 'green'
    ? 'bg-green-50 dark:bg-green-950/30'
    : tone === 'red'
    ? 'bg-red-50 dark:bg-red-950/30'
    : 'bg-slate-50 dark:bg-slate-800/60';
  return (
    <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      {keys.map((k, i) => (
        <div key={k} className={`flex gap-3 px-3 py-1.5 text-sm ${i % 2 ? cellTone : ''}`}>
          <span className="w-40 shrink-0 font-medium text-slate-500 dark:text-slate-400 truncate">{k}</span>
          <span className="flex-1 break-words text-slate-700 dark:text-slate-200">{fmtVal(data[k])}</span>
        </div>
      ))}
    </div>
  );
}

function DiffTable({ before, after }) {
  const keys = keysOf(before, after);
  if (keys.length === 0) return <p className="text-sm text-slate-400">Sin datos comparables.</p>;
  return (
    <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      <div className="grid grid-cols-[10rem_1fr_1.25rem_1fr] items-center gap-x-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
        <span>Campo</span>
        <span>Antes</span>
        <span />
        <span>Después</span>
      </div>
      {keys.map(k => {
        const bv = before?.[k];
        const av = after?.[k];
        const changed = JSON.stringify(bv ?? null) !== JSON.stringify(av ?? null);
        return (
          <div
            key={k}
            className={`grid grid-cols-[10rem_1fr_1.25rem_1fr] items-center gap-x-2 px-3 py-1.5 text-sm border-b border-slate-100 dark:border-slate-700/60 last:border-0 ${changed ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}`}
          >
            <span className={`font-medium truncate ${changed ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>{k}</span>
            <span className={`break-words ${changed ? 'text-red-600 dark:text-red-400 line-through decoration-red-300/60' : 'text-slate-400 dark:text-slate-500'}`}>{fmtVal(bv)}</span>
            <span className="flex justify-center text-slate-300 dark:text-slate-600">{changed ? <ArrowRight size={13} /> : ''}</span>
            <span className={`break-words ${changed ? 'text-green-600 dark:text-green-400 font-medium' : 'text-slate-500 dark:text-slate-300'}`}>{fmtVal(av)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AuditDetailModal({ item, onClose }) {
  if (!item) return null;
  const diff = item.diff || {};
  const before = diff.before || null;
  const after = diff.response || null;
  const meta = ACCION_META[item.accion] || { label: item.accion, cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' };

  // "Después" para updates: preferir la respuesta; si no vino, reconstruir con before + payload.
  const afterUpdate = after || (before && diff.payload ? { ...before, ...diff.payload } : (after || diff.payload || null));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              {item.recurso} <span className="text-slate-400 font-mono text-sm">#{item.recurso_id ?? '—'}</span>
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3 text-xs border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40">
          <div><p className="text-slate-400 mb-0.5">Usuario</p><p className="font-medium text-slate-700 dark:text-slate-200">{item.usuario}</p></div>
          <div><p className="text-slate-400 mb-0.5">Fecha y hora</p><p className="font-medium text-slate-700 dark:text-slate-200">{new Date(item.fecha).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p></div>
          <div><p className="text-slate-400 mb-0.5">Recurso</p><p className="font-medium text-slate-700 dark:text-slate-200">{item.recurso}</p></div>
          <div><p className="text-slate-400 mb-0.5">IP</p><p className="font-medium text-slate-700 dark:text-slate-200 font-mono">{item.ip || '—'}</p></div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {item.accion === 'update' && (before || afterUpdate) && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Cambios</p>
              <DiffTable before={before} after={afterUpdate} />
              {!before && (
                <p className="text-xs text-slate-400 mt-2">No se registró el estado previo (registro anterior a esta versión). Se muestran los valores enviados/resultantes.</p>
              )}
            </div>
          )}

          {item.accion === 'create' && (
            <div>
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">Datos creados</p>
              <SingleColumn data={after || diff.payload} tone="green" />
            </div>
          )}

          {item.accion === 'delete' && (
            <div>
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2">Datos eliminados</p>
              <SingleColumn data={before || diff.payload} tone="red" />
            </div>
          )}

          {['login', 'logout', 'login_failed'].includes(item.accion) && (
            <SingleColumn data={diff.payload || {}} tone="neutral" />
          )}

          {/* Payload crudo enviado (útil como respaldo) */}
          {diff.payload && item.accion === 'update' && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Ver campos enviados en la solicitud</summary>
              <pre className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 overflow-x-auto text-slate-600 dark:text-slate-300">{JSON.stringify(diff.payload, null, 2)}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
