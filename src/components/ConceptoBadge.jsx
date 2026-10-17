import { Wallet, Sigma } from 'lucide-react';

// El color del concepto se usa solo como punto: el texto del badge queda en neutro
// para que se lea igual en tema claro y oscuro (paleta en utils/sumatoria.js).

/** Badge de concepto de una carga de Sumatoria (nombre + punto de color). */
export function ConceptoBadge({ nombre, color, inactivo = false, className = '' }) {
  return (
    <span
      title={inactivo ? `${nombre} (desactivado)` : nombre}
      className={`inline-flex items-center gap-1 max-w-full text-xs leading-4.5 px-1.5 rounded-full font-medium
                  bg-violet-50 dark:bg-violet-900/30 text-slate-700 dark:text-slate-200 border border-violet-200 dark:border-violet-800
                  ${inactivo ? 'opacity-60' : ''} ${className}`}
    >
      <span aria-hidden className="w-2 h-2 rounded-full shrink-0" style={{ background: color || '#7c3aed' }} />
      <span className="truncate">{nombre || 'Sin concepto'}</span>
    </span>
  );
}

/** Origen de una carga: "Caja" (descontó del día) o "Subrubro" (solo suma acá). */
export function OrigenBadge({ origen, compacto = false }) {
  const caja = origen === 'caja';
  const Icon = caja ? Wallet : Sigma;
  const label = caja ? 'Caja' : 'Subrubro';
  return (
    <span
      title={caja ? 'Cargado desde la Caja del Día: descontó de la caja' : 'Cargado desde el subrubro: no toca la Caja del Día'}
      className={`inline-flex items-center gap-1 text-xs leading-4.5 px-1.5 rounded-full font-medium shrink-0 ${
        caja
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
      }`}
    >
      <Icon size={11} aria-hidden />
      {compacto ? <span className="sr-only">{label}</span> : label}
    </span>
  );
}
