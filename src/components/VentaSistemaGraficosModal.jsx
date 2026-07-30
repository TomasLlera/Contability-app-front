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
export default function VentaSistemaGraficosModal({ data, tipos, onClose }) {
  const [tab, setTab] = useState('evolucion');
  const {
    mes, serie = [], mes_anterior = {}, quincenas = [], semanas = [],
    // total = ticket + facturado. El IVA 21% sale SOLO del facturado: el ticket no
    // genera débito fiscal. Los tres los calcula el backend sobre las ventas del mes.
    total = 0, total_ticket = 0, total_facturado = 0, iva_21 = 0, alicuota = 0.21,
  } = data || {};

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
        {/* Totales del mes por tipo + IVA del facturado + total consolidado */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Total Ticket" value={fmt(total_ticket)} hint={`Anterior: ${fmt(mes_anterior.total_ticket)}`} tone="violet" />
          <Stat label="Total Facturado" value={fmt(total_facturado)} hint={`Anterior: ${fmt(mes_anterior.total_facturado)}`} tone="blue" />
          <Stat label={`Total IVA ${(alicuota * 100).toFixed(0)}%`} value={fmt(iva_21)} hint="Solo sobre lo facturado" tone="sky" />
          <Stat label="Total del mes" value={fmt(total)} hint="Ticket + facturado" tone="strong" />
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
          {/* Evolución diaria apilada por tipo: la altura total sigue siendo la venta
              del día, pero se ve qué parte se facturó. */}
          {tab === 'evolucion' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} vertical={false} />
                <XAxis dataKey="dia" tick={axisCls} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={axisCls} tickLine={false} axisLine={false} tickFormatter={fmtCorto} width={52} />
                <Tooltip {...tooltipStyle} labelFormatter={(d) => `Día ${d}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {tipos.map(({ key, label, color }, i) => (
                  <Bar key={key} dataKey={key} name={label} stackId="ventas" fill={color}
                    radius={i === tipos.length - 1 ? [4, 4, 0, 0] : undefined} />
                ))}
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
    violet: 'text-violet-600 dark:text-violet-400',
    sky: 'text-sky-600 dark:text-sky-400',
    strong: 'text-slate-900 dark:text-white font-bold',
  };
  return (
    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`text-sm font-semibold ${tones[tone]}`}>{value}</p>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
