import { useState, useEffect, useRef } from 'react';
import { movimientosApi } from '../api';
import { Search, X } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);

export default function BuscadorGlobal({ onNavigate, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    setActiveIdx(-1);
    if (query.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(() => {
      movimientosApi.search(query.trim())
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    if (e.key === 'Enter' && activeIdx >= 0) {
      const mov = results[activeIdx];
      if (mov?.rubro && mov?.subrubro) { onNavigate(mov.rubro, mov.subrubro); onClose(); }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-16 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar movimientos, facturas, proveedores..."
            className="flex-1 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:block text-xs text-slate-400 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto">
          {loading && (
            <div className="py-10 text-center text-slate-400 text-sm">Buscando...</div>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="py-10 text-center text-slate-400 text-sm">
              Sin resultados para <strong className="text-slate-600 dark:text-slate-300">"{query}"</strong>
            </div>
          )}
          {!loading && query.trim().length < 2 && (
            <div className="py-10 text-center text-slate-400 text-sm">
              Escribí al menos 2 caracteres
            </div>
          )}
          {!loading && results.map((mov, i) => (
            <button
              key={mov.id}
              onClick={() => { if (mov.rubro && mov.subrubro) { onNavigate(mov.rubro, mov.subrubro); onClose(); } }}
              className={`w-full flex items-start gap-3 px-4 py-3 transition-colors text-left border-b border-slate-100 dark:border-slate-700 last:border-0 ${
                i === activeIdx ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <span className="text-xl mt-0.5 shrink-0">{mov.subrubro?.icon || '📄'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                    {mov.subrubro?.nombre}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">{mov.rubro?.nombre}</span>
                  {mov.campos_extra?.nro_factura && (
                    <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded shrink-0">
                      {mov.campos_extra.nro_factura}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {mov.concepto || mov.campos_extra?.descripcion || (mov.tipo === 'factura' ? 'Factura' : mov.tipo === 'pago' ? 'Pago' : mov.tipo)}
                </p>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className={`text-sm font-bold ${mov.tipo === 'factura' ? 'text-slate-800 dark:text-slate-100' : 'text-emerald-600'}`}>
                  {mov.tipo === 'factura' ? fmt(mov.monto) : `+${fmt(mov.pago)}`}
                </p>
                <p className="text-xs text-slate-400">{mov.fecha || 'Sin fecha'}</p>
              </div>
            </button>
          ))}
        </div>

        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3 text-xs text-slate-400">
            <span>{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
            <span className="hidden sm:block">· ↑↓ navegar · Enter seleccionar</span>
          </div>
        )}
      </div>
    </div>
  );
}
