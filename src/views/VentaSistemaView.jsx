import { useState, useEffect, useCallback } from 'react';
import { registroApi, getErrorMsg } from '../api';
import ConfirmModal from '../components/ConfirmModal';
import VentaSistemaGraficosModal from '../components/VentaSistemaGraficosModal';
import InfoTooltip from '../components/InfoTooltip';
import { Plus, Pencil, Trash2, Check, X, ChevronLeft, ChevronRight, BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => (n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const labelMes = (mes) => {
  if (!mes) return '';
  const [y, m] = mes.split('-');
  return `${MESES[Number(m) - 1]} ${y}`;
};
const hoy = () => new Date().toISOString().slice(0, 10);
const mesActual = () => new Date().toISOString().slice(0, 7);
const shiftMes = (mes, d) => {
  const [y, m] = mes.split('-').map(Number);
  const dt = new Date(y, m - 1 + d, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

export default function VentaSistemaView({ role }) {
  const isViewer = role === 'viewer';
  const [mes, setMes] = useState(mesActual());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGraficos, setShowGraficos] = useState(false);
  const [confirm, setConfirm] = useState(null);

  // Alta
  const [fecha, setFecha] = useState(hoy());
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [saving, setSaving] = useState(false);

  // Edición inline
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({ fecha: '', monto: '', concepto: '' });

  const cargar = useCallback(async () => {
    try {
      setData(await registroApi.ventas.getMes(mes));
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  }, [mes]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!monto || Number(monto) <= 0) { toast.error('Ingresá un monto mayor a 0'); return; }
    setSaving(true);
    try {
      await registroApi.ventas.create({ fecha, monto, concepto });
      setMonto(''); setConcepto('');
      // Si la venta cae en otro mes, saltamos a ese mes para que el usuario la vea.
      const mesVenta = fecha.slice(0, 7);
      if (mesVenta !== mes) setMes(mesVenta); else await cargar();
      toast.success('Venta registrada');
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (v) => {
    setEditId(v.id);
    setEdit({ fecha: v.fecha, monto: String(v.monto ?? ''), concepto: v.concepto || '' });
  };

  const saveEdit = async () => {
    if (!edit.monto || Number(edit.monto) <= 0) { toast.error('Ingresá un monto mayor a 0'); return; }
    try {
      await registroApi.ventas.update(editId, edit);
      setEditId(null);
      await cargar();
      toast.success('Venta actualizada');
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const handleDelete = (v) => setConfirm({
    message: `¿Eliminar la venta del ${v.fecha} por ${fmt(v.monto)}?`,
    onConfirm: async () => {
      try {
        await registroApi.ventas.delete(v.id);
        setConfirm(null);
        await cargar();
        toast.success('Venta eliminada');
      } catch (err) { toast.error(getErrorMsg(err)); setConfirm(null); }
    },
  });

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando…</div>;

  const { total = 0, mes_anterior = {}, comparativa = {}, stats = {}, ventas = [] } = data || {};
  const ventasDelDia = ventas.filter(v => v.fecha === fecha);
  const totalDia = ventasDelDia.reduce((s, v) => s + (v.monto || 0), 0);
  const sube = (comparativa.diferencia || 0) > 0;
  const igual = (comparativa.diferencia || 0) === 0;

  const inputCls = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      {showGraficos && <VentaSistemaGraficosModal data={data} onClose={() => setShowGraficos(false)} />}

      {/* Navegador de mes + gráficos */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center h-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-hidden">
          <button onClick={() => setMes(shiftMes(mes, -1))} title="Mes anterior"
            className="h-full px-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <ChevronLeft size={15} />
          </button>
          <div className="relative h-full flex items-center justify-center border-x border-slate-300 dark:border-slate-600 px-3 min-w-36 cursor-pointer">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{labelMes(mes)}</span>
            <input type="month" value={mes} onChange={e => e.target.value && setMes(e.target.value)} title="Elegir mes"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
          <button onClick={() => setMes(shiftMes(mes, 1))} title="Mes siguiente"
            className="h-full px-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>

        <button onClick={() => setShowGraficos(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40">
          <BarChart3 size={14} /> Ver gráficos
        </button>
      </div>

      {/* Resumen del mes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label={labelMes(mes)} value={fmt(total)} tone="blue" hint={`${stats.cantidad || 0} ventas`} />
        <Card label={labelMes(mes_anterior.mes)} value={fmt(mes_anterior.total)} hint="Mes anterior" />
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
          {/* div, no <p>: InfoTooltip renderiza un <div> y anidarlo en <p> rompe el HTML. */}
          <div className="text-xs text-slate-400 flex items-center gap-1">
            Diferencia
            <InfoTooltip text="Variación contra el mes anterior. El porcentaje no se muestra si el mes anterior cerró en cero." />
          </div>
          <p className={`text-lg font-semibold ${igual ? 'text-slate-500' : sube ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {fmt(comparativa.diferencia)}
          </p>
          <p className="text-xs flex items-center gap-1 text-slate-400">
            {igual ? <Minus size={12} /> : sube ? <TrendingUp size={12} className="text-green-500" /> : <TrendingDown size={12} className="text-red-500" />}
            {comparativa.porcentaje === null || comparativa.porcentaje === undefined
              ? 'Sin base de comparación'
              : `${comparativa.porcentaje > 0 ? '+' : ''}${comparativa.porcentaje.toFixed(1)}%`}
          </p>
        </div>
        <Card label="Promedio diario" value={fmt(stats.promedio_diario)} hint={`${stats.dias_con_ventas || 0} días con ventas`} />
      </div>

      {/* Alta */}
      {!isViewer && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Monto</label>
              <input type="number" min="0" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Concepto (opcional)</label>
              <input type="text" value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Detalle" className={inputCls} />
            </div>
            <button type="submit" disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-40">
              <Plus size={15} /> {saving ? 'Guardando…' : 'Agregar'}
            </button>
          </div>
        </form>
      )}

      {/* Ventas del día seleccionado */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40">
          <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">Ventas del {fecha}</span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {fmt(totalDia)} <span className="text-xs font-normal text-slate-400">({ventasDelDia.length})</span>
          </span>
        </div>
        {ventasDelDia.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Sin ventas cargadas para este día.</p>
        ) : (
          <Tabla ventas={ventasDelDia} isViewer={isViewer} editId={editId} edit={edit} setEdit={setEdit}
            onStartEdit={startEdit} onSaveEdit={saveEdit} onCancelEdit={() => setEditId(null)} onDelete={handleDelete} />
        )}
      </div>

      {/* Todas las ventas del mes */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40">
          <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{labelMes(mes)} — todas las ventas</span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {fmt(total)} <span className="text-xs font-normal text-slate-400">({ventas.length})</span>
          </span>
        </div>
        {ventas.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Todavía no hay ventas cargadas en {labelMes(mes)}.</p>
        ) : (
          <Tabla ventas={[...ventas].sort((a, b) => b.fecha.localeCompare(a.fecha))} isViewer={isViewer}
            editId={editId} edit={edit} setEdit={setEdit}
            onStartEdit={startEdit} onSaveEdit={saveEdit} onCancelEdit={() => setEditId(null)} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}

function Card({ label, value, hint, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-700 dark:text-slate-200',
    blue: 'text-blue-600 dark:text-blue-400',
  };
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${tones[tone]}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Tabla({ ventas, isViewer, editId, edit, setEdit, onStartEdit, onSaveEdit, onCancelEdit, onDelete }) {
  const cellInput = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500';
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-slate-400 text-xs">
          <tr>
            <th className="text-left px-4 py-1.5 font-medium w-36">Fecha</th>
            <th className="text-left px-4 py-1.5 font-medium">Concepto</th>
            <th className="text-right px-4 py-1.5 font-medium w-36">Monto</th>
            <th className="w-20"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {ventas.map(v => editId === v.id ? (
            <tr key={v.id} className="bg-blue-50/50 dark:bg-blue-900/10">
              <td className="px-4 py-1.5">
                <input type="date" value={edit.fecha} onChange={e => setEdit(p => ({ ...p, fecha: e.target.value }))} className={cellInput} />
              </td>
              <td className="px-4 py-1.5">
                <input type="text" value={edit.concepto} onChange={e => setEdit(p => ({ ...p, concepto: e.target.value }))} placeholder="Detalle" className={cellInput} />
              </td>
              <td className="px-4 py-1.5">
                <input type="number" min="0" step="0.01" value={edit.monto} onChange={e => setEdit(p => ({ ...p, monto: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit(); }}
                  className={`${cellInput} text-right`} autoFocus />
              </td>
              <td className="px-2 py-1.5">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={onSaveEdit} title="Guardar" className="text-green-500 hover:text-green-600"><Check size={15} /></button>
                  <button onClick={onCancelEdit} title="Cancelar" className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
                </div>
              </td>
            </tr>
          ) : (
            <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 group">
              <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{v.fecha}</td>
              <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{v.concepto || <span className="text-slate-400">—</span>}</td>
              <td className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmt(v.monto)}</td>
              <td className="px-2 py-2">
                {!isViewer && (
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => onStartEdit(v)} title="Editar" className="text-slate-300 hover:text-blue-500"><Pencil size={13} /></button>
                    <button onClick={() => onDelete(v)} title="Eliminar" className="text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
