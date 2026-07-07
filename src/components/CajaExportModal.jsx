import { useState } from 'react';
import { Download, X, FileSpreadsheet } from 'lucide-react';
import { reportesApi, getErrorMsg } from '../api';

const mesActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Exporta el historial de caja de un mes a Excel (S2): hojas Resumen, Detalle y Comparativas.
export default function CajaExportModal({ onClose }) {
  const [mes, setMes] = useState(mesActual());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    if (!mes) { setError('Elegí un mes'); return; }
    setLoading(true); setError(null);
    try {
      await reportesApi.cajaMensual({ mes });
      onClose();
    } catch (err) {
      setError(err?.message || getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Exportar caja</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Genera un Excel con <strong className="text-slate-700 dark:text-slate-200">Resumen</strong>, <strong className="text-slate-700 dark:text-slate-200">Detalle día a día</strong> y <strong className="text-slate-700 dark:text-slate-200">Comparativas</strong> (quincena y mes vs mes anterior).
        </p>

        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Mes</label>
        <input
          type="month"
          value={mes}
          onChange={e => setMes(e.target.value)}
          className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {error && <p className="text-xs text-red-500 dark:text-red-400 mt-4 text-center">{error}</p>}

        <button
          onClick={handleExport}
          disabled={loading}
          className="mt-5 w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Download size={15} />
          {loading ? 'Generando...' : 'Descargar Excel'}
        </button>
      </div>
    </div>
  );
}
