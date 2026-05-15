import { useState, useEffect, useRef } from 'react';
import { stockApi, subrubrosApi, rubrosApi, getErrorMsg } from '../api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, AlertTriangle, Package, ChevronRight, ChevronDown, X, Check, Link2, Percent } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);
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
                    <span className="text-base shrink-0">{r.icon || '📁'}</span>
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
                <span className="text-base shrink-0">{rubroActivo.icon || '📁'}</span>
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
                    {s.icon && <span className="text-sm shrink-0">{s.icon}</span>}
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
    categoria: inicial?.categoria || '',
    unidad: inicial?.unidad || 'unidad',
    precio_costo: inicial?.precio_costo || '',
    precio_venta: inicial?.precio_venta || '',
    stock_actual: inicial?.stock_actual ?? '',
    stock_minimo: inicial?.stock_minimo || '',
    subrubro_id: inicial?.subrubro_id || null,
    descripcion: inicial?.descripcion || '',
  });
  const [subrubroName, setSubrubroName] = useState(inicial?.subrubro_nombre || null);
  const [margen, setMargen] = useState(() => {
    const c = Number(inicial?.precio_costo);
    const v = Number(inicial?.precio_venta);
    if (c > 0 && v > 0) return String(Math.round(((v / c) - 1) * 100));
    return '';
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCostoChange = (v) => {
    set('precio_costo', v);
    const costo = Number(v);
    if (costo > 0 && margen !== '') {
      set('precio_venta', String(Math.round(costo * (1 + Number(margen) / 100))));
    }
  };

  const handleMargenChange = (v) => {
    setMargen(v);
    const costo = Number(form.precio_costo);
    if (costo > 0 && v !== '') {
      set('precio_venta', String(Math.round(costo * (1 + Number(v) / 100))));
    }
  };

  const handleVentaChange = (v) => {
    set('precio_venta', v);
    const costo = Number(form.precio_costo);
    const venta = Number(v);
    if (costo > 0 && venta > 0) {
      setMargen(String(Math.round(((venta / costo) - 1) * 100)));
    } else {
      setMargen('');
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Nombre *</label>
          <input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Cemento Portland" />
        </div>
        <div>
          <label className={labelCls}>Categoría</label>
          <input className={inputCls} value={form.categoria} onChange={e => set('categoria', e.target.value)} placeholder="Ej: Construcción" />
        </div>
        <div>
          <label className={labelCls}>Unidad</label>
          <select className={inputCls} value={form.unidad} onChange={e => set('unidad', e.target.value)}>
            {UNIDADES.map(u => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Stock mínimo</label>
          <input className={inputCls} type="number" min="0" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} placeholder="0" />
        </div>
      </div>

      {/* Precios con margen */}
      <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 space-y-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Precios</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelCls}>Costo</label>
            <input className={inputCls} type="number" min="0" value={form.precio_costo} onChange={e => handleCostoChange(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              <Percent size={11} /> Ganancia
            </label>
            <div className="relative">
              <input
                className={inputCls + ' pr-6'}
                type="number"
                min="0"
                value={margen}
                onChange={e => handleMargenChange(e.target.value)}
                placeholder="0"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
            </div>
          </div>
          <div>
            <label className={labelCls}>Venta</label>
            <input className={inputCls} type="number" min="0" value={form.precio_venta} onChange={e => handleVentaChange(e.target.value)} placeholder="0" />
          </div>
        </div>
        {Number(form.precio_costo) > 0 && Number(form.precio_venta) > 0 && (
          <p className="text-xs text-slate-400">
            Ganancia: <span className="font-medium text-emerald-600 dark:text-emerald-400">{fmt(Number(form.precio_venta) - Number(form.precio_costo))}</span> por unidad
          </p>
        )}
      </div>

      {!inicial && (
        <div>
          <label className={labelCls}>Stock inicial</label>
          <input className={inputCls} type="number" min="0" value={form.stock_actual} onChange={e => set('stock_actual', e.target.value)} placeholder="0" />
        </div>
      )}

      <div>
        <label className={labelCls}>Vincular a subrubro <span className="font-normal text-slate-400">(opcional)</span></label>
        <SubrubroSelector
          value={form.subrubro_id}
          valueName={subrubroName}
          onChange={(id, name) => { set('subrubro_id', id); setSubrubroName(name); }}
          rubros={rubros}
        />
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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [movModal, setMovModal] = useState(null);
  const [historialId, setHistorialId] = useState(null);
  const [historial, setHistorial] = useState([]);

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
      setShowForm(false);
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
        {[['productos', `📦 Productos (${productos.length})`], ['historial', '📋 Historial']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

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
            {isAdmin && !showForm && (
              <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5">
                <Plus size={14} /> Nuevo
              </button>
            )}
          </div>

          {showForm && isAdmin && (
            <div className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Nuevo producto</h3>
              <ProductoForm rubros={rubros} onSave={handleCreate} onCancel={() => setShowForm(false)} />
            </div>
          )}

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

      {/* Tab: Historial */}
      {tab === 'historial' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <select
              value={historialId || ''}
              onChange={e => e.target.value ? openHistorial({ id: Number(e.target.value) }) : setHistorialId(null)}
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar producto...</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          {historialId && historial.length > 0 ? (
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
          ) : historialId ? (
            <div className="text-center py-12 text-slate-400">Sin movimientos registrados</div>
          ) : (
            <div className="text-center py-12 text-slate-400">Seleccioná un producto para ver su historial</div>
          )}
        </div>
      )}

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
