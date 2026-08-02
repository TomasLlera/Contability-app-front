import { useState, useEffect, useRef } from 'react';
import { cajaApi, movimientosApi, subrubrosApi, newIdemKey } from '../api';
import {
  Plus, Trash2, Pencil, ChevronLeft, ChevronRight,
  Users, ShoppingCart, Banknote, ArrowLeftRight, Star, Clock, Wallet, Settings, X, Check,
  Link2, ChevronDown, RefreshCw, Loader2, Eye, EyeOff, FileSpreadsheet, ExternalLink, HandCoins,
  HelpCircle, Percent
} from 'lucide-react';
import toast from 'react-hot-toast';
import { EntityIcon } from '../icons';
import ConfirmModal from '../components/ConfirmModal';
import CajaExportModal from '../components/CajaExportModal';
import InfoTooltip from '../components/InfoTooltip';
import RowActions from '../components/RowActions';
import Modal from '../components/Modal';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
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
// Versión compacta para pantallas angostas: "Mié 13 jul" en vez de "Miércoles, 13 de julio".
const formatFechaMobile = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const s = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const formatFechaCorta = (dateStr) => {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
};
const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const selectCls = inputCls;

// Botón del toolbar de la Caja. Mobile: columna ícono + etiqueta, repartiéndose
// el ancho a 44px de alto. Desktop: el ícono solo de siempre.
const toolbarBtn = 'flex-1 sm:flex-none min-h-11 sm:w-auto sm:h-auto sm:p-2 flex flex-col sm:flex-row items-center justify-center gap-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0';
const toolbarLbl = 'sm:hidden text-[11px] leading-none font-medium';

