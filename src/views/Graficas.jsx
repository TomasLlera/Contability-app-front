import { useState, useEffect, useMemo } from 'react';
import { dashboardApi, subrubrosApi, cajaApi, stockApi } from '../api';
import { TrendingUp, TrendingDown, Minus, ChevronRight, ChevronDown, RotateCcw, BarChart3, ClipboardList } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);
const fmtNum = (n) => new Intl.NumberFormat('es-AR').format(n ?? 0);

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

// ── Caja charts config ────────────────────────────────────────────────────────
const CAJA_PRESETS = { dia: [15, 30, 60], mes: [3, 6, 12], anio: [2, 3, 5] };
const presetLabel = (v, vista) => {
  if (vista === 'dia') return `${v}d`;
  if (vista === 'mes') return `${v}m`;
  return `${v}a`;
};
const CAJA_CHARTS = [
  { key: 'ingresosEfvo',     label: 'Ingreso efectivo',    color: 'bg-green-500',  colorLight: 'bg-green-200 dark:bg-green-900/50',   text: 'text-green-700 dark:text-green-400' },
  { key: 'transDelta',       label: 'Ingreso trans',       color: 'bg-blue-500',   colorLight: 'bg-blue-200 dark:bg-blue-900/50',     text: 'text-blue-600 dark:text-blue-400' },
  { key: 'gastosEfvo',       label: 'Gasto efectivo',      color: 'bg-orange-500', colorLight: 'bg-orange-200 dark:bg-orange-900/50', text: 'text-orange-600 dark:text-orange-400' },
  { key: 'gastosTrans',      label: 'Gasto trans',         color: 'bg-purple-500', colorLight: 'bg-purple-200 dark:bg-purple-900/50', text: 'text-purple-600 dark:text-purple-400' },
  { key: 'totalGastos',      label: 'Gastos totales',      color: 'bg-red-500',    colorLight: 'bg-red-200 dark:bg-red-900/50',       text: 'text-red-600 dark:text-red-400' },
  { key: 'gastosEspeciales', label: 'Especiales',          color: 'bg-amber-500',  colorLight: 'bg-amber-200 dark:bg-amber-900/50',   text: 'text-amber-600 dark:text-amber-400' },
];

