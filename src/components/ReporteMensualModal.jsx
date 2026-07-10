import { useState } from 'react';
import { Download, X, FileSpreadsheet } from 'lucide-react';
import { reportesApi, getErrorMsg } from '../api';
import InfoTooltip from './InfoTooltip';

const mesActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Modal de exportación del análisis mensual de subrubros (S1).
export default function ReporteMensualModal({ rubro, subrubros = [], onClose }) {
  const [mes, setMes] = useState(mesActual());
  const [subrubroId, setSubrubroId] = useState('');
  const [orden, setOrden] = useState('saldo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    if (!mes) { setError('Elegí un mes'); return; }
    setLoading(true); setError(null);
    try {
      await reportesApi.subrubrosMensual(rubro.id, rubro.nombre, {
        mes,
        subrubroId: subrubroId || null,
        orden,
      });
      onClose();
    } catch (err) {
      setError(err?.message || getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Análisis mensual</h2>
            <InfoTooltip text={`Compara el saldo de cada subrubro de ${rubro.nombre} con el mes anterior: diferencia, % de cambio y tendencia, con barras de evolución.`} />
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Mes a analizar</label>
            <input
              type="month"
              value={mes}
              onChange={e => setMes(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Subrubro</label>
            <select
              value={subrubroId}
              onChange={e => setSubrubroId(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los subrubros</option>
              {subrubros.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Ordenar por</label>
            <select
              value={orden}
              onChange={e => setOrden(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="saldo">Saldo mes actual (mayor primero)</option>
              <option value="subrubro">Subrubro (A → Z)</option>
              <option value="diferencia">Diferencia (mayor primero)</option>
              <option value="pct">% Cambio (mayor primero)</option>
            </select>
          </div>
        </div>

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
