import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Tags, Pencil, Trash2, Sigma, ChevronDown, Table2, CalendarRange, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { sumatoriasApi, getErrorMsg } from '../api';
import SumatoriaMovForm from '../components/SumatoriaMovForm';
import ConceptosSumatoriaManager from '../components/ConceptosSumatoriaManager';
import { ConceptoBadge, OrigenBadge } from '../components/ConceptoBadge';
import FiltroSheet from '../components/FiltroSheet';
import RowActions from '../components/RowActions';
import TableScroll from '../components/TableScroll';
import Skeleton from '../components/Skeleton';
import InfoTooltip from '../components/InfoTooltip';
import { useIsMobile } from '../hooks/useMediaQuery';
import { confirmar } from '../utils/confirmar';
import { fmtMoneda } from '../utils/formato';
import { fmtFecha, fmtMesAnio, mesAR } from '../utils/fecha';
import { ORIGENES, METODO_LABEL, sumarMeses, paramsPeriodo } from '../utils/sumatoria';

const fmt = fmtMoneda;
const segBtn = (activo) => `px-2.5 py-1 min-h-10 sm:min-h-0 pointer-coarse:min-h-11 rounded-md text-xs font-medium transition-colors ${
  activo ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
}`;
const th = 'px-3 sm:px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide';

/**
 * Subrubro de tipo Sumatoria: cada carga suma en su concepto. Sin estados,
 * vencimientos ni saldos. Todos los totales (tarjetas, pie de tabla, vista por mes)
 * vienen agregados del backend con los mismos filtros que la lista.
 */
