import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';

/**
 * Hoja de filtro multi-selección: la presentación mobile de una fila de chips.
 *
 * Una fila de chips con contadores se va a tres líneas en 375px —más de un
 * tercio de la pantalla gastada antes de mostrar un solo dato—. Acá el filtro
 * ocupa una línea (el disparador lo pone quien la usa) y la lista completa vive
 * en la hoja, con 52px de área táctil por opción y el contador a la vista.
 *
 * A diferencia de <ActionSheet>, tocar una opción NO cierra: el filtro es
 * multi-selección y se cierra con "Listo", el backdrop o Escape.
 *
 * opciones:  [{ key, label, count, hint }]
 * seleccion: string[] — vacío = todas
 */
export default function FiltroSheet({
  title = 'Filtrar',
  todasLabel = 'Todas',
  opciones = [],
  seleccion = [],
  onToggle,
  onTodas,
  onClose,
}) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const todas = seleccion.length === 0;
  const fila = (activo) =>
    `w-full flex items-center gap-3 px-3 min-h-13 rounded-xl text-left
     active:bg-slate-100 dark:active:bg-slate-700/60 transition-colors
     ${activo ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`;

  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-end bg-slate-950/50 backdrop-blur-[2px] animate-[fadeIn_120ms_ease-out]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        className="w-full bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl
                   ring-1 ring-slate-200 dark:ring-slate-700
                   pb-[max(0.5rem,env(safe-area-inset-bottom))]
                   animate-[sheetIn_220ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        {/* Agarradera: señal visual de que la hoja se cierra tirando hacia abajo. */}
        <div className="flex justify-center pt-2.5 pb-1">
          <span className="w-9 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        <p className="px-5 pt-1 pb-2 text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">
          {title}
        </p>

        {/* La lista scrollea sola: con muchos tipos la hoja no puede crecer más
            allá del viewport o el botón "Listo" queda fuera de alcance. */}
        <div className="px-2 pb-2 max-h-[55vh] overflow-y-auto overscroll-contain">
          <button type="button" onClick={onTodas} className={fila(todas)}>
            <span className="shrink-0 w-5 flex justify-center">
              {todas && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
            </span>
            <span className={`flex-1 min-w-0 text-sm font-medium ${todas ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
              {todasLabel}
            </span>
          </button>

          {opciones.map(o => {
            const activo = seleccion.includes(o.key);
            return (
              <button key={o.key} type="button" onClick={() => onToggle?.(o.key)} className={fila(activo)}>
                <span className="shrink-0 w-5 flex justify-center">
                  {activo && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block truncate text-sm font-medium ${activo ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                    {o.label}
                  </span>
                  {o.hint && <span className="block truncate text-xs font-normal text-slate-400">{o.hint}</span>}
                </span>
                {/* Un 0 no deshabilita la opción: dice que no hay comprobantes
                    de ese tipo cargados, que es otra cosa. */}
                <span className="shrink-0 text-xs tabular-nums text-slate-400">{o.count ?? ''}</span>
              </button>
            );
          })}
        </div>

        <div className="px-4 pt-1 pb-2 border-t border-slate-100 dark:border-slate-700/60">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-11 rounded-xl text-sm font-semibold text-blue-600 dark:text-blue-400
                       active:bg-slate-100 dark:active:bg-slate-700/60"
          >
            Listo
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sheetIn { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>,
    document.body
  );
}
