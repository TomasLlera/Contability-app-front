import { useState, useEffect, useRef } from 'react';
import { cajaApi, movimientosApi, subrubrosApi } from '../api';
import {
  Plus, Trash2, Pencil, ChevronLeft, ChevronRight,
  Users, ShoppingCart, Banknote, ArrowLeftRight, Star, Clock, Wallet, Settings, X, Check, HelpCircle
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
  const s = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const selectCls = inputCls;

const InfoTooltip = ({ text }) => {
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!show) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show]);
  return (
    <div ref={ref} className="relative inline-flex shrink-0">
      <button type="button" onClick={() => setShow(v => !v)}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        <HelpCircle size={13} />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-800 text-white text-xs rounded-lg px-3 py-2.5 z-20 shadow-lg leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
};

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
function EntryForm({ fecha, onSave, onCancel, initial, tipoForzado, empleadosList, rubros = [], prefillSubrubro = null }) {
  const ref = useRef(null);
  const [tipo, setTipo]         = useState(tipoForzado || initial?.tipo || 'gasto');
  const [concepto, setConcepto] = useState(initial?.concepto || '');
  const [monto, setMonto]       = useState(initial?.monto || prefillSubrubro?.monto || '');
  const [metodo, setMetodo]     = useState(initial?.metodo || 'efectivo');
  const [esEspecial, setEsEspecial] = useState(initial?.es_especial || false);
  const [seleccionEmpleado, setSeleccionEmpleado] = useState('');

  // Subrubro state (gastos)
  const [rubroIdSel, setRubroIdSel]             = useState('');
  const [subsDelRubro, setSubsDelRubro]         = useState([]);
  const [subrubroIdSel, setSubrubroIdSel]       = useState('');
  const [boletas, setBoletas]                   = useState([]);
  const [boletasSel, setBoletasSel]             = useState(new Set());
  const [cargandoSubs, setCargandoSubs]         = useState(false);
  const [cargandoBoletas, setCargandoBoletas]   = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onCancel();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onCancel]);

  // Prefill desde vencimiento
  useEffect(() => {
    if (!prefillSubrubro?.rubroId) return;
    setRubroIdSel(String(prefillSubrubro.rubroId));
  }, [prefillSubrubro]);

  useEffect(() => {
    if (!prefillSubrubro?.subrubroId || !subsDelRubro.length) return;
    setSubrubroIdSel(String(prefillSubrubro.subrubroId));
  }, [subsDelRubro, prefillSubrubro]);

  useEffect(() => {
    if (!prefillSubrubro?.boletaId || !boletas.length) return;
    setBoletasSel(new Set([prefillSubrubro.boletaId]));
  }, [boletas, prefillSubrubro]);

  // Cargar subrubros al elegir rubro
  useEffect(() => {
    if (!rubroIdSel) { setSubsDelRubro([]); setSubrubroIdSel(''); return; }
    setCargandoSubs(true);
    subrubrosApi.getByRubro(rubroIdSel)
      .then(s => setSubsDelRubro(s))
      .catch(() => {})
      .finally(() => setCargandoSubs(false));
    setSubrubroIdSel('');
    setBoletas([]);
    setBoletasSel(new Set());
  }, [rubroIdSel]);

  // Cargar boletas al elegir subrubro
  useEffect(() => {
    if (!subrubroIdSel || subrubroIdSel === '__nuevo__') { setBoletas([]); setBoletasSel(new Set()); return; }
    setCargandoBoletas(true);
    movimientosApi.getBySubrubro(subrubroIdSel)
      .then(data => setBoletas((data.movimientos || []).filter(m => m.tipo === 'factura' && !m.pagado)))
      .catch(() => setBoletas([]))
      .finally(() => setCargandoBoletas(false));
    setBoletasSel(new Set());
  }, [subrubroIdSel]);

  // Auto-completar concepto con nombre del subrubro
  useEffect(() => {
    if (!subrubroIdSel || subrubroIdSel === '__nuevo__') return;
    const sub = subsDelRubro.find(s => String(s.id) === subrubroIdSel);
    if (sub && !concepto) setConcepto(sub.nombre);
  }, [subrubroIdSel, subsDelRubro]);

  const handleSeleccionEmpleado = (val) => {
    setSeleccionEmpleado(val);
    if (val && val !== '__otro__') setConcepto(val);
  };

  const resetGastoState = () => {
    setRubroIdSel(''); setSubsDelRubro([]); setSubrubroIdSel('');
    setBoletas([]); setBoletasSel(new Set());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!concepto.trim() || !Number(monto)) return;
    const esNuevoSub = tipo === 'gasto' && subrubroIdSel === '__nuevo__';
    onSave({
      fecha, tipo, concepto: concepto.trim(), monto: Number(monto), metodo, es_especial: esEspecial,
      subrubro_id: tipo === 'gasto' && subrubroIdSel && !esNuevoSub ? Number(subrubroIdSel) : null,
      boletas_seleccionadas: tipo === 'gasto' ? [...boletasSel] : [],
      nuevo_subrubro_rubro_id: esNuevoSub ? rubroIdSel : null,
      nuevo_subrubro_nombre: esNuevoSub ? concepto.trim() : null,
    });
  };

  const TIPOS_FORM = [
    { value: 'empleado',      label: 'Empleado',     color: 'bg-green-600' },
    { value: 'gasto',         label: 'Gasto',        color: 'bg-red-500' },
    { value: 'ingreso_extra', label: 'Ingreso extra', color: 'bg-amber-500' },
  ];

  return (
    <form ref={ref} onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3 border border-slate-200 dark:border-slate-600">
      {!tipoForzado && (
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs font-medium">
          {TIPOS_FORM.map(t => (
            <button key={t.value} type="button" onClick={() => { setTipo(t.value); setSeleccionEmpleado(''); setConcepto(''); resetGastoState(); }}
              className={`flex-1 py-2 transition-colors ${tipo === t.value ? `${t.color} text-white` : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Empleado: lista rápida */}
      {tipo === 'empleado' && empleadosList.length > 0 && (
        <select className={selectCls} value={seleccionEmpleado} onChange={e => handleSeleccionEmpleado(e.target.value)}>
          <option value="">— Elegir empleado —</option>
          {empleadosList.map((item, i) => <option key={i} value={item.nombre}>{item.nombre}</option>)}
          <option value="__otro__">Otro (escribir)</option>
        </select>
      )}

      {/* Gasto: selector rubro + subrubro */}
      {tipo === 'gasto' && (
        <div className="grid grid-cols-2 gap-2">
          <select className={selectCls} value={rubroIdSel} onChange={e => setRubroIdSel(e.target.value)}>
            <option value="">— Rubro —</option>
            {rubros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
          <select className={selectCls} value={subrubroIdSel} onChange={e => setSubrubroIdSel(e.target.value)} disabled={!rubroIdSel || cargandoSubs}>
            <option value="">— {cargandoSubs ? 'Cargando...' : 'Subrubro'} —</option>
            {subsDelRubro.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            {rubroIdSel && concepto.trim() && !subsDelRubro.find(s => s.nombre.toLowerCase() === concepto.trim().toLowerCase()) && (
              <option value="__nuevo__">+ Crear "{concepto.trim()}"</option>
            )}
          </select>
        </div>
      )}

      {/* Concepto */}
      {(tipo !== 'empleado' || !empleadosList.length || seleccionEmpleado === '__otro__' || !seleccionEmpleado) && (
        <input type="text" className={inputCls}
          placeholder={tipo === 'empleado' ? 'Nombre del empleado' : tipo === 'ingreso_extra' ? 'Descripción del ingreso' : 'Proveedor o concepto'}
          value={concepto}
          onChange={e => { setConcepto(e.target.value); if (subrubroIdSel === '__nuevo__' && !e.target.value.trim()) setSubrubroIdSel(''); }}
          required autoFocus={tipo !== 'empleado' || !empleadosList.length} />
      )}

      {/* Boletas pendientes del subrubro */}
      {tipo === 'gasto' && subrubroIdSel && subrubroIdSel !== '__nuevo__' && (
        cargandoBoletas ? (
          <p className="text-xs text-slate-400 text-center py-1">Cargando boletas...</p>
        ) : boletas.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Boletas pendientes</p>
            <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
              {boletas.map(b => (
                <label key={b.id} className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors ${boletasSel.has(b.id) ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                  <input type="checkbox" checked={boletasSel.has(b.id)}
                    onChange={() => setBoletasSel(prev => { const n = new Set(prev); n.has(b.id) ? n.delete(b.id) : n.add(b.id); return n; })}
                    className="accent-blue-600 shrink-0" />
                  <span className="text-xs text-slate-500 w-20 shrink-0">{b.fecha}</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex-1">{fmt(b.monto)}</span>
                  {b.campos_extra?.nro_factura && <span className="text-xs text-slate-400 truncate max-w-20">#{b.campos_extra.nro_factura}</span>}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-1">Sin boletas pendientes</p>
        )
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

function ResumenMetodo({ label, icon: Icon, color, disponible, gastos, vencimientos, labelDisponible }) {
  const restante = disponible - gastos;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className={color} />
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</h4>
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>{labelDisponible || 'Disponible'}</span>
          <span className="font-semibold text-green-600">{fmt(disponible)}</span>
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

  const dateInputRef = useRef(null);

  // Saldo efectivo
  const [saldoInput, setSaldoInput]         = useState('');
  const [editandoSaldo, setEditandoSaldo]   = useState(false);
  const [saldoAutoCalculado, setSaldoAutoCalculado] = useState(null);
  const saldoEditRef = useRef(null);

  // Saldo cuenta (transferencia)
  const [saldoCuentaInput, setSaldoCuentaInput]       = useState('');
  const [editandoSaldoCuenta, setEditandoSaldoCuenta] = useState(false);
  const [saldoCuentaAyer, setSaldoCuentaAyer]         = useState(null);
  const saldoCuentaEditRef = useRef(null);

  const [vencimientos, setVencimientos]       = useState([]);
  const [vencimientosHoy, setVencimientosHoy] = useState([]);
  const [vencimientoPrefill, setVencimientoPrefill] = useState(null);
  const [config, setConfig]             = useState({ empleados: [], proveedores: [] });
  const [showConfig, setShowConfig]     = useState(false);
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
    setSaldoCuentaAyer(dataAyer.find(m => m.tipo === 'saldo_cuenta')?.monto ?? null);
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

  const cargarVencimientosHoy = async () => {
    try {
      const data = await movimientosApi.getVencimientosDia(fecha);
      setVencimientosHoy(data || []);
    } catch {}
  };

  const cargarSubrubros = async () => {
    try {
      const results = await Promise.all(rubros.map(r => subrubrosApi.getByRubro(r.id)));
      setAllSubrubros(results.flat());
    } catch {}
  };

  useEffect(() => { cargar(); cargarVencimientosHoy(); }, [fecha]);
  useEffect(() => { cargarConfig(); cargarVencimientos(); cargarSubrubros(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'ArrowLeft') setFecha(f => addDays(f, -1));
      if (e.key === 'ArrowRight') setFecha(f => addDays(f, 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!editandoSaldo) return;
    const handler = (e) => {
      if (saldoEditRef.current && !saldoEditRef.current.contains(e.target)) {
        setEditandoSaldo(false); setSaldoInput('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editandoSaldo]);

  useEffect(() => {
    if (!editandoSaldoCuenta) return;
    const handler = (e) => {
      if (saldoCuentaEditRef.current && !saldoCuentaEditRef.current.contains(e.target)) {
        setEditandoSaldoCuenta(false); setSaldoCuentaInput('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editandoSaldoCuenta]);

  const handleSave = async (data) => {
    try {
      const { subrubro_id, boletas_seleccionadas, nuevo_subrubro_rubro_id, nuevo_subrubro_nombre, ...cajaData } = data;

      let finalSubrubroId = subrubro_id;

      // Crear subrubro nuevo si corresponde
      if (nuevo_subrubro_nombre && nuevo_subrubro_rubro_id) {
        const newSub = await subrubrosApi.create(nuevo_subrubro_rubro_id, nuevo_subrubro_nombre);
        finalSubrubroId = newSub.id;
        const updatedConfig = { ...config, proveedores: [...(config.proveedores || []), { nombre: nuevo_subrubro_nombre, subrubro_id: newSub.id }] };
        await cajaApi.saveConfig(updatedConfig);
        setConfig(updatedConfig);
        cargarSubrubros();
      }

      if (editingMov) {
        await cajaApi.update(editingMov.id, { ...cajaData, subrubro_id: finalSubrubroId ?? null });
        toast.success('Actualizado');
      } else {
        await cajaApi.create({ ...cajaData, subrubro_id: finalSubrubroId ?? null });
        // Registrar pago en el subrubro para sincronizar boletas
        if (finalSubrubroId && cajaData.tipo === 'gasto') {
          if (boletas_seleccionadas?.length > 0) {
            await movimientosApi.pagoVinculado(finalSubrubroId, {
              pago: cajaData.monto,
              facturas_vinculadas_ids: boletas_seleccionadas,
              fecha: cajaData.fecha,
              campos_extra: {},
              concepto_diferencia: 'Diferencia',
            });
          } else {
            await movimientosApi.create(finalSubrubroId, {
              tipo: 'pago', pago: cajaData.monto, monto: 0,
              fecha: cajaData.fecha, campos_extra: {}, facturas_vinculadas_ids: [],
            });
          }
        }
        toast.success('Guardado');
      }

      setShowForm(false); setEditingMov(null); setTipoForm(null); setVencimientoPrefill(null);
      cargar(); cargarVencimientosHoy();
    } catch { toast.error('Error al guardar'); }
  };

  const handleDelete = async (id) => {
    await cajaApi.delete(id);
    setMovs(prev => prev.filter(m => m.id !== id));
    toast.success('Eliminado');
  };

  const handleEdit = (m) => { setEditingMov(m); setShowForm(true); setTipoForm(null); setVencimientoPrefill(null); };
  const openForm  = (tipo) => { setTipoForm(tipo); setEditingMov(null); setShowForm(true); setVencimientoPrefill(null); };

  const handlePagarVencimiento = (v) => {
    setEditingMov(null);
    setTipoForm('gasto');
    setShowForm(true);
    setVencimientoPrefill({
      rubroId: v.rubro?.id ?? v.rubro?._id,
      subrubroId: v.subrubro?.id ?? v.subrubro?._id ?? v.subrubro_id,
      boletaId: v.id,
      monto: v.monto,
    });
  };

  const handleSaldoInicial = async () => {
    const n = Number(saldoInput);
    if (!n) return;
    const existing = movs.find(m => m.tipo === 'saldo_inicial');
    if (existing) await cajaApi.update(existing.id, { monto: n, concepto: 'Saldo anterior', metodo: 'efectivo' });
    else await cajaApi.create({ fecha, tipo: 'saldo_inicial', concepto: 'Saldo anterior', monto: n, metodo: 'efectivo', es_especial: false });
    setSaldoInput(''); setEditandoSaldo(false);
    cargar(); toast.success('Saldo inicial guardado');
  };

  const handleSaldoCuenta = async () => {
    const n = Number(saldoCuentaInput);
    if (isNaN(n) || saldoCuentaInput === '') return;
    const existing = movs.find(m => m.tipo === 'saldo_cuenta');
    if (existing) await cajaApi.update(existing.id, { monto: n, concepto: 'Saldo en cuenta', metodo: 'transferencia' });
    else await cajaApi.create({ fecha, tipo: 'saldo_cuenta', concepto: 'Saldo en cuenta', monto: n, metodo: 'transferencia', es_especial: false });
    setSaldoCuentaInput(''); setEditandoSaldoCuenta(false);
    cargar(); toast.success('Saldo en cuenta guardado');
  };

  const handleSaveConfig = async (data) => {
    await cajaApi.saveConfig(data);
    setConfig(data);
    toast.success('Configuración guardada');
  };

  // ── Cálculos ────────────────────────────────────────────────────────────────
  const saldoMov      = movs.find(m => m.tipo === 'saldo_inicial');
  const saldoInicial  = saldoMov?.monto ?? saldoAutoCalculado ?? 0;
  const saldoCuentaMov = movs.find(m => m.tipo === 'saldo_cuenta');
  const saldoCuentaHoy = saldoCuentaMov?.monto ?? null;

  // Ingreso del día por transferencia = diferencia entre saldo de cuenta de hoy y ayer
  const ingresoTransDia = (saldoCuentaHoy !== null && saldoCuentaAyer !== null)
    ? saldoCuentaHoy - saldoCuentaAyer
    : null;

  const empleados     = movs.filter(m => m.tipo === 'empleado');
  const ingresosExtra = movs.filter(m => m.tipo === 'ingreso_extra');
  const gastos        = movs.filter(m => m.tipo === 'gasto');

  const disponibleEfvo  = saldoInicial
    + empleados.filter(m => m.metodo === 'efectivo').reduce((s,m) => s+m.monto,0)
    + ingresosExtra.filter(m => m.metodo === 'efectivo').reduce((s,m) => s+m.monto,0);

  // Si hay saldo de cuenta registrado, el disponible es el delta (ingreso real del día)
  // Si no, suma los ingresos individuales por transferencia como antes
  const disponibleTrans = ingresoTransDia !== null
    ? ingresoTransDia
    : empleados.filter(m => m.metodo === 'transferencia').reduce((s,m) => s+m.monto,0)
      + ingresosExtra.filter(m => m.metodo === 'transferencia').reduce((s,m) => s+m.monto,0);

  const gastosEfvo  = gastos.filter(m => m.metodo === 'efectivo').reduce((s,m) => s+m.monto,0);
  const gastosTrans = gastos.filter(m => m.metodo === 'transferencia').reduce((s,m) => s+m.monto,0);
  const vencEfvo    = vencimientos.filter(v => v.metodo !== 'transferencia');
  const vencTrans   = vencimientos.filter(v => v.metodo === 'transferencia');

  const formProps = {
    fecha, onSave: handleSave,
    onCancel: () => { setShowForm(false); setEditingMov(null); setVencimientoPrefill(null); },
    empleadosList: config.empleados || [],
    rubros,
    prefillSubrubro: vencimientoPrefill,
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Navegación de fecha */}
      <div className="flex items-center gap-2">
        <button onClick={() => setFecha(addDays(fecha, -1))}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 shrink-0">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <button
            onClick={() => { try { dateInputRef.current?.showPicker(); } catch { dateInputRef.current?.click(); } }}
            className="font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            {formatFecha(fecha)}
          </button>
          {fecha !== todayStr() && (
            <button onClick={() => setFecha(todayStr())} className="text-xs text-blue-500 hover:underline block mx-auto">Ir a hoy</button>
          )}
        </div>
        <button onClick={() => setFecha(addDays(fecha, 1))} disabled={fecha >= todayStr()}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 shrink-0">
          <ChevronRight size={18} />
        </button>
        <input ref={dateInputRef} type="date" value={fecha} max={todayStr()}
          onChange={e => setFecha(e.target.value)}
          className="sr-only" />
        <button onClick={() => setShowConfig(true)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0" title="Configurar empleados y proveedores">
          <Settings size={16} />
        </button>
      </div>

      {/* Saldos del día — fila de dos tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Saldo efectivo anterior */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Wallet size={15} className="text-slate-500 shrink-0" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">Saldo del día anterior</span>
              <InfoTooltip text="Efectivo en caja al empezar el día. Se calcula automáticamente del cierre de ayer. Ajustalo si hay una diferencia." />
            </div>
            {!editandoSaldo && (
              <button onClick={() => { setSaldoInput(saldoInicial || ''); setEditandoSaldo(true); }}
                className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                <Pencil size={11} /> {saldoMov ? 'Editar' : 'Ajustar'}
              </button>
            )}
          </div>
          {editandoSaldo ? (
            <div ref={saldoEditRef} className="flex gap-2 mt-3">
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
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">💵 Efectivo</span>
                <span className="text-xs text-slate-400">
                  {saldoMov ? 'Ajustado manualmente' : saldoAutoCalculado !== null ? 'Efectivo del día anterior' : 'Sin datos del día anterior'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Saldo en cuenta bancaria */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <ArrowLeftRight size={15} className="text-blue-500 shrink-0" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">Saldo en cuenta</span>
              <InfoTooltip text="Total en la cuenta bancaria hoy. El sistema calcula el ingreso por transferencia restando el saldo de ayer al de hoy." />
            </div>
            {!editandoSaldoCuenta && (
              <button onClick={() => { setSaldoCuentaInput(saldoCuentaHoy ?? ''); setEditandoSaldoCuenta(true); }}
                className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                <Pencil size={11} /> {saldoCuentaMov ? 'Editar' : 'Ingresar'}
              </button>
            )}
          </div>
          {editandoSaldoCuenta ? (
            <div ref={saldoCuentaEditRef} className="flex gap-2 mt-3">
              <input type="number" min="0" step="any" className={inputCls} placeholder="Saldo actual en cuenta"
                value={saldoCuentaInput} onChange={e => setSaldoCuentaInput(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaldoCuenta()} />
              <button onClick={handleSaldoCuenta} className="bg-blue-600 text-white px-3 rounded-lg text-sm hover:bg-blue-700">OK</button>
              <button onClick={() => setEditandoSaldoCuenta(false)} className="text-slate-400 hover:text-slate-600 px-2">✕</button>
            </div>
          ) : (
            <div className="mt-1">
              <p className={`text-2xl font-bold ${saldoCuentaHoy !== null ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                {saldoCuentaHoy !== null ? fmt(saldoCuentaHoy) : '—'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">🏦 Transferencia</span>
                {ingresoTransDia !== null ? (
                  <span className={`text-xs font-medium ${ingresoTransDia >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                    {ingresoTransDia >= 0 ? '↑' : '↓'} {fmt(Math.abs(ingresoTransDia))} ingreso del día bancario
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">
                    {saldoCuentaAyer !== null ? 'Ingresá el saldo de hoy para ver el ingreso' : 'Sin datos de cuenta'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vencimientos del día */}
      {vencimientosHoy.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Vencimientos del día</h3>
            <span className="text-xs text-amber-600 dark:text-amber-400">({vencimientosHoy.length})</span>
          </div>
          <div className="space-y-2">
            {vencimientosHoy.map(v => {
              const yaPagado = gastos.some(g => g.subrubro_id === (v.subrubro?.id ?? v.subrubro_id));
              return (
                <div key={v.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-lg px-3 py-2.5 border border-amber-100 dark:border-amber-900/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {v.subrubro?.nombre ?? 'Subrubro'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {v.rubro?.nombre ?? ''}{v.rubro?.nombre ? ' · ' : ''}{fmt(v.monto)}
                    </p>
                  </div>
                  {yaPagado
                    ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shrink-0">Pagado</span>
                    : <button onClick={() => handlePagarVencimiento(v)}
                        className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg shrink-0 transition-colors">
                        Pagar
                      </button>
                  }
                </div>
              );
            })}
          </div>
        </div>
      )}

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
        <ResumenMetodo label="Efectivo" icon={Banknote} color="text-green-600"
          disponible={disponibleEfvo} gastos={gastosEfvo} vencimientos={vencEfvo} />
        <ResumenMetodo label="Transferencia" icon={ArrowLeftRight} color="text-blue-600"
          disponible={disponibleTrans} gastos={gastosTrans} vencimientos={vencTrans}
          labelDisponible={ingresoTransDia !== null ? 'Ingreso del día' : 'Disponible'} />
      </div>

      {showConfig && (
        <ConfigPanel config={config} rubros={allSubrubros} onSave={handleSaveConfig} onClose={() => setShowConfig(false)} />
      )}
    </div>
  );
}