// ── Panel de configuración ──────────────────────────────────────────────────
function ConfigPanel({ config, rubros, allRubros, onSave, onClose }) {
  const [empleados, setEmpleados] = useState(config.empleados || []);
  const [proveedores, setProveedores] = useState(config.proveedores || []);
  const [nuevoEmp, setNuevoEmp] = useState('');
  const [nuevoProv, setNuevoProv] = useState('');
  const [nuevoProvSub, setNuevoProvSub] = useState('');
  const [rubrosSync, setRubrosSync] = useState(config.rubros_sync || []);
  const [diasAnticipacion, setDiasAnticipacion] = useState(config.dias_anticipacion_caja ?? 3);
  const [syncOpen, setSyncOpen] = useState((config.rubros_sync || []).length === 0);
  const [empleadosOpen, setEmpleadosOpen] = useState((config.empleados || []).length === 0);
  const [proveedoresOpen, setProveedoresOpen] = useState((config.proveedores || []).length === 0);

  // Subrubros cuyo rubro ya está sincronizado: sus proveedores aparecen solos.
  const subrubrosSincronizadosIds = new Set(
    rubros.filter(s => rubrosSync.includes(s.rubro_id)).map(s => s.id)
  );
  const proveedoresVisibles = proveedores
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !p.subrubro_id || !subrubrosSincronizadosIds.has(p.subrubro_id));
  const subrubrosVinculables = rubros.filter(s => !rubrosSync.includes(s.rubro_id));

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
    // Modal en vez de un cuadro a mano: en mobile queda full-screen y el botón de
    // guardar se fija al pie. Antes vivía al final del contenido, así que había que
    // recorrer empleados y proveedores enteros para llegar a guardar.
    <Modal
      title="Configurar Caja"
      size="md"
      onClose={onClose}
      footer={
        <button onClick={handleSave}
          className="w-full min-h-11 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
          <Check size={15} /> Guardar configuración
        </button>
      }
    >
      <div>
        {/* Sincronización de rubros */}
        <div className="mb-5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl overflow-hidden">
          <button type="button" onClick={() => setSyncOpen(v => !v)}
            className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5"><Link2 size={13} /> Sincronizar vencimientos</h3>
              {!syncOpen && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {rubrosSync.length === 0
                    ? 'Sin rubros sincronizados'
                    : `${rubrosSync.length} ${rubrosSync.length === 1 ? 'rubro' : 'rubros'} · ${diasAnticipacion} ${Number(diasAnticipacion) === 1 ? 'día' : 'días'} de anticipación`}
                </p>
              )}
            </div>
            <ChevronDown size={16} className={`text-blue-600 dark:text-blue-400 shrink-0 transition-transform ${syncOpen ? 'rotate-180' : ''}`} />
          </button>
          {syncOpen && (
            <div className="px-4 pb-4 -mt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Las boletas de estos rubros aparecerán automáticamente en la caja cuando estén por vencer.</p>
              {allRubros.length === 0
                ? <p className="text-xs text-slate-400">No hay rubros disponibles.</p>
                : allRubros.map(r => (
                  <label key={r.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                    <input type="checkbox" className="accent-blue-600"
                      checked={rubrosSync.includes(r.id)}
                      onChange={() => toggleRubroSync(r.id)} />
                    <span className="text-sm text-slate-700 dark:text-slate-200 inline-flex items-center gap-1"><EntityIcon value={r.icon} size={14} /> {r.nombre}</span>
                  </label>
                ))
              }
              {rubrosSync.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Días de anticipación</label>
                  <div className="flex items-center gap-2">
                    {/* numeric y no decimal: son días enteros, sin separador. */}
                    <input type="number" inputMode="numeric" min="0" max="30" value={diasAnticipacion}
                      onChange={e => setDiasAnticipacion(e.target.value)}
                      className="w-20 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-xs text-slate-500">días antes del vencimiento</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Empleados */}
        <div className="mb-5">
          <button type="button" onClick={() => setEmpleadosOpen(v => !v)}
            className="w-full flex items-center justify-between gap-2 mb-2 text-left">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Users size={13} className="text-green-600" /> Empleados
              {!empleadosOpen && empleados.length > 0 && (
                <span className="text-xs font-normal text-slate-400 dark:text-slate-500">· {empleados.length}</span>
              )}
            </h3>
            <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform ${empleadosOpen ? 'rotate-180' : ''}`} />
          </button>
          {empleadosOpen && (
            <>
              <div className="space-y-1.5 mb-2">
                {empleados.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-1.5">
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{e.nombre}</span>
                    <button onClick={() => setEmpleados(prev => prev.filter((_, j) => j !== i))}
                      aria-label={`Quitar ${e.nombre}`}
                      className="tap shrink-0 text-slate-400 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" className={inputCls} placeholder="Nombre del empleado"
                  value={nuevoEmp} onChange={e => setNuevoEmp(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addEmpleado()} />
                <button onClick={addEmpleado} aria-label="Agregar empleado"
                  className="shrink-0 w-11 flex items-center justify-center bg-green-600 text-white rounded-lg hover:bg-green-700"><Plus size={17} /></button>
              </div>
            </>
          )}
        </div>

        {/* Proveedores */}
        <div className="mb-5">
          <button type="button" onClick={() => setProveedoresOpen(v => !v)}
            className="w-full flex items-center justify-between gap-2 mb-2 text-left">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShoppingCart size={13} className="text-red-500" /> Proveedores
              {!proveedoresOpen && proveedoresVisibles.length > 0 && (
                <span className="text-xs font-normal text-slate-400 dark:text-slate-500">· {proveedoresVisibles.length}</span>
              )}
            </h3>
            <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform ${proveedoresOpen ? 'rotate-180' : ''}`} />
          </button>
          {proveedoresOpen && (
            <>
              {proveedores.length > proveedoresVisibles.length && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 italic">
                  {proveedores.length - proveedoresVisibles.length} oculto{proveedores.length - proveedoresVisibles.length === 1 ? '' : 's'} (ya sincronizado{proveedores.length - proveedoresVisibles.length === 1 ? '' : 's'} por rubro)
                </p>
              )}
              <div className="space-y-1.5 mb-2">
                {proveedoresVisibles.map(({ p, i }) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-1.5">
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{p.nombre}</span>
                    {p.subrubro_id && <span className="text-xs text-blue-500">vinculado</span>}
                    <button onClick={() => setProveedores(prev => prev.filter((_, j) => j !== i))}
                      aria-label={`Quitar ${p.nombre}`}
                      className="tap shrink-0 text-slate-400 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
              <div className="mb-2">
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Vincular a un subrubro existente</label>
                <div className="flex gap-2">
                  <select className={selectCls} value={nuevoProvSub} onChange={e => setNuevoProvSub(e.target.value)}>
                    <option value="">— Elegir subrubro —</option>
                    {subrubrosVinculables.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                  <button onClick={addProveedor} disabled={!nuevoProvSub} aria-label="Vincular subrubro"
                    className="shrink-0 w-11 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"><Plus size={17} /></button>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">O agregar manualmente</label>
                <div className="flex gap-2">
                  <input type="text" className={inputCls} placeholder="Nombre del proveedor"
                    value={nuevoProv} onChange={e => setNuevoProv(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addProveedor()} />
                  <button onClick={addProveedor} disabled={!nuevoProv.trim()} aria-label="Agregar proveedor"
                    className="shrink-0 w-11 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-40"><Plus size={17} /></button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Formulario de entrada ───────────────────────────────────────────────────
function EntryForm({ fecha, onSave, onCancel, initial, tipoForzado, empleadosList, proveedoresList, rubros, allSubrubros }) {
  const ref = useRef(null);
  const [tipo, setTipo]         = useState(tipoForzado || initial?.tipo || 'gasto');
  const [concepto, setConcepto] = useState(initial?.concepto || '');
  const [monto, setMonto]       = useState(initial?.monto || '');
  // Si el initial trae metodo=null (gasto auto-sincronizado), preservar null para
  // que el usuario lo elija explícitamente — sin defaultearlo a 'efectivo'.
  const [metodo, setMetodo]     = useState(
    initial && 'metodo' in initial ? initial.metodo : 'efectivo'
  );
  const [esEspecial, setEsEspecial] = useState(initial?.es_especial || false);
  const [seleccion, setSeleccion] = useState('');

  // Anti doble-clic: bloqueo síncrono (ref) + estado para deshabilitar/spinner.
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  // Clave de idempotencia estable por apertura del formulario.
  const idemKeyRef = useRef(null);
  if (idemKeyRef.current === null) idemKeyRef.current = newIdemKey();

  // Vinculación a subrubro (solo para gastos nuevos)
  const [rubroSel, setRubroSel]       = useState('');
  const [subrubroSel, setSubrubroSel] = useState('');
  const [facturasSub, setFacturasSub] = useState([]);
  const [facturaSel, setFacturaSel]   = useState('');
  const [loadingFacturas, setLoadingFacturas] = useState(false);

  const subrubrosDel = rubroSel
    ? allSubrubros.filter(s => String(s.rubro_id) === rubroSel)
    : [];

  // Cerrar al tocar afuera solo con mouse. En touch, `mousedown` también dispara
  // y cualquier tap al scrollear descartaba el formulario a medio llenar. En
  // mobile se cierra con Cancelar, que está siempre visible.
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return;
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
      if (f) setMonto(f.saldo ?? f.monto);
    }
  };

  const lista = tipo === 'empleado' ? empleadosList : tipo === 'gasto' ? proveedoresList : [];

  const handleSeleccion = (val) => {
    setSeleccion(val);
    if (val && val !== '__otro__') setConcepto(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (savingRef.current) return;
    if (!concepto.trim() || !Number(monto)) return;
    const data = {
      fecha, tipo, concepto: concepto.trim(), monto: Number(monto), metodo, es_especial: esEspecial,
      idempotency_key: idemKeyRef.current,
    };
    if (subrubroSel) {
      data.subrubro_id = Number(subrubroSel);
      if (facturaSel) data.movimiento_id = Number(facturaSel);
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await onSave(data);
      // Éxito: el padre cierra el formulario (se desmonta).
    } catch {
      savingRef.current = false;
      setSaving(false);
    }
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
              className={`flex-1 min-h-11 sm:min-h-0 py-2 transition-colors ${tipo === t.value ? `${t.color} text-white` : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select className={selectCls} value={rubroSel} onChange={e => { setRubroSel(e.target.value); setSubrubroSel(''); setFacturasSub([]); setFacturaSel(''); }}>
              <option value="">— Rubro —</option>
              {rubros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
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
                        {f.concepto || 'Sin concepto'} — {fmt(f.saldo ?? f.monto)}{f.fecha_vencimiento ? ` — vence ${formatFechaCorta(f.fecha_vencimiento)}` : ''}
                      </option>
                    ))}
                  </select>
                )
          )}
        </div>
      )}

      {/* Monto y método apilados en mobile: en dos columnas de 150px el toggle
          Efectivo/Transf. queda en botones de 75px, imposibles de acertar. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input type="number" inputMode="decimal" min="0" step="any" className={inputCls} placeholder="Monto"
          value={monto} onChange={e => setMonto(e.target.value)} required />
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-sm sm:text-xs font-medium">
          {[['efectivo', 'Efectivo'], ['transferencia', 'Transferencia', 'Transf.']].map(([v, l, corto]) => (
            <button key={v} type="button" onClick={() => setMetodo(v)}
              className={`flex-1 min-h-11 sm:min-h-0 py-2 transition-colors ${metodo === v ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              <span className="sm:hidden">{l}</span>
              <span className="hidden sm:inline">{corto || l}</span>
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
        <button type="button" onClick={onCancel} disabled={saving}
          className="flex-1 min-h-11 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-2 rounded-lg text-sm disabled:opacity-40">
          Cancelar
        </button>
        <button type="submit" disabled={saving || !concepto.trim() || !Number(monto)}
          className="flex-1 min-h-11 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center gap-1.5">
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

function MetodoBadge({ metodo }) {
  if (metodo === 'efectivo')
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Efectivo</span>;
  if (metodo === 'transferencia')
    return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Transf.</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-dashed border-amber-300 dark:border-amber-700">Sin definir</span>;
}

// Tipo de comprobante de respaldo del movimiento de origen (campo derivado que el
// backend adjunta desde Movimiento.documento). Los gastos manuales no tienen
// comprobante enlazado y no muestran badge.
function DocumentoBadge({ documento }) {
  // Los dos en gris: el tipo de comprobante es una etiqueta, no un estado. En
  // ámbar competía con "Sin confirmar", que sí pide acción.
  const cls = 'text-[11px] leading-[18px] px-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium';
  if (documento === 'factura') return <span className={cls}>Factura</span>;
  if (documento === 'remito')  return <span className={cls}>Remito</span>;
  return null;
}

// ── Agrupación de la lista de pagos ─────────────────────────────────────────
// Orden fijo de secciones: primero transferencias, después efectivo y al final los
// que todavía no tienen método (auto-sync sin confirmar) para que queden a la vista
// como pendientes de definir.
const GRUPOS_METODO = [
  { key: 'transferencia', label: 'Transferencias', icon: ArrowLeftRight, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-900' },
  { key: 'efectivo',      label: 'Efectivo',       icon: Banknote,       color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-900' },
  { key: null,            label: 'Sin método',     icon: HelpCircle,     color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900' },
];

// El sync de remitos guarda el concepto con el prefijo "Remito — " (db.js). Con el
// badge de comprobante a la vista el prefijo es redundante, y además mandaría al
// remito a la "R" al ordenar, separándolo de la factura del mismo proveedor. Se
// quita para mostrar y para ordenar; el dato en la base queda intacto.
const conceptoLimpio = (m) =>
  m.documento === 'remito'
    ? (m.concepto || '').replace(/^Remito\s+—\s+/, '')
    : (m.concepto || '');

// sensitivity 'base' para que acentos y mayúsculas no rompan el orden
// ("Álvarez" cae junto a "Alvarez").
const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

// Devuelve solo los grupos con ítems, en el orden de GRUPOS_METODO y con cada grupo
// ordenado A-Z por proveedor. No muta ni filtra datos: es puro reordenamiento de
// presentación.
//
// `nombreDe` resuelve el nombre del proveedor (el subrubro vinculado, con fallback al
// concepto). Ordenar por proveedor y NO por el concepto crudo es lo que mantiene
// juntos al remito y a la factura del mismo proveedor en el mismo día: sus conceptos
// difieren ("Remito — X" vs "X"), su proveedor no.
function agruparPorMetodo(items, nombreDe) {
  const ordenar = (a, b) =>
    collator.compare(nombreDe(a), nombreDe(b))
    // Mismo proveedor: factura primero, remito después. Desempate final por id para
    // que el orden sea estable entre renders.
    || (a.documento === 'remito' ? 1 : 0) - (b.documento === 'remito' ? 1 : 0)
    || a.id - b.id;

  return GRUPOS_METODO
    .map(g => ({ ...g, items: items.filter(m => (m.metodo || null) === g.key).sort(ordenar) }))
    .filter(g => g.items.length > 0);
}

// Encabezado de sección de método: ícono, label, contador y subtotal del grupo.
// Sticky: con veinte gastos cargados, al scrollear se pierde de vista si lo que
// estás mirando es efectivo o transferencia. `top-14` lo deja justo debajo del
// header de la app; el fondo opaco es lo que evita que las filas se le transparenten.
function GrupoHeader({ grupo }) {
  const Icon = grupo.icon;
  const total = grupo.items.reduce((s, m) => s + (m.monto || 0), 0);
  return (
    <div className={`sticky top-14 z-10 flex items-center gap-2 px-2.5 py-2 mb-2 rounded-lg border backdrop-blur-sm ${grupo.bg} ${grupo.border}`}>
      <Icon size={14} className={`${grupo.color} shrink-0`} />
      <span className={`text-xs font-semibold uppercase tracking-wide ${grupo.color}`}>{grupo.label}</span>
      <span className="text-xs text-slate-400 dark:text-slate-500">({grupo.items.length})</span>
      <span className="ml-auto text-sm font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap tabular-nums">{fmt(total)}</span>
    </div>
  );
}

function MovRow({ m, onEdit, onDelete, onConfirmar, colorMonto, confirming = false, subrubro, onGoToSubrubro, selectable = false, selected = false, onToggleSelect, hideMetodo = false, aplicaDescuento = false }) {
  // Acordeón de descuento: arranca cerrado siempre (también después de confirmar) para
  // no ocupar espacio; se abre a demanda, ya sea para cargar el descuento o para
  // consultar el detalle de uno ya aplicado.
  const [descOpen, setDescOpen] = useState(false);
  const [descInput, setDescInput] = useState('');
  // Modo de carga del descuento: 'monto' = pesos fijos · 'pct' = porcentaje sobre el
  // bruto. El mismo "7" significa $7 o 7% según este toggle, así que la unidad tiene
  // que estar siempre visible al lado del input.
  const [descModo, setDescModo] = useState('monto');
  // Cobro de deuda: ingreso auto-sincronizado con ciclo de confirmación (una deuda
  // por cobrar apunta a su movimiento de origen). Los ingresos manuales/espejo de
  // abono no llevan confirmación (confirmado null).
  const esCobro      = m.tipo === 'ingreso_extra' && m.movimiento_id != null;
  const esPendiente  = (m.tipo === 'gasto' || esCobro) && m.confirmado === false;
  const esConfirmado = (m.tipo === 'gasto' || esCobro) && m.confirmado === true;
  const esGasto      = m.tipo === 'gasto';
  const confirmable  = esGasto || esCobro;
  // Descuento por pago ya aplicado: el ítem vale el NETO y `descuento` guarda cuánto
  // se descontó. Es lo que pinta la fila de violeta.
  const conDescuento = Number(m.descuento) > 0;
  // El acordeón se ofrece para cargar el descuento (pendiente, subrubro habilitado y
  // vinculado a una factura) o para consultar uno ya aplicado.
  const puedeDescontar = aplicaDescuento && esPendiente && m.movimiento_id != null;
  const mostrarAcordeon = puedeDescontar || conDescuento;

  // Jerarquía de color del importe (semáforo de estado):
  //   · pendiente  → ROJO. Plata que todavía debés/no cobraste: es lo que pide acción.
  //   · confirmado → VERDE. Ya está hecho.
  //   · descuento  → VIOLETA, y tiene prioridad sobre los dos anteriores: es el único
  //                  caso donde el número mostrado no es el bruto, y eso hay que
  //                  poder verlo de un vistazo aunque el pago ya esté confirmado.
  // Los ítems no confirmables (empleados, ingresos manuales) conservan el color que
  // les pasa la sección vía `colorMonto`.
  const montoColor = conDescuento ? 'text-purple-600 dark:text-purple-400'
    : (esGasto || esCobro)
      ? (esPendiente ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')
      : colorMonto;

  const bruto = Number(m.monto_bruto ?? m.monto) || 0;
  const descRaw = Number(descInput) || 0;
  const esPct = descModo === 'pct';
  // En modo % el importe se previsualiza acá, pero el que vale es el que recalcula el
  // backend al confirmar (mismo criterio de redondeo a centavos en un solo lugar).
  const descNum = esPct ? Math.round(bruto * (descRaw / 100) * 100) / 100 : descRaw;
  const netoPreview = bruto - descNum;
  const descValido = esPct
    ? descRaw > 0 && descRaw < 100
    : descRaw > 0 && descRaw < bruto;

  // El borde/fondo repite el semáforo del importe para que el estado se lea de lejos,
  // sin tener que buscar el badge: rojo punteado = falta confirmar, verde =
  // confirmado, violeta = con descuento aplicado.
  return (
    <div className={`rounded-xl border transition-colors ${
      selected
        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 ring-1 ring-blue-400/50'
        : conDescuento
          ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800'
          : esPendiente
            ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-900 border-dashed'
            : esConfirmado
              ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-900'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
    }`}>
    <div
      onClick={selectable ? () => onToggleSelect(m.id) : undefined}
      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 ${selectable ? 'cursor-pointer' : ''}`}>
      {selectable && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggleSelect(m.id); }}
          title={selected ? 'Deseleccionar' : 'Seleccionar'}
          aria-label={selected ? 'Deseleccionar' : 'Seleccionar'}
          className={`tap shrink-0 w-6 h-6 sm:w-5 sm:h-5 rounded-md border flex items-center justify-center transition-colors ${
            selected
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'border-slate-300 dark:border-slate-500 text-transparent hover:border-blue-400'
          }`}>
          <Check size={14} className="sm:w-3 sm:h-3" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        {/* El contenedor era `flex-wrap`: con un nombre largo el ícono de "ir al
            subrubro" se iba solo a una segunda línea, sin contexto. Sin wrap, el
            ícono queda siempre pegado al final del nombre y es el texto el que
            cede ancho (min-w-0). El nombre además usa dos líneas en mobile —no
            hay hover para resolver un truncado— y una sola en `sm:`, donde el
            `title` alcanza. */}
        <div className="flex items-center gap-1.5 min-w-0">
          {/* El nombre va en neutro fuerte siempre. Antes lo pendiente se atenuaba,
              que con el semáforo restaurado quedaba al revés: lo que falta confirmar
              es justamente lo que hay que mirar. El estado lo dicen color y badge. */}
          <p className="text-sm font-medium line-clamp-2 sm:truncate min-w-0 text-slate-800 dark:text-slate-100"
             title={conceptoLimpio(m)}>
            {conceptoLimpio(m)}
          </p>
          {m.es_especial && <Star size={11} className="text-amber-500 shrink-0" />}
          {subrubro && onGoToSubrubro && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onGoToSubrubro(m); }}
              title={`Ir al subrubro: ${subrubro.nombre}`}
              aria-label={`Ir al subrubro: ${subrubro.nombre}`}
              className="tap shrink-0 text-slate-400 hover:text-blue-500 transition-colors"
            >
              <ExternalLink size={12} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {/* Dentro de una sección agrupada por método el badge repite lo que ya dice
              el encabezado: se omite y queda solo el tipo de comprobante y el estado. */}
          {!hideMetodo && <MetodoBadge metodo={m.metodo} />}
          <DocumentoBadge documento={m.documento} />
          {/* Rojo, igual que el importe y el borde: un solo código de color por estado. */}
          {esPendiente && <span className="text-[11px] leading-[18px] px-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">{esCobro ? 'Sin cobrar' : 'Sin confirmar'}</span>}
          {/* El ✓ verde de la derecha ya dice que está confirmado: en mobile este
              badge solo agrega una línea de alto por fila. Se muestra desde `sm`. */}
          {esConfirmado && m.movimiento_id && <span className="hidden sm:flex text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 items-center gap-0.5"><Check size={9} /> {esCobro ? 'Cobro confirmado' : 'Pago confirmado'}</span>}
          {conDescuento && (
            <span title={`Descuento de ${fmt(m.descuento)}${m.descuento_pct ? ` (${m.descuento_pct}%)` : ''} aplicado sobre ${fmt(bruto)}`}
              className="text-[11px] leading-[18px] px-1.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium inline-flex items-center gap-0.5">
              <Percent size={9} /> <span className="hidden sm:inline">Con </span>descuento
            </span>
          )}
        </div>
      </div>
      {/* En mobile el monto se apila sobre las acciones: si van todos en línea, el
          concepto se queda sin ancho y se trunca a nada. */}
      <div className="shrink-0 flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-3">
        <p className={`text-base font-bold whitespace-nowrap tabular-nums ${montoColor}`}>
          {fmt(m.monto)}
        </p>
        {/* Confirmar es LA acción diaria de la caja: se queda visible y a 44px en
            mobile. Descuento/editar/eliminar pasan al menú ⋮ — en escritorio
            RowActions los sigue dibujando en línea, igual que antes.
            gap-2 = los 8px mínimos de separación entre dos targets táctiles
            adyacentes (MOBILE.md): con gap-1 los bordes de 44px se solapaban. */}
        <div className="flex items-center gap-2 sm:gap-3">
          {confirmable && onConfirmar && (
            <button onClick={(e) => { e.stopPropagation(); onConfirmar(m); }} disabled={confirming}
              title={esConfirmado ? 'Revertir confirmación' : esCobro ? 'Confirmar cobro (registra el abono)' : 'Confirmar pago'}
              aria-label={esConfirmado ? 'Revertir confirmación' : 'Confirmar pago'}
              className={`w-11 h-11 sm:w-auto sm:h-auto sm:p-1.5 flex items-center justify-center rounded-lg shrink-0 transition-colors disabled:opacity-50 disabled:cursor-wait ${
                esConfirmado
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 opacity-40 hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-500 dark:hover:text-red-400'
                  : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/70'
              }`}>
              {confirming ? <Loader2 size={18} className="animate-spin sm:w-3.5 sm:h-3.5" /> : <Check size={18} className="sm:w-3.5 sm:h-3.5" />}
            </button>
          )}
          <RowActions
            title={conceptoLimpio(m)}
            acciones={[
              mostrarAcordeon && {
                key: 'descuento',
                label: conDescuento ? 'Ver detalle del descuento' : 'Aplicar descuento por pago',
                icon: <Percent size={16} />,
                iconDesktop: (
                  <>
                    <Percent size={13} />
                    <ChevronDown size={11} className={`transition-transform ${descOpen ? 'rotate-180' : ''}`} />
                  </>
                ),
                onClick: () => setDescOpen(v => !v),
                className: `p-1.5 rounded-lg shrink-0 transition-colors flex items-center gap-0.5 ${
                  conDescuento
                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300'
                    : 'text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/40'
                }`,
              },
              {
                key: 'editar',
                label: 'Editar',
                icon: <Pencil size={16} />,
                onClick: () => onEdit(m),
                className: 'p-1 -m-1 text-slate-400 hover:text-blue-500 transition-colors shrink-0',
              },
              {
                key: 'eliminar',
                label: 'Eliminar',
                icon: <Trash2 size={16} />,
                tone: 'danger',
                onClick: () => onDelete(m.id),
                className: 'p-1 -m-1 text-slate-400 hover:text-red-500 transition-colors shrink-0',
              },
            ]}
          />
        </div>
      </div>
    </div>

    {/* Acordeón de descuento. Cerrado por defecto para no ocupar espacio: se abre
        para cargar el descuento y, una vez confirmado, solo si el usuario quiere
        revisar los números. */}
    {mostrarAcordeon && descOpen && (
      <div onClick={(e) => e.stopPropagation()}
        className="px-3 sm:px-4 pb-3 pt-1 border-t border-purple-200 dark:border-purple-900/60 mt-1">
        {conDescuento ? (
          // Ya confirmado con descuento: detalle de solo lectura.
          <div className="space-y-1 text-xs pt-2">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Monto original</span><span className="font-medium">{fmt(bruto)}</span>
            </div>
            <div className="flex justify-between text-purple-700 dark:text-purple-300">
              <span>Descuento aplicado{m.descuento_pct ? ` (${m.descuento_pct}%)` : ''}</span>
              <span className="font-medium">− {fmt(m.descuento)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 border-t border-purple-200 dark:border-purple-900/60 pt-1">
              <span>Pagado (neto)</span><span>{fmt(m.monto)}</span>
            </div>
            {m.nc_mov_id && (
              <p className="text-[11px] text-slate-400 pt-0.5">
                Nota de crédito #{m.nc_mov_id} generada automáticamente — el saldo de la factura queda en cero.
              </p>
            )}
          </div>
        ) : (
          // Pendiente: carga del descuento y confirmación en un paso.
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 dark:text-slate-300 shrink-0">Descuento</label>
              {/* Selector de unidad: sin esto un "7" es ambiguo entre $7 y 7%. */}
              <div className="flex rounded-lg border border-purple-300 dark:border-purple-800 overflow-hidden text-xs font-medium shrink-0">
                {[['monto', '$'], ['pct', '%']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setDescModo(v)}
                    className={`w-7 py-1.5 transition-colors ${
                      descModo === v ? 'bg-purple-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
              <input type="number" inputMode="decimal" min="0" step="any" autoFocus
                value={descInput} onChange={e => setDescInput(e.target.value)}
                placeholder={esPct ? '7' : '0,00'}
                className="flex-1 min-w-0 min-h-11 sm:min-h-0 border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            {esPct && descValido && (
              <div className="flex justify-between text-xs text-purple-700 dark:text-purple-300">
                <span>{descRaw}% de {fmt(bruto)}</span><span className="font-medium">− {fmt(descNum)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Monto neto a pagar</span>
              <span className={`font-bold ${descValido ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}>
                {descValido ? fmt(netoPreview) : fmt(bruto)}
              </span>
            </div>
            {!esPct && descRaw > 0 && descRaw >= bruto && (
              <p className="text-[11px] text-red-500">El descuento no puede ser mayor o igual al monto de la factura ({fmt(bruto)}).</p>
            )}
            {esPct && descRaw > 0 && descRaw >= 100 && (
              <p className="text-[11px] text-red-500">El porcentaje debe ser menor a 100.</p>
            )}
            <button type="button" disabled={!descValido || confirming}
              onClick={() => {
                onConfirmar(m, esPct ? { descuento_pct: descRaw } : { descuento: descNum });
                setDescOpen(false); setDescInput('');
              }}
              className="w-full bg-purple-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-40 flex items-center justify-center gap-1.5">
              {confirming ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Confirmar pago con descuento
            </button>
            <p className="text-[11px] text-slate-400">
              Se registra el pago por el neto y una Nota de Crédito por el descuento, para que el saldo de la factura cierre en cero.
            </p>
          </div>
        )}
      </div>
    )}
    </div>
  );
}

function ResumenMetodo({ label, icon: Icon, color, disponible, gastos, sinConfirmar = 0, vencimientos, labelDisponible }) {
  const restante = disponible - gastos;
  const restanteSiConfirma = disponible - gastos - sinConfirmar;
  const [vencAbierto, setVencAbierto] = useState(false);
  const totalVenc = (vencimientos || []).reduce((s, v) => s + (v.monto || 0), 0);
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className={color} />
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</h4>
      </div>
      <div className="space-y-1.5 text-sm">
        {/* Disponible y Gastos en neutro: son los datos de entrada del cálculo,
            no alertas. El color se guarda para lo que exige mirar — el ámbar de
            lo sin confirmar y el rojo de una Resta negativa. */}
        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>{labelDisponible || 'Disponible'}</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{fmt(disponible)}</span>
        </div>
        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>Gastos</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">− {fmt(gastos)}</span>
        </div>
        {sinConfirmar > 0 && (
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Sin confirmar</span>
            <span className="font-semibold text-amber-500 tabular-nums">{fmt(sinConfirmar)}</span>
          </div>
        )}
        <div className="border-t border-slate-100 dark:border-slate-700 pt-1.5 flex justify-between font-bold">
          <span className="text-slate-700 dark:text-slate-200">Resta</span>
          <span className={`tabular-nums ${restante >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600'}`}>{fmt(restante)}</span>
        </div>
        {sinConfirmar > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Si confirmás todo</span>
            <span className={`font-semibold tabular-nums ${restanteSiConfirma >= 0 ? 'text-slate-500 dark:text-slate-400' : 'text-red-500'}`}>{fmt(restanteSiConfirma)}</span>
          </div>
        )}
      </div>
      {vencimientos?.length > 0 && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
          <button type="button" onClick={() => setVencAbierto(v => !v)}
            className="w-full flex items-center justify-between gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <span className="flex items-center gap-1">
              <Clock size={10} /> Próximos a vencer
              <span className="text-slate-400 dark:text-slate-500">({vencimientos.length})</span>
            </span>
            <span className="flex items-center gap-1.5">
              {!vencAbierto && <span className="text-amber-700 dark:text-amber-400">{fmt(totalVenc)}</span>}
              <ChevronDown size={13} className={`transition-transform ${vencAbierto ? 'rotate-180' : ''}`} />
            </span>
          </button>
          {vencAbierto && (
            <div className="mt-1.5 space-y-0.5">
              {vencimientos.map((v, i) => (
                <div key={i} className="flex justify-between gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <span className="truncate min-w-0">{v.subrubro?.nombre}</span>
                  <span className="shrink-0">{fmt(v.monto)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CajaView({ rubros = [], onNavigate }) {
  const [fecha, setFecha]           = useState(todayStr());
  // Ocultar los montos de "Saldo del día" y "Saldo en cuenta" (privacidad). Persiste.
  // Arranca visible siempre. Antes el estado se persistía, así que un "ocultar"
  // puntual —mostrarle la pantalla a alguien— dejaba los saldos tapados para
  // siempre y costaba un tap extra en cada entrada a la Caja. Ocultar es la
  // excepción, no el default: vive lo que dura la vista.
  const [ocultarSaldos, setOcultarSaldos] = useState(false);
  const resumenRef = useRef(null);
  const [movs, setMovs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [tipoForm, setTipoForm]     = useState(null);
  const [editingMov, setEditingMov] = useState(null);
  // Id del movimiento de caja pendiente de confirmar su eliminación (null = sin modal).
  const [deleteId, setDeleteId] = useState(null);
  // ID del gasto cuya confirmación/reversión está en curso (bloquea doble clic en
  // el botón de confirmar, que de otro modo crearía dos pagos en el subrubro).
  const [confirmingId, setConfirmingId] = useState(null);
  // Acordeones con memoria: recuerdan si quedaron abiertos/cerrados entre recargas.
  const [gastosOpen, setGastosOpen] = useState(() => localStorage.getItem('cajaGastosOpen') !== '0');
  const [empleadosOpen, setEmpleadosOpen] = useState(() => localStorage.getItem('cajaEmpleadosOpen') !== '0');
  const [deudasOpen, setDeudasOpen] = useState(() => localStorage.getItem('cajaDeudasOpen') !== '0');
  // Filtro "solo pagos con descuento". No persiste: es una lente momentánea, no una
  // preferencia — arrancar el día con la lista filtrada sería confuso.
  const [soloDescuentos, setSoloDescuentos] = useState(false);
  useEffect(() => { localStorage.setItem('cajaGastosOpen', gastosOpen ? '1' : '0'); }, [gastosOpen]);
  useEffect(() => { localStorage.setItem('cajaEmpleadosOpen', empleadosOpen ? '1' : '0'); }, [empleadosOpen]);
  useEffect(() => { localStorage.setItem('cajaDeudasOpen', deudasOpen ? '1' : '0'); }, [deudasOpen]);

  const dateInputRef = useRef(null);
  // Bloqueo síncrono de confirmaciones en vuelo (por id de gasto). El estado
  // confirmingId es para la UI; este ref evita la carrera de dos clics en el mismo
  // tick, donde el estado todavía no se actualizó.
  const confirmingRef = useRef(new Set());

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
  const [showExport, setShowExport]     = useState(false);
  const [allSubrubros, setAllSubrubros] = useState([]);

  // Selección múltiple de gastos (para sumar/agrupar por proveedor/subrubro).
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const toggleSelection = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const clearSelection = () => setSelectedIds(new Set());

  const cargar = async () => {
    setLoading(true);
    try {
      // Auto-sync: trae vencimientos del día (de los rubros configurados) y los crea
      // como gastos pending sin método de pago. Idempotente — corre cada vez sin duplicar.
      try { await cajaApi.autoSync(fecha); } catch {}
      const data = await cajaApi.getByFecha(fecha);
      setMovs(data);

      const tieneSaldoManual = data.some(m => m.tipo === 'saldo_inicial');

      // El saldo de ayer se necesita en los dos casos: para el ingreso por
      // transferencia del día (saldo_cuenta de hoy − el de ayer).
      const dataAyer = await cajaApi.getByFecha(addDays(fecha, -1));
      setSaldoCuentaAyer(dataAyer.find(m => m.tipo === 'saldo_cuenta')?.monto ?? null);

      if (tieneSaldoManual) {
        setSaldoAutoCalculado(null);
      } else {
        // El encadenado lo resuelve el backend desde el último saldo_inicial manual,
        // sin límite de días hacia atrás. Antes se hacía acá trayendo 30 días: cuando
        // el ancla caía fuera de esa ventana la cadena arrancaba en cero y el saldo
        // del día se desplomaba sin ninguna señal de que faltaba la base.
        // saldo === null = nunca se cargó un saldo inicial → la Caja muestra "—".
        const { saldo } = await cajaApi.getSaldoAnterior(fecha);
        setSaldoAutoCalculado(saldo ?? null);
      }
    } catch {}
    setLoading(false);
  };

  const cargarConfig = async () => {
    const cfg = await cajaApi.getConfig();
    setConfig(cfg);
  };

  const cargarVencimientos = async () => {
    try {
      const data = await movimientosApi.getVencimientos(7);
      setVencimientos(Array.isArray(data) ? data : (data?.vencimientos || []));
    } catch {}
  };

  const cargarSubrubros = async () => {
    try {
      const results = await Promise.all(rubros.map(r => subrubrosApi.getByRubro(r.id)));
      setAllSubrubros(results.flat());
    } catch {}
  };

  // Refresca todo lo que depende de datos del servidor (movimientos del día +
  // reconciliación auto-sync, vencimientos, config y subrubros). Lo usa el botón
  // "Refrescar" y los disparos automáticos al volver el foco a la ventana.
  const refrescarTodo = async () => {
    setRefreshing(true);
    try {
      await Promise.all([cargar(), cargarVencimientos(), cargarConfig(), cargarSubrubros()]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { cargar(); clearSelection(); }, [fecha]);
  useEffect(() => { cargarConfig(); cargarVencimientos(); cargarSubrubros(); }, []);

  // Auto-refresh: al volver el foco a la ventana o reactivar la pestaña, recarga
  // datos frescos. Así un pago/baja hecho en otra vista (o pestaña) se refleja sin
  // tener que recargar la página a mano. Se omite si hay un formulario abierto para
  // no descartar lo que el usuario está escribiendo.
  useEffect(() => {
    const onFocus = () => { if (!showForm && !editandoSaldo && !editandoSaldoCuenta) refrescarTodo(); };
    const onVisible = () => { if (document.visibilityState === 'visible') onFocus(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fecha, showForm, editandoSaldo, editandoSaldoCuenta]);

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
        const msgCreado = {
          ingreso_extra: 'Ingreso cargado ✓',
          empleado: 'Caja ingresada ✓',
          gasto: 'Pago ingresado ✓',
        }[data.tipo] || 'Guardado — confirmá el pago para que descuente de la caja';
        toast.success(msgCreado);
      }
      setShowForm(false); setEditingMov(null); setTipoForm(null);
      cargar();
    } catch (err) { toast.error('Error al guardar'); throw err; }
  };

  // `opts` = { descuento } (monto fijo) o { descuento_pct } (porcentaje). Vacío = sin
  // descuento. El backend resuelve el % a pesos.
  const handleConfirmarGasto = async (m, opts = {}) => {
    // Bloqueo anti doble-clic: si ya hay una operación en curso para este gasto,
    // ignorar. Sin esto, dos clics rápidos entran ambos a la rama de confirmar
    // (m.confirmado sigue siendo false en el render viejo) y crean dos pagos.
    if (confirmingRef.current.has(m.id)) return;
    // Cobro de deuda (ingreso auto-sincronizado) vs gasto de proveedor: mismo
    // flujo — al confirmar se crea el pago/abono en el subrubro de origen.
    const esCobro = m.tipo === 'ingreso_extra';
    confirmingRef.current.add(m.id);
    setConfirmingId(m.id);
    try {
      if (m.confirmado === true) {
        // Revertir: el backend borra el pago Y la NC de descuento (si la hubo) y
        // devuelve el ítem a su monto bruto, en una sola operación auditada.
        await cajaApi.revertir(m.id);
        cargar();
        toast.success('Confirmación revertida');
      } else {
        // Bloqueo: no se puede confirmar sin método de pago definido.
        if (!m.metodo) {
          toast.error('Definí el método de pago antes de confirmar');
          return;
        }
        // El pago se registra en la FECHA REAL en que se confirma = el día que se
        // está viendo en la Caja (`fecha`, por defecto hoy), NO la fecha de
        // vencimiento del ítem. Así una factura que venció el 15/7 y se paga el 17/7
        // queda registrada en Caja y en el Subrubro el 17/7 (fecha del pago real).
        //
        // El backend hace el pago (por el neto) y la NC del descuento juntos: si algo
        // falla, no queda un pago huérfano sin su nota de crédito.
        const r = await cajaApi.confirmar(m.id, { ...opts, fecha });
        cargar();
        toast.success(
          r?.descuento
            ? `Pago confirmado con descuento de ${fmt(r.descuento)}${r.descuento_pct ? ` (${r.descuento_pct}%)` : ''} — NC generada`
            : esCobro ? 'Cobro confirmado — sumado a los ingresos del día' : 'Pago confirmado'
        );
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Error al confirmar');
    }
    finally { confirmingRef.current.delete(m.id); setConfirmingId(null); }
  };

  // Subrubro vinculado a un movimiento de caja (si tiene subrubro_id resoluble).
  const subrubroDe = (m) => (m.subrubro_id ? allSubrubros.find(s => s.id === m.subrubro_id) : null);

  // Clave de orden alfabético: el proveedor real (nombre del subrubro vinculado), con
  // fallback al concepto para los gastos manuales sin subrubro. Así el remito y la
  // factura de un mismo proveedor quedan pegados aunque sus conceptos difieran.
  const nombreProveedor = (m) => subrubroDe(m)?.nombre || conceptoLimpio(m);

  // Acceso directo: navega al Subrubro de origen del movimiento para ver/editar el
  // pago real. Requiere que App haya pasado onNavigate y que el subrubro exista.
  const handleGoToSubrubro = (m) => {
    const sub = subrubroDe(m);
    if (!sub) return;
    const rubro = rubros.find(r => r.id === sub.rubro_id);
    if (!rubro) return;
    onNavigate?.(rubro, sub);
  };

  // Click en el ícono de eliminar: abre el modal de confirmación (no borra todavía).
  const handleDelete = (id) => setDeleteId(id);

  // Borrado real: solo se ejecuta cuando el usuario confirma en el modal.
  const confirmDelete = async () => {
    const id = deleteId;
    const mov = movs.find(m => m.id === id);
    // Revertir antes de borrar: limpia el pago Y la NC de descuento en el subrubro.
    // Borrar el ítem sin revertir dejaría la nota de crédito huérfana, inflando el
    // saldo a favor de la factura.
    if (mov?.confirmado === true && (mov.pago_mov_id || mov.nc_mov_id)) {
      try { await cajaApi.revertir(id); } catch {}
    }
    await cajaApi.delete(id, fecha);
    setMovs(prev => prev.filter(m => m.id !== id));
    setDeleteId(null);
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
    cargar(); toast.success('Saldo cargado con éxito ✓');
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

  // ── Cálculos ────────────────────────────────────────────────────────────────
  const saldoMov      = movs.find(m => m.tipo === 'saldo_inicial');
  const saldoInicial  = saldoMov?.monto ?? saldoAutoCalculado ?? 0;
  const saldoCuentaMov = movs.find(m => m.tipo === 'saldo_cuenta');
  const saldoCuentaHoy = saldoCuentaMov?.monto ?? null;

  const ingresoTransDia = (saldoCuentaHoy !== null && saldoCuentaAyer !== null)
    ? saldoCuentaHoy - saldoCuentaAyer
    : null;
  // % de variación respecto al saldo del día anterior. null si ayer era 0 (no hay base).
  const pctTransDia = (ingresoTransDia !== null && saldoCuentaAyer)
    ? (ingresoTransDia / Math.abs(saldoCuentaAyer)) * 100
    : null;

  const empleados     = movs.filter(m => m.tipo === 'empleado');
  // Deudas por cobrar: ingresos auto-sincronizados desde un subrubro DEUDA
  // (apuntan a la deuda por movimiento_id). Pendientes hasta confirmar el cobro.
  const deudasCobro   = movs.filter(m => m.tipo === 'ingreso_extra' && m.movimiento_id != null);
  const ingresosExtra = movs.filter(m => m.tipo === 'ingreso_extra' && m.movimiento_id == null);
  const gastos        = movs.filter(m => m.tipo === 'gasto');
  // Filtro de presentación: aísla los pagos con descuento aplicado. Solo afecta la
  // LISTA — los totales, el resumen del día y la selección siguen operando sobre
  // `gastos` completo, para que filtrar la vista no altere ningún número.
  const gastosVisibles  = soloDescuentos ? gastos.filter(m => Number(m.descuento) > 0) : gastos;
  const hayDescuentos   = gastos.some(m => Number(m.descuento) > 0);
  const totalDescuentos = gastos.reduce((s, m) => s + (Number(m.descuento) || 0), 0);
  // Ingresos que cuentan para el saldo del día: manuales + abonos espejados +
  // cobros de deuda YA confirmados (confirmado === false = todavía no entró la plata).
  const ingresosDia   = movs.filter(m => m.tipo === 'ingreso_extra' && m.confirmado !== false);

  // --- Selección múltiple de gastos ---
  // Seleccionables: gastos de proveedores y cobros de deuda (ambos confirmables).
  const selectedGastos = [...gastos, ...deudasCobro].filter(m => selectedIds.has(m.id));
  const selTotal       = selectedGastos.reduce((s, m) => s + m.monto, 0);
  // Subrubros distintos involucrados en la selección (para el panel de resumen).
  const selSubNames    = [...new Set(selectedGastos.map(m => subrubroDe(m)?.nombre).filter(Boolean))];
  const allGastosSelected = gastos.length > 0 && gastos.every(m => selectedIds.has(m.id));
  const selectAllGastos   = () => setSelectedIds(prev => new Set([...prev, ...gastos.map(m => m.id)]));
  const allDeudasSelected = deudasCobro.length > 0 && deudasCobro.every(m => selectedIds.has(m.id));
  const selectAllDeudas   = () => setSelectedIds(prev => new Set([...prev, ...deudasCobro.map(m => m.id)]));

  // Marca como pagados/cobrados (confirma) todos los ítems seleccionados que estén
  // sin confirmar y tengan método definido. Reusa la confirmación individual para
  // mantener la misma lógica (crea el pago/abono en el subrubro si corresponde).
  const bulkConfirmSeleccionados = async () => {
    const aConfirmar = selectedGastos.filter(m => m.confirmado === false && m.metodo);
    const sinMetodo  = selectedGastos.filter(m => m.confirmado === false && !m.metodo).length;
    if (aConfirmar.length === 0) {
      toast.error(sinMetodo ? 'Definí el método de pago en los ítems seleccionados' : 'No hay pendientes para confirmar');
      return;
    }
    for (const m of aConfirmar) await handleConfirmarGasto(m);
    clearSelection();
    if (sinMetodo) toast('Se saltearon ' + sinMetodo + ' sin método definido', { icon: '⚠️' });
  };

  const disponibleEfvo  = saldoInicial
    + empleados.filter(m => m.metodo === 'efectivo').reduce((s,m) => s+m.monto,0)
    + ingresosDia.filter(m => m.metodo === 'efectivo').reduce((s,m) => s+m.monto,0);

  const disponibleTrans = saldoCuentaHoy !== null
  ? saldoCuentaHoy
  : empleados.filter(m => m.metodo === 'transferencia').reduce((s,m) => s+m.monto,0)
    + ingresosDia.filter(m => m.metodo === 'transferencia').reduce((s,m) => s+m.monto,0);

  // Solo los gastos confirmados (confirmado !== false) descuentan de la caja
  const gastosEfvo  = gastos.filter(m => m.metodo === 'efectivo'       && m.confirmado !== false).reduce((s,m) => s+m.monto,0);
  const gastosTrans = gastos.filter(m => m.metodo === 'transferencia'  && m.confirmado !== false).reduce((s,m) => s+m.monto,0);
  const sinConfirmarEfvo  = gastos.filter(m => m.metodo === 'efectivo'      && m.confirmado === false).reduce((s,m) => s+m.monto,0);
  const sinConfirmarTrans = gastos.filter(m => m.metodo === 'transferencia' && m.confirmado === false).reduce((s,m) => s+m.monto,0);
  // Misma cuenta que hace ResumenMetodo (`restante`). Se calcula acá porque el
  // atajo de arriba muestra el resultado sin montar la card.
  const restaEfvo  = disponibleEfvo  - gastosEfvo;
  const restaTrans = disponibleTrans - gastosTrans;
  const vencEfvo    = vencimientos.filter(v => v.metodo_pago !== 'transferencia');
  const vencTrans   = vencimientos.filter(v => v.metodo_pago === 'transferencia');

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
      {/* Navegación de fecha. En mobile la fecha va sola en su fila y las acciones
          debajo: no entran los 6 botones más la fecha larga en 360px de ancho. */}
      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
        <button onClick={() => setFecha(addDays(fecha, -1))} aria-label="Día anterior"
          className="w-11 h-11 sm:w-auto sm:h-auto sm:p-2 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 shrink-0">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <button
            onClick={() => { try { dateInputRef.current?.showPicker(); } catch { dateInputRef.current?.click(); } }}
            className="min-h-11 sm:min-h-0 font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-500 dark:hover:text-blue-400 transition-colors max-w-full truncate"
          >
            <span className="sm:hidden">{formatFechaMobile(fecha)}</span>
            <span className="hidden sm:inline">{formatFecha(fecha)}</span>
          </button>
          {fecha !== todayStr() && (
            <button onClick={() => setFecha(todayStr())} className="text-xs text-blue-500 hover:underline block mx-auto -mt-1 sm:mt-0 pb-1">Ir a hoy</button>
          )}
        </div>
        <button onClick={() => setFecha(addDays(fecha, 1))} aria-label="Día siguiente"
          className="w-11 h-11 sm:w-auto sm:h-auto sm:p-2 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 shrink-0">
          <ChevronRight size={20} />
        </button>
        <input ref={dateInputRef} type="date" value={fecha}
          onChange={e => setFecha(e.target.value)}
          className="sr-only" />
        {/* Cuatro íconos sueltos no se entienden: en mobile cada uno lleva su
            etiqueta debajo y se reparten el ancho. En `sm:` vuelven a ser íconos
            con `title`, que ahí sí hay hover. */}
        <div className="flex items-stretch justify-end gap-1 sm:gap-2 w-full sm:w-auto">
          <button
            onClick={() => setOcultarSaldos(v => !v)}
            className={toolbarBtn}
            title={ocultarSaldos ? 'Mostrar saldos' : 'Ocultar saldos'}>
            {ocultarSaldos ? <EyeOff size={18} /> : <Eye size={18} />}
            <span className={toolbarLbl}>{ocultarSaldos ? 'Mostrar' : 'Ocultar'}</span>
          </button>
          <button onClick={refrescarTodo} disabled={refreshing}
            className={`${toolbarBtn} disabled:opacity-50`} title="Refrescar ahora (sincroniza pagos y vencimientos)">
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            <span className={toolbarLbl}>Refrescar</span>
          </button>
          <button onClick={() => setShowExport(true)}
            className={`${toolbarBtn} hover:text-emerald-600 dark:hover:text-emerald-400`} title="Exportar mes a Excel">
            <FileSpreadsheet size={18} />
            <span className={toolbarLbl}>Excel</span>
          </button>
          <button onClick={() => setShowConfig(true)}
            className={toolbarBtn} title="Configurar empleados y proveedores">
            <Settings size={18} />
            <span className={toolbarLbl}>Ajustes</span>
          </button>
        </div>
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
                className="shrink-0 min-h-11 sm:min-h-0 -my-2 sm:my-0 px-1 text-xs text-blue-500 hover:underline flex items-center gap-1">
                <Pencil size={11} /> {saldoMov ? 'Editar' : 'Ajustar'}
              </button>
            )}
          </div>
          {editandoSaldo ? (
            <div ref={saldoEditRef} className="flex gap-2 mt-3">
              <input type="number" inputMode="decimal" min="0" step="any" className={inputCls} placeholder="Saldo del día anterior"
                value={saldoInput} onChange={e => setSaldoInput(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaldoInicial()} />
              <button onClick={handleSaldoInicial} className="shrink-0 min-w-11 min-h-11 sm:min-h-0 bg-blue-600 text-white px-3 rounded-lg text-sm font-medium hover:bg-blue-700">OK</button>
              <button onClick={() => setEditandoSaldo(false)} aria-label="Cancelar" className="shrink-0 min-w-11 min-h-11 sm:min-h-0 text-slate-400 hover:text-slate-600 px-2">✕</button>
            </div>
          ) : (
            <div className="mt-1">
              <p className={`text-2xl font-bold ${saldoInicial ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                {ocultarSaldos ? '••••••' : (saldoInicial ? fmt(saldoInicial) : '—')}
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
                className="shrink-0 min-h-11 sm:min-h-0 -my-2 sm:my-0 px-1 text-xs text-blue-500 hover:underline flex items-center gap-1">
                <Pencil size={11} /> {saldoCuentaMov ? 'Editar' : 'Ingresar'}
              </button>
            )}
          </div>
          {editandoSaldoCuenta ? (
            <div ref={saldoCuentaEditRef} className="flex gap-2 mt-3">
              <input type="number" inputMode="decimal" min="0" step="any" className={inputCls} placeholder="Saldo actual en cuenta"
                value={saldoCuentaInput} onChange={e => setSaldoCuentaInput(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaldoCuenta()} />
              <button onClick={handleSaldoCuenta} className="shrink-0 min-w-11 min-h-11 sm:min-h-0 bg-blue-600 text-white px-3 rounded-lg text-sm font-medium hover:bg-blue-700">OK</button>
              <button onClick={() => setEditandoSaldoCuenta(false)} aria-label="Cancelar" className="shrink-0 min-w-11 min-h-11 sm:min-h-0 text-slate-400 hover:text-slate-600 px-2">✕</button>
            </div>
          ) : (
            <div className="mt-1">
              <p className={`text-2xl font-bold ${saldoCuentaHoy !== null ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                {ocultarSaldos ? '••••••' : (saldoCuentaHoy !== null ? fmt(saldoCuentaHoy) : '—')}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">🏦 Transferencia</span>
                {ingresoTransDia !== null ? (
                  <span className={`text-xs font-medium ${ingresoTransDia >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                    {ingresoTransDia >= 0 ? '↑' : '↓'} {ocultarSaldos ? '••••' : (pctTransDia !== null ? `${Math.abs(pctTransDia).toFixed(1)}%` : fmt(Math.abs(ingresoTransDia)))} vs. día anterior
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

      {/* Atajo al resumen. El detalle vive al final, que es donde corresponde:
          es el total de los gastos que están más abajo, y un total arriba de lo
          que suma se lee al revés. Lo que sí estaba mal era el alcance —"¿cuánto
          me queda?" es la pregunta con la que se entra a la Caja y quedaba a
          nueve gastos de scroll—, así que se adelanta solo la línea de fondo.
          Tocarla baja al detalle. Mobile únicamente: en desktop las dos columnas
          dejan el resumen a la vista sin esto. */}
      <button
        onClick={() => resumenRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className="sm:hidden w-full flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-left active:bg-slate-50 dark:active:bg-slate-700/40 transition-colors"
      >
        <span className="flex-1 min-w-0 space-y-1">
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Banknote size={12} className="text-green-600 shrink-0" /> Resta efectivo
            </span>
            <span className={`text-sm font-bold tabular-nums ${restaEfvo >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600'}`}>
              {fmt(restaEfvo)}
            </span>
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ArrowLeftRight size={12} className="text-blue-600 shrink-0" /> Resta transferencia
            </span>
            <span className={`text-sm font-bold tabular-nums ${restaTrans >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600'}`}>
              {fmt(restaTrans)}
            </span>
          </span>
        </span>
        <ChevronDown size={16} className="text-slate-400 shrink-0" />
      </button>

      {/* Ingresos extra */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Plus size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ingresos extra</h3>
            {ingresosExtra.length > 0 && <span className="text-xs text-slate-400">{fmt(ingresosExtra.reduce((s,m) => s+m.monto,0))}</span>}
          </div>
          <button onClick={() => openForm('ingreso_extra')} className="min-h-11 sm:min-h-0 px-1.5 -mr-1.5 text-xs text-blue-500 hover:underline flex items-center gap-1 shrink-0"><Plus size={13} /> Agregar</button>
        </div>
        {/* La edición de un cobro de deuda (ingreso con movimiento_id) se renderiza
            en la sección "Deudas por cobrar", no acá. */}
        {showForm && (tipoForm === 'ingreso_extra' || (editingMov?.tipo === 'ingreso_extra' && editingMov?.movimiento_id == null)) && (
          <div className="mb-2"><EntryForm {...formProps} initial={editingMov} tipoForzado={editingMov ? null : 'ingreso_extra'} /></div>
        )}
        {ingresosExtra.map(m => (
          <div key={m.id} className="mb-1.5 sm:mb-2">
            {/* Abono de deuda espejado desde un subrubro (origen 'subrubro'): verde y
                con acceso directo al subrubro de origen. Ingreso manual: ámbar. */}
            {editingMov?.id === m.id && showForm ? null : (
              <MovRow
                m={m}
                onEdit={handleEdit}
                onDelete={handleDelete}
                colorMonto={m.origen === 'subrubro' ? 'text-green-600' : 'text-amber-600'}
                subrubro={m.origen === 'subrubro' ? subrubroDe(m) : null}
                onGoToSubrubro={onNavigate ? handleGoToSubrubro : undefined}
              />
            )}
          </div>
        ))}
      </div>

      {/* Empleados */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <button type="button" onClick={() => setEmpleadosOpen(v => !v)}
            className="flex items-center gap-2 min-h-11 sm:min-h-0 text-left flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <Users size={14} className="text-green-600 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cajas empleados</h3>
            {empleados.length > 0 && <span className="text-xs text-slate-400">{fmt(empleados.reduce((s,m) => s+m.monto,0))}</span>}
            {!empleadosOpen && empleados.length > 0 && (
              <span className="text-xs text-slate-400 dark:text-slate-500">· {empleados.length}</span>
            )}
            <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${empleadosOpen ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={() => { setEmpleadosOpen(true); openForm('empleado'); }} className="min-h-11 sm:min-h-0 px-1.5 -mr-1.5 text-xs text-blue-500 hover:underline flex items-center gap-1 shrink-0 ml-2"><Plus size={13} /> Agregar</button>
        </div>
        {empleadosOpen && (
          <>
            {showForm && (tipoForm === 'empleado' || editingMov?.tipo === 'empleado') && (
              <div className="mb-2"><EntryForm {...formProps} initial={editingMov} tipoForzado={editingMov ? null : 'empleado'} /></div>
            )}
            {empleados.length === 0 && !(showForm && tipoForm === 'empleado') && (
              <p className="text-xs text-slate-400 py-2 text-center">Sin empleados cargados</p>
            )}
            {empleados.map(m => (
              <div key={m.id} className="mb-1.5 sm:mb-2">
                {editingMov?.id === m.id && showForm ? null : <MovRow m={m} onEdit={handleEdit} onDelete={handleDelete} colorMonto="text-green-600" />}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Gastos / Proveedores */}
      <div>
        {/* Título en su propia fila a ancho completo; monto y acciones abajo.
            En una sola fila el que cedía ancho era el título ("Gas...") mientras
            "Seleccionar todos" se quedaba entero — al revés de la prioridad. En
            `sm:` entra todo en una línea y vuelve al layout de antes. */}
        <div className="mb-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-y-1">
          <button type="button" onClick={() => setGastosOpen(v => !v)}
            className="w-full sm:w-auto flex items-center gap-2 min-h-11 sm:min-h-0 text-left sm:flex-1 sm:min-w-0 hover:opacity-80 transition-opacity">
            <ShoppingCart size={14} className="text-slate-400 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 sm:truncate">Gastos y proveedores</h3>
            <span className="hidden sm:contents">
              {gastos.length > 0 && <span className="text-xs text-slate-400">{fmt(gastos.reduce((s,m) => s+m.monto,0))}</span>}
              {!gastosOpen && gastos.length > 0 && (
                <span className="text-xs text-slate-400 dark:text-slate-500">· {gastos.length}</span>
              )}
            </span>
            <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ml-auto sm:ml-0 ${gastosOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex items-center gap-2 sm:contents">
            {/* El total solo en mobile: en `sm:` ya va pegado al título. */}
            {gastos.length > 0 && (
              <span className="sm:hidden text-xs text-slate-400 tabular-nums">
                {fmt(gastos.reduce((s,m) => s+m.monto,0))} · {gastos.length}
              </span>
            )}
            {hayDescuentos && (
              <button onClick={() => setSoloDescuentos(v => !v)}
                title={soloDescuentos ? 'Mostrar todos los pagos' : `Ver solo los pagos con descuento (${fmt(totalDescuentos)} descontados hoy)`}
                className={`text-xs shrink-0 sm:ml-2 px-1.5 py-0.5 rounded-full flex items-center gap-1 transition-colors ${
                  soloDescuentos
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40'
                }`}>
                <Percent size={10} /> {fmt(totalDescuentos)}
              </button>
            )}
            {gastos.length > 0 && (
              <button onClick={allGastosSelected ? clearSelection : selectAllGastos}
                className="min-h-11 sm:min-h-0 px-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:underline shrink-0 ml-auto sm:ml-2">
                {allGastosSelected ? 'Quitar selección' : 'Seleccionar todos'}
              </button>
            )}
            <button onClick={() => { setGastosOpen(true); openForm('gasto'); }} className="min-h-11 sm:min-h-0 px-1.5 -mr-1.5 text-xs text-blue-500 hover:underline flex items-center gap-1 shrink-0 sm:ml-2"><Plus size={13} /> Agregar</button>
          </div>
        </div>
        {gastosOpen && (
          <>
            {showForm && (tipoForm === 'gasto' || editingMov?.tipo === 'gasto') && (
              <div className="mb-2"><EntryForm {...formProps} initial={editingMov} tipoForzado={editingMov ? null : 'gasto'} /></div>
            )}
            {gastos.length === 0 && !(showForm && tipoForm === 'gasto') && (
              <p className="text-xs text-slate-400 py-2 text-center">Sin gastos cargados</p>
            )}
            {/* Agrupados por método (transferencias → efectivo → sin método) y dentro
                de cada grupo alfabéticamente por proveedor/concepto. */}
            {agruparPorMetodo(gastosVisibles, nombreProveedor).map(grupo => (
              <div key={grupo.key ?? 'sin-metodo'} className="mb-3">
                <GrupoHeader grupo={grupo} />
                {grupo.items.map(m => (
                  <div key={m.id} className="mb-1.5 sm:mb-2">
                    {editingMov?.id === m.id && showForm ? null : <MovRow m={m} onEdit={handleEdit} onDelete={handleDelete} onConfirmar={handleConfirmarGasto} colorMonto="text-red-500" confirming={confirmingId === m.id} subrubro={subrubroDe(m)} onGoToSubrubro={onNavigate ? handleGoToSubrubro : undefined} selectable selected={selectedIds.has(m.id)} onToggleSelect={toggleSelection} hideMetodo aplicaDescuento={!!subrubroDe(m)?.aplica_descuento} />}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Deudas por cobrar — ingresos pendientes de cobro sincronizados desde los
          subrubros DEUDA. Mismo flujo que los gastos: seleccionar varias, confirmar
          con ✓ (registra el abono en el subrubro y suma a los ingresos del día). */}
      {(deudasCobro.length > 0 || (showForm && editingMov?.tipo === 'ingreso_extra' && editingMov?.movimiento_id != null)) && (
        <div>
          {/* Mismo criterio que "Gastos y proveedores": título a ancho completo
              en mobile, monto y acciones en la fila siguiente. */}
          <div className="mb-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-y-1">
            <button type="button" onClick={() => setDeudasOpen(v => !v)}
              className="w-full sm:w-auto flex items-center gap-2 min-h-11 sm:min-h-0 text-left sm:flex-1 sm:min-w-0 hover:opacity-80 transition-opacity">
              <HandCoins size={14} className="text-slate-400 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 sm:truncate">Deudas por cobrar</h3>
              <span className="hidden sm:contents">
                {deudasCobro.length > 0 && <span className="text-xs text-slate-400">{fmt(deudasCobro.reduce((s, m) => s + m.monto, 0))}</span>}
                {!deudasOpen && deudasCobro.length > 0 && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">· {deudasCobro.length}</span>
                )}
              </span>
              <InfoTooltip text="Plata que te deben, vencida o por vencer. Al confirmar el cobro con ✓ se registra el abono en el subrubro y el monto se suma a los ingresos del día bajo su método." />
              <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ml-auto sm:ml-0 ${deudasOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex items-center gap-2 sm:contents">
              {deudasCobro.length > 0 && (
                <span className="sm:hidden text-xs text-slate-400 tabular-nums">
                  {fmt(deudasCobro.reduce((s, m) => s + m.monto, 0))} · {deudasCobro.length}
                </span>
              )}
              {deudasCobro.length > 0 && (
                <button onClick={allDeudasSelected ? clearSelection : selectAllDeudas}
                  className="min-h-11 sm:min-h-0 px-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:underline shrink-0 ml-auto sm:ml-2">
                  {allDeudasSelected ? 'Quitar selección' : 'Seleccionar todas'}
                </button>
              )}
            </div>
          </div>
          {deudasOpen && (
            <>
              {showForm && editingMov?.tipo === 'ingreso_extra' && editingMov?.movimiento_id != null && (
                <div className="mb-2"><EntryForm {...formProps} initial={editingMov} /></div>
              )}
              {agruparPorMetodo(deudasCobro, nombreProveedor).map(grupo => (
                <div key={grupo.key ?? 'sin-metodo'} className="mb-3">
                  <GrupoHeader grupo={grupo} />
                  {grupo.items.map(m => (
                    <div key={m.id} className="mb-1.5 sm:mb-2">
                      {editingMov?.id === m.id && showForm ? null : (
                        <MovRow
                          m={m}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onConfirmar={handleConfirmarGasto}
                          colorMonto="text-orange-500"
                          confirming={confirmingId === m.id}
                          subrubro={subrubroDe(m)}
                          onGoToSubrubro={onNavigate ? handleGoToSubrubro : undefined}
                          selectable
                          selected={selectedIds.has(m.id)}
                          onToggleSelect={toggleSelection}
                          hideMetodo
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Resumen — al final, después de los gastos que suma. El acceso rápido
          está arriba (botón "Resta efectivo / Resta transferencia"). */}
      <div ref={resumenRef} className="grid grid-cols-1 sm:grid-cols-2 gap-3 scroll-mt-20">
        <ResumenMetodo label="Efectivo" icon={Banknote} color="text-green-600"
          disponible={disponibleEfvo} gastos={gastosEfvo} sinConfirmar={sinConfirmarEfvo} vencimientos={vencEfvo} />
        <ResumenMetodo label="Transferencia" icon={ArrowLeftRight} color="text-blue-600"
          disponible={disponibleTrans} gastos={gastosTrans} sinConfirmar={sinConfirmarTrans} vencimientos={vencTrans}
          labelDisponible={ingresoTransDia !== null ? 'Ingreso del día' : 'Disponible'} />
      </div>

      {showExport && <CajaExportModal onClose={() => setShowExport(false)} />}

      {showConfig && (
        <ConfigPanel config={config} rubros={allSubrubros} allRubros={rubros} onSave={handleSaveConfig} onClose={() => setShowConfig(false)} />
      )}

      {deleteId !== null && (
        <ConfirmModal
          message="¿Estás seguro de que querés eliminar este pago? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {selectedGastos.length > 0 && (
        <SeleccionPanel
          total={selTotal}
          count={selectedGastos.length}
          subNames={selSubNames}
          onClear={clearSelection}
          onConfirmar={bulkConfirmSeleccionados}
        />
      )}
    </div>
  );
}

// Panel flotante de resumen de la selección múltiple de gastos: total acumulado,
// cantidad y subrubro(s) involucrado(s). Acciones: marcar como pagados / limpiar.
function SeleccionPanel({ total, count, subNames, onClear, onConfirmar }) {
  const subLabel = subNames.length === 0
    ? 'Sin subrubro'
    : subNames.length === 1
      ? subNames[0]
      : `Múltiples (${subNames.length})`;
  return (
    // En mobile sube por encima de la bottom nav; en desktop conserva su posición
    // de siempre. El offset sale de `.bottom-above-nav` (index.css), que se apoya
    // en el mismo --bottomnav-h que usa la barra: si cambia el alto, se mueven las dos.
    <div className="fixed bottom-above-nav left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-lg">
      <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-2xl ring-1 ring-white/10 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Total seleccionado</span>
            <span className="text-lg font-bold text-green-400 tabular-nums">{fmt(total)}</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">
            {count} {count === 1 ? 'mov.' : 'movs.'} · <span className="text-slate-200">{subLabel}</span>
          </div>
        </div>
        <button onClick={onConfirmar}
          className="text-xs font-medium px-3 min-h-11 sm:min-h-0 sm:py-1.5 rounded-lg bg-green-600 hover:bg-green-500 transition-colors shrink-0 flex items-center gap-1">
          <Check size={14} /> <span className="hidden sm:inline">Marcar </span>pagados
        </button>
        <button onClick={onClear} title="Limpiar selección" aria-label="Limpiar selección"
          className="w-11 h-11 sm:w-auto sm:h-auto flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
