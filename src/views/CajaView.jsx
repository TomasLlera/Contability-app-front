import { useState, useEffect, useRef } from 'react';
import { cajaApi, movimientosApi, subrubrosApi } from '../api';
import {
  Plus, Trash2, Pencil, ChevronLeft, ChevronRight,
  Users, ShoppingCart, Banknote, ArrowLeftRight, Star, Clock, Wallet, Settings, X, Check, HelpCircle,
  AlertCircle, Link2
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
const formatFechaCorta = (dateStr) => {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
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
function ConfigPanel({ config, rubros, allRubros, onSave, onClose }) {
  const [empleados, setEmpleados] = useState(config.empleados || []);
  const [proveedores, setProveedores] = useState(config.proveedores || []);
  const [nuevoEmp, setNuevoEmp] = useState('');
  const [nuevoProv, setNuevoProv] = useState('');
  const [nuevoProvSub, setNuevoProvSub] = useState('');
  const [rubrosSync, setRubrosSync] = useState(config.rubros_sync || []);
  const [diasAnticipacion, setDiasAnticipacion] = useState(config.dias_anticipacion_caja ?? 3);

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

  const toggleRubroSync = (rubroId) => {
    setRubrosSync(prev =>
      prev.includes(rubroId) ? prev.filter(id => id !== rubroId) : [...prev, rubroId]
    );
  };

  const handleSave = async () => {
    try {
      await onSave({ empleados, proveedores, rubros_sync: rubrosSync, dias_anticipacion_caja: Number(diasAnticipacion) });
      onClose();
    } catch {
      // error ya mostrado por handleSaveConfig
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Settings size={15} /> Configurar Caja</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {/* Sincronización de rubros */}
        <div className="mb-5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1.5"><Link2 size={13} /> Sincronizar vencimientos</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Las boletas de estos rubros aparecerán automáticamente en la caja cuando estén por vencer.</p>
          {allRubros.length === 0
            ? <p className="text-xs text-slate-400">No hay rubros disponibles.</p>
            : allRubros.map(r => (
              <label key={r.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                <input type="checkbox" className="accent-blue-600"
                  checked={rubrosSync.includes(r.id)}
                  onChange={() => toggleRubroSync(r.id)} />
                <span className="text-sm text-slate-700 dark:text-slate-200">{r.icon ? `${r.icon} ` : ''}{r.nombre}</span>
              </label>
            ))
          }
          {rubrosSync.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
              <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Días de anticipación</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="30" value={diasAnticipacion}
                  onChange={e => setDiasAnticipacion(e.target.value)}
                  className="w-20 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-xs text-slate-500">días antes del vencimiento</span>
              </div>
            </div>
          )}
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
function EntryForm({ fecha, onSave, onCancel, initial, tipoForzado, empleadosList, proveedoresList, rubros, allSubrubros }) {
  const ref = useRef(null);
  const [tipo, setTipo]         = useState(tipoForzado || initial?.tipo || 'gasto');
  const [concepto, setConcepto] = useState(initial?.concepto || '');
  const [monto, setMonto]       = useState(initial?.monto || '');
  const [metodo, setMetodo]     = useState(initial?.metodo || 'efectivo');
  const [esEspecial, setEsEspecial] = useState(initial?.es_especial || false);
  const [seleccion, setSeleccion] = useState('');

  // Vinculación a subrubro (solo para gastos nuevos)
  const [rubroSel, setRubroSel]       = useState('');
  const [subrubroSel, setSubrubroSel] = useState('');
  const [facturasSub, setFacturasSub] = useState([]);
  const [facturaSel, setFacturaSel]   = useState('');
  const [loadingFacturas, setLoadingFacturas] = useState(false);

  const subrubrosDel = rubroSel
    ? allSubrubros.filter(s => String(s.rubro_id) === rubroSel)
    : [];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onCancel();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onCancel]);

  useEffect(() => {
    if (!subrubroSel) { setFacturasSub([]); setFacturaSel(''); return; }
    setLoadingFacturas(true);
    cajaApi.getFacturasPendientes(subrubroSel)
      .then(data => { setFacturasSub(data); setFacturaSel(''); })
      .catch(() => setFacturasSub([]))
      .finally(() => setLoadingFacturas(false));
  }, [subrubroSel]);

  // Proveedor → auto-selecciona subrubro si está vinculado
  useEffect(() => {
    if (!seleccion) return;
    const prov = proveedoresList.find(p => p.nombre === seleccion);
    if (prov?.subrubro_id) {
      const sub = allSubrubros.find(s => s.id === prov.subrubro_id);
      if (sub) {
        setRubroSel(String(sub.rubro_id));
        setSubrubroSel(String(sub.id));
      }
    }
  }, [seleccion]);

  const handleFacturaSel = (id) => {
    setFacturaSel(id);
    if (id) {
      const f = facturasSub.find(f => String(f.id) === id);
      if (f) setMonto(f.monto);
    }
  };

  const lista = tipo === 'empleado' ? empleadosList : tipo === 'gasto' ? proveedoresList : [];

  const handleSeleccion = (val) => {
    setSeleccion(val);
    if (val && val !== '__otro__') setConcepto(val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!concepto.trim() || !Number(monto)) return;
    const data = {
      fecha, tipo, concepto: concepto.trim(), monto: Number(monto), metodo, es_especial: esEspecial,
    };
    if (subrubroSel) {
      data.subrubro_id = Number(subrubroSel);
      if (facturaSel) data.movimiento_id = Number(facturaSel);
    }
    onSave(data);
  };

  const TIPOS_FORM = [
    { value: 'empleado',      label: 'Empleado',     color: 'bg-green-600' },
    { value: 'gasto',         label: 'Gasto',        color: 'bg-red-500' },
    { value: 'ingreso_extra', label: 'Ingreso extra', color: 'bg-amber-500' },
  ];

  const esGastoNuevo = tipo === 'gasto' && !initial;

  return (
    <form ref={ref} onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3 border border-slate-200 dark:border-slate-600">
      {!tipoForzado && (
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs font-medium">
          {TIPOS_FORM.map(t => (
            <button key={t.value} type="button" onClick={() => { setTipo(t.value); setSeleccion(''); setConcepto(''); setRubroSel(''); setSubrubroSel(''); setFacturasSub([]); setFacturaSel(''); }}
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

      {(lista.length === 0 || seleccion === '__otro__' || !seleccion) && !subrubroSel && (
        <input type="text" className={inputCls}
          placeholder={tipo === 'empleado' ? 'Nombre del empleado' : tipo === 'ingreso_extra' ? 'Descripción del ingreso' : 'Proveedor o concepto'}
          value={concepto} onChange={e => setConcepto(e.target.value)} required autoFocus={!lista.length} />
      )}

      {/* Selector de subrubro directo en gastos nuevos */}
      {esGastoNuevo && rubros.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-600">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Link2 size={11} className="text-blue-400" /> Subrubro <span className="text-slate-400">(opcional — registra un pago en el subrubro)</span></p>
          <div className="flex gap-2">
            <select className={selectCls} value={rubroSel} onChange={e => { setRubroSel(e.target.value); setSubrubroSel(''); setFacturasSub([]); setFacturaSel(''); }}>
              <option value="">— Rubro —</option>
              {rubros.map(r => <option key={r.id} value={r.id}>{r.icon ? `${r.icon} ` : ''}{r.nombre}</option>)}
            </select>
            <select className={selectCls} value={subrubroSel} onChange={e => {
              const id = e.target.value;
              setSubrubroSel(id);
              if (id) {
                const sub = subrubrosDel.find(s => String(s.id) === id);
                if (sub) setConcepto(sub.nombre);
              }
            }} disabled={!rubroSel}>
              <option value="">— Subrubro —</option>
              {subrubrosDel.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          {subrubroSel && (
            loadingFacturas
              ? <p className="text-xs text-slate-400">Cargando boletas...</p>
              : facturasSub.length === 0
                ? <p className="text-xs text-slate-400">Sin boletas pendientes.</p>
                : (
                  <select className={selectCls} value={facturaSel} onChange={e => handleFacturaSel(e.target.value)}>
                    <option value="">— Boleta pendiente (opcional) —</option>
                    {facturasSub.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.concepto || 'Sin concepto'} — {fmt(f.monto)}{f.fecha_vencimiento ? ` — vence ${formatFechaCorta(f.fecha_vencimiento)}` : ''}
                      </option>
                    ))}
                  </select>
                )
          )}
        </div>
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

function MovRow({ m, onEdit, onDelete, onConfirmar, colorMonto }) {
  const esPendiente  = m.tipo === 'gasto' && m.confirmado === false;
  const esConfirmado = m.tipo === 'gasto' && m.confirmado === true;
  const esGasto      = m.tipo === 'gasto';

  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
      esPendiente
        ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 border-dashed'
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`text-sm font-medium truncate ${esPendiente ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
            {m.concepto}
          </p>
          {m.es_especial && <Star size={11} className="text-amber-500 shrink-0" />}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <MetodoBadge metodo={m.metodo} />
          {esPendiente && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">Sin confirmar</span>}
          {esConfirmado && m.movimiento_id && <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 flex items-center gap-0.5"><Check size={9} /> Registrado en subrubro</span>}
        </div>
      </div>
      <p className={`text-base font-bold whitespace-nowrap ${esPendiente ? 'text-slate-400 dark:text-slate-500' : colorMonto}`}>
        {fmt(m.monto)}
      </p>
      {esGasto && (
        <button onClick={() => onConfirmar(m)}
          title={esConfirmado ? 'Revertir confirmación' : 'Confirmar pago'}
          className={`p-1.5 rounded-lg shrink-0 transition-colors ${
            esConfirmado
              ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 opacity-40 hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-500 dark:hover:text-red-400'
              : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/70'
          }`}>
          <Check size={14} />
        </button>
      )}
      <button onClick={() => onEdit(m)} className="text-slate-400 hover:text-blue-500 transition-colors shrink-0"><Pencil size={14} /></button>
      <button onClick={() => onDelete(m.id)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0"><Trash2 size={14} /></button>
    </div>
  );
}

// ── Fila de vencimiento sugerido (auto-sync) ────────────────────────────────
function SugeridoRow({ s, onConfirmar, onDescartar }) {
  const [monto, setMonto]   = useState(s.monto);
  const [metodo, setMetodo] = useState('efectivo');

  const hoy = todayStr();
  const esHoy = s.fecha_vencimiento === hoy;
  const esMañana = s.fecha_vencimiento === addDays(hoy, 1);
  const labelVenc = esHoy ? 'hoy' : esMañana ? 'mañana' : `${formatFechaCorta(s.fecha_vencimiento)}`;

  return (
    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 border-dashed rounded-xl px-3 py-3">
      <AlertCircle size={14} className="text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{s.subrubro_nombre}</p>
          {s.concepto && <p className="text-xs text-slate-400 truncate">{s.concepto}</p>}
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${esHoy ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'}`}>
            vence {labelVenc}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-md border border-slate-200 dark:border-slate-600 overflow-hidden text-xs">
            {[['efectivo', 'Efectivo'], ['transferencia', 'Transf.']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setMetodo(v)}
                className={`px-2.5 py-1 transition-colors ${metodo === v ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                {l}
              </button>
            ))}
          </div>
          <input type="number" min="0" step="any" value={monto} onChange={e => setMonto(Number(e.target.value))}
            className="w-28 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-2 py-1 text-sm font-semibold text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>
      </div>
      <button onClick={() => onConfirmar(s, monto, metodo)} title="Confirmar pago"
        className="p-2 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/70 shrink-0">
        <Check size={14} />
      </button>
      <button onClick={() => onDescartar(s.movimiento_id)} title="Ignorar hoy"
        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

function ResumenMetodo({ label, icon: Icon, color, disponible, gastos, sinConfirmar = 0, vencimientos, labelDisponible }) {
  const restante = disponible - gastos;
  const restanteSiConfirma = disponible - gastos - sinConfirmar;
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
        {sinConfirmar > 0 && (
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Sin confirmar</span>
            <span className="font-semibold text-amber-500">{fmt(sinConfirmar)}</span>
          </div>
        )}
        <div className="border-t border-slate-100 dark:border-slate-700 pt-1.5 flex justify-between font-bold">
          <span className="text-slate-700 dark:text-slate-200">Resta</span>
          <span className={restante >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600'}>{fmt(restante)}</span>
        </div>
        {sinConfirmar > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Si confirmás todo</span>
            <span className={`font-semibold ${restanteSiConfirma >= 0 ? 'text-slate-500 dark:text-slate-400' : 'text-red-500'}`}>{fmt(restanteSiConfirma)}</span>
          </div>
        )}
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

  const [vencimientos, setVencimientos] = useState([]);
  const [config, setConfig]             = useState({ empleados: [], proveedores: [], rubros_sync: [], dias_anticipacion_caja: 3 });
  const [showConfig, setShowConfig]     = useState(false);
  const [allSubrubros, setAllSubrubros] = useState([]);

  // Vencimientos auto-sincronizados
  const [sugeridos, setSugeridos] = useState([]);

  const getDismissedKey = (f) => `caja_dismissed_${f}`;
  const getDismissed = (f) => {
    try { return JSON.parse(sessionStorage.getItem(getDismissedKey(f)) || '[]'); } catch { return []; }
  };
  const addDismissed = (f, movimientoId) => {
    const prev = getDismissed(f);
    sessionStorage.setItem(getDismissedKey(f), JSON.stringify([...new Set([...prev, movimientoId])]));
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await cajaApi.getByFecha(fecha);
      setMovs(data);

      const tieneSaldoManual = data.some(m => m.tipo === 'saldo_inicial');

      if (tieneSaldoManual) {
        setSaldoAutoCalculado(null);
        const dataAyer = await cajaApi.getByFecha(addDays(fecha, -1));
        setSaldoCuentaAyer(dataAyer.find(m => m.tipo === 'saldo_cuenta')?.monto ?? null);
      } else {
        // Busca hasta 30 días atrás para encadenar el saldo correctamente
        const hasta = addDays(fecha, -1);
        const desde = addDays(fecha, -30);
        const historial = await cajaApi.getRango(desde, hasta);

        setSaldoCuentaAyer(
          historial.filter(m => m.fecha === hasta).find(m => m.tipo === 'saldo_cuenta')?.monto ?? null
        );

        const byDate = {};
        historial.forEach(m => {
          if (!byDate[m.fecha]) byDate[m.fecha] = [];
          byDate[m.fecha].push(m);
        });

        const dates = Object.keys(byDate).sort();

        // Encuentra el último saldo_inicial almacenado (busca de más reciente a más antiguo)
        let saldoBase = 0;
        let startIdx = -1;
        for (let i = dates.length - 1; i >= 0; i--) {
          const entry = byDate[dates[i]].find(m => m.tipo === 'saldo_inicial');
          if (entry) { saldoBase = entry.monto; startIdx = i; break; }
        }

        // Encadena el saldo corriendo desde el último ancla hasta ayer
        let running = saldoBase;
        for (let i = Math.max(startIdx, 0); i < dates.length; i++) {
          const ms = byDate[dates[i]];
          running += ms.filter(m => (m.tipo === 'empleado' || m.tipo === 'ingreso_extra') && m.metodo === 'efectivo').reduce((s, m) => s + m.monto, 0);
          running -= ms.filter(m => m.tipo === 'gasto' && m.metodo === 'efectivo' && m.confirmado !== false).reduce((s, m) => s + m.monto, 0);
        }

        setSaldoAutoCalculado(running);
      }
    } catch {}
    setLoading(false);
  };

  const cargarSugeridos = async () => {
    if (!config.rubros_sync?.length) { setSugeridos([]); return; }
    try {
      const data = await cajaApi.getVencimientosSync(fecha);
      const dismissed = getDismissed(fecha);
      setSugeridos(data.filter(s => !dismissed.includes(s.movimiento_id)));
    } catch { setSugeridos([]); }
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

  const cargarSubrubros = async () => {
    try {
      const results = await Promise.all(rubros.map(r => subrubrosApi.getByRubro(r.id)));
      setAllSubrubros(results.flat());
    } catch {}
  };

  useEffect(() => { cargar(); }, [fecha]);
  useEffect(() => { cargarConfig(); cargarVencimientos(); cargarSubrubros(); }, []);
  useEffect(() => { cargarSugeridos(); }, [fecha, config.rubros_sync]);

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
      if (editingMov) {
        await cajaApi.update(editingMov.id, data);
        toast.success('Actualizado');
      } else {
        await cajaApi.create(data);
        toast.success('Guardado — confirmá el pago para que descuente de la caja');
      }
      setShowForm(false); setEditingMov(null); setTipoForm(null);
      cargar();
    } catch { toast.error('Error al guardar'); }
  };

  const handleConfirmarGasto = async (m) => {
    try {
      if (m.confirmado === true) {
        // Desconfirmar: eliminar el pago del subrubro si existe
        if (m.pago_mov_id) {
          await movimientosApi.delete(m.pago_mov_id);
        }
        await cajaApi.update(m.id, { confirmado: false, pago_mov_id: null });
        cargar();
        toast.success('Confirmación revertida');
      } else {
        await cajaApi.update(m.id, { confirmado: true });
        if (m.subrubro_id) {
          const pago = await movimientosApi.create(m.subrubro_id, {
            tipo: 'pago',
            pago: m.monto,
            fecha: m.fecha,
            concepto: `Pago caja: ${m.concepto}`,
          });
          if (pago?.id) await cajaApi.update(m.id, { pago_mov_id: pago.id });
        }
        cargar();
        toast.success('Pago confirmado');
      }
    } catch { toast.error('Error al confirmar'); }
  };

  const handleDelete = async (id) => {
    const mov = movs.find(m => m.id === id);
    if (mov?.pago_mov_id && mov?.confirmado === true) {
      try { await movimientosApi.delete(mov.pago_mov_id); } catch {}
    }
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
    try {
      await cajaApi.saveConfig(data);
      await cargarConfig();
      toast.success('Configuración guardada');
    } catch (e) {
      toast.error('Error al guardar la configuración');
      throw e;
    }
  };

  const handleConfirmarSugerido = async (s, monto, metodo) => {
    try {
      const pago = await movimientosApi.create(s.subrubro_id, {
        tipo: 'pago',
        pago: Number(monto),
        fecha,
        concepto: `Pago caja: ${s.subrubro_nombre}`,
      });
      await cajaApi.create({
        fecha,
        tipo: 'gasto',
        concepto: s.subrubro_nombre + (s.concepto ? ` - ${s.concepto}` : ''),
        monto: Number(monto),
        metodo,
        subrubro_id: s.subrubro_id,
        movimiento_id: s.movimiento_id,
        pago_mov_id: pago?.id || null,
        confirmado: true,
        es_especial: false,
      });
      setSugeridos(prev => prev.filter(x => x.movimiento_id !== s.movimiento_id));
      cargar();
      toast.success(`Pago de ${s.subrubro_nombre} confirmado`);
    } catch { toast.error('Error al confirmar pago'); }
  };

  const handleDescartarSugerido = (movimientoId) => {
    addDismissed(fecha, movimientoId);
    setSugeridos(prev => prev.filter(s => s.movimiento_id !== movimientoId));
  };

  // ── Cálculos ────────────────────────────────────────────────────────────────
  const saldoMov      = movs.find(m => m.tipo === 'saldo_inicial');
  const saldoInicial  = saldoMov?.monto ?? saldoAutoCalculado ?? 0;
  const saldoCuentaMov = movs.find(m => m.tipo === 'saldo_cuenta');
  const saldoCuentaHoy = saldoCuentaMov?.monto ?? null;

  const ingresoTransDia = (saldoCuentaHoy !== null && saldoCuentaAyer !== null)
    ? saldoCuentaHoy - saldoCuentaAyer
    : null;

  const empleados     = movs.filter(m => m.tipo === 'empleado');
  const ingresosExtra = movs.filter(m => m.tipo === 'ingreso_extra');
  const gastos        = movs.filter(m => m.tipo === 'gasto');

  const disponibleEfvo  = saldoInicial
    + empleados.filter(m => m.metodo === 'efectivo').reduce((s,m) => s+m.monto,0)
    + ingresosExtra.filter(m => m.metodo === 'efectivo').reduce((s,m) => s+m.monto,0);

  const disponibleTrans = saldoCuentaHoy !== null
  ? saldoCuentaHoy
  : empleados.filter(m => m.metodo === 'transferencia').reduce((s,m) => s+m.monto,0)
    + ingresosExtra.filter(m => m.metodo === 'transferencia').reduce((s,m) => s+m.monto,0);

  // Solo los gastos confirmados (confirmado !== false) descuentan de la caja
  const gastosEfvo  = gastos.filter(m => m.metodo === 'efectivo'       && m.confirmado !== false).reduce((s,m) => s+m.monto,0);
  const gastosTrans = gastos.filter(m => m.metodo === 'transferencia'  && m.confirmado !== false).reduce((s,m) => s+m.monto,0);
  const sinConfirmarEfvo  = gastos.filter(m => m.metodo === 'efectivo'      && m.confirmado === false).reduce((s,m) => s+m.monto,0);
  const sinConfirmarTrans = gastos.filter(m => m.metodo === 'transferencia' && m.confirmado === false).reduce((s,m) => s+m.monto,0);
  const vencEfvo    = vencimientos.filter(v => v.metodo !== 'transferencia');
  const vencTrans   = vencimientos.filter(v => v.metodo === 'transferencia');

  const formProps = {
    fecha, onSave: handleSave,
    onCancel: () => { setShowForm(false); setEditingMov(null); },
    empleadosList: config.empleados || [],
    proveedoresList: config.proveedores || [],
    rubros,
    allSubrubros,
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
        <button onClick={() => setFecha(addDays(fecha, 1))}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 shrink-0">
          <ChevronRight size={18} />
        </button>
        <input ref={dateInputRef} type="date" value={fecha}
          onChange={e => setFecha(e.target.value)}
          className="sr-only" />
        <button onClick={() => setShowConfig(true)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0" title="Configurar empleados y proveedores">
          <Settings size={16} />
        </button>
      </div>

      {/* Saldos del día */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    {saldoCuentaAyer !== null ? 'Ingresá el saldo de hoy.' : 'Sin datos de cuenta'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vencimientos sincronizados (auto-sugeridos) */}
      {sugeridos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Boletas por vencer</h3>
            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">{sugeridos.length}</span>
            <InfoTooltip text="Boletas de subrubros sincronizados próximas a vencer. Confirmá el pago para registrarlo en la caja y en el subrubro correspondiente." />
          </div>
          <div className="space-y-2">
            {sugeridos.map(s => (
              <SugeridoRow key={s.movimiento_id} s={s}
                onConfirmar={handleConfirmarSugerido}
                onDescartar={handleDescartarSugerido} />
            ))}
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
            {editingMov?.id === m.id && showForm ? null : <MovRow m={m} onEdit={handleEdit} onDelete={handleDelete} onConfirmar={handleConfirmarGasto} colorMonto="text-red-500" />}
          </div>
        ))}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ResumenMetodo label="Efectivo" icon={Banknote} color="text-green-600"
          disponible={disponibleEfvo} gastos={gastosEfvo} sinConfirmar={sinConfirmarEfvo} vencimientos={vencEfvo} />
        <ResumenMetodo label="Transferencia" icon={ArrowLeftRight} color="text-blue-600"
          disponible={disponibleTrans} gastos={gastosTrans} sinConfirmar={sinConfirmarTrans} vencimientos={vencTrans}
          labelDisponible={ingresoTransDia !== null ? 'Ingreso del día' : 'Disponible'} />
      </div>

      {showConfig && (
        <ConfigPanel config={config} rubros={allSubrubros} allRubros={rubros} onSave={handleSaveConfig} onClose={() => setShowConfig(false)} />
      )}
    </div>
  );
}
