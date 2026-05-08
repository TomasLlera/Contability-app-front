import { useState, useEffect } from 'react';
import { cajaApi, movimientosApi, subrubrosApi } from '../api';
import {
  Plus, Trash2, Pencil, ChevronLeft, ChevronRight,
  Users, ShoppingCart, Banknote, ArrowLeftRight, Star, Clock, Wallet, Settings, X, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);
const todayStr = () => new Date().toISOString().split('T')[0];
const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};
const formatFecha = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
};

const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const selectCls = inputCls;

// ── Panel de configuración ──────────────────────────────────────────────────
function ConfigPanel({ config, rubros, onSave, onClose }) {
  const [empleados, setEmpleados] = useState(config.empleados || []);
  const [proveedores, setProveedores] = useState(config.proveedores || []);
  const [nuevoEmp, setNuevoEmp] = useState('');
  const [nuevoProv, setNuevoProv] = useState('');
  const [nuevoProvSub, setNuevoProvSub] = useState('');

  const addEmpleado = () => {
    if (!nuevoEmp.trim()) return;
    setEmpleados(prev => [...prev, { nombre: nuevoEmp.trim() }]);
    setNuevoEmp('');
  };

  const addProveedor = () => {
    if (!nuevoProv.trim() && !nuevoProvSub) return;
    if (nuevoProvSub) {
      const sub = rubros.find(r => String(r.id) === nuevoProvSub);
      setProveedores(prev => [...prev, { nombre: sub?.nombre || nuevoProvSub, subrubro_id: Number(nuevoProvSub) }]);
      setNuevoProvSub('');
    } else {
      setProveedores(prev => [...prev, { nombre: nuevoProv.trim(), subrubro_id: null }]);
      setNuevoProv('');
    }
  };

  const handleSave = async () => {
    await onSave({ empleados, proveedores });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Settings size={15} /> Configurar Caja</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {/* Empleados */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5"><Users size={13} className="text-green-600" /> Empleados</h3>
          <div className="space-y-1.5 mb-2">
            {empleados.map((e, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-1.5">
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{e.nombre}</span>
                <button onClick={() => setEmpleados(prev => prev.filter((_, j) => j !== i))}
                  className="text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" className={inputCls} placeholder="Nombre del empleado"
              value={nuevoEmp} onChange={e => setNuevoEmp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEmpleado()} />
            <button onClick={addEmpleado} className="bg-green-600 text-white px-3 rounded-lg hover:bg-green-700"><Plus size={15} /></button>
          </div>
        </div>

        {/* Proveedores */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5"><ShoppingCart size={13} className="text-red-500" /> Proveedores</h3>
          <div className="space-y-1.5 mb-2">
            {proveedores.map((p, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-1.5">
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{p.nombre}</span>
                {p.subrubro_id && <span className="text-xs text-blue-500">vinculado</span>}
                <button onClick={() => setProveedores(prev => prev.filter((_, j) => j !== i))}
                  className="text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          {/* Desde subrubro */}
          <div className="mb-2">
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Vincular a un subrubro existente</label>
            <div className="flex gap-2">
              <select className={selectCls} value={nuevoProvSub} onChange={e => setNuevoProvSub(e.target.value)}>
                <option value="">— Elegir subrubro —</option>
                {rubros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
              <button onClick={addProveedor} disabled={!nuevoProvSub}
                className="bg-blue-600 text-white px-3 rounded-lg hover:bg-blue-700 disabled:opacity-40"><Plus size={15} /></button>
            </div>
          </div>
          {/* Manual */}
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">O agregar manualmente</label>
            <div className="flex gap-2">
              <input type="text" className={inputCls} placeholder="Nombre del proveedor"
                value={nuevoProv} onChange={e => setNuevoProv(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addProveedor()} />
              <button onClick={addProveedor} disabled={!nuevoProv.trim()}
                className="bg-red-500 text-white px-3 rounded-lg hover:bg-red-600 disabled:opacity-40"><Plus size={15} /></button>
            </div>
          </div>
        </div>

        <button onClick={handleSave}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
          <Check size={15} /> Guardar configuración
        </button>
      </div>
    </div>
  );
}

// ── Formulario de entrada ───────────────────────────────────────────────────
function EntryForm({ fecha, onSave, onCancel, initial, tipoForzado, empleadosList, proveedoresList }) {
  const [tipo, setTipo]         = useState(tipoForzado || initial?.tipo || 'gasto');
  const [concepto, setConcepto] = useState(initial?.concepto || '');
  const [monto, setMonto]       = useState(initial?.monto || '');
  const [metodo, setMetodo]     = useState(initial?.metodo || 'efectivo');
  const [esEspecial, setEsEspecial] = useState(initial?.es_especial || false);
  const [seleccion, setSeleccion] = useState('');

  const lista = tipo === 'empleado' ? empleadosList : tipo === 'gasto' ? proveedoresList : [];

  const handleSeleccion = (val) => {
    setSeleccion(val);
    if (val) setConcepto(val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!concepto.trim() || !Number(monto)) return;
    onSave({ fecha, tipo, concepto: concepto.trim(), monto: Number(monto), metodo, es_especial: esEspecial });
  };

  const TIPOS_FORM = [
    { value: 'empleado',      label: 'Empleado',     color: 'bg-green-600' },
    { value: 'gasto',         label: 'Gasto',        color: 'bg-red-500' },
    { value: 'ingreso_extra', label: 'Ingreso extra', color: 'bg-amber-500' },
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3 border border-slate-200 dark:border-slate-600">
      {!tipoForzado && (
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs font-medium">
          {TIPOS_FORM.map(t => (
            <button key={t.value} type="button" onClick={() => { setTipo(t.value); setSeleccion(''); setConcepto(''); }}
              className={`flex-1 py-2 transition-colors ${tipo === t.value ? `${t.color} text-white` : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {lista.length > 0 && (
        <select className={selectCls} value={seleccion} onChange={e => handleSeleccion(e.target.value)}>
          <option value="">— Elegir de la lista —</option>
          {lista.map((item, i) => <option key={i} value={item.nombre}>{item.nombre}</option>)}
          <option value="__otro__">Otro (escribir)</option>
        </select>
      )}

      {(lista.length === 0 || seleccion === '__otro__' || !seleccion) && (
        <input type="text" className={inputCls}
          placeholder={tipo === 'empleado' ? 'Nombre del empleado' : tipo === 'ingreso_extra' ? 'Descripción del ingreso' : 'Proveedor o concepto'}
          value={concepto} onChange={e => setConcepto(e.target.value)} required autoFocus={!lista.length} />
      )}

      <div className="grid grid-cols-2 gap-2">
        <input type="number" min="0" step="any" className={inputCls} placeholder="Monto"
          value={monto} onChange={e => setMonto(e.target.value)} required />
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs font-medium">
          {[['efectivo', 'Efectivo'], ['transferencia', 'Transf.']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setMetodo(v)}
              className={`flex-1 py-2 transition-colors ${metodo === v ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {tipo === 'gasto' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="accent-amber-500" checked={esEspecial} onChange={e => setEsEspecial(e.target.checked)} />
          <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <Star size={11} className="text-amber-500" /> Marcar como pago especial
          </span>
        </label>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-2 rounded-lg text-sm">
          Cancelar
        </button>
        <button type="submit" disabled={!concepto.trim() || !Number(monto)}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40">
          Guardar
        </button>
      </div>
    </form>
  );
}

function MetodoBadge({ metodo }) {
  return metodo === 'efectivo'
    ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Efectivo</span>
    : <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Transf.</span>;
}

function MovRow({ m, onEdit, onDelete, colorMonto }) {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{m.concepto}</p>
          {m.es_especial && <Star size={11} className="text-amber-500 shrink-0" />}
        </div>
        <MetodoBadge metodo={m.metodo} />
      </div>
      <p className={`text-base font-bold whitespace-nowrap ${colorMonto}`}>{fmt(m.monto)}</p>
      <button onClick={() => onEdit(m)} className="text-slate-400 hover:text-blue-500 transition-colors shrink-0"><Pencil size={14} /></button>
      <button onClick={() => onDelete(m.id)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0"><Trash2 size={14} /></button>
    </div>
  );
}

function ResumenMetodo({ label, icon: Icon, color, disponible, gastos, vencimientos }) {
  const restante = disponible - gastos;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className={color} />
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</h4>
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>Disponible</span><span className="font-semibold text-green-600">{fmt(disponible)}</span>
        </div>
        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>Gastos</span><span className="font-semibold text-red-500">{fmt(gastos)}</span>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-700 pt-1.5 flex justify-between font-bold">
          <span className="text-slate-700 dark:text-slate-200">Resta</span>
          <span className={restante >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600'}>{fmt(restante)}</span>
        </div>
      </div>
      {vencimientos?.length > 0 && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1"><Clock size={10} /> Próximos a vencer</p>
          {vencimientos.map((v, i) => (
            <div key={i} className="flex justify-between text-xs text-amber-700 dark:text-amber-400">
              <span className="truncate max-w-32">{v.subrubro_nombre}</span>
              <span>{fmt(v.monto_pendiente)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CajaView({ rubros = [] }) {
  const [fecha, setFecha]           = useState(todayStr());
  const [movs, setMovs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [tipoForm, setTipoForm]     = useState(null);
  const [editingMov, setEditingMov] = useState(null);
  const [saldoInput, setSaldoInput] = useState('');
  const [editandoSaldo, setEditandoSaldo] = useState(false);
  const [saldoAutoCalculado, setSaldoAutoCalculado] = useState(null);
  const [vencimientos, setVencimientos] = useState([]);
  const [config, setConfig]         = useState({ empleados: [], proveedores: [] });
  const [showConfig, setShowConfig] = useState(false);
  const [allSubrubros, setAllSubrubros] = useState([]);

  const calcularSaldoAyer = (movsAyer) => {
    const saldoInicial = movsAyer.find(m => m.tipo === 'saldo_inicial')?.monto || 0;
    const efvoDisp = saldoInicial
      + movsAyer.filter(m => m.tipo === 'empleado'      && m.metodo === 'efectivo').reduce((s,m) => s+m.monto, 0)
      + movsAyer.filter(m => m.tipo === 'ingreso_extra' && m.metodo === 'efectivo').reduce((s,m) => s+m.monto, 0);
    const efvoGastos = movsAyer.filter(m => m.tipo === 'gasto' && m.metodo === 'efectivo').reduce((s,m) => s+m.monto, 0);
    return efvoDisp - efvoGastos;
  };

  const cargar = async () => {
    setLoading(true);
    const [data, dataAyer] = await Promise.all([
      cajaApi.getByFecha(fecha),
      cajaApi.getByFecha(addDays(fecha, -1)),
    ]);
    setMovs(data);
    const tieneSaldoManual = data.some(m => m.tipo === 'saldo_inicial');
    setSaldoAutoCalculado(tieneSaldoManual ? null : calcularSaldoAyer(dataAyer));
    setLoading(false);
  };

  const cargarConfig = async () => {
    const cfg = await cajaApi.getConfig();
    setConfig(cfg);
  };

  const cargarVencimientos = async () => {
    try {
      const data = await movimientosApi.getVencimientos(7);
      setVencimientos(data.vencimientos || []);
    } catch {}
  };

  // Cargamos todos los subrubros para el ConfigPanel
  const cargarSubrubros = async () => {
    try {
      const results = await Promise.all(rubros.map(r => subrubrosApi.getByRubro(r.id)));
      setAllSubrubros(results.flat());
    } catch {}
  };

  useEffect(() => { cargar(); }, [fecha]);
  useEffect(() => { cargarConfig(); cargarVencimientos(); cargarSubrubros(); }, []);

  const handleSave = async (data) => {
    try {
      if (editingMov) {
        await cajaApi.update(editingMov.id, data);
        toast.success('Actualizado');
      } else {
        await cajaApi.create(data);
        toast.success('Guardado');
      }
      setShowForm(false);
      setEditingMov(null);
      setTipoForm(null);
      cargar();
    } catch { toast.error('Error al guardar'); }
  };

  const handleDelete = async (id) => {
    await cajaApi.delete(id);
    setMovs(prev => prev.filter(m => m.id !== id));
    toast.success('Eliminado');
  };

  const handleEdit = (m) => { setEditingMov(m); setShowForm(true); setTipoForm(null); };
  const openForm  = (tipo) => { setTipoForm(tipo); setEditingMov(null); setShowForm(true); };

  const handleSaldoInicial = async () => {
    const n = Number(saldoInput);
    if (!n) return;
    const existing = movs.find(m => m.tipo === 'saldo_inicial');
    if (existing) await cajaApi.update(existing.id, { monto: n, concepto: 'Saldo anterior', metodo: 'efectivo' });
    else await cajaApi.create({ fecha, tipo: 'saldo_inicial', concepto: 'Saldo anterior', monto: n, metodo: 'efectivo', es_especial: false });
    setSaldoInput('');
    setEditandoSaldo(false);
    cargar();
    toast.success('Saldo inicial guardado');
  };

  const handleSaveConfig = async (data) => {
    await cajaApi.saveConfig(data);
    setConfig(data);
    toast.success('Configuración guardada');
  };

  const saldoMov     = movs.find(m => m.tipo === 'saldo_inicial');
  const saldoInicial = saldoMov?.monto ?? saldoAutoCalculado ?? 0;
  const empleados    = movs.filter(m => m.tipo === 'empleado');
  const ingresosExtra = movs.filter(m => m.tipo === 'ingreso_extra');
  const gastos       = movs.filter(m => m.tipo === 'gasto');

  const disponibleEfvo  = saldoInicial + empleados.filter(m => m.metodo === 'efectivo').reduce((s,m) => s+m.monto,0) + ingresosExtra.filter(m => m.metodo === 'efectivo').reduce((s,m) => s+m.monto,0);
  const disponibleTrans = empleados.filter(m => m.metodo === 'transferencia').reduce((s,m) => s+m.monto,0) + ingresosExtra.filter(m => m.metodo === 'transferencia').reduce((s,m) => s+m.monto,0);
  const gastosEfvo      = gastos.filter(m => m.metodo === 'efectivo').reduce((s,m) => s+m.monto,0);
  const gastosTrans     = gastos.filter(m => m.metodo === 'transferencia').reduce((s,m) => s+m.monto,0);
  const vencEfvo        = vencimientos.filter(v => v.metodo !== 'transferencia');
  const vencTrans       = vencimientos.filter(v => v.metodo === 'transferencia');

  const formProps = { fecha, onSave: handleSave, onCancel: () => { setShowForm(false); setEditingMov(null); }, empleadosList: config.empleados || [], proveedoresList: config.proveedores || [] };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Navegación de fecha */}
      <div className="flex items-center gap-3">
        <button onClick={() => setFecha(addDays(fecha, -1))}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <p className="font-semibold text-slate-800 dark:text-slate-100 capitalize">{formatFecha(fecha)}</p>
          {fecha !== todayStr() && (
            <button onClick={() => setFecha(todayStr())} className="text-xs text-blue-500 hover:underline">Ir a hoy</button>
          )}
        </div>
        <button onClick={() => setFecha(addDays(fecha, 1))} disabled={fecha >= todayStr()}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30">
          <ChevronRight size={18} />
        </button>
        <input type="date" value={fecha} max={todayStr()} onChange={e => setFecha(e.target.value)}
          className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={() => setShowConfig(true)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Configurar empleados y proveedores">
          <Settings size={16} />
        </button>
      </div>

      {/* Saldo inicial */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet size={15} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Saldo del día anterior</span>
          </div>
          {!editandoSaldo && (
            <button onClick={() => { setSaldoInput(saldoInicial || ''); setEditandoSaldo(true); }}
              className="text-xs text-blue-500 hover:underline flex items-center gap-1">
              <Pencil size={11} /> {saldoMov ? 'Editar' : 'Ajustar'}
            </button>
          )}
        </div>
        {editandoSaldo ? (
          <div className="flex gap-2 mt-3">
            <input type="number" min="0" step="any" className={inputCls} placeholder="Saldo del día anterior"
              value={saldoInput} onChange={e => setSaldoInput(e.target.value)} autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSaldoInicial()} />
            <button onClick={handleSaldoInicial} className="bg-blue-600 text-white px-3 rounded-lg text-sm hover:bg-blue-700">OK</button>
            <button onClick={() => setEditandoSaldo(false)} className="text-slate-400 hover:text-slate-600 px-2">✕</button>
          </div>
        ) : (
          <div className="mt-1">
            <p className={`text-2xl font-bold ${saldoInicial ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
              {saldoInicial ? fmt(saldoInicial) : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {saldoMov ? 'Ajustado manualmente' : saldoAutoCalculado !== null ? 'Calculado del día anterior' : 'Sin datos del día anterior'}
            </p>
          </div>
        )}
      </div>

      {/* Ingresos extra */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Plus size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ingresos extra</h3>
            {ingresosExtra.length > 0 && <span className="text-xs text-slate-400">{fmt(ingresosExtra.reduce((s,m) => s+m.monto,0))}</span>}
          </div>
          <button onClick={() => openForm('ingreso_extra')} className="text-xs text-blue-500 hover:underline flex items-center gap-1"><Plus size={11} /> Agregar</button>
        </div>
        {showForm && (tipoForm === 'ingreso_extra' || editingMov?.tipo === 'ingreso_extra') && (
          <div className="mb-2"><EntryForm {...formProps} initial={editingMov} tipoForzado={editingMov ? null : 'ingreso_extra'} /></div>
        )}
        {ingresosExtra.map(m => (
          <div key={m.id} className="mb-2">
            {editingMov?.id === m.id && showForm ? null : <MovRow m={m} onEdit={handleEdit} onDelete={handleDelete} colorMonto="text-amber-600" />}
          </div>
        ))}
      </div>

      {/* Empleados */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-green-600" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Empleados</h3>
            {empleados.length > 0 && <span className="text-xs text-slate-400">{fmt(empleados.reduce((s,m) => s+m.monto,0))}</span>}
          </div>
          <button onClick={() => openForm('empleado')} className="text-xs text-blue-500 hover:underline flex items-center gap-1"><Plus size={11} /> Agregar</button>
        </div>
        {showForm && (tipoForm === 'empleado' || editingMov?.tipo === 'empleado') && (
          <div className="mb-2"><EntryForm {...formProps} initial={editingMov} tipoForzado={editingMov ? null : 'empleado'} /></div>
        )}
        {empleados.length === 0 && !(showForm && tipoForm === 'empleado') && (
          <p className="text-xs text-slate-400 py-2 text-center">Sin empleados cargados</p>
        )}
        {empleados.map(m => (
          <div key={m.id} className="mb-2">
            {editingMov?.id === m.id && showForm ? null : <MovRow m={m} onEdit={handleEdit} onDelete={handleDelete} colorMonto="text-green-600" />}
          </div>
        ))}
      </div>

      {/* Gastos / Proveedores */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShoppingCart size={14} className="text-red-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Gastos y proveedores</h3>
            {gastos.length > 0 && <span className="text-xs text-slate-400">{fmt(gastos.reduce((s,m) => s+m.monto,0))}</span>}
          </div>
          <button onClick={() => openForm('gasto')} className="text-xs text-blue-500 hover:underline flex items-center gap-1"><Plus size={11} /> Agregar</button>
        </div>
        {showForm && (tipoForm === 'gasto' || editingMov?.tipo === 'gasto') && (
          <div className="mb-2"><EntryForm {...formProps} initial={editingMov} tipoForzado={editingMov ? null : 'gasto'} /></div>
        )}
        {gastos.length === 0 && !(showForm && tipoForm === 'gasto') && (
          <p className="text-xs text-slate-400 py-2 text-center">Sin gastos cargados</p>
        )}
        {gastos.map(m => (
          <div key={m.id} className="mb-2">
            {editingMov?.id === m.id && showForm ? null : <MovRow m={m} onEdit={handleEdit} onDelete={handleDelete} colorMonto="text-red-500" />}
          </div>
        ))}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ResumenMetodo label="Efectivo" icon={Banknote} color="text-green-600" disponible={disponibleEfvo} gastos={gastosEfvo} vencimientos={vencEfvo} />
        <ResumenMetodo label="Transferencia" icon={ArrowLeftRight} color="text-blue-600" disponible={disponibleTrans} gastos={gastosTrans} vencimientos={vencTrans} />
      </div>

      {showConfig && (
        <ConfigPanel config={config} rubros={allSubrubros} onSave={handleSaveConfig} onClose={() => setShowConfig(false)} />
      )}
    </div>
  );
}