export default function SumatoriaView({ rubro, subrubro, onBack, role }) {
  const isAdmin = role !== 'viewer';
  const isMobile = useIsMobile();

  const [conceptos, setConceptos] = useState([]);
  const [nonceConceptos, setNonceConceptos] = useState(0);
  const cargarConceptos = () => setNonceConceptos(n => n + 1);
  useEffect(() => {
    sumatoriasApi.getConceptos(subrubro.id).then(setConceptos).catch(() => {});
  }, [subrubro.id, nonceConceptos]);
  const conMap = useMemo(() => new Map(conceptos.map(c => [c.id, c])), [conceptos]);

  // --- Filtros ---
  const [periodo, setPeriodo] = useState(() => ({ modo: 'mes', mes: mesAR(), desde: '', hasta: '' }));
  const [conceptosSel, setConceptosSel] = useState([]); // ids como string; vacío = todos
  const [origen, setOrigen] = useState('todos');
  const [vista, setVista] = useState('tabla');
  const [showFiltroConceptos, setShowFiltroConceptos] = useState(false);
  const toggleConcepto = (id) => setConceptosSel(sel => (sel.includes(String(id)) ? sel.filter(x => x !== String(id)) : [...sel, String(id)]));

  const filtros = useMemo(() => ({
    ...paramsPeriodo(periodo),
    conceptos: conceptosSel.map(Number),
    origen: origen === 'todos' ? undefined : origen,
  }), [periodo, conceptosSel, origen]);
  const clave = `${subrubro.id}|${JSON.stringify(filtros)}`;

  // --- Datos: lista + resumen con los mismos filtros. La respuesta lleva la clave a
  // la que corresponde (una respuesta vieja no pisa a una nueva).
  const [resp, setResp] = useState({ clave: null, movs: [], resumen: null });
  const [nonce, setNonce] = useState(0);
  const recargar = () => setNonce(n => n + 1);
  const subId = subrubro.id;
  useEffect(() => {
    const k = `${subId}|${JSON.stringify(filtros)}`;
    Promise.all([
      sumatoriasApi.getMovimientos(subId, filtros),
      sumatoriasApi.getResumen(subId, filtros),
    ])
      .then(([movs, resumen]) => setResp({ clave: k, movs, resumen }))
      .catch(err => { toast.error(getErrorMsg(err)); setResp(r => ({ ...r, clave: k })); });
  }, [subId, filtros, nonce]);
  const primeraCarga = resp.resumen === null;
  const recargando = resp.clave !== clave;
  const { movs, resumen } = resp;

  // --- Formularios ---
  const [form, setForm] = useState(null); // null | { initial }
  const [showConceptos, setShowConceptos] = useState(false);

  const eliminar = async (m) => {
    const c = conMap.get(m.concepto_id);
    const ok = await confirmar({
      message: `¿Eliminar la carga de ${fmt(m.monto)} (${c?.nombre || 'concepto'})?`,
      detail: m.origen === 'caja'
        ? `Se cargó desde la Caja: también se elimina de la Caja del ${fmtFecha(m.fecha)} y vuelve a sumar ${fmt(m.monto)} en ${METODO_LABEL[m.metodo]?.toLowerCase() || 'la caja'}.`
        : 'Solo estaba en el subrubro: la Caja no cambia.',
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await sumatoriasApi.deleteMovimiento(m.id);
      toast.success('Carga eliminada');
      recargar(); cargarConceptos();
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const etiquetaPeriodo = periodo.modo === 'mes' ? fmtMesAnio(periodo.mes)
    : periodo.modo === 'rango'
      ? [periodo.desde && `desde ${fmtFecha(periodo.desde)}`, periodo.hasta && `hasta ${fmtFecha(periodo.hasta)}`].filter(Boolean).join(' ') || 'todo el historial'
      : 'todo el historial';

  // Tarjetas: todos los conceptos activos más los inactivos que tengan cargas en el
  // período (sin el filtro de concepto, para poder usarlas como filtro).
  const tarjetaDe = new Map((resumen?.tarjetas || []).map(t => [t.concepto_id, t]));
  const tarjetas = conceptos
    .filter(c => c.activo || (tarjetaDe.get(c.id)?.cantidad || 0) > 0)
    .map(c => ({ c, t: tarjetaDe.get(c.id) || { total: 0, cantidad: 0 } }));

  // Vista por mes: columnas = conceptos con cargas en el resultado, en su orden.
  const totalConcepto = new Map((resumen?.por_concepto || []).map(p => [p.concepto_id, p]));
  const columnasMes = conceptos.filter(c => totalConcepto.has(c.id));
  const celda = new Map((resumen?.celdas || []).map(x => [`${x.mes}|${x.concepto_id}`, x]));

  const hayFiltros = conceptosSel.length > 0 || origen !== 'todos';
  const mesActual = mesAR();

  if (primeraCarga) return <Skeleton variante="vista" />;

  const accionesDe = (m) => (isAdmin ? [
    { key: 'editar', label: 'Editar', icon: <Pencil size={16} />, iconDesktop: <Pencil size={17} />, onClick: () => setForm({ initial: m }),
      className: 'p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors shrink-0' },
    { key: 'eliminar', label: 'Eliminar', tone: 'danger', icon: <Trash2 size={16} />, iconDesktop: <Trash2 size={17} />, onClick: () => eliminar(m),
      className: 'p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors shrink-0' },
  ] : []);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div className="min-w-0">
          <button onClick={onBack} className="-ml-1 px-1 min-h-11 sm:min-h-8 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm flex items-center gap-1 max-w-full">
            <ArrowLeft size={15} className="shrink-0" /> <span className="truncate">{rubro.nombre}</span>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">{subrubro.nombre}</h1>
            <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
              <Sigma size={11} /> Sumatoria
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowConceptos(true)} disabled={!isAdmin}
            className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-1.5 disabled:opacity-50">
            <Tags size={14} /> Conceptos
          </button>
          {isAdmin && (
            <button onClick={() => setForm({ initial: null })}
              className="bg-blue-600 text-white px-4 py-1.5 min-h-11 sm:min-h-0 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center gap-1.5">
              <Plus size={14} /> Cargar
            </button>
          )}
        </div>
      </div>

      {/* Filtros: período, concepto, origen */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5" role="group" aria-label="Período">
          {[['mes', 'Mes'], ['rango', 'Rango'], ['todo', 'Todo']].map(([v, l]) => (
            <button key={v} type="button" aria-pressed={periodo.modo === v} onClick={() => setPeriodo(p => ({ ...p, modo: v }))} className={segBtn(periodo.modo === v)}>{l}</button>
          ))}
        </div>
        {periodo.modo === 'mes' && (
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
            <button onClick={() => setPeriodo(p => ({ ...p, mes: sumarMeses(p.mes, -1) }))} aria-label="Mes anterior"
              className="px-3 py-1 min-h-10 sm:min-h-0 pointer-coarse:min-h-11 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-base sm:text-sm font-medium">‹</button>
            <input type="month" value={periodo.mes} max={mesActual} aria-label="Mes"
              onChange={e => e.target.value && setPeriodo(p => ({ ...p, mes: e.target.value }))}
              className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none min-w-0 w-36 text-center" />
            <button onClick={() => setPeriodo(p => ({ ...p, mes: sumarMeses(p.mes, 1) }))} disabled={periodo.mes >= mesActual} aria-label="Mes siguiente"
              className="px-3 py-1 min-h-10 sm:min-h-0 pointer-coarse:min-h-11 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium disabled:opacity-30">›</button>
          </div>
        )}
        {periodo.modo === 'rango' && (
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
            <input type="date" value={periodo.desde} max={periodo.hasta || undefined} aria-label="Desde"
              onChange={e => setPeriodo(p => ({ ...p, desde: e.target.value }))}
              className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none min-h-10 sm:min-h-0" />
            <span className="text-slate-300 dark:text-slate-600 text-xs">→</span>
            <input type="date" value={periodo.hasta} min={periodo.desde || undefined} aria-label="Hasta"
              onChange={e => setPeriodo(p => ({ ...p, hasta: e.target.value }))}
              className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none min-h-10 sm:min-h-0" />
          </div>
        )}

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5" role="group" aria-label="Origen">
          {ORIGENES.map(o => (
            <button key={o.key} type="button" aria-pressed={origen === o.key} onClick={() => setOrigen(o.key)} className={segBtn(origen === o.key)}>{o.label}</button>
          ))}
        </div>
        <InfoTooltip width="w-64" text={<><b>Desde caja</b>: cargas hechas en la Caja del Día, que descontaron del efectivo o de la cuenta.<br /><b>Solo subrubro</b>: cargas hechas acá, que no tocan la Caja.</>} />

        {/* Concepto: chips en escritorio, hoja de filtro en mobile. */}
        {isMobile ? (
          <button type="button" onClick={() => setShowFiltroConceptos(true)}
            className="min-h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Filter size={13} /> Conceptos: {conceptosSel.length === 0 ? 'Todos' : conceptosSel.length}
            <ChevronDown size={13} />
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Conceptos">
            <button type="button" aria-pressed={conceptosSel.length === 0} onClick={() => setConceptosSel([])}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${conceptosSel.length === 0 ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
              Todos los conceptos
            </button>
            {conceptos.filter(c => c.activo || c.cantidad_movimientos > 0).map(c => {
              const activo = conceptosSel.includes(String(c.id));
              return (
                <button key={c.id} type="button" aria-pressed={activo} onClick={() => toggleConcepto(c.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1 ${activo ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                  <span aria-hidden className="w-2 h-2 rounded-full" style={{ background: c.color || '#7c3aed' }} /> {c.nombre}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className={recargando ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
        {/* Tarjetas: total del período (con todos los filtros) + una por concepto. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-5">
          <div className="col-span-2 lg:col-span-1 bg-violet-600 text-white rounded-xl p-3 sm:p-4 min-w-0">
            <p className="text-xs uppercase tracking-wide opacity-90">Total {hayFiltros ? 'filtrado' : 'del período'}</p>
            <p className="text-lg sm:text-2xl font-bold mt-1 tabular-nums whitespace-nowrap">{fmt(resumen.total)}</p>
            <p className="text-xs opacity-90 mt-0.5 first-letter:uppercase">{etiquetaPeriodo} · {resumen.cantidad} carga{resumen.cantidad !== 1 ? 's' : ''}</p>
          </div>
          {tarjetas.map(({ c, t }) => {
            const sel = conceptosSel.includes(String(c.id));
            const atenuada = conceptosSel.length > 0 && !sel;
            return (
              <button key={c.id} type="button" onClick={() => toggleConcepto(c.id)} aria-pressed={sel}
                title={sel ? 'Quitar filtro' : 'Filtrar la tabla por este concepto'}
                className={`text-left rounded-xl p-3 sm:p-4 min-w-0 border transition-all ${
                  sel ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-400 dark:border-violet-600 ring-1 ring-violet-400/50'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700'
                } ${atenuada ? 'opacity-60' : ''}`}>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5 min-w-0">
                  <span aria-hidden className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color || '#7c3aed' }} />
                  <span className="truncate">{c.nombre}</span>
                </p>
                <p className="text-base sm:text-xl font-bold mt-1 tabular-nums whitespace-nowrap text-slate-800 dark:text-slate-100">{fmt(t.total)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.cantidad} carga{t.cantidad !== 1 ? 's' : ''}{!c.activo ? ' · desactivado' : ''}</p>
              </button>
            );
          })}
        </div>

        {/* Toggle de vista */}
        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 text-xs font-medium mb-3 w-fit" role="tablist" aria-label="Vista">
          {[['tabla', 'Movimientos', Table2], ['mes', 'Por mes', CalendarRange]].map(([v, l, icono]) => {
            const Icon = icono;
            return (
              <button key={v} type="button" role="tab" aria-selected={vista === v} onClick={() => setVista(v)}
                className={`px-4 py-1.5 pointer-coarse:min-h-11 rounded-md transition-colors flex items-center gap-1.5 ${vista === v ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                <Icon size={13} /> {l}
              </button>
            );
          })}
        </div>

        {vista === 'tabla' && (movs.length === 0 ? (
          <div className="text-center py-14 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
            <Sigma size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="font-medium">Sin cargas en {etiquetaPeriodo}{hayFiltros ? ' con estos filtros' : ''}</p>
            {isAdmin && <button onClick={() => setForm({ initial: null })} className="mt-3 text-blue-600 hover:underline text-sm min-h-11">Cargar la primera</button>}
          </div>
        ) : (
          <>
            {/* Mobile: una card por carga. */}
            <div className="lg:hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
              {movs.map(m => {
                const c = conMap.get(m.concepto_id);
                return (
                  <div key={m.id} className="flex items-start gap-2 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <ConceptoBadge nombre={c?.nombre} color={c?.color} inactivo={c && !c.activo} />
                        <OrigenBadge origen={m.origen} />
                        {m.metodo && <span className="text-xs text-slate-500 dark:text-slate-400">{METODO_LABEL[m.metodo]}</span>}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{fmtFecha(m.fecha)}{m.descripcion ? ` · ${m.descripcion}` : ''}</p>
                    </div>
                    <p className="text-base font-bold tabular-nums whitespace-nowrap text-slate-800 dark:text-slate-100">{fmt(m.monto)}</p>
                    <RowActions title={`${c?.nombre || 'Carga'} ${fmt(m.monto)}`} acciones={accionesDe(m)} />
                  </div>
                );
              })}
              <div className="flex items-center justify-between px-3 py-3 bg-slate-50 dark:bg-slate-700/40">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total · {resumen.cantidad}</span>
                <span className="text-base font-bold tabular-nums text-violet-700 dark:text-violet-300">{fmt(resumen.total)}</span>
              </div>
            </div>

            {/* Desktop: tabla. */}
            <TableScroll className="hidden lg:block rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700">
                    <th className={`${th} text-left`}>Fecha</th>
                    <th className={`${th} text-left`}>Concepto</th>
                    <th className={`${th} text-left`}>Origen</th>
                    <th className={`${th} text-left`}>Método</th>
                    <th className={`${th} text-left`}>Descripción</th>
                    <th className={`${th} text-right`}>Monto</th>
                    {isAdmin && <th className={th}><span className="sr-only">Acciones</span></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {movs.map(m => {
                    const c = conMap.get(m.concepto_id);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300 tabular-nums">{fmtFecha(m.fecha)}</td>
                        <td className="px-3 sm:px-4 py-2.5"><ConceptoBadge nombre={c?.nombre} color={c?.color} inactivo={c && !c.activo} /></td>
                        <td className="px-3 sm:px-4 py-2.5"><OrigenBadge origen={m.origen} /></td>
                        <td className="px-3 sm:px-4 py-2.5 text-slate-600 dark:text-slate-300">{m.metodo ? METODO_LABEL[m.metodo] : <span className="text-slate-400 dark:text-slate-500">—</span>}</td>
                        <td className="px-3 sm:px-4 py-2.5 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={m.descripcion || undefined}>{m.descripcion || <span className="text-slate-400 dark:text-slate-500">—</span>}</td>
                        <td className="px-3 sm:px-4 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap text-slate-800 dark:text-slate-100">{fmt(m.monto)}</td>
                        {isAdmin && <td className="px-3 sm:px-4 py-2.5"><RowActions title={`${c?.nombre || 'Carga'} ${fmt(m.monto)}`} acciones={accionesDe(m)} className="justify-end" /></td>}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-700/60 border-t-2 border-slate-200 dark:border-slate-600">
                    <td colSpan={5} className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Total {hayFiltros ? 'filtrado' : ''} · {resumen.cantidad} carga{resumen.cantidad !== 1 ? 's' : ''}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap text-violet-700 dark:text-violet-300">{fmt(resumen.total)}</td>
                    {isAdmin && <td />}
                  </tr>
                </tfoot>
              </table>
            </TableScroll>
          </>
        ))}

        {/* Por mes: meses en filas, conceptos en columnas, totales por fila y columna. */}
        {vista === 'mes' && (resumen.por_mes.length === 0 ? (
          <p className="text-center py-10 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">Sin cargas en {etiquetaPeriodo}.</p>
        ) : (
          <TableScroll className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700">
                  <th className={`${th} text-left sticky left-0 z-10 bg-slate-50 dark:bg-slate-700`}>Mes</th>
                  {columnasMes.map(c => (
                    <th key={c.id} className={`${th} text-right whitespace-nowrap`}>
                      <span className="inline-flex items-center gap-1"><span aria-hidden className="w-2 h-2 rounded-full" style={{ background: c.color || '#7c3aed' }} />{c.nombre}</span>
                    </th>
                  ))}
                  <th className={`${th} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {resumen.por_mes.map(fila => (
                  <tr key={fila.mes}>
                    <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap font-medium text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800">{fmtMesAnio(fila.mes)}</td>
                    {columnasMes.map(c => {
                      const x = celda.get(`${fila.mes}|${c.id}`);
                      return (
                        <td key={c.id} className="px-3 sm:px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-200" title={x ? `${x.cantidad} carga${x.cantidad !== 1 ? 's' : ''}` : undefined}>
                          {x ? fmt(x.total) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 sm:px-4 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap text-slate-800 dark:text-slate-100">{fmt(fila.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-700/60 border-t-2 border-slate-200 dark:border-slate-600">
                  <td className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sticky left-0 bg-slate-50 dark:bg-slate-700">Total</td>
                  {columnasMes.map(c => (
                    <td key={c.id} className="px-3 sm:px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap text-slate-800 dark:text-slate-100">{fmt(totalConcepto.get(c.id)?.total)}</td>
                  ))}
                  <td className="px-3 sm:px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap text-violet-700 dark:text-violet-300">{fmt(resumen.total)}</td>
                </tr>
              </tfoot>
            </table>
          </TableScroll>
        ))}
      </div>

      {showFiltroConceptos && (
        <FiltroSheet
          title="Filtrar por concepto"
          todasLabel="Todos los conceptos"
          opciones={conceptos.filter(c => c.activo || c.cantidad_movimientos > 0).map(c => ({
            key: String(c.id), label: c.nombre,
            count: tarjetaDe.get(c.id)?.cantidad ?? 0,
          }))}
          seleccion={conceptosSel}
          onToggle={(k) => toggleConcepto(k)}
          onTodas={() => setConceptosSel([])}
          onClose={() => setShowFiltroConceptos(false)}
        />
      )}

      {form && (
        <SumatoriaMovForm
          subrubro={subrubro}
          origen="subrubro"
          initial={form.initial}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); recargar(); cargarConceptos(); }}
        />
      )}

      {showConceptos && (
        <ConceptosSumatoriaManager
          subrubro={subrubro}
          conceptos={conceptos}
          onChange={() => { cargarConceptos(); recargar(); }}
          onClose={() => setShowConceptos(false)}
        />
      )}
    </div>
  );
}
