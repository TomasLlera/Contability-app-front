import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BellRing, Check, Clock, X, ChevronRight, ChevronLeft, Star } from 'lucide-react';

/**
 * Recordatorios del día, centrados sobre el Dashboard.
 *
 * Va centrado y no en una esquina porque un aviso arrinconado no se ve. Para que igual
 * no sea un bloqueo: se cierra con Esc o con un click en el fondo, y se monta
 * ÚNICAMENTE en Inicio y sin ningún modal abierto — trabajando en Caja o cargando un
 * movimiento nunca aparece encima.
 *
 * De a uno por vez, con contador "1 de N": tres tarjetas apiladas son un muro, y el
 * recordatorio que importa termina abajo de todo.
 *
 * Va por portal a `document.body` porque el shell tiene ancestros con `transform` (el
 * drawer del sidebar): dentro del árbol del Dashboard, `position: fixed` se resolvería
 * contra ese ancestro en vez de contra el viewport — el mismo motivo por el que la
 * BottomNav vive fuera del shell.
 *
 * Props:
 *   items         — recordatorios, tal como los devuelve /recordatorios/pendientes
 *   onCompletar   — (id) => void
 *   onPostergar   — (id) => void
 *   onDescartar   — (id) => void   cerrar sin registrar acción (queda como ignorado)
 *   onToggleItem  — (id, subrubroId, hecho) => void   checklist, se persiste en la BD
 *   onNavigate    — (rubro, subrubro) => void   misma firma que el resto de la app
 */

// Cuántos subrubros se muestran antes de plegar el resto detrás de "+N más".
const CHIPS_VISIBLES = 5;

// Separador con el que se parte un nombre para buscarle el prefijo común.
const SEPARADOR = /[\s\-–—/]+/;

/**
 * Agrupa los subrubros por su primera palabra cuando dos o más la comparten
 * ("HERGO DISTRINTINO", "HERGO DANODIS" → grupo HERGO). Con nueve proveedores sueltos
 * el popup es una pared de chips iguales; agrupados se leen de un vistazo.
 *
 * Devuelve una lista ordenada de entradas: los grupos y sueltos con algún prioritario
 * van primero, y dentro de cada grupo también.
 */
function agruparSubrubros(subrubros) {
  const porPrefijo = new Map();
  for (const s of subrubros) {
    const prefijo = String(s.nombre || '').trim().split(SEPARADOR)[0].toUpperCase();
    if (!porPrefijo.has(prefijo)) porPrefijo.set(prefijo, []);
    porPrefijo.get(prefijo).push(s);
  }

  const entradas = [];
  for (const [prefijo, lista] of porPrefijo) {
    if (lista.length >= 2) {
      entradas.push({ tipo: 'grupo', clave: prefijo, prefijo, items: lista });
    } else {
      entradas.push({ tipo: 'suelto', clave: `s${lista[0].id}`, items: lista });
    }
  }
  // Prioritario adentro = la entrada sube. Es el único criterio de orden: el resto ya
  // viene ordenado desde el backend.
  return entradas.sort((a, b) =>
    (b.items.some(s => s.prioritario) === true) - (a.items.some(s => s.prioritario) === true));
}

// Quita el prefijo del grupo del nombre del chip: dentro de "HERGO" alcanza con
// "DISTRINTINO". Si no queda nada legible, se muestra el nombre entero.
function etiquetaCorta(nombre, prefijo) {
  if (!prefijo) return nombre;
  const resto = String(nombre).trim().slice(prefijo.length).replace(/^[\s\-–—/]+/, '').trim();
  return resto || nombre;
}

