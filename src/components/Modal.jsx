import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useIsMobile, useViewportHeight } from '../hooks/useMediaQuery';

/**
 * Modal responsive.
 *
 * Desktop (≥640px): cuadro centrado, como siempre.
 * Mobile  (<640px): full-screen entrando desde abajo. Un cuadrito con márgenes
 *   desperdicia el ancho que ya escasea, y deja los botones de acción al final
 *   de un formulario largo.
 *
 * `footer` fija los botones al pie, siempre visibles sin scrollear. Si no se
 * pasa, el contenido se comporta como antes.
 *
 * El alto en mobile sale de `visualViewport` y no de `100vh`/`100dvh`: al abrirse
 * el teclado virtual, `vh` no se entera y el input enfocado queda tapado.
 */
export default function Modal({ title, onClose, children, footer, size = 'lg', closeOnBackdrop = true }) {
  const isMobile = useIsMobile();
  const vh = useViewportHeight();

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

  const maxW = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl', '4xl': 'max-w-4xl' }[size] || 'max-w-lg';

  return (
    <div
      className={`fixed inset-0 z-50 flex bg-slate-950/60 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]
                  ${isMobile ? 'items-end' : 'items-center justify-center p-4'}`}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        // En mobile fijamos el alto al viewport visible: el modal encoge con el
        // teclado en vez de quedar debajo.
        style={isMobile && vh ? { height: `${vh}px` } : undefined}
        className={`relative bg-white dark:bg-slate-800 shadow-2xl w-full
                    overflow-hidden flex flex-col
                    ring-1 ring-slate-200 dark:ring-slate-700
                    ${isMobile
                      ? 'rounded-t-2xl h-dvh animate-[sheetIn_220ms_cubic-bezier(0.16,1,0.3,1)]'
                      : `${maxW} max-h-[90vh] rounded-2xl animate-[modalIn_180ms_cubic-bezier(0.16,1,0.3,1)]`}`}
      >
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-200 dark:border-slate-700/80">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 tracking-tight min-w-0 truncate">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="press shrink-0 w-11 h-11 -mr-2 sm:w-auto sm:h-auto sm:mr-0 sm:p-1.5 flex items-center justify-center rounded-lg
                       text-slate-400 hover:text-slate-700 dark:hover:text-slate-200
                       hover:bg-slate-100 dark:hover:bg-slate-700/60"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto overscroll-contain">{children}</div>

        {footer && (
          <div className="shrink-0 px-4 sm:px-5 py-3 border-t border-slate-200 dark:border-slate-700/80
                          bg-white dark:bg-slate-800
                          pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes sheetIn { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  );
}
