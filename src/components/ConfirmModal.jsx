import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import useDialogFocus from '../hooks/useDialogFocus';

/**
 * Diálogo de confirmación.
 *
 * message      — pregunta principal. Conviene que diga QUÉ se afecta (concepto,
 *                monto, fecha): "¿Borrar este movimiento?" no alcanza.
 * detail       — texto secundario opcional (consecuencias, qué se puede deshacer).
 * requireText  — si se pasa (p. ej. 'RESTAURAR'), el botón se habilita recién
 *                cuando se escribe esa palabra. Para acciones irreversibles grandes.
 */
export default function ConfirmModal({ message, detail, onConfirm, onCancel, dangerous = true, confirmLabel, cancelLabel = 'Cancelar', requireText }) {
  const [loading, setLoading] = useState(false);
  const [texto, setTexto] = useState('');
  const ref = useRef(null);
  useDialogFocus(ref);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !loading) onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, loading]);

  const habilitado = !requireText || texto.trim().toUpperCase() === requireText.toUpperCase();

  const handleConfirm = async () => {
    if (!habilitado) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-3 sm:p-4
                 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onClick={loading ? undefined : onCancel}
    >
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-msg"
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-6
                   ring-1 ring-slate-200 dark:ring-slate-700 animate-modal-in
                   mb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-start gap-3 mb-5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ring-4 ${
            dangerous
              ? 'bg-red-100 dark:bg-red-900/40 ring-red-50 dark:ring-red-950/40'
              : 'bg-amber-100 dark:bg-amber-900/40 ring-amber-50 dark:ring-amber-950/40'
          }`}>
            {dangerous
              ? <Trash2 size={17} className="text-red-600 dark:text-red-400" />
              : <AlertTriangle size={17} className="text-amber-700 dark:text-amber-400" />
            }
          </div>
          <div className="pt-1.5 min-w-0">
            <p id="confirm-msg" className="text-slate-800 dark:text-slate-100 text-sm font-medium leading-relaxed wrap-break-word">{message}</p>
            {detail && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{detail}</p>}
          </div>
        </div>
        {requireText && (
          <label className="block mb-4">
            <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Para confirmar escribí <strong className="text-slate-700 dark:text-slate-200">{requireText}</strong>
            </span>
            <input
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              autoComplete="off"
              data-autofocus
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </label>
        )}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            // Foco inicial en Cancelar: un Enter por inercia no borra nada.
            data-autofocus={requireText ? undefined : true}
            className="press flex-1 min-h-11 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !habilitado}
            className={`press flex-1 min-h-11 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 shadow-sm ${
              dangerous
                ? 'bg-linear-to-b from-red-500 to-red-600 hover:from-red-500 hover:to-red-700 shadow-red-500/25'
                : 'bg-linear-to-b from-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 shadow-amber-500/25'
            }`}
          >
            {loading ? 'Procesando…' : (confirmLabel || (dangerous ? 'Eliminar' : 'Confirmar'))}
          </button>
        </div>
      </div>
    </div>
  );
}
