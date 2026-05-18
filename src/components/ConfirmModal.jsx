import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function ConfirmModal({ message, onConfirm, onCancel, dangerous = true, confirmLabel }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-slate-950/60 backdrop-blur-sm
                 animate-[fadeIn_150ms_ease-out]"
      onClick={loading ? undefined : onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6
                   ring-1 ring-slate-200 dark:ring-slate-700
                   animate-[modalIn_180ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="flex items-start gap-3 mb-5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ring-4 ${
            dangerous
              ? 'bg-red-100 dark:bg-red-900/40 ring-red-50 dark:ring-red-950/40'
              : 'bg-amber-100 dark:bg-amber-900/40 ring-amber-50 dark:ring-amber-950/40'
          }`}>
            {dangerous
              ? <Trash2 size={17} className="text-red-600 dark:text-red-400" />
              : <AlertTriangle size={17} className="text-amber-600 dark:text-amber-400" />
            }
          </div>
          <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed pt-1.5">{message}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="press flex-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`press flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 shadow-sm ${
              dangerous
                ? 'bg-linear-to-b from-red-500 to-red-600 hover:from-red-500 hover:to-red-700 shadow-red-500/25'
                : 'bg-linear-to-b from-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 shadow-amber-500/25'
            }`}
          >
            {loading ? 'Procesando…' : (confirmLabel || (dangerous ? 'Eliminar' : 'Confirmar'))}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
