import { useState, useEffect, useMemo, Fragment } from 'react';
import { movimientosApi, camposApi, subrubrosApi, getErrorMsg } from '../api';
import Modal from '../components/Modal';
import MovimientoForm from '../components/MovimientoForm';
import CalendarioSubrubro from '../components/CalendarioSubrubro';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Trash2, FileText, Zap, ArrowDownCircle, CheckCircle2, Clock, Wallet, Banknote, ArrowLeftRight, Edit3, ChevronDown, Eye, EyeOff, Link2, PieChart } from 'lucide-react';
import ExportModal from '../components/ExportModal';
import DescuentosPanel from '../components/DescuentosPanel';
import RowActions from '../components/RowActions';
import TableScroll from '../components/TableScroll';
import InfoTooltip from '../components/InfoTooltip';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

// --- Rango de fechas mostrado ---------------------------------------------
// Al entrar se muestran los últimos 30 días, no el histórico completo: un
// subrubro con años de facturas tardaba en cargar y enterraba lo reciente.
const DIAS_RANGO_DEFAULT = 30;

const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function hace(dias) {
  const d = new Date();
  d.setDate(d.getDate() - (dias - 1)); // "últimos 30 días" incluye hoy
  return isoLocal(d);
}

// Params del GET según el rango activo. El rango '30d' NO fija `hasta`: los pagos
// programados desde la Caja se fechan en el vencimiento, que puede ser futuro, y
// cortar en hoy los escondería.
function paramsDeRango(rango, mesKey, custom) {
  if (rango === 'mes') { const [anio, mes] = mesKey.split('-'); return { anio, mes }; }
  if (rango === 'custom') return { desde: custom.desde || undefined, hasta: custom.hasta || undefined };
  if (rango === '30d') return { desde: hace(DIAS_RANGO_DEFAULT) };
  return {}; // 'todo'
}

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
  // Saldada / PARCIAL / pendiente: una factura con pagos o NC que no la cubren
  // del todo no es lo mismo que una intacta, y antes las dos decían "Pendiente".
  if (mov.saldo != null && mov.saldo > 0.005 && mov.saldo < (mov.monto || 0) - 0.005)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/40 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded-full">
        <PieChart size={11} /> Parcial
      </span>
    );
  return deuda
    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full"><Clock size={11} /> Por cobrar</span>
    : <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full"><Clock size={11} /> Pendiente</span>;
}

// Un pago/NC cuyo importe no llegó a imputarse contra ninguna factura queda como
// crédito a favor. Sin esto era indistinguible de uno aplicado (el backend lo
// reparte FIFO en silencio) y el saldo del subrubro "no cerraba" sin explicación.
function SinAplicarBadge({ mov }) {
  if (mov.tipo !== 'pago' && mov.tipo !== 'nota_credito') return null;
  if ((mov.sin_aplicar ?? 0) <= 0.005) return null;
  const total = (mov.facturas_aplicadas?.length ?? 0) > 0;
  return (
    <span
      title={total ? 'Parte de este importe no cubre ninguna factura' : 'Este movimiento no está imputado a ninguna factura'}
      className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded"
    >
      <Link2 size={10} className="opacity-60" /> {total ? 'Sobra' : 'Sin aplicar'} {fmt(mov.sin_aplicar)}
    </span>
  );
}

// Botón 👁 de vinculación: abre el desglose del movimiento y resalta su
// contraparte en la lista. Los ajustes no se imputan contra facturas, así que
// ahí va un espaciador para que las fechas sigan alineadas.
function FocoBtn({ mov, activo, onToggle }) {
  if (mov.tipo !== 'factura' && mov.tipo !== 'pago' && mov.tipo !== 'nota_credito')
    return <span className="inline-block w-4 shrink-0" aria-hidden="true" />;
  const vinculos = (mov.pagos_aplicados?.length || 0) + (mov.facturas_aplicadas?.length || 0);
  const Icono = activo ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(activo ? null : mov.id); }}
      aria-pressed={activo}
      title={activo
        ? 'Cerrar el desglose'
        : mov.tipo === 'factura'
          ? (vinculos ? `Ver los ${vinculos} pagos/NC de esta factura` : 'Ver el desglose (no tiene pagos aplicados)')
          : (vinculos ? `Ver las ${vinculos} facturas que cubre` : 'Ver el desglose (no está imputado)')}
      className={`tap shrink-0 rounded transition-colors ${
        activo ? 'text-indigo-600 dark:text-indigo-400'
          : vinculos ? 'text-indigo-300 dark:text-indigo-700 hover:text-indigo-500 dark:hover:text-indigo-400'
          : 'text-slate-200 dark:text-slate-700 hover:text-indigo-500 dark:hover:text-indigo-400'
      }`}
    >
      <Icono size={15} />
    </button>
  );
}

