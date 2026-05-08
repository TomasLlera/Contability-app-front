import { useState, useEffect, useMemo } from 'react';
import { dashboardApi, subrubrosApi, cajaApi } from '../api';
import { TrendingUp, TrendingDown, Minus, ChevronRight, RotateCcw, BarChart3, ClipboardList } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);

const MESES = { '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun',
                '07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic' };

const RUBRO_ICONS = ['📁','👥','🏭','🏪','🚚','💼','🏗️','📦'];
function getRubroIcon(rubro) {
  if (rubro.icon) return rubro.icon;
  const n = rubro.nombre.toLowerCase();
  if (n.includes('emple') || n.includes('person')) return '👥';
  if (n.includes('provee') || n.includes('vendor')) return '🚚';
  if (n.includes('client') || n.includes('venta')) return '🏪';
  return RUBRO_ICONS[rubro.nombre.charCodeAt(0) % RUBRO_ICONS.length];
}

const todayStr = () => new Date().toISOString().split('T')[0];
const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

function FinancialCard({ label, value, negative, sub }) {
  return (
    <div className={`rounded-2xl p-5 border ${negative && value > 0 ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold ${negative && value > 0 ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>
        {fmt(value)}
      </p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function Delta({ current, previous, positiveIsGood = false }) {
  if (!previous || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const abs = Math.abs(pct).toFixed(1);
  if (Math.abs(pct) < 1) return <span className="inline-flex items-center gap-0.5 text-xs text-slate-400"><Minus size={11} /> Sin cambio</span>;
  if (pct > 0) {
    const color = positiveIsGood ? 'text-green-600' : 'text-red-500';
    return <span className={`inline-flex items-center gap-0.5 text-xs ${color} font-medium`}><TrendingUp size={11} /> +{abs}% vs mes ant.</span>;
  }
  const color = positiveIsGood ? 'text-red-500' : 'text-green-600';
  return <span className={`inline-flex items-center gap-0.5 text-xs ${color} font-medium`}><TrendingDown size={11} /> -{abs}% vs mes ant.</span>;
}

const METRICAS = [
  { key: 'facturado',  label: 'Facturas', color: 'bg-blue-500',    colorLight: 'bg-blue-200 dark:bg-blue-900/60' },
  { key: 'pagado',     label: 'Pagos',    color: 'bg-emerald-500', colorLight: 'bg-emerald-200 dark:bg-emerald-900/60' },
  { key: 'diferencia', label: 'Deuda',    color: 'bg-red-500',     colorLight: 'bg-red-200 dark:bg-red-900/60' },
];

function GraficoRanking({ comparacion, metrica, selectedId, onSelect }) {
  if (comparacion.length === 0) return null;
  const m = METRICAS.find(x => x.key === metrica);
  const vals = comparacion.map(s => Math.max(s[metrica] ?? 0, 0));
  const maxVal = Math.max(...vals, 1);

  return (
    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Ranking de subrubros
        </h4>
        {selectedId && (
          <button
            onClick={() => onSelect(null)}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors"
          >
            <RotateCcw size={11} /> Ver todos
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {comparacion.map(s => {
          const val = Math.max(s[metrica] ?? 0, 0);
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          const isSelected = selectedId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(isSelected ? null : s.id)}
              className={`w-full text-left flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <span className="text-base shrink-0 w-6 text-center">{s.icon || '📁'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium truncate ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {s.nombre}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 shrink-0">{fmt(val)}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isSelected ? m.color : m.colorLight}`}
                    style={{ width: `${Math.max(pct, 1)}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GraficoTendencia({ tendencia, metrica }) {
  const m = METRICAS.find(x => x.key === metrica);
  const vals = tendencia.map(t => Math.max(t[metrica] ?? 0, 0));
  const maxVal = Math.max(...vals, 1);

  if (tendencia.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
        Sin datos para este período
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end gap-2 h-40 mb-2">
        {tendencia.map((t, i) => {
          const val = Math.max(t[metrica] ?? 0, 0);
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          const isLast = i === tendencia.length - 1;
          const prev = tendencia[i - 1];
          const [anio, mes] = t.mes.split('-');
          return (
            <div key={t.mes} className="flex-1 h-full flex flex-col items-center gap-1 group relative">
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <p className="font-semibold">{fmt(val)}</p>
                {prev && <Delta current={val} previous={prev[metrica] ?? 0} positiveIsGood={metrica === 'pagado'} />}
              </div>
              <div className="w-full flex-1 flex items-end">
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${isLast ? m.color : m.colorLight}`}
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <p className={`text-xs ${isLast ? 'font-bold text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>
                {MESES[mes]}
              </p>
              {isLast && <p className="text-xs text-slate-400">{anio}</p>}
            </div>
          );
        })}
      </div>

      {tendencia.length >= 2 && (() => {
        const last = tendencia[tendencia.length - 1];
        const prev = tendencia[tendencia.length - 2];
        const val = last[metrica] ?? 0;
        const prevVal = prev[metrica] ?? 0;
        return (
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Mes actual</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{fmt(val)}</p>
            </div>
            <div className="ml-2">
              <Delta current={val} previous={prevVal} positiveIsGood={metrica === 'pagado'} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function GraficoCajaDia({ datos }) {
  const maxVal = Math.max(...datos.flatMap(d => [d.ingresosEfvo, d.transDelta, d.gastos]), 1);
  const today = todayStr();

  return (
    <div>
      <div className="flex items-end gap-1 h-40 mb-2">
        {datos.map(d => {
          const [, mes, dd] = d.fecha.split('-');
          const isToday = d.fecha === today;
          const h = (v) => `${Math.max((v / maxVal) * 100, v > 0 ? 2 : 0)}%`;
          return (
            <div key={d.fecha} className="flex-1 h-full flex flex-col items-center gap-0.5 group relative min-w-0">
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded-lg px-2.5 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <p className="font-semibold mb-1">{dd}/{mes}</p>
                <p className="text-green-400">Efvo {fmt(d.ingresosEfvo)}</p>
                <p className="text-blue-400">Trans {fmt(d.transDelta)}</p>
                <p className="text-red-400">Gastos {fmt(d.gastos)}</p>
              </div>
              <div className="w-full flex-1 flex items-end gap-px">
                <div className="flex-1 rounded-t-sm bg-green-400 dark:bg-green-500 transition-all duration-500" style={{ height: h(d.ingresosEfvo) }} />
                <div className="flex-1 rounded-t-sm bg-blue-400 dark:bg-blue-500 transition-all duration-500" style={{ height: h(d.transDelta) }} />
                <div className="flex-1 rounded-t-sm bg-red-400 dark:bg-red-500 transition-all duration-500" style={{ height: h(d.gastos) }} />
              </div>
              <p className={`text-xs truncate ${isToday ? 'font-bold text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>
                {dd}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-green-400" />Efectivo</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-400" />Transferencia</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-400" />Gastos</div>
      </div>
    </div>
  );
}

export default function Graficas({ rubros = [] }) {
  const [resumen, setResumen] = useState(null);
  const [selectedRubroId, setSelectedRubroId] = useState(null);
  const [subrubros, setSubrubros] = useState([]);
  const [selectedSubrubroId, setSelectedSubrubroId] = useState(null);
  const [metrica, setMetrica] = useState('facturado');
  const [tendencia, setTendencia] = useState([]);
  const [loadingTendencia, setLoadingTendencia] = useState(false);
  const [comparacion, setComparacion] = useState([]);

  // Caja
  const [cajaPreset, setCajaPreset] = useState(14);
  const [cajaMovs, setCajaMovs] = useState([]);
  const [cajaLoading, setCajaLoading] = useState(false);

  useEffect(() => {
    dashboardApi.getResumen().then(setResumen);
  }, []);

  useEffect(() => {
    if (rubros.length > 0 && !selectedRubroId) setSelectedRubroId(rubros[0].id);
  }, [rubros]);

  useEffect(() => {
    if (!selectedRubroId) return;
    setSelectedSubrubroId(null);
    setComparacion([]);
    subrubrosApi.getByRubro(selectedRubroId).then(setSubrubros);
    dashboardApi.getComparacion(selectedRubroId)
      .then(d => setComparacion(d.comparacion ?? []))
      .catch(() => {});
  }, [selectedRubroId]);

  useEffect(() => {
    if (!selectedRubroId) return;
    setLoadingTendencia(true);
    const request = selectedSubrubroId
      ? dashboardApi.getTendenciaSubrubro(selectedSubrubroId, 6)
      : dashboardApi.getTendencia(selectedRubroId, 6);
    request
      .then(d => setTendencia(d.tendencia ?? []))
      .finally(() => setLoadingTendencia(false));
  }, [selectedRubroId, selectedSubrubroId]);

  useEffect(() => {
    const hasta = todayStr();
    const desde = addDays(hasta, -(cajaPreset - 1));
    setCajaLoading(true);
    cajaApi.getRango(desde, hasta)
      .then(data => setCajaMovs(data))
      .catch(() => {})
      .finally(() => setCajaLoading(false));
  }, [cajaPreset]);

  const cajaByDia = useMemo(() => {
    const map = {};
    cajaMovs.forEach(m => {
      if (!map[m.fecha]) map[m.fecha] = { ingresosEfvo: 0, gastos: 0, saldoCuenta: null };
      if (m.tipo === 'empleado' || m.tipo === 'ingreso_extra') map[m.fecha].ingresosEfvo += m.monto;
      if (m.tipo === 'gasto') map[m.fecha].gastos += m.monto;
      if (m.tipo === 'saldo_cuenta') map[m.fecha].saldoCuenta = m.monto;
    });
    const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([fecha, v]) => ({ fecha, ...v }));
    return sorted.map((d, i) => {
      const prev = sorted[i - 1];
      const transDelta = (d.saldoCuenta !== null && prev?.saldoCuenta != null)
        ? Math.max(d.saldoCuenta - prev.saldoCuenta, 0)
        : 0;
      return { ...d, transDelta };
    });
  }, [cajaMovs]);

  const totalEfvo     = cajaByDia.reduce((s, d) => s + d.ingresosEfvo, 0);
  const totalTrans    = cajaByDia.reduce((s, d) => s + d.transDelta, 0);
  const totalGastos   = cajaByDia.reduce((s, d) => s + d.gastos, 0);
  const balance       = totalEfvo + totalTrans - totalGastos;

  const rubroSeleccionado = rubros.find(r => r.id === selectedRubroId);
  const subrubroSeleccionado = subrubros.find(s => s.id === selectedSubrubroId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Cards financieras del mes actual */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FinancialCard label="Facturado este mes" value={resumen.facturadoMes}
            sub="Total de facturas ingresadas" />
          <FinancialCard label="Pagado este mes" value={resumen.pagadoMes}
            sub="Total de pagos registrados" />
          <FinancialCard label="Deuda total acumulada" value={resumen.deudaTotal}
            negative sub="Diferencia histórica facturado − pagado" />
        </div>
      )}

      {/* Gráfico interactivo de rubros */}
      {rubros.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mr-auto">Tendencia mensual</h3>
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
              {METRICAS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMetrica(m.key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    metrica === m.key
                      ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-5">
            <select
              value={selectedRubroId ?? ''}
              onChange={e => setSelectedRubroId(Number(e.target.value))}
              className="min-w-0 flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {rubros.map(r => (
                <option key={r.id} value={r.id}>{getRubroIcon(r)} {r.nombre}</option>
              ))}
            </select>

            {subrubros.length > 0 && (
              <>
                <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
                <select
                  value={selectedSubrubroId ?? ''}
                  onChange={e => setSelectedSubrubroId(e.target.value ? Number(e.target.value) : null)}
                  className="min-w-0 flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Todos los subrubros</option>
                  {subrubros.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.icon ? `${s.icon} ` : ''}{s.nombre}
                    </option>
                  ))}
                </select>
              </>
            )}

            <span className="hidden sm:block text-xs text-slate-400 dark:text-slate-500 shrink-0">últimos 6 meses</span>
          </div>

          {loadingTendencia ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Cargando...</div>
          ) : (
            <GraficoTendencia tendencia={tendencia} metrica={metrica} />
          )}

          <GraficoRanking
            comparacion={comparacion}
            metrica={metrica}
            selectedId={selectedSubrubroId}
            onSelect={setSelectedSubrubroId}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-12 text-center">
          <BarChart3 size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">Sin rubros para graficar</p>
          <p className="text-sm text-slate-400 mt-1">Creá rubros y cargá movimientos para ver las tendencias</p>
        </div>
      )}

      {/* Caja del día — Historial */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mr-auto flex items-center gap-2">
            <ClipboardList size={14} className="text-blue-500" /> Caja del día — Historial
          </h3>
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
            {[7, 14, 30].map(n => (
              <button key={n} onClick={() => setCajaPreset(n)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  cajaPreset === n
                    ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}>
                {n}d
              </button>
            ))}
          </div>
        </div>

        {cajaLoading ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Cargando...</div>
        ) : cajaByDia.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sin datos de caja para este período</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50 rounded-xl p-3">
                <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">Efectivo</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-400">{fmt(totalEfvo)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Transferencia</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{fmt(totalTrans)}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl p-3">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Gastos</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{fmt(totalGastos)}</p>
              </div>
              <div className={`rounded-xl p-3 border ${balance >= 0 ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600' : 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50'}`}>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Balance neto</p>
                <p className={`text-lg font-bold ${balance >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600'}`}>{fmt(balance)}</p>
              </div>
            </div>
            <GraficoCajaDia datos={cajaByDia} />
          </>
        )}
      </div>

    </div>
  );
}
