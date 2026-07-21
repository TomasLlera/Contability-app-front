import { useState, useEffect } from 'react';
import { Percent, ChevronDown, Loader2 } from 'lucide-react';
import { cajaApi } from '../api';
import InfoTooltip from './InfoTooltip';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

const formatFechaCorta = (dateStr) => {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
};

// Primer y último día del mes de una fecha dada (YYYY-MM-DD).
export const rangoMes = (ref = new Date()) => {
  const y = ref.getFullYear();
  const m = String(ref.getMonth() + 1).padStart(2, '0');
  const ultimo = new Date(y, ref.getMonth() + 1, 0).getDate();
  return { desde: `${y}-${m}-01`, hasta: `${y}-${m}-${String(ultimo).padStart(2, '0')}` };
};
export const rangoAnio = (ref = new Date()) => {
  const y = ref.getFullYear();
  return { desde: `${y}-01-01`, hasta: `${y}-12-31` };
};

/**
 * Panel de seguimiento de descuentos por pago.
 *
 * Muestra el total descontado en el período y, desplegable, el detalle de cada pago.
 * Se usa tanto en el Dashboard (todos los subrubros del mes) como dentro de un
 * Subrubro (su propio historial), según se le pase `subrubroId`.
 *
 * Si en el período no hubo ningún descuento no renderiza nada: un card en cero solo
 * agrega ruido a la vista.
 */
export default function DescuentosPanel({ subrubroId = null, desde, hasta, titulo = 'Descuentos aplicados', compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    cajaApi.getDescuentos({
      ...(desde ? { desde } : {}),
      ...(hasta ? { hasta } : {}),
      ...(subrubroId ? { subrubro_id: subrubroId } : {}),
    })
      .then(d => { if (vivo) setData(d); })
      .catch(() => { if (vivo) setData(null); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [subrubroId, desde, hasta]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
        <Loader2 size={12} className="animate-spin" /> Cargando descuentos...
      </div>
    );
  }
  if (!data || data.count === 0) return null;

  // % efectivo del período: cuánto se descontó sobre el total facturado alcanzado.
  const pctEfectivo = data.total_bruto > 0 ? (data.total / data.total_bruto) * 100 : null;

  return (
    <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors">
        <Percent size={15} className="text-purple-600 dark:text-purple-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
            {titulo}
            <InfoTooltip text="Descuentos por pago aplicados en el período. Cada uno generó una Nota de Crédito automática en su subrubro, así que el saldo de esas facturas ya está en cero." />
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {data.count} {data.count === 1 ? 'pago' : 'pagos'}
            {pctEfectivo !== null && ` · ${pctEfectivo.toFixed(1)}% promedio`}
          </p>
        </div>
        <span className={`font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap ${compact ? 'text-base' : 'text-xl'}`}>
          {fmt(data.total)}
        </span>
        <ChevronDown size={15} className={`text-purple-600 dark:text-purple-400 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="px-4 pb-3 -mt-1">
          {/* Desglose por subrubro: solo tiene sentido en la vista global. Dentro de un
              subrubro es una única fila redundante con el total de arriba. */}
          {!subrubroId && data.por_subrubro.length > 1 && (
            <div className="mb-3 pb-3 border-t border-purple-200 dark:border-purple-900 pt-2 space-y-1">
              {data.por_subrubro.map(s => (
                <div key={s.subrubro_id ?? 'sin'} className="flex justify-between gap-2 text-xs">
                  <span className="truncate min-w-0 text-slate-600 dark:text-slate-300">{s.nombre}</span>
                  <span className="shrink-0 text-slate-500 dark:text-slate-400">{s.count}×</span>
                  <span className="shrink-0 font-medium text-purple-700 dark:text-purple-300">{fmt(s.total)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-purple-200 dark:border-purple-900 pt-2 space-y-1.5 max-h-64 overflow-y-auto">
            {data.items.map(i => (
              <div key={i.id} className="flex items-baseline gap-2 text-xs">
                <span className="text-slate-400 shrink-0 tabular-nums">{formatFechaCorta(i.fecha)}</span>
                <span className="truncate min-w-0 text-slate-700 dark:text-slate-200">
                  {i.subrubro_nombre || i.concepto}
                </span>
                <span className="ml-auto shrink-0 text-slate-400 line-through">{fmt(i.monto_bruto ?? i.monto)}</span>
                <span className="shrink-0 font-medium text-purple-700 dark:text-purple-300">
                  −{fmt(i.descuento)}{i.descuento_pct ? ` (${i.descuento_pct}%)` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
