import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { movimientosApi, getErrorMsg } from '../api';

const hoy = () => new Date().toISOString().split('T')[0];
const addMonths = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().split('T')[0];
};
const startOfYear = () => `${new Date().getFullYear()}-01-01`;

const PRESETS = [
  { label: 'Último mes',    desde: () => addMonths(-1), hasta: hoy },
  { label: 'Últimos 3 meses', desde: () => addMonths(-3), hasta: hoy },
  { label: 'Último año',    desde: () => addMonths(-12), hasta: hoy },
  { label: 'Este año',      desde: startOfYear, hasta: hoy },
  { label: 'Todo',          desde: () => '', hasta: () => '' },
  { label: 'Personalizado', desde: null, hasta: null },
];

export default function ExportModal({ subrubro, onClose }) {
  const [preset, setPreset] = useState(4); // "Todo" por defecto
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePreset = (idx) => {
    setPreset(idx);
    const p = PRESETS[idx];
    if (p.desde !== null) {
      setDesde(p.desde());
      setHasta(p.hasta());
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const p = PRESETS[preset];
      const d = p.label === 'Todo' ? null : desde || null;
      const h = p.label === 'Todo' ? null : hasta || null;
      await movimientosApi.exportExcel(subrubro.id, subrubro.nombre, d, h);
      onClose();
    } catch (err) {
      setError(err?.message ? err.message : getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const isPersonalizado = PRESETS[preset].desde === null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Exportar Excel</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Período a exportar para <strong className="text-slate-700 dark:text-slate-200">{subrubro.nombre}</strong></p>

        {/* Presets */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => handlePreset(i)}
              className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors border ${
                preset === i
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500'
              }`}
            >{p.label}</button>
          ))}
        </div>

        {/* Rango personalizado */}
        {(isPersonalizado || PRESETS[preset].label !== 'Todo') && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Desde</label>
              <input
                type="date"
                value={desde}
                onChange={e => { setDesde(e.target.value); setPreset(5); }}
                className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
              <input
                type="date"
                value={hasta}
                onChange={e => { setHasta(e.target.value); setPreset(5); }}
                className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {PRESETS[preset].label === 'Todo' && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5 text-center">Se exportarán todos los movimientos sin filtro de fecha.</p>
        )}

        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 mb-3 text-center">{error}</p>
        )}

        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Download size={15} />
          {loading ? 'Generando...' : 'Descargar Excel'}
        </button>
      </div>
    </div>
  );
}
