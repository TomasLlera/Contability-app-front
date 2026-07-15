import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, size = 'lg', closeOnBackdrop = true }) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-slate-950/60 backdrop-blur-sm
                 animate-[fadeIn_150ms_ease-out]"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${maxW}
                    max-h-[90vh] overflow-hidden flex flex-col
                    ring-1 ring-slate-200 dark:ring-slate-700
                    animate-[modalIn_180ms_cubic-bezier(0.16,1,0.3,1)]`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-700/80">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="press p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200
                       hover:bg-slate-100 dark:hover:bg-slate-700/60"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
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