// Desglose de la factura hacia sus pagos/NC: monto original − lo aplicado = saldo.
// Esta es la dirección natural de consulta ("¿qué pagos cubren esta factura?"),
// pero en la base la relación se guarda al revés (`facturas_vinculadas_ids` vive
// en el pago), así que el backend la da vuelta y la manda ya resuelta.
// Se lista completa aunque algún pago haya quedado fuera del período mostrado —
// que es justo lo que el resaltado por sí solo no puede mostrar.
function DesgloseVinculos({ mov, esDeudaSub, visibles }) {
  const esFactura = mov.tipo === 'factura';
  const items = esFactura ? (mov.pagos_aplicados || []) : (mov.facturas_aplicadas || []);
  const bruto = esFactura ? (mov.monto || 0) : (mov.pago || 0);
  const resto = esFactura ? (mov.saldo ?? bruto) : (mov.sin_aplicar ?? 0);

  const fila = (label, valor, extra = '') => (
    <div className={`flex items-baseline justify-between gap-3 ${extra}`}>
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{valor}</span>
    </div>
  );

  return (
    <div className="text-xs space-y-1 max-w-md">
      {fila(esFactura ? (esDeudaSub ? 'Deuda original' : 'Monto original') : 'Importe del movimiento', fmt(bruto))}

      {items.length === 0 ? (
        <p className="italic text-slate-400 dark:text-slate-500 py-1">
          {esFactura
            ? `Sin ${esDeudaSub ? 'abonos' : 'pagos'} ni notas de crédito aplicados`
            : 'No está imputado a ninguna factura'}
        </p>
      ) : items.map(a => (
        <div key={a.mov_id} className="flex items-baseline justify-between gap-3 pl-2 border-l-2 border-indigo-200 dark:border-indigo-800">
          <span className="flex items-center gap-1.5 min-w-0 flex-wrap text-slate-600 dark:text-slate-300">
            {esFactura
              ? (a.tipo === 'nota_credito'
                  ? <><FileText size={11} className="text-purple-500 shrink-0" /> NC</>
                  : <><ArrowDownCircle size={11} className="text-blue-500 shrink-0" /> {esDeudaSub ? 'Abono' : 'Pago'}</>)
              : <><FileText size={11} className="text-amber-500 shrink-0" /> {esDeudaSub ? 'Deuda' : 'Factura'}</>}
            <span className="tabular-nums text-slate-400 dark:text-slate-500">{a.fecha || 'sin fecha'}</span>
            {!a.explicito && (
              <span title="Imputado automáticamente por antigüedad (FIFO): no hubo vinculación manual" className="text-[10px] px-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">auto</span>
            )}
            {!visibles.has(a.mov_id) && (
              <span title="Está fuera del período mostrado" className="text-[10px] px-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">fuera del período</span>
            )}
          </span>
          <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">−{fmt(a.monto)}</span>
        </div>
      ))}

      <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
        {esFactura
          ? fila(
              'Saldo',
              resto <= 0.005
                ? <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle2 size={12} /> Saldada</span>
                : <span className={items.length ? 'text-amber-600 dark:text-amber-400' : ''}>{fmt(resto)}</span>
            )
          : fila('Sin aplicar', resto <= 0.005 ? fmt(0) : <span className="text-amber-600 dark:text-amber-400">{fmt(resto)}</span>)}
      </div>
    </div>
  );
}

