import { useState } from 'react';
import Modal from './Modal';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';

const fmt = (n) => (n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
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

const TABS = [
  ['evolucion', 'Evolución diaria'],
  ['comparativa', 'Mes actual vs anterior'],
  ['periodos', 'Quincenas y semanas'],
];

// Gráficos detallados del mes: evolución diaria, cruce contra el mes anterior y
// comparativa por quincenas/semanas. Recibe el payload de registroApi.ventas.getMes.
export default function VentaSistemaGraficosModal({ data, onClose }) {
  const [tab, setTab] = useState('evolucion');
  const { mes, serie = [], mes_anterior = {}, quincenas = [], semanas = [], stats = {}, total = 0 } = data || {};

  // Serie combinada actual vs anterior, alineada por día del mes.
  const seriePrev = mes_anterior.serie || [];
  const dias = Math.max(serie.length, seriePrev.length);
  const comparada = Array.from({ length: dias }, (_, i) => ({
    dia: i + 1,
    actual: serie[i]?.total ?? 0,
    anterior: seriePrev[i]?.total ?? 0,
  }));

  const periodos = [
    ...quincenas.map(q => ({ label: q.label, total: q.total, color: '#3b82f6' })),
    ...semanas.map(s => ({ label: `${s.label} (${s.desde}-${s.hasta})`, total: s.total, color: '#8b5cf6' })),
  ];

  const axisCls = { fontSize: 11, fill: 'currentColor' };
  const tooltipStyle = {
    contentStyle: { borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12 },
    formatter: (v) => fmt(v),
  };

  return (
    <Modal title={`Ventas del sistema — ${labelMes(mes)}`} onClose={onClose} size="2xl">
      <div className="space-y-4">
        {/* Estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Total del mes" value={fmt(total)} tone="blue" />
          <Stat label="Promedio diario" value={fmt(stats.promedio_diario)} hint={`${stats.dias_con_ventas || 0} días con ventas`} />
          <Stat label="Máximo" value={fmt(stats.maximo?.total)} hint={stats.maximo ? `Día ${stats.maximo.dia}` : '—'} tone="green" />
          <Stat label="Mínimo" value={fmt(stats.minimo?.total)} hint={stats.minimo ? `Día ${stats.minimo.dia}` : '—'} tone="amber" />
        </div>

        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                tab === key ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >{label}</button>
          ))}
        </div>

        <div className="h-72 text-slate-400">
          {tab === 'evolucion' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} vertical={false} />
                <XAxis dataKey="dia" tick={axisCls} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={axisCls} tickLine={false} axisLine={false} tickFormatter={fmtCorto} width={52} />
                <Tooltip {...tooltipStyle} labelFormatter={(d) => `Día ${d}`} />
                <Bar dataKey="total" name="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {tab === 'comparativa' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparada} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} vertical={false} />
                <XAxis dataKey="dia" tick={axisCls} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={axisCls} tickLine={false} axisLine={false} tickFormatter={fmtCorto} width={52} />
                <Tooltip {...tooltipStyle} labelFormatter={(d) => `Día ${d}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="actual" name={labelMes(mes)} stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="anterior" name={labelMes(mes_anterior.mes)} stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {tab === 'periodos' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={periodos} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} vertical={false} />
                <XAxis dataKey="label" tick={{ ...axisCls, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={axisCls} tickLine={false} axisLine={false} tickFormatter={fmtCorto} width={52} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="total" name="Ventas" radius={[4, 4, 0, 0]}>
                  {periodos.map((p, i) => <Cell key={i} fill={p.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value, hint, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-700 dark:text-slate-200',
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };
  return (
    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`text-sm font-semibold ${tones[tone]}`}>{value}</p>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
