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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${dangerous ? 'bg-red-100' : 'bg-amber-100'}`}>
            {dangerous
              ? <Trash2 size={16} className="text-red-600" />
              : <AlertTriangle size={16} className="text-amber-600" />
            }
          </div>
          <p className="text-slate-700 text-sm leading-relaxed pt-1.5">{message}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-xl text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 ${
              dangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {loading ? 'Procesando...' : (confirmLabel || (dangerous ? 'Eliminar' : 'Confirmar'))}
          </button>
        </div>
      </div>
    </div>
  );
}
