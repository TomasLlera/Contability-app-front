import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);

// Métricas por defecto (rubros). Se pueden sobreescribir con la prop `metricas`
// (p. ej. caja usa ingresos/egresos/neto).
const METRICAS_DEFAULT = [
  { key: 'facturado', label: 'Facturado', good: true,  bar: 'bg-blue-500' },
  { key: 'pagado',    label: 'Pagado',    good: true,  bar: 'bg-emerald-500' },
  { key: 'deuda',     label: 'Deuda',     good: false, bar: 'bg-red-500' },
];

function pctChange(cur, prev) {
  if (!prev || prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

// Badge de variación coloreado: verde si el cambio es bueno, rojo si es malo.
function DeltaBadge({ cur, prev, good }) {
  const pct = pctChange(cur, prev);
  if (pct === null || Math.abs(pct) < 0.5) {
    return <span className="inline-flex items-center gap-0.5 text-xs text-slate-400 font-medium"><Minus size={12} /> = sin cambio</span>;
  }
  const up = pct > 0;
  const positivo = good ? up : !up; // ¿es un buen resultado?
  const cls = positivo ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400';
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${cls}`}>
      <Icon size={12} /> {up ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

// Par de barras (actual vs anterior) escaladas al máximo del par.
function BarPair({ actual, anterior, bar }) {
  const max = Math.max(actual, anterior, 1);
  const rows = [
    { l: 'Actual', v: actual, cls: bar },
    { l: 'Anterior', v: anterior, cls: 'bg-slate-300 dark:bg-slate-600' },
  ];
  return (
    <div className="space-y-1">
      {rows.map(r => (
        <div key={r.l} className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[11px] text-slate-400">{r.l}</span>
          <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${r.cls} transition-all duration-500`} style={{ width: `${Math.max((r.v / max) * 100, r.v > 0 ? 3 : 0)}%` }} />
          </div>
          <span className="w-24 shrink-0 text-right text-[11px] font-medium text-slate-600 dark:text-slate-300 tabular-nums">{fmt(r.v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ComparativaCard({ titulo, subtitulo, icon, actual, anterior, footer, defaultOpen = false, metricas = METRICAS_DEFAULT }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!actual || !anterior) return null;

  // El "titular" de la card se basa en la primera métrica (actividad principal).
  const principal = metricas[0];
  const pctFact = pctChange(actual[principal.key], anterior[principal.key]);
  const trendUp = pctFact !== null && pctFact > 0.5;
  const trendDown = pctFact !== null && pctFact < -0.5;
  const accent = trendUp
    ? 'border-emerald-200 dark:border-emerald-800/70'
    : trendDown
    ? 'border-red-200 dark:border-red-800/70'
    : 'border-slate-200 dark:border-slate-700';

  return (
    <div className={`bg-white dark:bg-slate-800 border rounded-2xl p-4 ${accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{titulo}</h3>
            {subtitulo && <p className="text-xs text-slate-400 truncate">{subtitulo}</p>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <DeltaBadge cur={actual[principal.key]} prev={anterior[principal.key]} good={principal.good} />
          <p className="text-[11px] text-slate-400 mt-0.5">{principal.label.toLowerCase()}</p>
        </div>
      </div>

      {/* Resumen compacto: 3 métricas con su delta */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {metricas.map(m => (
          <div key={m.key} className="rounded-lg bg-slate-50 dark:bg-slate-700/40 px-2.5 py-2">
            <p className="text-[11px] text-slate-400 mb-0.5">{m.label}</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums truncate">{fmt(actual[m.key])}</p>
            <DeltaBadge cur={actual[m.key]} prev={anterior[m.key]} good={m.good} />
          </div>
        ))}
      </div>

      <button
        onClick={() => setOpen(o => !o)}
        className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {open ? 'Ocultar detalle' : 'Ver detalle (barras comparativas)'}
      </button>

      {open && (
        <div className="mt-3 space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          {metricas.map(m => (
            <div key={m.key}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{m.label}</p>
              <BarPair actual={actual[m.key]} anterior={anterior[m.key]} bar={m.bar} />
            </div>
          ))}
          {footer}
        </div>
      )}
    </div>
  );
}
