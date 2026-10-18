import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Landmark } from 'lucide-react';
import { BancoBadge } from './BancoBadge';
import { fmtMoneda, fmtMonedaCompacta, fmtPct } from '../utils/formato';

const fmt = fmtMoneda;
const SIN = 'sin_banco';

/**
 * Gráficos de Caja por banco (multi-banco). Recibe los períodos ya agregados en el
 * backend (GET /caja/graficas) y solo los presenta:
 *   • evolución del saldo por banco (líneas; acá sí entran los movimientos entre bancos),
 *   • gastos por transferencia por banco en el período,
 *   • efectivo vs. transferencia, con la transferencia desglosada por banco.
 * Los movimientos entre bancos nunca cuentan como gasto ni ingreso.
 */
export default function CajaBancosGraficos({ periodos, bancoDe }) {
  const nombre = (k) => (k === SIN ? 'Sin banco' : (bancoDe(k)?.alias || bancoDe(k)?.nombre || `#${k}`));
  const color = (k) => (k === SIN ? '#94a3b8' : bancoDe(k)?.color || '#2563eb');

  // Series de saldo: una por banco con algún saldo en el período.
  const clavesSaldo = [...new Set(periodos.flatMap(p => Object.keys(p.saldoPorBanco || {})))];
  const datosSaldo = periodos.map(p => ({ label: p.label, ...p.saldoPorBanco }));

  // Totales del período (los períodos ya vienen sumados por el backend).
  const gastosPorBanco = new Map();
  for (const p of periodos) {
    for (const [k, v] of Object.entries(p.gastosTransPorBanco || {})) gastosPorBanco.set(k, (gastosPorBanco.get(k) || 0) + v);
  }
  const filasGastos = [...gastosPorBanco].sort((a, b) => b[1] - a[1]);
  const maxGasto = Math.max(1, ...filasGastos.map(([, v]) => v));
  const efectivo = periodos.reduce((s, p) => s + (p.gastosEfvo || 0), 0);
  const transferencia = filasGastos.reduce((s, [, v]) => s + v, 0);
  const totalMetodos = efectivo + transferencia;

  const card = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5';
  const titulo = 'text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4';

  return (
    <div className="space-y-5">
      <div className={card}>
        <h3 className={titulo}><Landmark size={14} className="text-blue-600 dark:text-blue-400" /> Evolución del saldo por banco</h3>
        {clavesSaldo.length === 0 ? (
          <p className="h-32 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">Sin saldos en cuenta cargados en el período</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosSaldo} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-500" />
                <YAxis tickFormatter={fmtMonedaCompacta} tick={{ fontSize: 11 }} width={72} stroke="currentColor" className="text-slate-500" />
                <Tooltip formatter={(v, k) => [fmt(v), nombre(k)]} />
                <Legend formatter={(k) => nombre(k)} />
                {clavesSaldo.map(k => (
                  <Line key={k} type="monotone" dataKey={k} stroke={color(k)} strokeWidth={2} dot={{ r: 2 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Último saldo cargado de cada banco en el período, más los movimientos entre bancos de ese día en adelante.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={card}>
          <h3 className={titulo}>Gastos por transferencia, por banco</h3>
          {filasGastos.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Sin gastos por transferencia en el período.</p>
          ) : (
            <ul className="space-y-3">
              {filasGastos.map(([k, v]) => (
                <li key={k}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <BancoBadge banco={k === SIN ? null : bancoDe(k)} />
                    <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{fmt(v)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(v / maxGasto) * 100}%`, background: color(k) }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={card}>
          <h3 className={titulo}>Efectivo vs. transferencia (gastos)</h3>
          {totalMetodos === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Sin gastos en el período.</p>
          ) : (
            <>
              <div className="flex h-4 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700" role="img"
                aria-label={`Efectivo ${fmtPct((efectivo / totalMetodos) * 100, { signo: false })}, transferencia ${fmtPct((transferencia / totalMetodos) * 100, { signo: false })}`}>
                <div style={{ width: `${(efectivo / totalMetodos) * 100}%`, background: '#16a34a' }} />
                {filasGastos.map(([k, v]) => <div key={k} style={{ width: `${(v / totalMetodos) * 100}%`, background: color(k) }} />)}
              </div>
              <ul className="mt-3 space-y-1.5 text-xs">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-green-600" /> Efectivo</span>
                  <span className="tabular-nums text-slate-700 dark:text-slate-200">{fmt(efectivo)} · {fmtPct((efectivo / totalMetodos) * 100, { signo: false })}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Transferencia</span>
                  <span className="tabular-nums text-slate-700 dark:text-slate-200">{fmt(transferencia)} · {fmtPct((transferencia / totalMetodos) * 100, { signo: false })}</span>
                </li>
                {filasGastos.map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between pl-4">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: color(k) }} /> {nombre(k)}</span>
                    <span className="tabular-nums text-slate-500 dark:text-slate-400">{fmt(v)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
