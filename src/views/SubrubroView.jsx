import { useState, useEffect } from 'react';
import { movimientosApi, camposApi, subrubrosApi, getErrorMsg } from '../api';
import Modal from '../components/Modal';
import MovimientoForm from '../components/MovimientoForm';
import CalendarioSubrubro from '../components/CalendarioSubrubro';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Trash2, FileText, Zap, ArrowDownCircle, CheckCircle2, Clock, Wallet, Banknote, ArrowLeftRight, Edit3 } from 'lucide-react';
import ExportModal from '../components/ExportModal';
import DescuentosPanel from '../components/DescuentosPanel';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

function vencimientoLabel(fechaVenc) {
  if (!fechaVenc) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVenc + 'T00:00:00');
  const dias = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
  if (dias < 0) return { label: `Vencida ${Math.abs(dias)}d`, cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' };
  if (dias === 0) return { label: 'Vence hoy', cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' };
  if (dias <= 7) return { label: `Vence en ${dias}d`, cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
  return { label: fechaVenc, cls: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600' };
}

function parseMes(key) {
  const [y, m] = key.split('-');
  return `${m}/${y}`;
}
function mesAnterior(key) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function mesSiguiente(key) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function mesActualKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function TipoBadge({ mov, deuda = false }) {
  if (mov.tipo === 'nota_credito')
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full"><FileText size={11} /> NC</span>;
  if (mov.tipo === 'ajuste')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-800 px-2 py-0.5 rounded-full">
        <Zap size={11} /> {mov.concepto || 'Ajuste'}
      </span>
    );
  if (mov.tipo === 'pago' || ((mov.pago || 0) > 0 && !(mov.monto > 0)))
    return deuda
      ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full"><ArrowDownCircle size={11} /> Abono</span>
      : <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full"><ArrowDownCircle size={11} /> Pago</span>;
  if (mov.pagado)
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> {deuda ? 'Cobrada' : 'Pagada'}</span>;
  return deuda
    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full"><Clock size={11} /> Por cobrar</span>
    : <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full"><Clock size={11} /> Pendiente</span>;
}

export default function SubrubroView({ rubro, subrubro, onBack, role }) {
  const isAdmin = role !== 'viewer';
  // Subrubro DEUDA (dinero a cobrar): mismos datos, otra semántica visual —
  // 'factura' se muestra como Deuda (rojo/naranja) y 'pago' como Abono (verde).
  const esDeudaSub = subrubro.tipo_subrubro === 'deuda';
  const [data, setData] = useState({ movimientos: [], monto_base: 0, saldo_total: null, saldo_anterior: null });
  const [campos, setCampos] = useState([]);
  const [mesActual, setMesActual] = useState(mesActualKey);
  const [showForm, setShowForm] = useState(false);
  const [editingMov, setEditingMov] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('tabla');
  const [mostrarTodo, setMostrarTodo] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState('todos'); // 'todos' | 'pagadas' | 'pendientes'
  const [todosMovs, setTodosMovs] = useState([]);
  const [todasFacturasPendientes, setTodasFacturasPendientes] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const cargar = async (mes, todo = false) => {
    const [d, cs] = await Promise.all([
      todo
        ? movimientosApi.getBySubrubro(subrubro.id)
        : (() => { const [y, m] = mes.split('-'); return movimientosApi.getBySubrubro(subrubro.id, y, m); })(),
      camposApi.getByRubro(rubro.id),
    ]);
    setData(d);
    setCampos(cs);
    setLoading(false);
  };

  const cargarTodos = async () => {
    const d = await movimientosApi.getBySubrubro(subrubro.id);
    setTodosMovs(d.movimientos);
    // Facturas pendientes para vinculación en el form
    const pendientes = d.movimientos.filter(m =>
      (m.tipo === 'factura' || (!m.tipo && (m.monto || 0) > 0)) && !m.pagado
    );
    setTodasFacturasPendientes(pendientes);
  };

  useEffect(() => { cargar(mesActual, mostrarTodo); }, [subrubro.id, mesActual, mostrarTodo]);
  useEffect(() => { cargarTodos(); }, [subrubro.id]);

  const handleSave = async (formData) => {
    const { tipo, facturas_vinculadas_ids, concepto_diferencia, ...rest } = formData;
    const tieneVinculacion = facturas_vinculadas_ids?.length > 0;
    const esPagoONC = tipo === 'pago' || tipo === 'nota_credito';
    // Si el movimiento editado TENÍA vinculación, siempre va por pago-vinculado:
    // el PUT normal ignora facturas_vinculadas_ids y dejaría la vinculación vieja
    // en la DB aunque el usuario la haya destildado (lista vacía = queda libre).
    const teniaVinculacion = editingMov?.facturas_vinculadas_ids?.length > 0;

    try {
      if (esPagoONC && (tieneVinculacion || (editingMov && teniaVinculacion))) {

        const payload = {
          tipo,
          fecha: rest.fecha,
          monto_pago: rest.pago,
          facturas_vinculadas_ids,
          concepto_diferencia,
          campos_extra: rest.campos_extra,
          metodo_pago: rest.metodo_pago,
          // Percepciones de la NC (el backend las ignora si el tipo es 'pago').
          percepcion_iva: rest.percepcion_iva,
          ingresos_brutos: rest.ingresos_brutos,
          idempotency_key: rest.idempotency_key,
        };
        if (editingMov) {
          await movimientosApi.actualizarPagoVinculado(editingMov.id, payload);
        } else {
          await movimientosApi.pagoVinculado(subrubro.id, payload);
        }
      } else {
        const payload = { ...rest, tipo };
        if (editingMov) await movimientosApi.update(editingMov.id, payload);
        else await movimientosApi.create(subrubro.id, payload);
      }

      setShowForm(false);
      setEditingMov(null);
      cargar(mesActual, mostrarTodo);
      cargarTodos();
      toast.success(editingMov ? 'Movimiento actualizado' : 'Movimiento guardado');
    } catch (err) {
      toast.error(getErrorMsg(err));
      throw err; // que el form vuelva a habilitar el botón para reintentar
    }
  };

  const handleDelete = (mov) => {
    const message = mov._ajuste_pago_id
      ? '¿Borrar este ajuste automático?'
      : mov.tipo === 'pago' || mov.tipo === 'nota_credito'
        ? '¿Borrar este pago? También se borrará su ajuste automático si tiene uno.'
        : '¿Borrar este movimiento?';
    setConfirmModal({
      message,
      onConfirm: async () => {
        await movimientosApi.delete(mov.id);
        setConfirmModal(null);
        cargar(mesActual, mostrarTodo);
        cargarTodos();
        toast.success('Movimiento eliminado');
      },
    });
  };

  const handleEdit = (m) => {
    if (m.tipo === 'ajuste' && m._ajuste_pago_id) {
      toast.error('Este ajuste fue generado automáticamente. Editá el pago vinculado para modificarlo.');
      return;
    }
    setEditingMov(m);
    setShowForm(true);
  };

  const camposSumaSet = new Set(campos.filter(c => c.tipo === 'suma').map(c => c.nombre));
  const camposRestaSet = new Set(campos.filter(c => c.tipo === 'resta').map(c => c.nombre));

  const movsConTotal = () => {
    let total = data.saldo_anterior ?? data.monto_base ?? 0;
    return data.movimientos.map(m => {
      const extra = m.campos_extra || {};
      let extraEfecto = 0;
      for (const [k, v] of Object.entries(extra)) {
        const n = Number(v);
        if (!isNaN(n) && n !== 0) {
          if (camposSumaSet.has(k)) extraEfecto += n;
          if (camposRestaSet.has(k)) extraEfecto -= n;
        }
      }
      total += (m.monto || 0) - (m.pago || 0) + extraEfecto;
      return { ...m, _total: total };
    });
  };

  const saldoFinal = data.saldo_total ?? (data.monto_base || 0);
  const saldoPositivo = saldoFinal >= 0;

  // Factura pendiente cuyo vencimiento es el más próximo. Se muestra su saldo
  // ACTUAL (monto original − pagos − NC aplicadas), no el monto original.
  const proximaAVencer = todasFacturasPendientes
    .filter(m => m.fecha_vencimiento)
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))[0] || null;
  const saldoAVencer = proximaAVencer ? (proximaAVencer.saldo ?? proximaAVencer.monto ?? 0) : 0;
  const vencProxima = vencimientoLabel(proximaAVencer?.fecha_vencimiento);

  const camposTexto = campos.filter(c => c.tipo === 'texto');
  const camposNumericos = campos.filter(c => c.tipo === 'suma' || c.tipo === 'resta');
  const hayVencimientos = data.movimientos.some(m => m.fecha_vencimiento);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>;

  const esFacturaPendiente = (m) =>
    (m.tipo === 'factura' || (!m.tipo && (m.monto || 0) > 0)) && (m.saldo ?? m.monto ?? 0) > 0.005;

  const movsDetallados = movsConTotal().filter(m => {
    if (!mostrarTodo || estadoFiltro === 'todos') return true;
    const esFact = m.tipo === 'factura' || (!m.tipo && (m.monto || 0) > 0);
    if (!esFact) return false; // pagos/NC/ajustes no tienen estado pagada/pendiente
    return estadoFiltro === 'pendientes' ? esFacturaPendiente(m) : !esFacturaPendiente(m);
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm flex items-center gap-1 shrink-0">
          <ArrowLeft size={15} /> Volver
        </button>
        <div className="min-w-0">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium truncate">{rubro.nombre}</p>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">{subrubro.nombre}</h1>
            {esDeudaSub && (
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                Deuda a cobrar
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Resumen. En mobile los importes bajan a text-base: un monto largo en ARS
          no entra en media pantalla con text-xl y desborda la tarjeta. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{esDeudaSub ? 'Total adeudado' : 'Total facturado'}</p>
          <p className={`text-base sm:text-xl font-bold mt-1 tabular-nums truncate ${esDeudaSub ? 'text-orange-600' : 'text-slate-800 dark:text-slate-100'}`}>
            {fmt(data.movimientos.reduce((s, m) => s + (m.monto || 0), 0))}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{esDeudaSub ? 'Total abonado' : 'Total pagado'}</p>
          <p className="text-base sm:text-xl font-bold text-green-700 mt-1 tabular-nums truncate">
            {fmt(data.movimientos.reduce((s, m) => s + (m.pago || 0), 0))}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{esDeudaSub ? 'Deuda a vencer' : 'Saldo a vencer'}</p>
          <p className="text-base sm:text-xl font-bold text-amber-600 mt-1 tabular-nums truncate">
            {fmt(saldoAVencer)}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{vencProxima ? vencProxima.label : 'Sin vencimientos'}</p>
        </div>
        <div className={`rounded-xl p-3 sm:p-4 border min-w-0 ${saldoPositivo ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'}`}>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{esDeudaSub ? 'Saldo a cobrar' : 'Saldo pendiente'}</p>
          <p className={`text-base sm:text-xl font-bold mt-1 tabular-nums truncate ${!saldoPositivo ? 'text-red-600' : esDeudaSub && saldoFinal > 0.005 ? 'text-orange-600' : 'text-slate-800 dark:text-slate-100'}`}>{fmt(saldoFinal)}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{todasFacturasPendientes.length} {esDeudaSub ? 'deuda' : 'factura'}{todasFacturasPendientes.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Toggle vista */}
      <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 text-xs font-medium mb-4 w-fit">
        {[['tabla', 'Tabla'], ['calendario', 'Calendario']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => { setViewMode(v); if (v === 'calendario') cargarTodos(); }}
            className={`px-4 py-1.5 rounded-md transition-colors ${viewMode === v ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >{l}</button>
        ))}
      </div>

      {/* Selector mes + acciones */}
      <div className={`flex flex-wrap gap-2 items-center justify-between mb-4 ${viewMode === 'calendario' ? 'hidden' : ''}`}>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtros rápidos */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
            {[
              { label: 'Mes ant.', action: () => { setMostrarTodo(false); setEstadoFiltro('todos'); setMesActual(mesAnterior(mesActualKey())); } },
              { label: 'Este mes', action: () => { setMostrarTodo(false); setEstadoFiltro('todos'); setMesActual(mesActualKey()); } },
              { label: 'Todo', action: () => setMostrarTodo(true) },
            ].map(f => {
              const active = f.label === 'Todo' ? mostrarTodo
                : !mostrarTodo && (f.label === 'Este mes' ? mesActual === mesActualKey() : mesActual === mesAnterior(mesActualKey()));
              return (
                <button
                  key={f.label}
                  onClick={f.action}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${active ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >{f.label}</button>
              );
            })}
          </div>
          {/* Filtro de estado (solo en modo "Todo") */}
          {mostrarTodo && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
              {[
                { val: 'todos', label: 'Todas' },
                { val: 'pagadas', label: 'Pagadas' },
                { val: 'pendientes', label: 'Pendientes' },
              ].map(f => (
                <button
                  key={f.val}
                  onClick={() => setEstadoFiltro(f.val)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${estadoFiltro === f.val ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >{f.label}</button>
              ))}
            </div>
          )}
          {/* Navegación por mes (oculta en modo "Todo") */}
          {!mostrarTodo && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
              <button onClick={() => setMesActual(mesAnterior(mesActual))} className="px-2 py-1 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium">‹</button>
              <span className="px-3 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-20 text-center">{parseMes(mesActual)}</span>
              <button
                onClick={() => setMesActual(mesSiguiente(mesActual))}
                disabled={mesActual >= mesActualKey()}
                className="px-2 py-1 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium disabled:opacity-30"
              >›</button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center gap-1.5"
          ><Download size={14} /> Excel</button>
          {isAdmin && (
            <button
              onClick={() => setConfirmModal({
                message: `¿Borrar TODOS los movimientos de "${subrubro.nombre}"? Esta acción no se puede deshacer.`,
                onConfirm: async () => {
                  await subrubrosApi.clearMovimientos(subrubro.id);
                  setConfirmModal(null);
                  cargar(mesActual, mostrarTodo);
                  cargarTodos();
                  toast.success('Movimientos eliminados');
                },
              })}
              className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-1.5"
            ><Trash2 size={14} /> Limpiar</button>
          )}
          {isAdmin && (
            <button
              onClick={() => { setEditingMov(null); setShowForm(true); }}
              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 shadow-sm"
            >+ Movimiento</button>
          )}
        </div>
      </div>

      {/* Historial de descuentos por pago del proveedor (solo si aplica y hubo alguno).
          Sin rango: muestra el histórico completo del subrubro. */}
      {subrubro.aplica_descuento && (
        <DescuentosPanel subrubroId={subrubro.id} titulo="Descuentos obtenidos" compact />
      )}

      {viewMode === 'calendario' && <CalendarioSubrubro movimientos={todosMovs} />}

      {/* Tabla */}
      {viewMode === 'tabla' && (movsDetallados.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <Wallet size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="font-medium">
            {mostrarTodo && estadoFiltro !== 'todos'
              ? `Sin facturas ${estadoFiltro}`
              : `Sin movimientos en ${parseMes(mesActual)}`}
          </p>
          {isAdmin && (
            <button onClick={() => setShowForm(true)} className="mt-3 text-blue-600 hover:underline text-sm">
              Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <div>
        <p className="sm:hidden text-xs text-slate-400 dark:text-slate-500 mb-1.5">Deslizá la tabla para ver el resto de las columnas →</p>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide sticky left-0 z-10 bg-slate-50 dark:bg-slate-700/60">Fecha</th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Doc.</th>
                <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{esDeudaSub ? 'Deuda' : 'Monto'}</th>
                <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{esDeudaSub ? 'Abono' : 'Pago'}</th>
                <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Saldo</th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Método</th>
                {camposNumericos.map(c => (
                  <th key={c.id} className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{c.nombre}</th>
                ))}
                <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total</th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Estado</th>
                {camposTexto.map(c => (
                  <th key={c.id} className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{c.nombre}</th>
                ))}
                {hayVencimientos && (
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Vencimiento</th>
                )}
                <th className="px-3 sm:px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {movsDetallados.map(m => {
                const esFactura = m.tipo === 'factura';
                const esPago = m.tipo === 'pago';
                const esNC = m.tipo === 'nota_credito';
                const esAjuste = m.tipo === 'ajuste';
                const esAutoAjuste = esAjuste && m._ajuste_pago_id;
                // Una factura saldada (sin saldo pendiente o marcada como pagada) ya no
                // tiene vencimiento que mostrar, aunque conserve su fecha_vencimiento.
                const saldada = esFactura && ((m.saldo ?? m.monto) <= 0.005 || m.pagado === true);
                const venc = saldada ? null : vencimientoLabel(m.fecha_vencimiento);

                const rowCls = esFactura && m.pagado
                  ? 'bg-green-50/50 dark:bg-green-900/10'
                  : (esPago || esNC) ? (esDeudaSub ? 'bg-green-50/40 dark:bg-green-900/10' : 'bg-blue-50/30 dark:bg-blue-900/10')
                  : esAjuste ? 'bg-orange-50/30 dark:bg-orange-900/10'
                  : esDeudaSub && esFactura ? 'bg-orange-50/30 dark:bg-orange-900/10'
                  : '';

                return (
                  <tr key={m.id} className={`group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${rowCls}`}>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap font-medium sticky left-0 z-10 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50">
                      {m.fecha
                        ? <span className="text-slate-600 dark:text-slate-300">{m.fecha}</span>
                        : <span className="text-amber-500 text-xs italic">Sin fecha</span>
                      }
                    </td>

                    <td className="px-3 sm:px-4 py-3">
                      {esFactura && (esDeudaSub || m.documento) && (
                        <span
                          className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            esDeudaSub
                              ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
                              : m.documento === 'remito'
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {esDeudaSub ? 'Deuda' : m.documento === 'remito' ? 'Remito' : 'Factura'}
                        </span>
                      )}
                    </td>

                    <td className="px-3 sm:px-4 py-3 text-right font-semibold whitespace-nowrap">
                      {(m.monto || 0) > 0
                        ? <span className={esDeudaSub ? 'text-orange-600 dark:text-orange-400' : 'text-slate-800 dark:text-slate-100'}>+{fmt(m.monto)}</span>
                        : <span className="text-slate-300 dark:text-slate-600">—</span>
                      }
                    </td>

                    <td className="px-3 sm:px-4 py-3 text-right font-semibold whitespace-nowrap">
                      {(m.pago || 0) > 0 ? (
                        <span className={esNC ? 'text-purple-600' : esAjuste ? 'text-orange-600' : esDeudaSub ? 'text-green-600' : 'text-blue-600'}>
                          −{fmt(m.pago)}
                        </span>
                      ) : <span className="text-slate-300">—</span>
                      }
                    </td>

                    {/* Saldo pendiente por factura (monto − NC/pagos vinculados) */}
                    <td className="px-3 sm:px-4 py-3 text-right font-semibold whitespace-nowrap">
                      {esFactura ? (
                        (m.saldo ?? m.monto) <= 0.005
                          ? <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs"><CheckCircle2 size={12} /> Saldada</span>
                          : <span className={m.saldo != null && m.saldo < m.monto - 0.005 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}>
                              {fmt(m.saldo ?? m.monto)}
                            </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>

                    <td className="px-3 sm:px-4 py-3">
                      {esPago && m.metodo_pago ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            m.metodo_pago === 'efectivo'
                              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                              : 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400'
                          }`}
                          title={m.metodo_pago === 'efectivo' ? 'Pago en efectivo' : 'Pago por transferencia'}
                        >
                          {m.metodo_pago === 'efectivo'
                            ? <><Banknote size={10} /> Efvo</>
                            : <><ArrowLeftRight size={10} /> Transf</>}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>

                    {camposNumericos.map(c => {
                      const val = m.campos_extra?.[c.nombre];
                      const n = Number(val);
                      return (
                        <td key={c.id} className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">
                          {val !== undefined && val !== '' && !isNaN(n)
                            ? <span className={c.tipo === 'suma' ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                                {c.tipo === 'suma' ? '+' : '−'}{fmt(n)}
                              </span>
                            : <span className="text-slate-300">—</span>
                          }
                        </td>
                      );
                    })}

                    <td className={`px-3 sm:px-4 py-3 text-right font-bold whitespace-nowrap ${m._total >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600'}`}>
                      {fmt(m._total)}
                    </td>

                    <td className="px-3 sm:px-4 py-3">
                      <TipoBadge mov={m} deuda={esDeudaSub} />
                    </td>

                    {camposTexto.map(c => {
                      const val = m.campos_extra?.[c.nombre];
                      return (
                        // title: el texto se trunca a 9rem, así el valor completo queda accesible al hover.
                        <td key={c.id} title={val || undefined}
                          className="px-3 sm:px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 max-w-36 truncate">
                          {val || <span className="text-slate-300 dark:text-slate-600 font-normal">—</span>}
                        </td>
                      );
                    })}

                    {hayVencimientos && (
                      <td className="px-3 sm:px-4 py-3">
                        {venc
                          ? <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${venc.cls}`}>{venc.label}</span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                    )}

                    <td className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">
                      {isAdmin && (
                        <>
                          {!esAutoAjuste && (
                            <button onClick={() => handleEdit(m)} className="text-blue-500 hover:text-blue-700 text-xs mr-3">Editar</button>
                          )}
                          <button onClick={() => handleDelete(m)} className="text-red-400 hover:text-red-600 text-xs">Borrar</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      ))}

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {showExportModal && (
        <ExportModal subrubro={subrubro} onClose={() => setShowExportModal(false)} />
      )}

      {showForm && (
        <Modal
          title={editingMov ? 'Editar movimiento' : `Nuevo movimiento — ${subrubro.nombre}`}
          onClose={() => { setShowForm(false); setEditingMov(null); }}
          closeOnBackdrop={false}
        >
          <MovimientoForm
            campos={campos}
            movimiento={editingMov}
            metodoDefault={subrubro.metodo_pago_default || 'ambas'}
            tipoSubrubro={subrubro.tipo_subrubro || 'factura'}
            todasFacturasPendientes={(() => {
              // Al editar un pago vinculado, incluir también las facturas ya pagadas
              // por ese pago (que no aparecerían en la lista de pendientes)
              if (!editingMov?.facturas_vinculadas_ids?.length) return todasFacturasPendientes;
              const linkedIds = new Set(editingMov.facturas_vinculadas_ids);
              const yaIncluidas = new Set(todasFacturasPendientes.map(f => f.id));
              const extra = todosMovs.filter(m => linkedIds.has(m.id) && m.tipo === 'factura' && !yaIncluidas.has(m.id));
              return [...todasFacturasPendientes, ...extra].sort((a, b) => {
                if (!a.fecha && !b.fecha) return a.id - b.id;
                if (!a.fecha) return 1;
                if (!b.fecha) return -1;
                return a.fecha.localeCompare(b.fecha) || a.id - b.id;
              });
            })()}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingMov(null); }}
          />
        </Modal>
      )}
    </div>
  );
}
