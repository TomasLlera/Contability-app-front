import { useState, useEffect } from 'react';
import { stockApi, subrubrosApi, rubrosApi, getErrorMsg } from '../api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, AlertTriangle, Package, ChevronRight, X, Check } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);
const fmtNum = (n) => new Intl.NumberFormat('es-AR').format(n ?? 0);

const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400';
const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

function SubrubroSelector({ value, onChange, rubros }) {
  const [expanded, setExpanded] = useState(null);
  const [subrubrosMap, setSubrubrosMap] = useState({});

  const toggleRubro = async (rubroId) => {
    if (expanded === rubroId) { setExpanded(null); return; }
    setExpanded(rubroId);
    if (!subrubrosMap[rubroId]) {
      const subs = await subrubrosApi.getByRubro(rubroId);
      setSubrubrosMap(prev => ({ ...prev, [rubroId]: subs }));
    }
  };

  return (
    <div className="border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-white dark:bg-slate-700">
      <div
        className={`px-3 py-2 text-sm cursor-pointer transition-colors ${!value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
        onClick={() => onChange(null)}
      >
        Sin vínculo
      </div>
      {rubros.map(r => (
        <div key={r.id}>
          <div
            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-600"
            onClick={() => toggleRubro(r.id)}
          >
            <span className="text-base">{r.icon || '📁'}</span>
            <span className="flex-1 font-medium">{r.nombre}</span>
            <ChevronRight size={13} className={`transition-transform ${expanded === r.id ? 'rotate-90' : ''}`} />
          </div>
          {expanded === r.id && (subrubrosMap[r.id] || []).map(s => (
            <div
              key={s.id}
              className={`flex items-center gap-2 pl-8 pr-3 py-1.5 text-sm cursor-pointer transition-colors ${value === s.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
              onClick={() => onChange(s.id)}
            >
              {s.icon && <span className="text-sm">{s.icon}</span>}
              <span>{s.nombre}</span>
              {value === s.id && <Check size={12} className="ml-auto" />}
            </div>
          ))}
        </div>
      ))}
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
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
            {['unidad', 'kg', 'g', 'litro', 'ml', 'm', 'cm', 'm²', 'caja', 'bolsa', 'rollo', 'par'].map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Stock mínimo</label>
          <input className={inputCls} type="number" min="0" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={labelCls}>Precio costo</label>
          <input className={inputCls} type="number" min="0" value={form.precio_costo} onChange={e => set('precio_costo', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={labelCls}>Precio venta</label>
          <input className={inputCls} type="number" min="0" value={form.precio_venta} onChange={e => set('precio_venta', e.target.value)} placeholder="0" />
        </div>
        {!inicial && (
          <div>
            <label className={labelCls}>Stock inicial</label>
            <input className={inputCls} type="number" min="0" value={form.stock_actual} onChange={e => set('stock_actual', e.target.value)} placeholder="0" />
          </div>
        )}
      </div>

      <div>
        <label className={labelCls}>Vincular a subrubro (opcional)</label>
        <SubrubroSelector value={form.subrubro_id} onChange={v => set('subrubro_id', v)} rubros={rubros} />
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
    const [prods, alertss, rubross] = await Promise.all([
      stockApi.getProductos(),
      stockApi.getAlertas(),
      rubrosApi.getAll(),
    ]);
    setProductos(prods);
    setAlertas(alertss);
    setRubros(rubross);
    setLoading(false);
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
