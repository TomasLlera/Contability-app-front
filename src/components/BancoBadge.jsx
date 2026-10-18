// Badge y selector de banco (multi-banco de la Caja). El color del banco va como
// punto; el texto queda en neutro para leerse igual en tema claro y oscuro.

/** Badge de banco: punto de color + alias (o nombre). `null` = sin banco asignado. */
export function BancoBadge({ banco, className = '' }) {
  if (!banco) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs leading-4.5 px-1.5 rounded-full font-medium border border-dashed border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 ${className}`}>
        Sin banco
      </span>
    );
  }
  return (
    <span title={banco.nombre}
      className={`inline-flex items-center gap-1 max-w-full text-xs leading-4.5 px-1.5 rounded-full font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ${banco.activo === false ? 'opacity-60' : ''} ${className}`}>
      <span aria-hidden className="w-2 h-2 rounded-full shrink-0" style={{ background: banco.color || '#2563eb' }} />
      <span className="truncate">{banco.alias || banco.nombre}</span>
    </span>
  );
}

/**
 * Selector de banco como botones (2-4 bancos entran en una fila; con más, envuelven).
 * `opciones` = bancos activos; si `value` es un banco desactivado (edición de un pago
 * viejo) se agrega para poder conservarlo.
 */
export function BancoSelect({ opciones = [], value, onChange, bancoActual = null, label = 'Banco', id }) {
  const lista = bancoActual && !opciones.some(b => b.id === bancoActual.id) ? [...opciones, bancoActual] : opciones;
  return (
    <div>
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1" id={id}>{label}</span>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 p-0.5 text-sm font-medium">
        {lista.map(b => {
          const activo = Number(value) === b.id;
          return (
            <button key={b.id} type="button" role="radio" aria-checked={activo} onClick={() => onChange(b.id)}
              className={`flex-1 min-w-24 min-h-11 sm:min-h-9 px-2 rounded-md transition-colors inline-flex items-center justify-center gap-1.5 ${
                activo ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-300'
              }`}>
              <span aria-hidden className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color || '#2563eb' }} />
              <span className="truncate">{b.alias || b.nombre}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
