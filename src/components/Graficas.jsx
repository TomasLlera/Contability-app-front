import { useState, useEffect } from 'react';
import { dashboardApi, subrubrosApi } from '../api';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';

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

export default function Graficas({ rubros = [] }) {
  const [resumen, setResumen] = useState(null);
  const [selectedRubroId, setSelectedRubroId] = useState(null);
  const [subrubros, setSubrubros] = useState([]);
  const [selectedSubrubroId, setSelectedSubrubroId] = useState(null);
  const [metrica, setMetrica] = useState('facturado');
  const [tendencia, setTendencia] = useState([]);
  const [loadingTendencia, setLoadingTendencia] = useState(false);

  useEffect(() => {
    dashboardApi.getResumen().then(setResumen);
  }, []);

  useEffect(() => {
    if (rubros.length > 0 && !selectedRubroId) setSelectedRubroId(rubros[0].id);
  }, [rubros]);

  // Al cambiar de rubro: cargar sus subrubros y resetear selección de subrubro
  useEffect(() => {
    if (!selectedRubroId) return;
    setSelectedSubrubroId(null);
    subrubrosApi.getByRubro(selectedRubroId).then(setSubrubros);
  }, [selectedRubroId]);

  // Al cambiar rubro o subrubro: cargar tendencia
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

      {/* Gráfico interactivo */}
      {rubros.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          {/* Fila 1: título + métricas */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tendencia mensual</h3>
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
              {METRICAS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMetrica(m.key)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
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

          {/* Fila 2: selectores rubro / subrubro */}
          <div className="flex items-center gap-2 mb-5">
            <select
              value={selectedRubroId ?? ''}
              onChange={e => setSelectedRubroId(Number(e.target.value))}
              className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                  className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
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

            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">últimos 6 meses</span>
          </div>

          {loadingTendencia ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Cargando...</div>
          ) : (
            <GraficoTendencia tendencia={tendencia} metrica={metrica} />
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-12 text-center">
          <p className="text-5xl mb-4">📊</p>
          <p className="font-semibold text-slate-600 dark:text-slate-300">Sin rubros para graficar</p>
          <p className="text-sm text-slate-400 mt-1">Creá rubros y cargá movimientos para ver las tendencias</p>
        </div>
      )}
    </div>
  );
}
