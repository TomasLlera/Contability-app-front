import { useState } from 'react';
import { Download, X, FileSpreadsheet } from 'lucide-react';
import { getErrorMsg } from '../api';
import InfoTooltip from './InfoTooltip';

const mesActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Modal genérico para exportar un registro (Ventas Sistema / Tarjetas) a Excel por
// rango de meses. Mismo mes en Desde/Hasta = un solo mes; rango = comparativa.
// `onExport({ desde, hasta })` recibe el rango ya ordenado.
export default function RegistroExportModal({ titulo, ayuda, mesInicial, onExport, onClose }) {
  const inicial = mesInicial || mesActual();
  const [desde, setDesde] = useState(inicial);
  const [hasta, setHasta] = useState(inicial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    if (!desde || !hasta) { setError('Elegí el rango de meses'); return; }
    const [d, h] = hasta < desde ? [hasta, desde] : [desde, hasta];
    setLoading(true); setError(null);
    try {
      await onExport({ desde: d, hasta: h });
      onClose();
    } catch (err) {
      setError(err?.message || getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">{titulo}</h2>
            {ayuda && <InfoTooltip text={ayuda} />}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Desde</label>
            <input type="month" value={desde} onChange={e => setDesde(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
            <input type="month" value={hasta} onChange={e => setHasta(e.target.value)} className={inputCls} />
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Elegí el mismo mes en ambos para exportar uno solo, o un rango para comparar varios meses.
        </p>

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