// ── Componentes compartidos ───────────────────────────────────────────────────
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
    return <span className={`inline-flex items-center gap-0.5 text-xs ${color} font-medium`}><TrendingUp size={11} /> +{abs}% vs ant.</span>;
  }
  const color = positiveIsGood ? 'text-red-500' : 'text-green-600';
  return <span className={`inline-flex items-center gap-0.5 text-xs ${color} font-medium`}><TrendingDown size={11} /> -{abs}% vs ant.</span>;
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
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Ranking de subrubros</h4>
        {selectedId && (
          <button onClick={() => onSelect(null)} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
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
            <button key={s.id} onClick={() => onSelect(isSelected ? null : s.id)}
              className={`w-full text-left flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
              <span className="text-base shrink-0 w-6 text-center">{s.icon || '📁'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium truncate ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{s.nombre}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 shrink-0">{fmt(val)}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${isSelected ? m.color : m.colorLight}`} style={{ width: `${Math.max(pct, 1)}%` }} />
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
  if (tendencia.length === 0) return <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sin datos para este período</div>;
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
                <div className={`w-full rounded-t-lg transition-all duration-500 ${isLast ? m.color : m.colorLight}`} style={{ height: `${Math.max(pct, 2)}%` }} />
              </div>
              <p className={`text-xs ${isLast ? 'font-bold text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>{MESES[mes]}</p>
              {isLast && <p className="text-xs text-slate-400">{anio}</p>}
            </div>
          );
        })}
      </div>
      {tendencia.length >= 2 && (() => {
        const last = tendencia[tendencia.length - 1];
        const prev = tendencia[tendencia.length - 2];
        return (
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Mes actual</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{fmt(last[metrica] ?? 0)}</p>
            </div>
            <div className="ml-2"><Delta current={last[metrica] ?? 0} previous={prev[metrica] ?? 0} positiveIsGood={metrica === 'pagado'} /></div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Gráfico de barras genérico para caja ─────────────────────────────────────
function CajaBarChart({ datos, chartCfg }) {
  const vals = datos.map(d => d[chartCfg.key] || 0);
  const maxVal = Math.max(...vals, 1);
  const total = vals.reduce((s, v) => s + v, 0);

  if (datos.length === 0) return <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sin datos para este período</div>;

  const minBarW = 22;
  const needsScroll = datos.length > 14;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className={`text-2xl font-bold ${chartCfg.text}`}>{fmt(total)}</p>
        <p className="text-xs text-slate-400">Total del período</p>
      </div>
      <div className={needsScroll ? 'overflow-x-auto -mx-1 px-1' : ''}>
        <div className="flex items-end gap-1.5 h-40 mb-2" style={needsScroll ? { minWidth: `${datos.length * (minBarW + 6)}px` } : {}}>
          {datos.map((d, i) => {
            const val = d[chartCfg.key] || 0;
            const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
            const isLast = i === datos.length - 1;
            const prev = datos[i - 1];
            return (
              <div key={d.key} className="flex-1 h-full flex flex-col items-center gap-1 group relative" style={needsScroll ? { minWidth: `${minBarW}px` } : {}}>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <p className="font-semibold">{d.label}</p>
                  <p>{fmt(val)}</p>
                  {prev && val > 0 && <Delta current={val} previous={prev[chartCfg.key] || 0} positiveIsGood={chartCfg.key.startsWith('ingreso') || chartCfg.key === 'transDelta'} />}
                </div>
                <div className="w-full flex-1 flex items-end">
                  <div className={`w-full rounded-t-lg transition-all duration-500 ${isLast ? chartCfg.color : chartCfg.colorLight}`}
                    style={{ height: `${Math.max(pct, val > 0 ? 2 : 0)}%` }} />
                </div>
                <p className={`text-xs ${isLast ? 'font-bold text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>{d.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Graficas({ rubros = [] }) {
  const [tab, setTab] = useState(() => sessionStorage.getItem('graficas_tab') || 'rubros');
  const [showResumen, setShowResumen] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [selectedRubroId, setSelectedRubroId] = useState(null);
  const [subrubros, setSubrubros] = useState([]);
  const [selectedSubrubroId, setSelectedSubrubroId] = useState(null);
  const [metrica, setMetrica] = useState('facturado');
  const [tendencia, setTendencia] = useState([]);
  const [loadingTendencia, setLoadingTendencia] = useState(false);
  const [comparacion, setComparacion] = useState([]);

  // Caja
  const [cajaVista, setCajaVista]     = useState('dia');
  const [cajaPreset, setCajaPreset]   = useState(30);
  const [cajaMetrica, setCajaMetrica] = useState('ingresosEfvo');
  const [cajaMovs, setCajaMovs]       = useState([]);
  const [cajaLoading, setCajaLoading] = useState(false);

  // Stock
  const [stockVista, setStockVista]   = useState('mes');
  const [stockAnio, setStockAnio]     = useState(new Date().getFullYear());
  const [stockData, setStockData]     = useState(null);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => { dashboardApi.getResumen().then(setResumen); }, []);
  useEffect(() => { if (rubros.length > 0 && !selectedRubroId) setSelectedRubroId(rubros[0].id); }, [rubros]);

  useEffect(() => {
    if (!selectedRubroId) return;
    setSelectedSubrubroId(null); setComparacion([]);
    subrubrosApi.getByRubro(selectedRubroId).then(setSubrubros);
    dashboardApi.getComparacion(selectedRubroId).then(d => setComparacion(d.comparacion ?? [])).catch(() => {});
  }, [selectedRubroId]);

  useEffect(() => {
    if (!selectedRubroId) return;
    setLoadingTendencia(true);
    const req = selectedSubrubroId
      ? dashboardApi.getTendenciaSubrubro(selectedSubrubroId, 6)
      : dashboardApi.getTendencia(selectedRubroId, 6);
    req.then(d => setTendencia(d.tendencia ?? [])).finally(() => setLoadingTendencia(false));
  }, [selectedRubroId, selectedSubrubroId]);

  useEffect(() => {
    if (tab !== 'caja') return;
    const hasta = todayStr();
    let desde;
    if (cajaVista === 'dia') {
      if (cajaPreset === 'mes') {
        desde = todayStr().slice(0, 7) + '-01';
      } else {
        desde = addDays(hasta, -(Number(cajaPreset) - 1));
      }
    } else if (cajaVista === 'mes') {
      const d = new Date(hasta + 'T00:00:00');
      d.setMonth(d.getMonth() - cajaPreset);
      desde = d.toISOString().split('T')[0];
    } else {
      const d = new Date(hasta + 'T00:00:00');
      d.setFullYear(d.getFullYear() - cajaPreset);
      desde = d.toISOString().split('T')[0];
    }
    setCajaLoading(true);
    cajaApi.getRango(desde, hasta).then(data => setCajaMovs(data)).catch(() => {}).finally(() => setCajaLoading(false));
  }, [tab, cajaPreset, cajaVista]);

  useEffect(() => {
    if (tab !== 'stock') return;
    setStockLoading(true);
    stockApi.getGraficas(stockVista, stockVista === 'dia' ? undefined : stockAnio)
      .then(setStockData).catch(() => {}).finally(() => setStockLoading(false));
  }, [tab, stockVista, stockAnio]);

  const cajaAggregated = useMemo(() => {
    const getKey = (fecha) => {
      if (cajaVista === 'dia') return fecha;
      if (cajaVista === 'mes') return fecha.slice(0, 7);
      return fecha.slice(0, 4);
    };
    const getLabel = (key) => {
      if (cajaVista === 'dia') return key.split('-')[2];
      if (cajaVista === 'mes') { const [a, m] = key.split('-'); return `${MESES[m]}'${a.slice(2)}`; }
      return key;
    };

    const map = {};
    cajaMovs.forEach(m => {
      const key = getKey(m.fecha);
      if (!map[key]) map[key] = { ingresosEfvo: 0, gastosEfvo: 0, gastosTrans: 0, gastosEspeciales: 0, saldoCuentaLast: null };
      if ((m.tipo === 'empleado' || m.tipo === 'ingreso_extra') && m.metodo === 'efectivo') map[key].ingresosEfvo += m.monto;
      if (m.tipo === 'gasto') {
        if (m.metodo === 'efectivo') map[key].gastosEfvo += m.monto;
        else map[key].gastosTrans += m.monto;
        if (m.es_especial) map[key].gastosEspeciales += m.monto;
      }
      if (m.tipo === 'saldo_cuenta') map[key].saldoCuentaLast = m.monto;
    });

    const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => ({ key, label: getLabel(key), ...v }));
    return sorted.map((d, i) => {
      const prev = sorted[i - 1];
      const transDelta = (d.saldoCuentaLast !== null && prev?.saldoCuentaLast != null)
        ? Math.max(d.saldoCuentaLast - prev.saldoCuentaLast, 0) : 0;
      return { ...d, transDelta, totalGastos: d.gastosEfvo + d.gastosTrans };
    });
  }, [cajaMovs, cajaVista]);

  const activeCajaCfg = CAJA_CHARTS.find(c => c.key === cajaMetrica) || CAJA_CHARTS[0];

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
        {[['rubros', '📊 Rubros'], ['caja', '🗂️ Caja'], ['stock', '📦 Stock']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); sessionStorage.setItem('graficas_tab', key); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Rubros */}
      {tab === 'rubros' && (
        <>
          <div>
            <button
              onClick={() => setShowResumen(v => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mb-2"
            >
              {showResumen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              {showResumen ? 'Ocultar resumen del mes' : 'Ver resumen del mes'}
            </button>
            {showResumen && resumen && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                <FinancialCard label="Facturado este mes" value={resumen.facturadoMes} sub="Total de facturas ingresadas" />
                <FinancialCard label="Pagado este mes" value={resumen.pagadoMes} sub="Total de pagos registrados" />
                <FinancialCard label="Deuda total acumulada" value={resumen.deudaTotal} negative sub="Diferencia histórica facturado − pagado" />
              </div>
            )}
          </div>

          {rubros.length > 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mr-auto">Tendencia mensual</h3>
                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
                  {METRICAS.map(m => (
                    <button key={m.key} onClick={() => setMetrica(m.key)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${metrica === m.key ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <select value={selectedRubroId ?? ''} onChange={e => setSelectedRubroId(Number(e.target.value))}
                  className="min-w-0 flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {rubros.map(r => <option key={r.id} value={r.id}>{getRubroIcon(r)} {r.nombre}</option>)}
                </select>
                {subrubros.length > 0 && (
                  <>
                    <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
                    <select value={selectedSubrubroId ?? ''} onChange={e => setSelectedSubrubroId(e.target.value ? Number(e.target.value) : null)}
                      className="min-w-0 flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="">Todos los subrubros</option>
                      {subrubros.map(s => <option key={s.id} value={s.id}>{s.icon ? `${s.icon} ` : ''}{s.nombre}</option>)}
                    </select>
                  </>
                )}
                <span className="hidden sm:block text-xs text-slate-400 dark:text-slate-500 shrink-0">últimos 6 meses</span>
              </div>
              {loadingTendencia
                ? <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Cargando...</div>
                : <GraficoTendencia tendencia={tendencia} metrica={metrica} />}
              {comparacion.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => setShowRanking(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showRanking ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    {showRanking ? 'Ocultar ranking de subrubros' : 'Ver ranking de subrubros'}
                  </button>
                  {showRanking && <GraficoRanking comparacion={comparacion} metrica={metrica} selectedId={selectedSubrubroId} onSelect={setSelectedSubrubroId} />}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-12 text-center">
              <BarChart3 size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">Sin rubros para graficar</p>
              <p className="text-sm text-slate-400 mt-1">Creá rubros y cargá movimientos para ver las tendencias</p>
            </div>
          )}
        </>
      )}

      {/* Tab: Caja */}
      {tab === 'caja' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mr-auto">
              <ClipboardList size={14} className="text-blue-500" /> Historial de caja
            </h3>
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
              {[['dia','Día'],['mes','Mes'],['anio','Año']].map(([v, l]) => (
                <button key={v} onClick={() => { setCajaVista(v); setCajaPreset(CAJA_PRESETS[v][1]); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${cajaVista === v ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
              {CAJA_PRESETS[cajaVista].map(n => (
                <button key={n} onClick={() => setCajaPreset(n)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${cajaPreset === n ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                  {n}{cajaVista === 'dia' ? 'd' : cajaVista === 'mes' ? 'm' : 'a'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-5">
            {CAJA_CHARTS.map(c => (
              <button key={c.key} onClick={() => setCajaMetrica(c.key)}
                className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors text-center leading-tight ${
                  cajaMetrica === c.key
                    ? `${c.color} text-white shadow-sm`
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}>
                {c.label}
              </button>
            ))}
          </div>

          {cajaLoading ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Cargando...</div>
          ) : cajaAggregated.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sin datos de caja para este período</div>
          ) : (
            <CajaBarChart datos={cajaAggregated} chartCfg={activeCajaCfg} />
          )}
        </div>
      )}

      {/* Tab: Stock */}
      {tab === 'stock' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mr-auto">Ventas y ganancia de stock</h3>
              <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
                {[['dia','Días'],['mes','Meses'],['anio','Años']].map(([v, l]) => (
                  <button key={v} onClick={() => setStockVista(v)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${stockVista === v ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {stockVista !== 'dia' && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setStockAnio(a => a - 1)} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs">‹</button>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 w-10 text-center">{stockAnio}</span>
                  <button onClick={() => setStockAnio(a => a + 1)} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs">›</button>
                </div>
              )}
            </div>

            {stockLoading ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Cargando...</div>
            ) : !stockData || stockData.datos.every(d => d.ganancia === 0 && d.ingresos === 0) ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2">
                <span className="text-3xl">📦</span>
                <p className="text-sm">Sin ventas registradas en este período</p>
                <p className="text-xs text-slate-300 dark:text-slate-600">Los datos aparecen al registrar salidas de stock con precio de venta cargado</p>
              </div>
            ) : (() => {
              const datos = stockData.datos;
              const maxGanancia = Math.max(...datos.map(d => d.ganancia), 1);
              const maxIngresos = Math.max(...datos.map(d => d.ingresos), 1);
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Ganancia total', value: fmt(stockData.totales.ganancia), color: 'text-emerald-600 dark:text-emerald-400' },
                      { label: 'Ingresos totales', value: fmt(stockData.totales.ingresos), color: 'text-blue-600 dark:text-blue-400' },
                      { label: 'Unidades vendidas', value: fmtNum(stockData.totales.unidades), color: 'text-slate-700 dark:text-slate-200' },
                    ].map(k => (
                      <div key={k.label} className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-400 mb-1">{k.label}</p>
                        <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Ganancia por período</p>
                    <div className="flex items-end gap-1" style={{ height: '140px' }}>
                      {datos.map(d => {
                        const pct = (d.ganancia / maxGanancia) * 100;
                        return (
                          <div key={d.periodo} className="flex-1 flex flex-col items-center gap-1 group" style={{ height: '140px', justifyContent: 'flex-end' }}>
                            <div className="w-full bg-emerald-500 dark:bg-emerald-600 rounded-t transition-all group-hover:bg-emerald-400"
                              style={{ height: `${Math.max(pct, d.ganancia > 0 ? 3 : 0)}%` }}
                              title={`${d.label}: ${fmt(d.ganancia)}`} />
                            <span className="text-xs text-slate-400 truncate w-full text-center leading-none pb-0.5">{d.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Ingresos por período</p>
                    <div className="flex items-end gap-1" style={{ height: '120px' }}>
                      {datos.map(d => {
                        const pct = (d.ingresos / maxIngresos) * 100;
                        return (
                          <div key={d.periodo} className="flex-1 flex flex-col items-center gap-1 group" style={{ height: '120px', justifyContent: 'flex-end' }}>
                            <div className="w-full bg-blue-400 dark:bg-blue-600 rounded-t transition-all group-hover:bg-blue-300"
                              style={{ height: `${Math.max(pct, d.ingresos > 0 ? 3 : 0)}%` }}
                              title={`${d.label}: ${fmt(d.ingresos)}`} />
                            <span className="text-xs text-slate-400 truncate w-full text-center leading-none pb-0.5">{d.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
