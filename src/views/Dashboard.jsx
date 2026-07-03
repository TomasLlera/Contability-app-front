import { useState, useEffect } from 'react';
import { movimientosApi, cajaApi, dashboardApi, authApi } from '../api';
import {
  AlertCircle, Clock, TrendingUp, FolderOpen, ClipboardList,
  ChevronRight, ChevronLeft, Building2, CheckCircle2, AlertTriangle, Banknote,
  ArrowLeftRight, Check, Truck
} from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
const todayStr = () => new Date().toISOString().split('T')[0];

function greeting() {
  const h = new Date().getHours();
  const base = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const usuario = authApi.getUsuario();
  if (!usuario) return base;
  const nombre = usuario.charAt(0).toUpperCase() + usuario.slice(1);
  return `${base} ${nombre}`;
}

function vencInfo(dias) {
  if (dias < 0) return { label: `Vencida hace ${Math.abs(dias)}d`, dot: 'bg-red-500', row: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400' };
  if (dias === 0) return { label: 'Vence hoy', dot: 'bg-red-500', row: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400' };
  if (dias <= 3) return { label: `${dias}d`, dot: 'bg-orange-400', row: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400' };
  if (dias <= 7) return { label: `${dias}d`, dot: 'bg-amber-400', row: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' };
  return { label: `${dias}d`, dot: 'bg-blue-400', row: 'border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400' };
}

function StatCard({ label, value, sub, iconBg, iconText, icon, urgent, onClick }) {
  const isInteractive = typeof onClick === 'function';
  return (
    <div
      onClick={onClick}
      className={`group relative bg-white dark:bg-slate-800/60 border rounded-2xl p-4
                  transition-all duration-200
                  hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgb(15_23_42/0.12)]
                  dark:hover:shadow-[0_8px_24px_-8px_rgb(0_0_0/0.5)]
                  ${isInteractive ? 'cursor-pointer' : ''}
                  ${urgent
                    ? 'border-red-300/80 dark:border-red-800 ring-1 ring-red-200 dark:ring-red-900/40'
                    : 'border-slate-200 dark:border-slate-700/80'}`}
    >
      {urgent && (
        <span className="absolute top-3 right-3 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
      )}
      <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center ${iconText} mb-3
                       shadow-sm ring-1 ring-inset ring-black/3 dark:ring-white/4`}>
        {icon}
      </div>
      <p className={`text-2xl font-bold tracking-tight ${urgent ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>{value}</p>
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">{sub}</p>}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
      <div className="skeleton w-1.5 h-1.5 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-3 w-2/3" />
        <div className="skeleton h-2.5 w-1/3" />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="skeleton h-3 w-16 ml-auto" />
        <div className="skeleton h-2.5 w-10 ml-auto" />
      </div>
    </div>
  );
}

const mesActualStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function Dashboard({ locales = [], rubros = [], rubroStats = {}, onNavigate, onViewChange }) {
  const [vencimientos, setVencimientos] = useState([]);
  const [loadingVenc, setLoadingVenc] = useState(true);
  const [rangoVenc, setRangoVenc] = useState(30);
  const [rangoVencOpen, setRangoVencOpen] = useState(false);
  const [cajaHoy, setCajaHoy] = useState([]);
  const [provTendencia, setProvTendencia] = useState(null);

  const proveedoresRubro = rubros.find(r => r.nombre.toLowerCase().includes('provee'));

  useEffect(() => {
    movimientosApi.getVencimientos(30).then(data => {
      setVencimientos(Array.isArray(data) ? data : data?.vencimientos || []);
      setLoadingVenc(false);
    }).catch(() => setLoadingVenc(false));
    cajaApi.getByFecha(todayStr()).then(setCajaHoy).catch(() => {});
  }, []);

  const proveedoresRubroId = proveedoresRubro?.id;
  useEffect(() => {
    if (!proveedoresRubroId) return;
    dashboardApi.getTendencia(proveedoresRubroId, 6)
      .then(d => setProvTendencia(d.tendencia ?? []))
      .catch(() => setProvTendencia([]));
  }, [proveedoresRubroId]);

  // Totales de Proveedores del mes actual (mismas métricas que la gráfica)
  const mesActual = mesActualStr();
  const provMesEntry = provTendencia?.find(t => t.mes === mesActual);
  const provUltima = provTendencia?.length ? provTendencia[provTendencia.length - 1] : null;
  const provFacturas = provMesEntry?.facturado ?? 0;
  const provPagos = provMesEntry?.pagado ?? 0;
  // La deuda es acumulada: si no hubo movimientos este mes, se arrastra la del último mes con datos.
  const provDeuda = provMesEntry?.diferencia ?? provUltima?.diferencia ?? 0;
  const provFecha = new Date(mesActual + '-01T00:00:00');
  const provNombreMes = `${provFecha.toLocaleDateString('es-AR', { month: 'long' })} ${provFecha.getFullYear()}`;

  const totalSubrubros = Object.values(rubroStats).reduce((a, b) => a + b, 0);
  const vencidos    = vencimientos.filter(v => v.dias_restantes <= 0);
  const proximos7d  = vencimientos.filter(v => v.dias_restantes > 0 && v.dias_restantes <= 7);
  // Las vencidas (días < 0) se muestran siempre; el rango filtra solo lo que está por vencer.
  const vencFiltrados = vencimientos.filter(v => v.dias_restantes < 0 || v.dias_restantes <= rangoVenc);
  const montoVencido = vencidos.reduce((s, v) => s + v.monto, 0);
  // Total (saldo) de las boletas mostradas en el rango elegido (7/14/30d).
  const totalVencFiltrados = vencFiltrados.reduce((s, v) => s + (v.monto || 0), 0);

  // Caja hoy
  const gastosHoy          = cajaHoy.filter(m => m.tipo === 'gasto');
  const gastosConfirmados  = gastosHoy.filter(m => m.confirmado !== false);
  const gastosPendientes   = gastosHoy.filter(m => m.confirmado === false);
  const saldoMov           = cajaHoy.find(m => m.tipo === 'saldo_inicial');
  const saldoCuentaMov     = cajaHoy.find(m => m.tipo === 'saldo_cuenta');
  const ingresosExtra      = cajaHoy.filter(m => m.tipo === 'ingreso_extra');
  const empleados          = cajaHoy.filter(m => m.tipo === 'empleado');
  const totalConfirmados   = gastosConfirmados.reduce((s, m) => s + m.monto, 0);
  const totalPendientes    = gastosPendientes.reduce((s, m) => s + m.monto, 0);
  const totalIngresoExtra  = ingresosExtra.reduce((s, m) => s + m.monto, 0);
  const totalEmpleados     = empleados.reduce((s, m) => s + m.monto, 0);

  const tieneAlertas = vencidos.length > 0 || gastosPendientes.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{greeting()}</h1>
          <p className="text-sm text-slate-400 mt-0.5 capitalize">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
        {tieneAlertas && (
          <div className="flex items-center gap-2 flex-wrap">
            {vencidos.length > 0 && (
              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <AlertCircle size={11} /> {vencidos.length} factura{vencidos.length !== 1 ? 's' : ''} vencida{vencidos.length !== 1 ? 's' : ''}
              </span>
            )}
            {gastosPendientes.length > 0 && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <Clock size={11} /> {gastosPendientes.length} gasto{gastosPendientes.length !== 1 ? 's' : ''} sin confirmar
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Locales"
          value={locales.length}
          sub={`${rubros.length} rubros · ${totalSubrubros} subrubros`}
          iconBg="bg-blue-50 dark:bg-blue-900/30" iconText="text-blue-500"
          icon={<Building2 size={18} />} />
        <StatCard
          label={vencidos.length > 0 ? 'Facturas vencidas' : 'Sin vencidas'}
          value={vencidos.length > 0 ? vencidos.length : '✓'}
          sub={vencidos.length > 0 ? fmt(montoVencido) + ' pendiente' : 'Todo al día'}
          iconBg={vencidos.length > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30'}
          iconText={vencidos.length > 0 ? 'text-red-500' : 'text-green-500'}
          icon={vencidos.length > 0 ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          urgent={vencidos.length > 0} />
        <StatCard
          label="Vencen en 7 días"
          value={proximos7d.length}
          sub={proximos7d.length > 0 ? fmt(proximos7d.reduce((s, v) => s + v.monto, 0)) : 'Sin urgencias'}
          iconBg="bg-amber-50 dark:bg-amber-900/30" iconText="text-amber-500"
          icon={<Clock size={18} />} />
        <StatCard
          label={gastosPendientes.length > 0 ? 'Sin confirmar hoy' : 'Caja al día'}
          value={gastosPendientes.length > 0 ? gastosPendientes.length : '✓'}
          sub={gastosPendientes.length > 0 ? fmt(totalPendientes) + ' pendiente' : gastosConfirmados.length > 0 ? `${gastosConfirmados.length} confirmados` : 'Sin gastos hoy'}
          iconBg={gastosPendientes.length > 0 ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-green-50 dark:bg-green-900/30'}
          iconText={gastosPendientes.length > 0 ? 'text-amber-500' : 'text-green-500'}
          icon={<ClipboardList size={18} />} />
      </div>

      {/* Caja + Vencimientos */}
      <div className={`grid gap-4 ${vencimientos.length > 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'}`}>

        {/* Caja del día */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Caja de hoy</h3>
            </div>
            <button onClick={() => onViewChange?.('caja')}
              className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 shrink-0">
              Ver caja <ChevronRight size={12} />
            </button>
          </div>

          {cajaHoy.length === 0 ? (
            <div className="py-8 text-center">
              <ClipboardList size={28} className="mx-auto mb-2 text-slate-200 dark:text-slate-700" />
              <p className="text-sm text-slate-400">Sin movimientos hoy</p>
              <button onClick={() => onViewChange?.('caja')}
                className="mt-3 text-xs text-blue-500 hover:underline">
                Abrir caja del día →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {saldoMov && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Banknote size={12} className="text-slate-400" /> Saldo efectivo
                  </span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{fmt(saldoMov.monto)}</span>
                </div>
              )}
              {saldoCuentaMov && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <ArrowLeftRight size={12} className="text-slate-400" /> Saldo transferencia
                  </span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{fmt(saldoCuentaMov.monto)}</span>
                </div>
              )}
              {totalIngresoExtra > 0 && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Ingresos extra</span>
                  <span className="text-sm font-semibold text-amber-600">+ {fmt(totalIngresoExtra)}</span>
                </div>
              )}
              {totalEmpleados > 0 && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Empleados</span>
                  <span className="text-sm font-semibold text-green-600">+ {fmt(totalEmpleados)}</span>
                </div>
              )}
              {gastosConfirmados.length > 0 && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Check size={11} className="text-green-500" /> {gastosConfirmados.length} gasto{gastosConfirmados.length !== 1 ? 's' : ''} confirmado{gastosConfirmados.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-sm font-semibold text-red-500">− {fmt(totalConfirmados)}</span>
                </div>
              )}
              {gastosPendientes.length > 0 && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Clock size={11} className="text-amber-500" /> {gastosPendientes.length} sin confirmar
                  </span>
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{fmt(totalPendientes)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Vencimientos */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <AlertTriangle size={15} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Próximos vencimientos</h3>
            {!loadingVenc && vencimientos.length > 0 && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                {vencFiltrados.length}
              </span>
            )}
            {!loadingVenc && vencimientos.length > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200" title={`Total de las boletas en ${rangoVenc} días`}>
                  {fmt(totalVencFiltrados)}
                </span>
                <button
                  onClick={() => setRangoVencOpen(o => !o)}
                  title="Cambiar rango"
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <ChevronLeft size={13} className={`transition-transform ${rangoVencOpen ? 'rotate-180' : ''}`} />
                  {rangoVenc}d
                </button>
                <div className={`flex items-center gap-1 overflow-hidden transition-all duration-200 ${rangoVencOpen ? 'max-w-40 opacity-100' : 'max-w-0 opacity-0'}`}>
                  {[7, 14, 30].map(d => (
                    <button
                      key={d}
                      onClick={() => { setRangoVenc(d); setRangoVencOpen(false); }}
                      className={`text-xs px-2 py-0.5 rounded-lg font-medium transition-colors ${
                        rangoVenc === d
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {loadingVenc ? (
            <div className="space-y-1.5">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : vencimientos.length === 0 ? (
            <div className="py-8 text-center">
              <TrendingUp size={28} className="mx-auto mb-2 text-green-300 dark:text-green-700" />
              <p className="text-sm text-slate-400">Sin vencimientos en 30 días</p>
            </div>
          ) : vencFiltrados.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">Sin vencimientos en los próximos {rangoVenc} días</p>
            </div>
          ) : (
            <div className="space-y-1.5 overflow-y-auto max-h-64 pr-0.5">
              {[...vencFiltrados].sort((a, b) => a.dias_restantes - b.dias_restantes).map(item => {
                const info = vencInfo(item.dias_restantes);
                return (
                  <div
                    key={item.id}
                    onClick={() => onNavigate?.(item.rubro, item.subrubro)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer hover:opacity-80 transition-opacity ${info.row}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${info.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.subrubro?.nombre}</p>
                      <p className="text-xs opacity-60 truncate">{item.rubro?.nombre}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold">{fmt(item.monto)}</p>
                      <p className="text-xs opacity-60">{info.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Proveedores — mes actual */}
      {proveedoresRubro && (
        <div>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Saldos mensuales</p>
          <div
            onClick={() => onNavigate?.(proveedoresRubro, null)}
            className="group bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-300">
                <Truck size={16} />
              </span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{proveedoresRubro.nombre}</span>
              <span className="ml-auto text-xs text-slate-400 capitalize">{provNombreMes}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Facturas</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100 tabular-nums truncate">{fmt(provFacturas)}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Pagos</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100 tabular-nums truncate">{fmt(provPagos)}</p>
              </div>
              <div className={`rounded-xl p-3 ${provDeuda > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-slate-50 dark:bg-slate-700/40'}`}>
                <p className={`text-xs font-medium mb-1 ${provDeuda > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>Deuda</p>
                <p className={`text-lg font-bold tabular-nums truncate ${provDeuda > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>{fmt(provDeuda)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {rubros.length === 0 && (
        <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-12 text-center">
          <FolderOpen size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">No hay rubros todavía</p>
          <p className="text-sm text-slate-400 mt-1">Creá tu primer rubro desde el menú lateral para empezar</p>
        </div>
      )}
    </div>
  );
}
