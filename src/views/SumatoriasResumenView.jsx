import { useState, useEffect, useMemo } from 'react';
import { Sigma, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { sumatoriasApi, getErrorMsg } from '../api';
import FiltroSheet from '../components/FiltroSheet';
import TableScroll from '../components/TableScroll';
import Skeleton from '../components/Skeleton';
import InfoTooltip from '../components/InfoTooltip';
import { fmtMoneda } from '../utils/formato';
import { fmtFecha, fmtMesAnio, mesAR } from '../utils/fecha';
import { ORIGENES, sumarMeses, paramsPeriodo } from '../utils/sumatoria';

const fmt = fmtMoneda;
const segBtn = (activo) => `px-2.5 py-1 min-h-10 sm:min-h-0 pointer-coarse:min-h-11 rounded-md text-xs font-medium transition-colors ${
  activo ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
}`;
const th = 'px-3 sm:px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide';
const filtroBtn = 'min-h-11 sm:min-h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5';

/**
 * Resumen general de todos los subrubros Sumatoria: subrubros en filas, conceptos en
 * columnas. Los conceptos se agrupan por nombre (sin mayúsculas, acentos ni espacios
 * de más) para poder comparar entre subrubros. Todos los totales vienen agregados
 * del backend con los mismos filtros.
 */
export default function SumatoriasResumenView({ rubros = [], onNavigate }) {
  const [periodo, setPeriodo] = useState(() => ({ modo: 'mes', mes: mesAR(), desde: '', hasta: '' }));
  const [subsSel, setSubsSel] = useState([]);       // ids string; vacío = todos
  const [conceptosSel, setConceptosSel] = useState([]); // claves normalizadas; vacío = todos
  const [origen, setOrigen] = useState('todos');
  const [hoja, setHoja] = useState(null); // 'subrubros' | 'conceptos' | null
  const toggle = (set) => (k) => set(sel => (sel.includes(k) ? sel.filter(x => x !== k) : [...sel, k]));

  const filtros = useMemo(() => ({
    ...paramsPeriodo(periodo),
    subrubros: subsSel.map(Number),
    conceptos: conceptosSel,
    origen: origen === 'todos' ? undefined : origen,
  }), [periodo, subsSel, conceptosSel, origen]);
  const clave = JSON.stringify(filtros);

  const [resp, setResp] = useState({ clave: null, data: null });
  useEffect(() => {
    const k = JSON.stringify(filtros);
    sumatoriasApi.getResumenGeneral(filtros)
      .then(data => setResp({ clave: k, data }))
      .catch(err => { toast.error(getErrorMsg(err)); setResp(r => ({ ...r, clave: k })); });
  }, [filtros]);
  const data = resp.data;
  const recargando = resp.clave !== clave;

  if (!data) return <Skeleton variante="vista" />;

  const celda = new Map(data.celdas.map(c => [`${c.subrubro_id}|${c.clave}`, c]));
  const rubroDe = (id) => rubros.find(r => r.id === id);
  const mesActual = mesAR();
  const etiquetaPeriodo = periodo.modo === 'mes' ? fmtMesAnio(periodo.mes)
    : periodo.modo === 'rango'
      ? [periodo.desde && `desde ${fmtFecha(periodo.desde)}`, periodo.hasta && `hasta ${fmtFecha(periodo.hasta)}`].filter(Boolean).join(' ') || 'todo el historial'
      : 'todo el historial';

  if (data.subrubros_disponibles.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
        <Sigma size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className="font-medium">Todavía no hay subrubros de tipo Sumatoria</p>
        <p className="text-sm mt-1">Creá uno desde un rubro con «Nuevo subrubro» → tipo Sumatoria.</p>
      </div>
    );
  }

  const irA = (fila) => {
    const rubro = rubroDe(fila.rubro_id);
    if (rubro && onNavigate) onNavigate(rubro, { id: fila.id, nombre: fila.nombre, rubro_id: fila.rubro_id, tipo_subrubro: 'sumatoria' });
  };

  return (
    <div>
      {/* Filtros */}
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
              className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none w-36 text-center" />
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
        <button type="button" className={filtroBtn} onClick={() => setHoja('subrubros')}>
          <Filter size={13} /> Subrubros: {subsSel.length === 0 ? 'Todos' : subsSel.length} <ChevronDown size={13} />
        </button>
        <button type="button" className={filtroBtn} onClick={() => setHoja('conceptos')}>
          <Filter size={13} /> Conceptos: {conceptosSel.length === 0 ? 'Todos' : conceptosSel.length} <ChevronDown size={13} />
        </button>
        <InfoTooltip width="w-64" text="Los conceptos con el mismo nombre en distintos subrubros se suman en una sola columna (sin distinguir mayúsculas, acentos ni espacios)." />
      </div>

      <div className={recargando ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-5">
          <div className="col-span-2 lg:col-span-1 bg-violet-600 text-white rounded-xl p-3 sm:p-4 min-w-0">
            <p className="text-xs uppercase tracking-wide opacity-90">Total</p>
            <p className="text-lg sm:text-2xl font-bold mt-1 tabular-nums whitespace-nowrap">{fmt(data.total)}</p>
            <p className="text-xs opacity-90 mt-0.5 first-letter:uppercase">{etiquetaPeriodo} · {data.cantidad} carga{data.cantidad !== 1 ? 's' : ''}</p>
          </div>
          {data.columnas.map(col => (
            <div key={col.clave} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{col.nombre}</p>
              <p className="text-base sm:text-xl font-bold mt-1 tabular-nums whitespace-nowrap text-slate-800 dark:text-slate-100">{fmt(col.total)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{col.cantidad} carga{col.cantidad !== 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>

        {data.filas.length === 0 ? (
          <p className="text-center py-10 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
            Sin cargas en {etiquetaPeriodo} con estos filtros.
          </p>
        ) : (
          <TableScroll className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700">
                  <th className={`${th} text-left sticky left-0 z-10 bg-slate-50 dark:bg-slate-700`}>Subrubro</th>
                  {data.columnas.map(col => <th key={col.clave} className={`${th} text-right whitespace-nowrap`}>{col.nombre}</th>)}
                  <th className={`${th} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {data.filas.map(fila => (
                  <tr key={fila.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-3 sm:px-4 py-2.5 sticky left-0 bg-white dark:bg-slate-800">
                      <button type="button" onClick={() => irA(fila)} disabled={!rubroDe(fila.rubro_id)}
                        className="text-left min-h-11 sm:min-h-0 flex items-center gap-1 group" title="Abrir el subrubro">
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-800 dark:text-slate-100 group-hover:text-blue-600 truncate">{fila.nombre}</span>
                          {fila.rubro && <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{[fila.local, fila.rubro].filter(Boolean).join(' · ')}</span>}
                        </span>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 shrink-0" />
                      </button>
                    </td>
                    {data.columnas.map(col => {
                      const x = celda.get(`${fila.id}|${col.clave}`);
                      return (
                        <td key={col.clave} className="px-3 sm:px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-200"
                          title={x ? `${x.cantidad} carga${x.cantidad !== 1 ? 's' : ''}` : undefined}>
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
                  {data.columnas.map(col => <td key={col.clave} className="px-3 sm:px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap text-slate-800 dark:text-slate-100">{fmt(col.total)}</td>)}
                  <td className="px-3 sm:px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap text-violet-700 dark:text-violet-300">{fmt(data.total)}</td>
                </tr>
              </tfoot>
            </table>
          </TableScroll>
        )}
      </div>

      {hoja === 'subrubros' && (
        <FiltroSheet
          title="Filtrar por subrubro"
          todasLabel="Todos los subrubros"
          opciones={data.subrubros_disponibles.map(s => ({ key: String(s.id), label: s.nombre, hint: [s.local, s.rubro].filter(Boolean).join(' · ') }))}
          seleccion={subsSel}
          onToggle={toggle(setSubsSel)}
          onTodas={() => setSubsSel([])}
          onClose={() => setHoja(null)}
        />
      )}
      {hoja === 'conceptos' && (
        <FiltroSheet
          title="Filtrar por concepto"
          todasLabel="Todos los conceptos"
          opciones={data.conceptos_disponibles.map(c => ({ key: c.clave, label: c.nombre }))}
          seleccion={conceptosSel}
          onToggle={toggle(setConceptosSel)}
          onTodas={() => setConceptosSel([])}
          onClose={() => setHoja(null)}
        />
      )}
    </div>
  );
}