function Chip({ sub, hecho, prefijo, onToggle, onNavegar, navegable }) {
  const label = etiquetaCorta(sub.nombre, prefijo);
  return (
    // Interacción dual: el cuerpo tilda, la flecha navega. Van como dos botones
    // hermanos dentro de un contenedor (un <button> adentro de otro no es válido).
    <span
      className={`inline-flex items-stretch rounded-lg border overflow-hidden max-w-full transition-colors ${
        hecho
          ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700/40'
          : sub.prioritario
            ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/25'
            : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50'
      }`}
    >
      <button
        onClick={() => onToggle(!hecho)}
        aria-pressed={hecho}
        title={hecho ? 'Marcar como pendiente' : 'Marcar como hecho'}
        className={`flex items-center gap-1.5 pl-2 pr-2 py-1.5 text-sm font-medium min-w-0 transition-colors ${
          hecho
            ? 'text-slate-400 dark:text-slate-500 line-through'
            : sub.prioritario
              ? 'text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/45'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
        }`}
      >
        <span className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
          hecho
            ? 'bg-slate-400 dark:bg-slate-500 border-transparent'
            : 'border-slate-300 dark:border-slate-500'
        }`}>
          {hecho && <Check size={11} className="text-white" strokeWidth={3} />}
        </span>
        {sub.prioritario && !hecho && <Star size={11} className="shrink-0 fill-current" />}
        <span className="truncate">{label}</span>
      </button>
      {navegable && (
        <button
          onClick={onNavegar}
          aria-label={`Ir a ${sub.nombre}`}
          title={`Ir a ${sub.nombre}`}
          className="shrink-0 px-1.5 flex items-center border-l border-slate-200 dark:border-slate-600
                     text-slate-400 hover:text-blue-600 dark:hover:text-blue-400
                     hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <ChevronRight size={14} />
        </button>
      )}
    </span>
  );
}

function Tarjeta({ rec, posicion, total, onAnterior, onSiguiente, onCompletar, onPostergar, onDescartar, onToggleItem, onNavigate }) {
  const [expandido, setExpandido] = useState(false);

  // Memoizado para que el `|| []` no genere un array nuevo en cada render y dispare
  // el reagrupado de los chips sin que haya cambiado nada.
  const subrubros = useMemo(() => rec.subrubros || [], [rec.subrubros]);
  const hechos = useMemo(() => new Set(rec.items_hechos || []), [rec.items_hechos]);
  const entradas = useMemo(() => agruparSubrubros(subrubros), [subrubros]);
  const listo = subrubros.length > 0 && hechos.size >= subrubros.length;

  // Se pliega por entradas completas: partir un grupo al medio deja "HERGO" mostrando
  // dos de sus tres variantes sin ninguna señal de que falta una.
  const { visibles, ocultos } = useMemo(() => {
    if (expandido || subrubros.length <= 6) return { visibles: entradas, ocultos: 0 };
    const acc = [];
    let cuenta = 0;
    for (const e of entradas) {
      if (cuenta >= CHIPS_VISIBLES) break;
      acc.push(e);
      cuenta += e.items.length;
    }
    return { visibles: acc, ocultos: subrubros.length - cuenta };
  }, [entradas, expandido, subrubros.length]);

  return (
    <div
      role="dialog"
      aria-label={rec.titulo}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700
                 overflow-hidden animate-[recordatorioIn_220ms_cubic-bezier(0.16,1,0.3,1)]"
    >
      {/* Encabezado: el recordatorio manda, el rubro es contexto. */}
      <div className="flex items-start gap-3 px-4 sm:px-5 pt-4 pb-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
          <BellRing size={18} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">{rec.titulo}</p>
          {rec.rubro && (
            <span className="inline-block mt-1 text-[11px] font-medium uppercase tracking-wide
                             text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60
                             px-1.5 py-0.5 rounded">
              {rec.rubro.nombre}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 -mr-1.5 -mt-1">
          {total > 1 && (
            <div className="flex items-center gap-0.5 text-xs text-slate-400">
              <button onClick={onAnterior} aria-label="Anterior" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 disabled:opacity-30" disabled={posicion === 0}>
                <ChevronLeft size={15} />
              </button>
              <span className="tabular-nums whitespace-nowrap">{posicion + 1} de {total}</span>
              <button onClick={onSiguiente} aria-label="Siguiente" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 disabled:opacity-30" disabled={posicion === total - 1}>
                <ChevronRight size={15} />
              </button>
            </div>
          )}
          <button
            onClick={() => onDescartar(rec.id)}
            aria-label="Cerrar"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400
                       hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {rec.mensaje && (
        <p className="px-4 sm:px-5 pb-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">
          {rec.mensaje}
        </p>
      )}

      {subrubros.length > 0 && (
        <div className="px-4 sm:px-5 pb-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-400">
              {hechos.size} de {subrubros.length} {hechos.size === 1 ? 'marcado' : 'marcados'}
            </p>
            <div className="flex-1 h-1 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${listo ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${(hechos.size / subrubros.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {visibles.map(entrada => (
              entrada.tipo === 'grupo' ? (
                <div key={entrada.clave} className="w-full flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-100 dark:border-slate-700/70 px-2 py-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 shrink-0">
                    {entrada.prefijo}
                  </span>
                  {entrada.items.map(sub => (
                    <Chip
                      key={sub.id}
                      sub={sub}
                      prefijo={entrada.prefijo}
                      hecho={hechos.has(sub.id)}
                      navegable={!!rec.rubro}
                      onToggle={(hecho) => onToggleItem(rec.id, sub.id, hecho)}
                      onNavegar={() => onNavigate?.(rec.rubro, sub)}
                    />
                  ))}
                </div>
              ) : (
                <Chip
                  key={entrada.clave}
                  sub={entrada.items[0]}
                  hecho={hechos.has(entrada.items[0].id)}
                  navegable={!!rec.rubro}
                  onToggle={(hecho) => onToggleItem(rec.id, entrada.items[0].id, hecho)}
                  onNavegar={() => onNavigate?.(rec.rubro, entrada.items[0])}
                />
              )
            ))}
            {ocultos > 0 && (
              <button
                onClick={() => setExpandido(true)}
                className="px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600
                           text-sm font-medium text-slate-500 dark:text-slate-400
                           hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                +{ocultos} más
              </button>
            )}
          </div>
        </div>
      )}

      <div className="px-3 sm:px-4 py-3 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/60">
        <div className="flex items-center gap-2">
          {/* El verde ya significa "pago confirmado" en la Caja del Día. Acá la acción
              primaria es azul —el acento de la app— y solo se pone verde cuando el
              checklist quedó completo, o sea cuando el verde significa lo mismo:
              está todo hecho. */}
          <button
            onClick={() => onCompletar(rec.id)}
            className={`press flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                        text-sm font-semibold text-white shadow-sm ${
              listo
                ? 'bg-linear-to-b from-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 shadow-emerald-500/25'
                : 'bg-linear-to-b from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 shadow-blue-500/25'
            }`}
          >
            <Check size={15} /> Completado
          </button>
          <button
            onClick={() => onPostergar(rec.id)}
            className="press flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl
                       border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300
                       hover:bg-white dark:hover:bg-slate-700"
          >
            <span className="flex items-center gap-1.5 text-sm font-medium"><Clock size={15} /> Más tarde</span>
            <span className="text-[11px] text-slate-400 leading-tight">
              {rec.proxima_vuelta ? `Vuelve ${rec.proxima_vuelta}` : 'Vuelve mañana'}
            </span>
          </button>
          {rec.rubro && (
            <button
              onClick={() => onNavigate?.(rec.rubro, null)}
              title={`Ver ${rec.rubro.nombre}`}
              className="press shrink-0 px-3 py-2.5 rounded-xl text-sm font-medium
                         text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/25"
            >
              Ver
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecordatorioPopup({ items = [], onCompletar, onPostergar, onDescartar, onToggleItem, onNavigate }) {
  const [idx, setIdx] = useState(0);

  // La cola se acorta sola al resolver uno: si era el último, se retrocede en vez de
  // quedar apuntando fuera del array.
  const posicion = Math.min(idx, Math.max(0, items.length - 1));

  useEffect(() => {
    if (!items.length) return;
    const onKey = (e) => { if (e.key === 'Escape') onDescartar?.(items[posicion].id); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, posicion, onDescartar]);

  if (!items.length) return null;
  const rec = items[posicion];

  return createPortal(
    <div
      // Click en el fondo: cierra todos de una. Es la salida rápida para volver a trabajar.
      onClick={() => items.forEach(r => onDescartar?.(r.id))}
      // z-40 lo deja por debajo de cualquier modal (z-50). El fondo es apenas un velo:
      // marca el foco sin apagar el dashboard que está atrás.
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4
                 bg-slate-950/40 backdrop-blur-[2px] animate-[recordatorioFade_150ms_ease-out]"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto overscroll-contain"
      >
        <Tarjeta
          key={rec.id}
          rec={rec}
          posicion={posicion}
          total={items.length}
          onAnterior={() => setIdx(i => Math.max(0, i - 1))}
          onSiguiente={() => setIdx(i => Math.min(items.length - 1, i + 1))}
          onCompletar={onCompletar}
          onPostergar={onPostergar}
          onDescartar={onDescartar}
          onToggleItem={onToggleItem}
          onNavigate={onNavigate}
        />
      </div>

      <style>{`
        @keyframes recordatorioFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes recordatorioIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}