// Chip que aparece en modo foco sobre cada movimiento vinculado: cuánto se
// imputó y si fue una vinculación manual o el reparto FIFO automático.
function AplicadoChip({ monto, explicito }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${
      explicito
        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
    }`}>
      <Link2 size={10} /> {fmt(monto)}{explicito ? '' : ' auto'}
    </span>
  );
}

// ── Movimiento como card (solo mobile) ───────────────────────────────────────
// La tabla del detalle arranca en 10 columnas y crece con los campos
// personalizados del rubro: 900px o más contra los 351px útiles de un teléfono.
// Debajo de sm cada movimiento se muestra como card con lo que se consulta
// siempre —fecha, tipo, monto/pago y saldo— y el resto detrás de un acordeón.
function MovimientoCard({ m, esDeudaSub, camposNumericos, camposTexto, venc, isAdmin, onEdit, onDelete, foco, onFoco }) {
  const [abierto, setAbierto] = useState(false);

  const esFactura = m.tipo === 'factura';
  const esPago    = m.tipo === 'pago';
  const esNC      = m.tipo === 'nota_credito';
  const esAjuste  = m.tipo === 'ajuste';
  const esAutoAjuste = esAjuste && m._ajuste_pago_id;

  // Un movimiento suma (factura/deuda) o resta (pago/abono/NC/ajuste): se muestra
  // el que corresponda, no las dos columnas con un guion en una.
  const suma  = (m.monto || 0) > 0;
  const valor = suma ? m.monto : m.pago;
  const signo = suma ? '+' : '−';
  const colorValor = suma
    ? (esDeudaSub ? 'text-orange-600 dark:text-orange-400' : 'text-slate-800 dark:text-slate-100')
    : esNC ? 'text-purple-600' : esAjuste ? 'text-orange-600' : esDeudaSub ? 'text-green-600' : 'text-blue-600';

  const extras = [
    ...camposNumericos.map(c => {
      const val = m.campos_extra?.[c.nombre];
      const n = Number(val);
      if (val === undefined || val === '' || isNaN(n)) return null;
      return { label: c.nombre, valor: `${c.tipo === 'suma' ? '+' : '−'}${fmt(n)}`, tono: c.tipo === 'suma' ? 'text-green-600' : 'text-red-500' };
    }),
    ...camposTexto.map(c => {
      const val = m.campos_extra?.[c.nombre];
      return val ? { label: c.nombre, valor: val } : null;
    }),
  ].filter(Boolean);

  const hayDetalle = extras.length > 0 || esFactura;

  const fondoTipo = esFactura && m.pagado
    ? 'bg-green-50/50 dark:bg-green-900/10'
    : (esPago || esNC) ? (esDeudaSub ? 'bg-green-50/40 dark:bg-green-900/10' : 'bg-blue-50/30 dark:bg-blue-900/10')
    : esAjuste ? 'bg-orange-50/30 dark:bg-orange-900/10'
    : esDeudaSub && esFactura ? 'bg-orange-50/30 dark:bg-orange-900/10'
    : '';

  // Modo foco: el movimiento enfocado y sus vinculados quedan destacados, todo
  // lo demás se atenúa. Sin foco activo, el fondo por tipo de siempre.
  const fondo = foco.activo
    ? (foco.esFoco
        ? 'bg-indigo-100/70 dark:bg-indigo-900/40 border-l-4 border-indigo-500'
        : foco.vinculado
          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-300 dark:border-indigo-700'
          : `${fondoTipo} opacity-40`)
    : fondoTipo;

  return (
    <div className={`px-3 py-2.5 transition-opacity ${fondo}`}>
      <div className="flex items-start gap-2">
        <FocoBtn mov={m} activo={foco.esFoco} onToggle={onFoco} />
        <button
          type="button"
          onClick={() => hayDetalle && setAbierto(v => !v)}
          aria-expanded={hayDetalle ? abierto : undefined}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <TipoBadge mov={m} deuda={esDeudaSub} />
            {foco.aplicado && <AplicadoChip monto={foco.aplicado.monto} explicito={foco.aplicado.explicito} />}
            <SinAplicarBadge mov={m} />
            {esFactura && (esDeudaSub || m.documento) && (
              <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ${
                esDeudaSub ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
                  : m.documento === 'remito' ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
              }`}>
                {esDeudaSub ? 'Deuda' : m.documento === 'remito' ? 'Remito' : 'Factura'}
              </span>
            )}
            {esPago && m.metodo_pago && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                m.metodo_pago === 'efectivo'
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                  : 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400'
              }`}>
                {m.metodo_pago === 'efectivo' ? <><Banknote size={10} /> Efvo</> : <><ArrowLeftRight size={10} /> Transf</>}
              </span>
            )}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            {m.fecha
              ? <span className="tabular-nums">{m.fecha}</span>
              : <span className="text-amber-500 italic">Sin fecha</span>}
            {venc && <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${venc.cls}`}>{venc.label}</span>}
            {hayDetalle && <ChevronDown size={12} className={`shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />}
          </p>
        </button>

        <div className="shrink-0 text-right">
          <p className={`text-base font-bold tabular-nums whitespace-nowrap ${colorValor}`}>
            {(valor || 0) > 0 ? `${signo}${fmt(valor)}` : <span className="text-slate-300 dark:text-slate-600">—</span>}
          </p>
          {esFactura && (
            (m.saldo ?? m.monto) <= 0.005
              ? <p className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><CheckCircle2 size={11} /> Saldada</p>
              : <p className={`text-xs tabular-nums ${m.saldo != null && m.saldo < m.monto - 0.005 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  Saldo {fmt(m.saldo ?? m.monto)}
                </p>
          )}
        </div>

        {isAdmin && (
          <RowActions
            title={m.concepto || (esFactura ? 'Factura' : 'Movimiento')}
            acciones={[
              !esAutoAjuste && { key: 'editar', label: 'Editar', icon: <Edit3 size={16} />, onClick: () => onEdit(m) },
              { key: 'borrar', label: 'Borrar', icon: <Trash2 size={16} />, tone: 'danger', onClick: () => onDelete(m) },
            ].filter(Boolean)}
          />
        )}
      </div>

      {/* Desglose factura → pagos/NC (o pago → facturas) al activar el 👁. */}
      {foco.esFoco && (
        <div className="mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-800">
          <DesgloseVinculos mov={m} esDeudaSub={esDeudaSub} visibles={foco.visibles} />
        </div>
      )}

      {abierto && hayDetalle && (
        <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/60 space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-slate-400 dark:text-slate-500">Total</span>
            <span className={`text-sm font-bold tabular-nums ${m._total >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600'}`}>{fmt(m._total)}</span>
          </div>
          {extras.map(e => (
            <div key={e.label} className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{e.label}</span>
              <span className={`text-sm text-right wrap-break-word ${e.tono || 'text-slate-700 dark:text-slate-200'}`}>{e.valor}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SubrubroView({ rubro, subrubro, onBack, role }) {
  const isAdmin = role !== 'viewer';
  // Subrubro DEUDA (dinero a cobrar): mismos datos, otra semántica visual —
  // 'factura' se muestra como Deuda (rojo/naranja) y 'pago' como Abono (verde).
  const esDeudaSub = subrubro.tipo_subrubro === 'deuda';
  const [data, setData] = useState({ movimientos: [], monto_base: 0, saldo_total: null, saldo_anterior: null });
  const [campos, setCampos] = useState([]);
  const [mesActual, setMesActual] = useState(mesActualKey);
  // Al entrar se muestran los últimos 30 días; el usuario amplía si necesita.
  const [rango, setRango] = useState('30d'); // '30d' | 'mes' | 'todo' | 'custom'
  const [custom, setCustom] = useState({ desde: '', hasta: '' });
  // ID del movimiento cuyo vínculo factura ↔ pagos/NC se está resaltando.
  const [foco, setFoco] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMov, setEditingMov] = useState(null);
  const [loading, setLoading] = useState(true);      // primera carga: pantalla completa
  const [recargando, setRecargando] = useState(false); // cambio de filtro: solo la lista
  const [viewMode, setViewMode] = useState('tabla');
  const [estadoFiltro, setEstadoFiltro] = useState('todos'); // 'todos' | 'pagadas' | 'pendientes'
  const [todosMovs, setTodosMovs] = useState([]);
  const [todasFacturasPendientes, setTodasFacturasPendientes] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const mostrarTodo = rango === 'todo';

  // Solo recarga la lista de movimientos: los campos del rubro se piden aparte y
  // una sola vez, así cambiar de rango no repinta la vista entera.
  const cargar = async () => {
    setRecargando(true);
    try {
      setData(await movimientosApi.getBySubrubro(subrubro.id, paramsDeRango(rango, mesActual, custom)));
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setRecargando(false);
      setLoading(false);
    }
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

  useEffect(() => { camposApi.getByRubro(rubro.id).then(setCampos).catch(() => {}); }, [rubro.id]);
  useEffect(() => { cargar(); }, [subrubro.id, rango, mesActual, custom.desde, custom.hasta]);
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
      cargar();
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
        cargar();
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
  // Fecha, Doc, Monto, Pago, Saldo, Método + numéricos + Total, Estado + textos
  // + Vencimiento? + acciones. Lo usa el colSpan de la fila de desglose.
  const totalCols = 9 + camposNumericos.length + camposTexto.length + (hayVencimientos ? 1 : 0);

  // --- Vinculación visual factura ↔ pagos/NC -------------------------------
  // Resuelve el foco en los dos sentidos: enfocar una factura resalta los pagos
  // que la cubrieron (`pagos_aplicados`), y enfocar un pago resalta las facturas
  // a las que se imputó (`facturas_aplicadas`). `montoPorId` alimenta el chip.
  const vinculo = useMemo(() => {
    const movFoco = foco != null ? data.movimientos.find(m => m.id === foco) : null;
    // El foco puede quedar fuera del rango tras cambiar el filtro: se desactiva solo.
    if (!movFoco) return null;
    const enlaces = [...(movFoco.pagos_aplicados || []), ...(movFoco.facturas_aplicadas || [])];
    const montoPorId = new Map();
    for (const a of enlaces) {
      const prev = montoPorId.get(a.mov_id);
      // Un mismo pago puede imputarse en más de un tramo a la misma factura.
      montoPorId.set(a.mov_id, { monto: (prev?.monto || 0) + a.monto, explicito: prev?.explicito || a.explicito });
    }
    const visibles = new Set(data.movimientos.map(m => m.id));
    return {
      id: movFoco.id,
      montoPorId,
      visibles,
      // Contrapartes que existen pero cayeron fuera del período mostrado. El
      // desglose las lista igual; el resaltado no puede (no hay fila que pintar).
      fueraDeRango: enlaces.filter(a => !visibles.has(a.mov_id)).length,
    };
  }, [foco, data.movimientos]);

  const SIN_FOCO = { activo: false, esFoco: false, vinculado: false, aplicado: null, visibles: new Set() };
  const focoDe = (m) => vinculo
    ? {
        activo: true,
        esFoco: m.id === vinculo.id,
        vinculado: vinculo.montoPorId.has(m.id),
        aplicado: vinculo.montoPorId.get(m.id) || null,
        visibles: vinculo.visibles,
      }
    : SIN_FOCO;

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>;

  const esFacturaPendiente = (m) =>
    (m.tipo === 'factura' || (!m.tipo && (m.monto || 0) > 0)) && (m.saldo ?? m.monto ?? 0) > 0.005;

  const movsDetallados = movsConTotal().filter(m => {
    if (estadoFiltro === 'todos') return true;
    const esFact = m.tipo === 'factura' || (!m.tipo && (m.monto || 0) > 0);
    if (!esFact) return false; // pagos/NC/ajustes no tienen estado pagada/pendiente
    return estadoFiltro === 'pendientes' ? esFacturaPendiente(m) : !esFacturaPendiente(m);
  });

  // Movimientos del subrubro que el rango activo está dejando afuera.
  const ocultosPorRango = Math.max(0, todosMovs.length - data.movimientos.length);
  const etiquetaRango = rango === '30d' ? `últimos ${DIAS_RANGO_DEFAULT} días`
    : rango === 'mes' ? parseMes(mesActual)
    : rango === 'custom'
      ? [custom.desde && `desde ${custom.desde}`, custom.hasta && `hasta ${custom.hasta}`].filter(Boolean).join(' ') || 'todo el historial'
      : 'todo el historial';

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
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{etiquetaRango}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{esDeudaSub ? 'Total abonado' : 'Total pagado'}</p>
          <p className="text-base sm:text-xl font-bold text-green-700 mt-1 tabular-nums truncate">
            {fmt(data.movimientos.reduce((s, m) => s + (m.pago || 0), 0))}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{etiquetaRango}</p>
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
          {/* Rango de fechas. Por defecto '30d'. */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
            {[
              { val: '30d', label: '30d' },
              { val: 'mes', label: 'Este mes' },
              { val: 'todo', label: 'Todo' },
              { val: 'custom', label: 'Personalizado' },
            ].map(f => (
              <button
                key={f.val}
                onClick={() => {
                  setRango(f.val);
                  if (f.val === 'mes') setMesActual(mesActualKey());
                }}
                className={`px-2.5 py-1 min-h-10 sm:min-h-0 rounded-md text-xs font-medium transition-colors ${rango === f.val ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >{f.label}</button>
            ))}
          </div>
          <InfoTooltip
            width="w-64"
            text={<>Al entrar se muestran los <b>últimos {DIAS_RANGO_DEFAULT} días</b> para que la vista cargue rápido. Los importes del resumen y el total corrido se calculan sobre el período elegido; el <b>saldo pendiente</b> siempre es el del subrubro completo.<br /><br />“{DIAS_RANGO_DEFAULT}d” no corta hacia adelante: los pagos programados en la Caja se fechan en el vencimiento y pueden ser futuros.</>}
          />
          {/* Rango personalizado */}
          {rango === 'custom' && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
              <input
                type="date" value={custom.desde} max={custom.hasta || undefined}
                onChange={e => setCustom(c => ({ ...c, desde: e.target.value }))}
                aria-label="Desde"
                className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none"
              />
              <span className="text-slate-300 dark:text-slate-600 text-xs">→</span>
              <input
                type="date" value={custom.hasta} min={custom.desde || undefined}
                onChange={e => setCustom(c => ({ ...c, hasta: e.target.value }))}
                aria-label="Hasta"
                className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none"
              />
            </div>
          )}
          {/* Filtro de estado de las facturas del período */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
            {[
              { val: 'todos', label: 'Todas' },
              { val: 'pagadas', label: 'Pagadas' },
              { val: 'pendientes', label: 'Pendientes' },
            ].map(f => (
              <button
                key={f.val}
                onClick={() => setEstadoFiltro(f.val)}
                className={`px-2.5 py-1 min-h-10 sm:min-h-0 rounded-md text-xs font-medium transition-colors ${estadoFiltro === f.val ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >{f.label}</button>
            ))}
          </div>
          {/* Navegación por mes (solo en el rango "Este mes") */}
          {rango === 'mes' && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
              <button onClick={() => setMesActual(mesAnterior(mesActual))} className="px-3 py-1 min-h-10 sm:min-h-0 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-base sm:text-sm font-medium">‹</button>
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
            className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center gap-1.5"
          ><Download size={14} /> Excel</button>
          {isAdmin && (
            <button
              onClick={() => setConfirmModal({
                message: `¿Borrar TODOS los movimientos de "${subrubro.nombre}"? Esta acción no se puede deshacer.`,
                onConfirm: async () => {
                  await subrubrosApi.clearMovimientos(subrubro.id);
                  setConfirmModal(null);
                  cargar();
                  cargarTodos();
                  toast.success('Movimientos eliminados');
                },
              })}
              className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-1.5"
            ><Trash2 size={14} /> Limpiar</button>
          )}
          {isAdmin && (
            <button
              onClick={() => { setEditingMov(null); setShowForm(true); }}
              className="bg-blue-600 text-white px-4 py-1.5 min-h-11 sm:min-h-0 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"
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

      {/* Aviso de filtro activo: sin esto la lista parece incompleta sin motivo. */}
      {viewMode === 'tabla' && !mostrarTodo && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
          <span>
            Mostrando <b>{etiquetaRango}</b>
            {ocultosPorRango > 0 && <> · {ocultosPorRango} movimiento{ocultosPorRango !== 1 ? 's' : ''} fuera del período</>}
          </span>
          <button onClick={() => setRango('todo')} className="font-semibold underline hover:no-underline">
            Ver todo
          </button>
        </div>
      )}

      {/* Modo foco activo: qué se está resaltando y cómo salir. */}
      {viewMode === 'tabla' && vinculo && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-800 dark:text-indigo-300">
          <Link2 size={13} />
          <span>
            Resaltando <b>{vinculo.montoPorId.size}</b> movimiento{vinculo.montoPorId.size !== 1 ? 's' : ''} vinculado{vinculo.montoPorId.size !== 1 ? 's' : ''}
            {vinculo.fueraDeRango > 0 && <> · {vinculo.fueraDeRango} fuera del período mostrado</>}
          </span>
          {vinculo.fueraDeRango > 0 && (
            <button onClick={() => setRango('todo')} className="font-semibold underline hover:no-underline">Ver todo</button>
          )}
          <button onClick={() => setFoco(null)} className="font-semibold underline hover:no-underline">Quitar resaltado</button>
        </div>
      )}

      {/* Tabla. Al cambiar de filtro solo se atenúa la lista: la vista no se
          desmonta ni vuelve al estado "Cargando..." de pantalla completa. */}
      {viewMode === 'tabla' && (
      <div className={recargando ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
      {movsDetallados.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <Wallet size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="font-medium">
            {estadoFiltro !== 'todos'
              ? `Sin facturas ${estadoFiltro} en ${etiquetaRango}`
              : `Sin movimientos en ${etiquetaRango}`}
          </p>
          {ocultosPorRango > 0 && (
            <button onClick={() => setRango('todo')} className="mt-2 text-blue-600 hover:underline text-sm block mx-auto">
              Ver los {ocultosPorRango} movimientos del historial
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setShowForm(true)} className="mt-3 text-blue-600 hover:underline text-sm">
              Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <div>
        {/* Mobile: una card por movimiento (ver MovimientoCard). */}
        <div className="sm:hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
          {movsDetallados.map(m => {
            const esFact = m.tipo === 'factura';
            const saldada = esFact && ((m.saldo ?? m.monto) <= 0.005 || m.pagado === true);
            return (
              <MovimientoCard
                key={m.id}
                m={m}
                esDeudaSub={esDeudaSub}
                camposNumericos={camposNumericos}
                camposTexto={camposTexto}
                venc={saldada ? null : vencimientoLabel(m.fecha_vencimiento)}
                isAdmin={isAdmin}
                onEdit={handleEdit}
                onDelete={handleDelete}
                foco={focoDe(m)}
                onFoco={setFoco}
              />
            );
          })}
        </div>

        {/* Desktop: la tabla completa. */}
        <TableScroll className="hidden sm:block rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 overflow-hidden">
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

                const f = focoDe(m);
                const destacado = f.esFoco || f.vinculado;

                const rowCls = esFactura && m.pagado
                  ? 'bg-green-50/50 dark:bg-green-900/10'
                  : (esPago || esNC) ? (esDeudaSub ? 'bg-green-50/40 dark:bg-green-900/10' : 'bg-blue-50/30 dark:bg-blue-900/10')
                  : esAjuste ? 'bg-orange-50/30 dark:bg-orange-900/10'
                  : esDeudaSub && esFactura ? 'bg-orange-50/30 dark:bg-orange-900/10'
                  : '';

                // En modo foco el fondo por tipo cede al del resaltado, y el resto
                // de las filas se atenúa para que el vínculo salte a la vista.
                const focoBg = f.esFoco ? 'bg-indigo-100/70 dark:bg-indigo-900/40'
                  : f.vinculado ? 'bg-indigo-50 dark:bg-indigo-950/40'
                  : '';
                const rowFinal = f.activo
                  ? (destacado ? focoBg : `${rowCls} opacity-40`)
                  : rowCls;
                // La celda sticky tapa el fondo de la fila, así que lleva el suyo.
                const stickyBg = f.activo && destacado
                  ? (f.esFoco ? 'bg-indigo-100 dark:bg-indigo-900/70' : 'bg-indigo-50 dark:bg-indigo-950/70')
                  : 'bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50';
                const acento = f.esFoco ? 'border-l-4 border-indigo-500'
                  : f.vinculado ? 'border-l-4 border-indigo-300 dark:border-indigo-700'
                  : '';

                return (
                  <Fragment key={m.id}>
                  <tr className={`group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${rowFinal}`}>
                    {/* El 👁 vive en la columna sticky: queda a mano aunque la tabla
                        esté scrolleada a la derecha. */}
                    <td className={`px-3 sm:px-4 py-3 whitespace-nowrap font-medium sticky left-0 z-10 ${stickyBg} ${acento}`}>
                      <span className="flex items-center gap-1.5">
                        <FocoBtn mov={m} activo={f.esFoco} onToggle={setFoco} />
                        {m.fecha
                          ? <span className="text-slate-600 dark:text-slate-300">{m.fecha}</span>
                          : <span className="text-amber-500 text-xs italic">Sin fecha</span>
                        }
                      </span>
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
                      <span className="flex flex-wrap items-center gap-1">
                        <TipoBadge mov={m} deuda={esDeudaSub} />
                        {f.aplicado && <AplicadoChip monto={f.aplicado.monto} explicito={f.aplicado.explicito} />}
                        <SinAplicarBadge mov={m} />
                      </span>
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

                  {/* Desglose del movimiento enfocado, justo debajo de su fila. */}
                  {f.esFoco && (
                    <tr className="bg-indigo-50/60 dark:bg-indigo-950/30">
                      <td colSpan={totalCols} className="px-4 sm:px-6 py-3 border-l-4 border-indigo-500">
                        <DesgloseVinculos mov={m} esDeudaSub={esDeudaSub} visibles={vinculo.visibles} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
        </div>
      )}
      </div>
      )}

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
