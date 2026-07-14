import { useState, useEffect, useCallback } from 'react';
import { registroApi, cajaApi, getErrorMsg } from '../api';
import ConfirmModal from '../components/ConfirmModal';
import InfoTooltip from '../components/InfoTooltip';
import TarjetasGraficosModal from '../components/TarjetasGraficosModal';
import {
  QrCode, CreditCard, Landmark, Ticket, Plus, Pencil, Trash2, Check, X, Users, BarChart3,
  ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => (n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hoy = () => new Date().toISOString().slice(0, 10);
const shiftDia = (fecha, d) => {
  const dt = new Date(`${fecha}T12:00:00`);
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
};
const shiftMes = (mes, d) => {
  const [y, m] = mes.split('-').map(Number);
  const dt = new Date(y, m - 1 + d, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

// Las 4 columnas fijas. `color` se usa en el gráfico apilado y en los acentos de las cards.
const TIPOS = [
  { key: 'qr',      label: 'Pagos QR',        Icon: QrCode,     color: '#8b5cf6', text: 'text-violet-600 dark:text-violet-400',   bg: 'bg-violet-50 dark:bg-violet-900/20',   border: 'border-violet-200 dark:border-violet-800' },
  { key: 'debito',  label: 'Tarjeta Débito',  Icon: CreditCard, color: '#3b82f6', text: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-900/20',       border: 'border-blue-200 dark:border-blue-800' },
  { key: 'credito', label: 'Tarjeta Crédito', Icon: Landmark,   color: '#f59e0b', text: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-900/20',     border: 'border-amber-200 dark:border-amber-800' },
  { key: 'prepaga', label: 'Tarjeta Prepaga', Icon: Ticket,     color: '#10b981', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
];
const tipoDef = (key) => TIPOS.find(t => t.key === key) || TIPOS[0];

const inputCls = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500';
const cellInput = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500';

export default function TarjetasView({ role }) {
  const isViewer = role === 'viewer';
  const [fecha, setFechaState] = useState(hoy());
  const [mes, setMes] = useState(hoy().slice(0, 7));
  const [dia, setDia] = useState(null);
  const [mesData, setMesData] = useState(null);
  const [empleados, setEmpleados] = useState([]); // lista de la config de Caja
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [expandido, setExpandido] = useState(null); // tipo con el detalle abierto
  const [showMensual, setShowMensual] = useState(false);

  // Elegir un día lleva el resumen mensual a ese mes (evita tener dos navegadores desfasados).
  const setFecha = (f) => { setFechaState(f); setMes(f.slice(0, 7)); };

  // Alta
  const [form, setForm] = useState({ tipo: 'qr', monto: '', empleado: '' });
  const [empleadoOtro, setEmpleadoOtro] = useState(false); // true = escribir a mano
  const [saving, setSaving] = useState(false);

  // Edición inline
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({ tipo: 'qr', fecha: '', monto: '', empleado: '' });

  const cargar = useCallback(async () => {
    try {
      const [d, m] = await Promise.all([
        registroApi.tarjetas.getDia(fecha),
        registroApi.tarjetas.getMes(mes),
      ]);
      setDia(d); setMesData(m);
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  }, [fecha, mes]);

  useEffect(() => { cargar(); }, [cargar]);

  // Empleados: misma lista que la Caja del día (CajaConfig), no una lista propia.
  useEffect(() => {
    cajaApi.getConfig()
      .then(cfg => setEmpleados(cfg?.empleados || []))
      .catch(() => setEmpleados([]));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.monto || Number(form.monto) <= 0) { toast.error('Ingresá un monto mayor a 0'); return; }
    setSaving(true);
    try {
      await registroApi.tarjetas.create({ ...form, fecha });
      setForm(f => ({ ...f, monto: '' })); // conserva tipo y empleado para cargas seguidas
      await cargar();
      toast.success('Ingreso registrado');
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (t) => {
    setEditId(t.id);
    setEdit({ tipo: t.tipo, fecha: t.fecha, monto: String(t.monto ?? ''), empleado: t.empleado || '' });
  };

  const saveEdit = async () => {
    if (!edit.monto || Number(edit.monto) <= 0) { toast.error('Ingresá un monto mayor a 0'); return; }
    try {
      await registroApi.tarjetas.update(editId, edit);
      setEditId(null);
      await cargar();
      toast.success('Ingreso actualizado');
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const handleDelete = (t) => setConfirm({
    message: `¿Eliminar el ingreso de ${tipoDef(t.tipo).label} del ${t.fecha} por ${fmt(t.monto)}?`,
    onConfirm: async () => {
      try {
        await registroApi.tarjetas.delete(t.id);
        setConfirm(null);
        await cargar();
        toast.success('Ingreso eliminado');
      } catch (err) { toast.error(getErrorMsg(err)); setConfirm(null); }
    },
  });

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando…</div>;

  const porTipoDia = dia?.por_tipo || {};
  const totalDia = dia?.total || 0;
  const txsDia = dia?.transacciones || [];
  const porEmpleadoDia = dia?.por_empleado || [];

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      {showMensual && (
        <TarjetasGraficosModal
          data={mesData} tipos={TIPOS} mes={mes}
          onMesChange={(d) => setMes(m => shiftMes(m, d))}
          onClose={() => setShowMensual(false)}
        />
      )}

      {/* Navegador de día */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center h-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-hidden">
          <button onClick={() => setFecha(shiftDia(fecha, -1))} title="Día anterior"
            className="h-full px-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <ChevronLeft size={15} />
          </button>
          <div className="relative h-full flex items-center justify-center border-x border-slate-300 dark:border-slate-600 px-3 min-w-36 cursor-pointer">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{fecha}</span>
            <input type="date" value={fecha} onChange={e => e.target.value && setFecha(e.target.value)} title="Elegir día"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
          <button onClick={() => setFecha(shiftDia(fecha, 1))} title="Día siguiente"
            className="h-full px-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {fecha !== hoy() && (
            <button onClick={() => setFecha(hoy())}
              className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40">
              Ir a hoy
            </button>
          )}
          {/* Registro mensual — se abre en ventana, igual que los gráficos de Venta Sistema */}
          <button onClick={() => setShowMensual(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40">
            <BarChart3 size={14} /> Registro mensual
          </button>
        </div>
      </div>

      {/* 4 columnas del día */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TIPOS.map((def) => {
          const { key, label, text, bg, border } = def;
          const g = porTipoDia[key] || { total: 0, transacciones: 0 };
          const abierto = expandido === key;
          const detalle = txsDia.filter(t => t.tipo === key);
          return (
            <div key={key} className={`rounded-xl border ${border} ${bg} overflow-hidden`}>
              <button onClick={() => setExpandido(abierto ? null : key)} className="w-full text-left px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${text}`}><def.Icon size={14} /> {label}</span>
                  <ChevronDown size={13} className={`text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
                </div>
                <p className={`mt-1 text-lg font-bold ${text}`}>{fmt(g.total)}</p>
                <p className="text-xs text-slate-400">{g.transacciones} {g.transacciones === 1 ? 'ingreso' : 'ingresos'}</p>
              </button>
              {abierto && (
                <div className="border-t border-slate-200/70 dark:border-slate-700/70 bg-white/60 dark:bg-slate-800/40 px-3 py-2 space-y-1">
                  {detalle.length === 0 ? (
                    <p className="text-xs text-slate-400 py-1">Sin cargas para este día.</p>
                  ) : detalle.map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-2 text-xs group">
                      <span className="truncate text-slate-600 dark:text-slate-300">
                        {fmt(t.monto)} <span className="text-slate-400">· {t.empleado || 'Sin asignar'}</span>
                      </span>
                      {!isViewer && (
                        <span className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => startEdit(t)} title="Editar" className="text-slate-300 hover:text-blue-500"><Pencil size={12} /></button>
                          <button onClick={() => handleDelete(t)} title="Eliminar" className="text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total consolidado del día */}
      <div className="flex items-center justify-between bg-slate-900 dark:bg-slate-800 border border-slate-700 rounded-xl px-5 py-4">
        <div className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
          Total consolidado del día
          <InfoTooltip text="Suma bruta de QR, débito, crédito y prepaga. Todavía no descuenta retenciones bancarias." />
        </div>
        <span className="text-2xl font-bold text-white">{fmt(totalDia)}</span>
      </div>

      {/* Alta */}
      {!isViewer && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex justify-end -mt-1 -mr-1">
            <InfoTooltip text={`El ingreso se carga en el día seleccionado arriba (${fecha}). Cambiá el día con el navegador de fechas.`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={inputCls}>
                {TIPOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Monto</label>
              <input type="number" min="0" step="0.01" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                Empleado
                <InfoTooltip text="La lista sale de los empleados cargados en Caja del día → Configuración. Si el nombre no está, elegí “Otro” y escribilo." />
              </label>
              <EmpleadoPicker
                empleados={empleados}
                value={form.empleado}
                otro={empleadoOtro}
                setOtro={setEmpleadoOtro}
                onChange={(v) => setForm(f => ({ ...f, empleado: v }))}
                cls={inputCls}
              />
            </div>
            <button type="submit" disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-40">
              <Plus size={15} /> {saving ? 'Guardando…' : 'Agregar'}
            </button>
          </div>
        </form>
      )}

      {/* Ingresos por empleado (día) */}
      {porEmpleadoDia.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40">
            <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Users size={14} className="text-green-600" /> Ingresos por empleado — {fecha}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="text-slate-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-1.5 font-medium">Empleado</th>
                  {TIPOS.map(t => <th key={t.key} className={`text-right px-4 py-1.5 font-medium ${t.text}`}>{t.label}</th>)}
                  <th className="text-right px-4 py-1.5 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {porEmpleadoDia.map(e => (
                  <tr key={e.empleado} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200">{e.empleado}</td>
                    {TIPOS.map(t => (
                      <td key={t.key} className="px-4 py-2 text-right text-slate-500">{e[t.key] ? fmt(e[t.key]) : '—'}</td>
                    ))}
                    <td className="px-4 py-2 text-right font-semibold text-slate-700 dark:text-slate-200">{fmt(e.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detalle del día */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40">
          <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">Ingresos del {fecha}</span>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(totalDia)} <span className="text-xs font-normal text-slate-400">({txsDia.length})</span></span>
        </div>
        {txsDia.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Sin ingresos cargados para este día.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-1.5 font-medium w-44">Tipo</th>
                  <th className="text-left px-4 py-1.5 font-medium">Empleado</th>
                  <th className="text-right px-4 py-1.5 font-medium w-36">Monto</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {txsDia.map(t => {
                  const def = tipoDef(t.tipo);
                  return editId === t.id ? (
                    <tr key={t.id} className="bg-blue-50/50 dark:bg-blue-900/10">
                      <td className="px-4 py-1.5">
                        <select value={edit.tipo} onChange={e => setEdit(p => ({ ...p, tipo: e.target.value }))} className={cellInput}>
                          {TIPOS.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-1.5">
                        <div className="flex gap-1.5">
                          <input type="date" value={edit.fecha} onChange={e => setEdit(p => ({ ...p, fecha: e.target.value }))} className={cellInput} />
                          <select value={empleados.some(x => x.nombre === edit.empleado) || !edit.empleado ? edit.empleado : '__otro__'}
                            onChange={e => setEdit(p => ({ ...p, empleado: e.target.value === '__otro__' ? '' : e.target.value }))}
                            className={cellInput}>
                            <option value="">— Sin asignar —</option>
                            {empleados.map((x, i) => <option key={i} value={x.nombre}>{x.nombre}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-1.5">
                        <input type="number" min="0" step="0.01" value={edit.monto}
                          onChange={e => setEdit(p => ({ ...p, monto: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null); }}
                          className={`${cellInput} text-right`} autoFocus />
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={saveEdit} title="Guardar" className="text-green-500 hover:text-green-600"><Check size={15} /></button>
                          <button onClick={() => setEditId(null)} title="Cancelar" className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 group">
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${def.text}`}><def.Icon size={13} /> {def.label}</span>
                      </td>
                      <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{t.empleado || <span className="text-slate-400">Sin asignar</span>}</td>
                      <td className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmt(t.monto)}</td>
                      <td className="px-2 py-2">
                        {!isViewer && (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => startEdit(t)} title="Editar" className="text-slate-300 hover:text-blue-500"><Pencil size={13} /></button>
                            <button onClick={() => handleDelete(t)} title="Eliminar" className="text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

// Selector de empleado con la misma mecánica que la Caja del día: lista de la config
// + opción "Otro" para escribir un nombre que no está cargado.
function EmpleadoPicker({ empleados, value, otro, setOtro, onChange, cls }) {
  if (empleados.length === 0 || otro) {
    return (
      <div className="flex gap-1.5">
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder="Nombre del empleado" className={cls} />
        {empleados.length > 0 && (
          <button type="button" onClick={() => { setOtro(false); onChange(''); }} title="Volver a la lista"
            className="px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={15} /></button>
        )}
      </div>
    );
  }
  return (
    <select value={value} className={cls}
      onChange={e => {
        if (e.target.value === '__otro__') { setOtro(true); onChange(''); }
        else onChange(e.target.value);
      }}>
      <option value="">— Sin asignar —</option>
      {empleados.map((e, i) => <option key={i} value={e.nombre}>{e.nombre}</option>)}
      <option value="__otro__">Otro (escribir)</option>
    </select>
  );
}
