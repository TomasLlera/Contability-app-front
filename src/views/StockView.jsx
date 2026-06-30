import { useState, useEffect, useRef } from 'react';
import { stockApi, subrubrosApi, rubrosApi, getErrorMsg } from '../api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, AlertTriangle, Package, ChevronRight, ChevronDown, X, Check, Link2, Percent, Download, Upload } from 'lucide-react';
import { EntityIcon } from '../icons';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
const fmtNum = (n) => new Intl.NumberFormat('es-AR').format(n ?? 0);

const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400';
const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

const UNIDADES = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'g', label: 'Gramo' },
  { value: 'litro', label: 'Litro' },
  { value: 'ml', label: 'Mililitro' },
  { value: 'm', label: 'Metro' },
  { value: 'cm', label: 'Centímetro' },
  { value: 'm2', label: 'Metro cuadrado' },
  { value: 'caja', label: 'Caja' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'rollo', label: 'Rollo' },
  { value: 'par', label: 'Par' },
  { value: 'docena', label: 'Docena' },
];

function SubrubroSelector({ value, valueName, onChange, rubros }) {
  const [open, setOpen] = useState(false);
  const [rubroActivo, setRubroActivo] = useState(null);
  const [subrubros, setSubrubros] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setRubroActivo(null); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpenRubro = async (r) => {
    setRubroActivo(r);
    const subs = await subrubrosApi.getByRubro(r.id);
    setSubrubros(subs);
  };

  const handleSelect = (id, name) => {
    onChange(id, name);
    setOpen(false);
    setRubroActivo(null);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setRubroActivo(null); }}
        className="w-full flex items-center gap-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <Link2 size={13} className="text-slate-400 shrink-0" />
        <span className={`flex-1 text-left truncate ${value ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
          {valueName || 'Sin vínculo'}
        </span>
        {value && (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onChange(null, null); }}
            className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
          ><X size={13} /></span>
        )}
        <ChevronDown size={13} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg overflow-hidden" style={{ maxHeight: '220px', display: 'flex', flexDirection: 'column' }}>
          {!rubroActivo ? (
            <>
              <div
                onClick={() => handleSelect(null, null)}
                className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-700 shrink-0 ${!value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                <X size={12} /><span>Sin vínculo</span>
              </div>
              <div className="overflow-y-auto flex-1">
                {rubros.map(r => (
                  <div
                    key={r.id}
                    onClick={() => handleOpenRubro(r)}
                    className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
                  >
                    <span className="shrink-0 text-slate-600 dark:text-slate-300"><EntityIcon value={r.icon} size={16} /></span>
                    <span className="flex-1 font-medium truncate">{r.nombre}</span>
                    <ChevronRight size={13} className="text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setRubroActivo(null)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 transition-colors shrink-0 text-left"
              >
                <ChevronRight size={13} className="rotate-180 shrink-0" />
                <span className="shrink-0 text-slate-600 dark:text-slate-300"><EntityIcon value={rubroActivo.icon} size={16} /></span>
                <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{rubroActivo.nombre}</span>
              </button>
              <div className="overflow-y-auto flex-1">
                {subrubros.length === 0 && (
                  <p className="px-4 py-3 text-xs text-slate-400">Sin subrubros</p>
                )}
                {subrubros.map(s => (
                  <div
                    key={s.id}
                    onClick={() => handleSelect(s.id, s.nombre)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm cursor-pointer transition-colors ${value === s.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    {s.icon && <span className="shrink-0 text-slate-500 dark:text-slate-400"><EntityIcon value={s.icon} size={15} /></span>}
                    <span className="flex-1 truncate">{s.nombre}</span>
                    {value === s.id && <Check size={12} className="shrink-0" />}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ProductoForm({ rubros, inicial, onSave, onCancel }) {
  const [form, setForm] = useState({
    nombre: inicial?.nombre || '',
    codigo_barra: inicial?.codigo_barra || '',
    categoria: inicial?.categoria || '',
    unidad: inicial?.unidad || 'unidad',
    precio_costo: inicial?.precio_costo || '',
    iva: inicial?.iva ?? '',
    precio_venta: inicial?.precio_venta || '',
    stock_actual: inicial?.stock_actual ?? '',
    stock_minimo: inicial?.stock_minimo || '',
    subrubro_id: inicial?.subrubro_id || null,
    descripcion: inicial?.descripcion || '',
  });
  const [subrubroName, setSubrubroName] = useState(inicial?.subrubro_nombre || null);
  const [margen, setMargen] = useState(() => {
    const c = Number(inicial?.precio_costo);
    const ivaVal = Number(inicial?.iva || 0);
    const v = Number(inicial?.precio_venta);
    const pci = c > 0 ? c * (1 + ivaVal / 100) : 0;
    if (pci > 0 && v > 0) return String(Math.round(((v / pci) - 1) * 100));
    return '';
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calcPCI = (costo, iva) => costo > 0 ? Math.round(costo * (1 + iva / 100)) : 0;

  const handleCostoChange = (v) => {
    set('precio_costo', v);
    const costo = Number(v);
    const iva = Number(form.iva || 0);
    const pci = calcPCI(costo, iva);
    if (pci > 0 && margen !== '') {
      set('precio_venta', String(Math.round(pci * (1 + Number(margen) / 100))));
    }
  };

  const handleIvaChange = (v) => {
    set('iva', v);
    const costo = Number(form.precio_costo);
    const iva = Number(v || 0);
    const pci = calcPCI(costo, iva);
    if (pci > 0 && margen !== '') {
      set('precio_venta', String(Math.round(pci * (1 + Number(margen) / 100))));
    }
  };

  const handleMargenChange = (v) => {
    setMargen(v);
    const costo = Number(form.precio_costo);
    const iva = Number(form.iva || 0);
    const pci = calcPCI(costo, iva);
    if (pci > 0 && v !== '') {
      set('precio_venta', String(Math.round(pci * (1 + Number(v) / 100))));
    }
  };

  const handlePrecioFinalChange = (v) => {
    set('precio_venta', v);
    const pf = Number(v);
    const iva = Number(form.iva || 0);
    const g = Number(margen || 0);
    if (pf > 0) {
      const divisor = (1 + iva / 100) * (1 + g / 100);
      set('precio_costo', divisor > 0 ? String(Math.round(pf / divisor)) : String(pf));
    }
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error('Nombre requerido'); return; }
    setSaving(true);
    try { await onSave(form); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Nombre | Código de barra */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Nombre *</label>
          <input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Cemento Portland" />
        </div>
        <div>
          <label className={labelCls}>Código de barra</label>
          <input className={inputCls} value={form.codigo_barra} onChange={e => set('codigo_barra', e.target.value)} placeholder="Ej: 7790001234567" />
        </div>
      </div>

      {/* Subrubro */}
      <div>
        <label className={labelCls}>Subrubro <span className="font-normal text-slate-400">(opcional)</span></label>
        <SubrubroSelector
          value={form.subrubro_id}
          valueName={subrubroName}
          onChange={(id, name) => { set('subrubro_id', id); setSubrubroName(name); }}
          rubros={rubros}
        />
      </div>

      {/* Stock */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{inicial ? 'Stock actual' : 'Stock inicial'}</label>
          <input
            className={inputCls + (inicial ? ' bg-slate-100 dark:bg-slate-600 cursor-not-allowed text-slate-500 dark:text-slate-300' : '')}
            type="number"
            min="0"
            readOnly={!!inicial}
            value={form.stock_actual}
            onChange={e => !inicial && set('stock_actual', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className={labelCls}>Stock mínimo</label>
          <input className={inputCls} type="number" min="0" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} placeholder="0" />
        </div>
      </div>

      {/* Precios */}
      <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 space-y-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Precios</p>
        {(() => {
          const costo = Number(form.precio_costo);
          const iva = Number(form.iva || 0);
          const precioConIva = costo > 0 ? Math.round(costo * (1 + iva / 100)) : 0;
          const precioFinal = Number(form.precio_venta);
          const readonlyCls = inputCls + ' bg-slate-100 dark:bg-slate-600 cursor-not-allowed text-slate-500 dark:text-slate-300';
          return (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>Costo</label>
                  <input className={inputCls} type="number" min="0" value={form.precio_costo} onChange={e => handleCostoChange(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <Percent size={11} /> IVA
                  </label>
                  <div className="relative">
                    <input className={inputCls + ' pr-6'} type="number" min="0" value={form.iva} onChange={e => handleIvaChange(e.target.value)} placeholder="0" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Costo + IVA</label>
                  <input className={readonlyCls} type="text" readOnly value={costo > 0 ? fmt(precioConIva) : ''} placeholder="—" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <Percent size={11} /> Ganancia
                  </label>
                  <div className="relative">
                    <input className={inputCls + ' pr-6'} type="number" min="0" value={margen} onChange={e => handleMargenChange(e.target.value)} placeholder="0" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Precio final</label>
                  <input className={inputCls} type="number" min="0" value={form.precio_venta} onChange={e => handlePrecioFinalChange(e.target.value)} placeholder="0" />
                </div>
              </div>
              {precioConIva > 0 && precioFinal > 0 && (
                <p className="text-xs text-slate-400">
                  Ganancia: <span className="font-medium text-emerald-600 dark:text-emerald-400">{fmt(precioFinal - precioConIva)}</span> por unidad
                </p>
              )}
            </>
          );
        })()}
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
          <Check size={14} /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button onClick={onCancel} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center gap-1.5">
          <X size={14} /> Cancelar
        </button>
      </div>
    </div>
  );
}

function PreciosTab({ productos, onActualizar }) {
  const [filtroSub, setFiltroSub] = useState('');
  const [filtroCat, setFiltroCat] = useState('');
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [ajusteTipo, setAjusteTipo] = useState('porcentaje');
  const [ajusteCampo, setAjusteCampo] = useState('venta');
  const [ajusteValor, setAjusteValor] = useState('');
  const [applying, setApplying] = useState(false);

  const subrubrosUniq = [...new Set(productos.filter(p => p.subrubro_nombre).map(p => p.subrubro_nombre))].sort();
  const categoriasUniq = [...new Set(productos.filter(p => p.categoria).map(p => p.categoria))].sort();

  const filtrados = productos.filter(p => {
    if (filtroSub && p.subrubro_nombre !== filtroSub) return false;
    if (filtroCat && p.categoria !== filtroCat) return false;
    return true;
  });

  const allSelected = filtrados.length > 0 && filtrados.every(p => seleccionados.has(p.id));

  const toggle = (id) => setSeleccionados(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (allSelected) setSeleccionados(new Set());
    else setSeleccionados(new Set(filtrados.map(p => p.id)));
  };

  const calcNew = (precio) => {
    const v = Number(ajusteValor);
    if (!ajusteValor) return null;
    if (ajusteTipo === 'porcentaje') return Math.round(precio * (1 + v / 100));
    if (ajusteTipo === 'monto') return Math.round(precio + v);
    if (ajusteTipo === 'fijar') return v;
    return null;
  };

  const getPreview = (p) => ({
    costo: (ajusteCampo === 'costo' || ajusteCampo === 'ambos') ? calcNew(p.precio_costo) : null,
    venta: (ajusteCampo === 'venta' || ajusteCampo === 'ambos') ? calcNew(p.precio_venta) : null,
  });

  const handleApply = async () => {
    if (seleccionados.size === 0) { toast.error('Seleccioná al menos un producto'); return; }
    if (!ajusteValor) { toast.error('Ingresá un valor'); return; }
    setApplying(true);
    try {
      const res = await stockApi.bulkUpdatePrecios([...seleccionados], ajusteCampo, ajusteTipo, Number(ajusteValor));
      toast.success(`Precios actualizados en ${res.updated} producto${res.updated !== 1 ? 's' : ''}`);
      setSeleccionados(new Set());
      setAjusteValor('');
      onActualizar();
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={filtroSub} onChange={e => { setFiltroSub(e.target.value); setSeleccionados(new Set()); }}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los subrubros</option>
          {subrubrosUniq.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filtroCat} onChange={e => { setFiltroCat(e.target.value); setSeleccionados(new Set()); }}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas las categorías</option>
          {categoriasUniq.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filtroSub || filtroCat) && (
          <button onClick={() => { setFiltroSub(''); setFiltroCat(''); setSeleccionados(new Set()); }}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors">
            Limpiar filtros
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400">{filtrados.length} productos</span>
      </div>

      {/* Panel de ajuste */}
      <div className="bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Ajuste de precios</span>
          {seleccionados.size > 0 && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
              {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className={labelCls}>Tipo de ajuste</label>
            <select value={ajusteTipo} onChange={e => setAjusteTipo(e.target.value)}
              className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="porcentaje">Aumentar %</option>
              <option value="monto">Aumentar $</option>
              <option value="fijar">Precio fijo</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Valor</label>
            <div className="relative">
              <input type="number" min="0" value={ajusteValor} onChange={e => setAjusteValor(e.target.value)}
                placeholder="0"
                className="w-28 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                {ajusteTipo === 'porcentaje' ? '%' : '$'}
              </span>
            </div>
          </div>
          <div>
            <label className={labelCls}>Aplicar a</label>
            <select value={ajusteCampo} onChange={e => setAjusteCampo(e.target.value)}
              className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="costo">Costo (recalcula precio final)</option>
              <option value="venta">Precio final</option>
            </select>
          </div>
          <button
            onClick={handleApply}
            disabled={applying || seleccionados.size === 0 || !ajusteValor}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Check size={14} />
            {applying ? 'Aplicando...' : seleccionados.size > 0 ? `Aplicar a ${seleccionados.size}` : 'Aplicar'}
          </button>
        </div>
      </div>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">Sin productos para mostrar</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded accent-blue-600 cursor-pointer" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden sm:table-cell">Subrubro / Cat.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Costo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Precio final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtrados.map(p => {
                const checked = seleccionados.has(p.id);
                const preview = checked && ajusteValor ? getPreview(p) : null;
                return (
                  <tr key={p.id} onClick={() => toggle(p.id)}
                    className={`cursor-pointer transition-colors ${checked ? 'bg-blue-50/60 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} className="rounded accent-blue-600 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{p.nombre}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex flex-col gap-0.5">
                        {p.subrubro_nombre && <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full w-fit">{p.subrubro_nombre}</span>}
                        {p.categoria && <span className="text-xs text-slate-400">{p.categoria}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {preview?.costo != null && preview.costo !== p.precio_costo ? (
                        <div className="flex flex-col items-end leading-tight">
                          <span className="text-xs text-slate-400 line-through">{fmt(p.precio_costo)}</span>
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmt(preview.costo)}</span>
                        </div>
                      ) : <span className="text-slate-600 dark:text-slate-300">{p.precio_costo ? fmt(p.precio_costo) : '—'}</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {preview?.venta != null && preview.venta !== p.precio_venta ? (
                        <div className="flex flex-col items-end leading-tight">
                          <span className="text-xs text-slate-400 line-through">{fmt(p.precio_venta)}</span>
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmt(preview.venta)}</span>
                        </div>
                      ) : <span className="text-slate-600 dark:text-slate-300">{p.precio_venta ? fmt(p.precio_venta) : '—'}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MovimientoModal({ producto, onClose, onDone }) {
  const [tipo, setTipo] = useState('entrada');
  const [cantidad, setCantidad] = useState('');
  const [observacion, setObservacion] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!cantidad || Number(cantidad) <= 0) { toast.error('Ingresá una cantidad válida'); return; }
    setSaving(true);
    try {
      await stockApi.createMovimiento({ producto_id: producto.id, tipo, cantidad: Number(cantidad), observacion });
      toast.success(tipo === 'entrada' ? `+${cantidad} ${producto.unidad} agregados` : tipo === 'salida' ? `-${cantidad} ${producto.unidad} descontados` : 'Stock ajustado');
      onDone();
      onClose();
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Registrar movimiento</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{producto.nombre} — stock actual: <strong className="text-slate-700 dark:text-slate-200">{fmtNum(producto.stock_actual)} {producto.unidad}</strong></p>
        <div className="space-y-3">
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
            {[['entrada','Entrada'], ['salida','Salida'], ['ajuste','Ajuste']].map(([v, l]) => (
              <button key={v} onClick={() => setTipo(v)} className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${tipo === v ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>{l}</button>
            ))}
          </div>
          <div>
            <label className={labelCls}>{tipo === 'ajuste' ? 'Nuevo stock total' : 'Cantidad'}</label>
            <input className={inputCls} type="number" min="0" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="0" autoFocus />
          </div>
          <div>
            <label className={labelCls}>Observación (opcional)</label>
            <input className={inputCls} value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Ej: Compra factura #123" />
          </div>
          <button onClick={handleSave} disabled={saving} className={`w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-1.5 ${tipo === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : tipo === 'salida' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {tipo === 'entrada' ? <ArrowDownCircle size={15} /> : tipo === 'salida' ? <ArrowUpCircle size={15} /> : <SlidersHorizontal size={15} />}
            {saving ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StockView({ role }) {
  const isAdmin = role !== 'viewer';
  const [tab, setTab] = useState('productos');
  const [productos, setProductos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [movModal, setMovModal] = useState(null);
  const [historialId, setHistorialId] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [historialSearch, setHistorialSearch] = useState('');
  const [formKey, setFormKey] = useState(0);
  const [importing, setImporting] = useState(false);
  const importRef = useRef(null);

  const cargar = async () => {
    try {
      const [prods, alertss, rubross] = await Promise.all([
        stockApi.getProductos(),
        stockApi.getAlertas(),
        rubrosApi.getAll(),
      ]);
      setProductos(prods);
      setAlertas(alertss);
      setRubros(rubross);
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const openHistorial = async (prod) => {
    setHistorialId(prod.id);
    const movs = await stockApi.getMovimientos(prod.id);
    setHistorial(movs);
  };

  const handleCreate = async (form) => {
    try {
      await stockApi.createProducto(form);
      toast.success('Producto creado');
      setFormKey(k => k + 1);
      setTab('productos');
      cargar();
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const handleEdit = async (form) => {
    try {
      await stockApi.updateProducto(editingId, form);
      toast.success('Actualizado');
      setEditingId(null);
      cargar();
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const handleDelete = async (id) => {
    try {
      await stockApi.deleteProducto(id);
      toast.success('Eliminado');
      cargar();
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const handleExport = async () => {
    try { await stockApi.exportProductos(); }
    catch (err) { toast.error(getErrorMsg(err)); }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const res = await stockApi.importProductos(file);
      toast.success(`Importado: ${res.creados} creados, ${res.actualizados} actualizados`);
      cargar();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setImporting(false); e.target.value = ''; }
  };

  const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()) || (p.categoria || '').toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Alertas de stock bajo */}
      {alertas.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{alertas.length} producto{alertas.length !== 1 ? 's' : ''} con stock bajo</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {alertas.map(p => (
              <span key={p.id} className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-700">
                {p.nombre} — {fmtNum(p.stock_actual)} / mín. {fmtNum(p.stock_minimo)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
        {[
          ['productos', `Productos (${productos.length})`],
          ...(isAdmin ? [['agregar', 'Agregar producto']] : []),
          ...(isAdmin ? [['precios', 'Actualizar precios']] : []),
          ['historial', 'Historial'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Agregar producto */}
      {tab === 'agregar' && isAdmin && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
          <ProductoForm key={formKey} rubros={rubros} onSave={handleCreate} onCancel={() => setTab('productos')} />
        </div>
      )}

      {/* Tab: Productos */}
      {tab === 'productos' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar producto o categoría..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button onClick={handleExport} title="Exportar Excel"
              className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-1.5 text-sm">
              <Download size={14} /> <span className="hidden sm:inline">Exportar</span>
            </button>
            {isAdmin && (
              <>
                <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
                <button onClick={() => importRef.current?.click()} disabled={importing} title="Importar Excel"
                  className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50">
                  <Upload size={14} /> <span className="hidden sm:inline">{importing ? 'Importando...' : 'Importar'}</span>
                </button>
              </>
            )}
          </div>

          {filtrados.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-12 text-center">
              <Package size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">{search ? 'Sin resultados' : 'Sin productos'}</p>
              {!search && isAdmin && <p className="text-sm text-slate-400 mt-1">Hacé clic en "Nuevo" para agregar el primero</p>}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Producto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden sm:table-cell">Categoría</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Costo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Venta</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden lg:table-cell">Subrubro</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filtrados.map(p => {
                    const stockBajo = p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo;
                    if (editingId === p.id) {
                      return (
                        <tr key={p.id}>
                          <td colSpan={7} className="px-4 py-3">
                            <ProductoForm rubros={rubros} inicial={p} onSave={handleEdit} onCancel={() => setEditingId(null)} />
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{p.nombre}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell">{p.categoria || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${stockBajo ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            {fmtNum(p.stock_actual)}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">{p.unidad}</span>
                          {stockBajo && <AlertTriangle size={12} className="inline ml-1 text-amber-500" />}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 hidden md:table-cell">{p.precio_costo ? fmt(p.precio_costo) : '—'}</td>
                        <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 hidden md:table-cell">{p.precio_venta ? fmt(p.precio_venta) : '—'}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {p.subrubro_nombre
                            ? <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{p.subrubro_nombre}</span>
                            : <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openHistorial(p)} className="text-slate-400 hover:text-blue-500 transition-colors" title="Ver historial">
                              <SlidersHorizontal size={14} />
                            </button>
                            {isAdmin && (
                              <>
                                <button onClick={() => setMovModal(p)} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Registrar movimiento">
                                  <ArrowDownCircle size={14} />
                                </button>
                                <button onClick={() => setEditingId(p.id)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Editar">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Eliminar">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Actualizar precios */}
      {tab === 'precios' && isAdmin && (
        <PreciosTab productos={productos} onActualizar={cargar} />
      )}

      {/* Tab: Historial */}
      {tab === 'historial' && (() => {
        const filtrados = productos.filter(p =>
          !historialSearch.trim() || p.nombre.toLowerCase().includes(historialSearch.toLowerCase())
        );
        const selNombre = productos.find(p => p.id === historialId)?.nombre;
        return (
          <div className="space-y-3">
            {/* Buscador + lista */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                <input
                  className={inputCls}
                  placeholder="Buscar producto..."
                  value={historialSearch}
                  onChange={e => setHistorialSearch(e.target.value)}
                />
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
                {filtrados.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">Sin resultados</p>
                ) : filtrados.map(p => (
                  <div
                    key={p.id}
                    onClick={() => openHistorial(p)}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors text-sm border-b border-slate-50 dark:border-slate-700/50 last:border-0 ${historialId === p.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}`}
                  >
                    <span className="truncate">{p.nombre}</span>
                    <span className="text-xs text-slate-400 shrink-0 ml-3">Stock: {fmtNum(p.stock_actual)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabla de movimientos */}
            {historialId && (
              <>
                {selNombre && (
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 px-1">{selNombre}</p>
                )}
                {historial.length > 0 ? (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Fecha</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tipo</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cantidad</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Observación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {historial.map(m => (
                          <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{m.fecha}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.tipo === 'entrada' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : m.tipo === 'salida' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'}`}>
                                {m.tipo}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-right font-semibold ${m.tipo === 'entrada' ? 'text-emerald-600' : m.tipo === 'salida' ? 'text-red-600' : 'text-blue-600'}`}>
                              {m.tipo === 'entrada' ? '+' : m.tipo === 'salida' ? '-' : '='}{fmtNum(m.cantidad)}
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{m.observacion || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-sm">Sin movimientos registrados</div>
                )}
              </>
            )}
          </div>
        );
      })()}

      {movModal && (
        <MovimientoModal
          producto={movModal}
          onClose={() => setMovModal(null)}
          onDone={cargar}
        />
      )}
    </div>
  );
}
