import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Hoja de acciones que entra desde abajo. Es la presentación mobile de los
 * menús de fila: cada acción ocupa 52px de alto y lleva su etiqueta, así que
 * no hay que adivinar qué hace un ícono de 14px ni acertarle con el pulgar.
 *
 * acciones: [{ key, label, icon, onClick, tone?: 'default'|'danger'|'success', hint? }]
 */
export default function ActionSheet({ title, acciones = [], onClose }) {
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

  const tono = {
    danger:  'text-red-600 dark:text-red-400',
    success: 'text-green-600 dark:text-green-400',
    default: 'text-slate-700 dark:text-slate-200',
  };

  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-end bg-slate-950/50 backdrop-blur-[2px] animate-[fadeIn_120ms_ease-out]"
      onClick={onClose}
    >
      <div
        role="menu"
        aria-label={title || 'Acciones'}
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

        {title && (
          <p className="px-5 pt-1 pb-2 text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">
            {title}
          </p>
        )}

        <div className="px-2 pb-2">
          {acciones.map(a => (
            <button
              key={a.key}
              type="button"
              disabled={a.disabled}
              onClick={() => { onClose?.(); a.onClick?.(); }}
              className={`w-full flex items-center gap-3 px-3 min-h-13 rounded-xl text-left text-sm font-medium
                          active:bg-slate-100 dark:active:bg-slate-700/60 disabled:opacity-40
                          ${tono[a.tone] || tono.default}`}
            >
              <span className="shrink-0 w-5 flex justify-center">{a.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block truncate">{a.label}</span>
                {a.hint && <span className="block text-xs font-normal text-slate-400 truncate">{a.hint}</span>}
              </span>
            </button>
          ))}
        </div>

        <div className="px-4 pt-1 pb-2 border-t border-slate-100 dark:border-slate-700/60">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-11 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400
                       active:bg-slate-100 dark:active:bg-slate-700/60"
          >
            Cancelar
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
