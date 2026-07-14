import Modal from './Modal';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Users, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react';

const fmt = (n) => (n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCorto = (n) => {
  const v = Math.abs(n || 0);
  if (v >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n || 0}`;
};
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const labelMes = (mes) => {
  if (!mes) return '';
  const [y, m] = mes.split('-');
  return `${MESES[Number(m) - 1]} ${y}`;
};

// Registro mensual de tarjetas: totales por tipo vs mes anterior, composición diaria
// apilada y acumulado por empleado. `tipos` viene de TarjetasView (única fuente de
// verdad de labels/colores). Navegable por mes con onMesChange.
export default function TarjetasGraficosModal({ data, tipos, mes, onMesChange, onClose }) {
  const {
    por_tipo = {}, total = 0, mes_anterior = {}, comparativa = {},
    comparativa_tipos = {}, serie = [], por_empleado = [],
  } = data || {};

  const sube = (comparativa.diferencia || 0) > 0;
  const igual = (comparativa.diferencia || 0) === 0;

  return (
    <Modal title="Registro mensual — Tarjetas" onClose={onClose} size="2xl">
      <div className="space-y-4">
        {/* Navegador de mes */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-hidden text-xs">
            <button onClick={() => onMesChange(-1)} title="Mes anterior"
              className="h-full px-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft size={14} /></button>
            <span className="h-full flex items-center px-3 border-x border-slate-300 dark:border-slate-600 font-medium text-slate-700 dark:text-slate-200">{labelMes(mes)}</span>
            <button onClick={() => onMesChange(1)} title="Mes siguiente"
              className="h-full px-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight size={14} /></button>
          </div>
        </div>

        {/* Totales por tipo + total del mes */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {tipos.map(({ key, label, text }) => {
            const g = por_tipo[key] || { total: 0 };
            const c = comparativa_tipos[key] || {};
            return (
              <div key={key} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className={`text-sm font-semibold ${text}`}>{fmt(g.total)}</p>
                <p className="text-[11px] text-slate-400">
                  {c.porcentaje === null || c.porcentaje === undefined
                    ? `Anterior: ${fmt(c.anterior)}`
                    : `${c.porcentaje > 0 ? '+' : ''}${c.porcentaje.toFixed(1)}% vs mes ant.`}
                </p>
              </div>
            );
          })}
          <div className="bg-slate-900 dark:bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
            <p className="text-[11px] text-slate-400">Total del mes</p>
            <p className="text-sm font-bold text-white">{fmt(total)}</p>
            <p className="text-[11px] flex items-center gap-1 text-slate-400">
              {igual ? <Minus size={10} /> : sube ? <TrendingUp size={10} className="text-green-500" /> : <TrendingDown size={10} className="text-red-500" />}
              {comparativa.porcentaje === null || comparativa.porcentaje === undefined
                ? `Anterior: ${fmt(mes_anterior.total)}`
                : `${comparativa.porcentaje > 0 ? '+' : ''}${comparativa.porcentaje.toFixed(1)}%`}
            </p>
          </div>
        </div>

        {/* Composición diaria apilada */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">Composición por tipo — {labelMes(mes)}</p>
          <div className="h-72 text-slate-400">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} tickFormatter={fmtCorto} width={52} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12 }}
                  formatter={(v) => fmt(v)} labelFormatter={(d) => `Día ${d}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {tipos.map(({ key, label, color }, i) => (
                  <Bar key={key} dataKey={key} name={label} stackId="tarjetas" fill={color}
                    radius={i === tipos.length - 1 ? [4, 4, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Acumulado por empleado */}
        {por_empleado.length > 0 && (
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/40">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Users size={13} className="text-green-600" /> Por empleado — {labelMes(mes)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead className="text-slate-400">
                  <tr className="border-b border-slate-100 dark:border-slate-700/60">
                    <th className="text-left px-3 py-1.5 font-medium">Empleado</th>
                    {tipos.map(t => <th key={t.key} className={`text-right px-3 py-1.5 font-medium ${t.text}`}>{t.label}</th>)}
                    <th className="text-right px-3 py-1.5 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {por_empleado.map(e => (
                    <tr key={e.empleado} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200">{e.empleado}</td>
                      {tipos.map(t => (
                        <td key={t.key} className="px-3 py-1.5 text-right text-slate-500">{e[t.key] ? fmt(e[t.key]) : '—'}</td>
                      ))}
                      <td className="px-3 py-1.5 text-right font-semibold text-slate-700 dark:text-slate-200">{fmt(e.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
