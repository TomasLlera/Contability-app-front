import { useState, useEffect, useCallback } from 'react';
import { registroApi, reportesApi, getErrorMsg } from '../api';
import ConfirmModal from '../components/ConfirmModal';
import VentaSistemaGraficosModal from '../components/VentaSistemaGraficosModal';
import RegistroExportModal from '../components/RegistroExportModal';
import InfoTooltip from '../components/InfoTooltip';
import RowActions from '../components/RowActions';
import ComparativaVentasModal from '../components/ComparativaVentasModal';
import { Plus, Pencil, Trash2, Check, X, ChevronLeft, ChevronRight, BarChart3, FileSpreadsheet, Scale, Receipt, FileText, ChevronDown } from 'lucide-react';
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

// Las 2 columnas fijas de la carga. Solo `facturado` genera IVA débito fiscal y es el
// único que entra en la comparativa contra tarjetas. `color` se usa en el gráfico
// apilado del modal de gráficas.
const TIPOS_VENTA = [
  { key: 'ticket',    label: 'Ticket',    Icon: Receipt,  color: '#8b5cf6', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800' },
  { key: 'facturado', label: 'Facturado', Icon: FileText, color: '#3b82f6', text: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20',     border: 'border-blue-200 dark:border-blue-800' },
];
const tipoDef = (key) => TIPOS_VENTA.find(t => t.key === key) || TIPOS_VENTA[0];

export default function VentaSistemaView({ role }) {
  const isViewer = role === 'viewer';
  const [mes, setMes] = useState(mesActual());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGraficos, setShowGraficos] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showComparativa, setShowComparativa] = useState(false);
  const [confirm, setConfirm] = useState(null);

  // Alta. El tipo queda pegado entre cargas: se suelen cargar varios tickets seguidos
  // (o varias facturas), así que rotarlo automáticamente obligaría a corregirlo casi
  // siempre.
  const [tipo, setTipo] = useState('ticket');
  const [fecha, setFecha] = useState(hoy());
  const [monto, setMonto] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandido, setExpandido] = useState(null); // tipo con el detalle del día abierto

  // Edición inline
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({ tipo: 'ticket', fecha: '', monto: '', concepto: '' });

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
      await registroApi.ventas.create({ tipo, fecha, monto });
      setMonto('');
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
    setEdit({ tipo: v.tipo || 'ticket', fecha: v.fecha, monto: String(v.monto ?? ''), concepto: v.concepto || '' });
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
    message: `¿Eliminar la venta de ${tipoDef(v.tipo).label} del ${v.fecha} por ${fmt(v.monto)}?`,
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

  const { ventas = [] } = data || {};
  const ventasDelDia = ventas.filter(v => v.fecha === fecha);
  const totalDia = ventasDelDia.reduce((s, v) => s + (v.monto || 0), 0);
  // Subtotales del día por tipo, derivados del detalle que ya trae el mes (no hay que
  // pedir el día aparte).
  const porTipoDia = Object.fromEntries(TIPOS_VENTA.map(({ key }) => {
    const lista = ventasDelDia.filter(v => (v.tipo || 'ticket') === key);
    return [key, { total: lista.reduce((s, v) => s + (v.monto || 0), 0), cantidad: lista.length, lista }];
  }));

  const inputCls = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      {showGraficos && <VentaSistemaGraficosModal data={data} tipos={TIPOS_VENTA} onClose={() => setShowGraficos(false)} />}
      {showExport && (
        <RegistroExportModal
          titulo="Exportar ventas"
          ayuda="Genera un Excel con el resumen mes a mes (total, cantidad, promedio y comparativa) y el detalle de cada venta."
          mesInicial={mes}
          onExport={reportesApi.ventasSistema}
          onClose={() => setShowExport(false)}
        />
      )}
      {showComparativa && (
        <ComparativaVentasModal mes={mes} onClose={() => setShowComparativa(false)} />
      )}

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

        <div className="flex items-center gap-2">
          <button onClick={() => setShowExport(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40">
            <FileSpreadsheet size={14} /> Exportar Excel
          </button>
          <button onClick={() => setShowComparativa(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40">
            <Scale size={14} /> Comparativa
          </button>
          <button onClick={() => setShowGraficos(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40">
            <BarChart3 size={14} /> Ver gráficos
          </button>
        </div>
      </div>

      {/* El resumen del mes (total, mes anterior, diferencia, promedio) vive en el modal
          de gráficas: acá arriba solo duplicaba lo que ya se ve ahí. */}

      {/* 2 columnas del día: ticket y facturado, con el detalle plegable */}
      <div className="grid grid-cols-2 gap-3">
        {TIPOS_VENTA.map((def) => {
          const { key, label, text, bg, border } = def;
          const g = porTipoDia[key];
          const abierto = expandido === key;
          return (
            <div key={key} className={`rounded-xl border ${border} ${bg} overflow-hidden`}>
              <button onClick={() => setExpandido(abierto ? null : key)} className="w-full text-left px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${text}`}><def.Icon size={14} /> {label}</span>
                  <ChevronDown size={13} className={`text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
                </div>
                <p className={`mt-1 text-lg font-bold ${text}`}>{fmt(g.total)}</p>
                <p className="text-xs text-slate-400">{g.cantidad} {g.cantidad === 1 ? 'venta' : 'ventas'}</p>
              </button>
              {abierto && (
                <div className="border-t border-slate-200/70 dark:border-slate-700/70 bg-white/60 dark:bg-slate-800/40 px-3 py-2 space-y-1">
                  {g.lista.length === 0 ? (
                    <p className="text-xs text-slate-400 py-1">Sin cargas para este día.</p>
                  ) : g.lista.map(v => (
                    <div key={v.id} className="flex items-center justify-between gap-2 text-xs group">
                      {/* El concepto ya no se carga desde el alta: solo se muestra
                          cuando la venta lo tiene (cargas viejas o editadas a mano). */}
                      <span className="truncate text-slate-600 dark:text-slate-300">
                        {fmt(v.monto)}
                        {v.concepto && <span className="text-slate-400"> · {v.concepto}</span>}
                      </span>
                      {!isViewer && (
                        <span className="flex items-center gap-1 shrink-0 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => startEdit(v)} title="Editar" className="text-slate-300 hover:text-blue-500"><Pencil size={12} /></button>
                          <button onClick={() => handleDelete(v)} title="Eliminar" className="text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>
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
      {/* flex-wrap + gap: sin esto el label largo, el ⓘ y un importe en text-2xl
          se desbordaban de los 351px de un teléfono. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-slate-900 dark:bg-slate-800 border border-slate-700 rounded-xl px-4 sm:px-5 py-3.5 sm:py-4">
        <div className="text-sm font-medium text-slate-300 flex items-center gap-1.5 min-w-0">
          <span className="truncate">Total consolidado del {fecha}</span>
          <InfoTooltip text="Ticket + facturado. Solo la parte facturada genera IVA débito fiscal (21%) y es la que se cruza contra el total de tarjetas en la Comparativa." />
        </div>
        <span className="text-xl sm:text-2xl font-bold text-white tabular-nums">{fmt(totalDia)}</span>
      </div>

      {/* Alta */}
      {!isViewer && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_auto] gap-3 items-end">
            <div className="sm:w-44">
              <label className="block text-xs text-slate-400 mb-1">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} onClick={e => e.currentTarget.showPicker?.()} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Monto</label>
              <input type="number" inputMode="decimal" min="0" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                Tipo
                <InfoTooltip text="Ticket = venta sin comprobante fiscal. Facturado = factura emitida. Solo lo facturado genera IVA 21% y entra en la comparativa contra tarjetas." />
              </label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputCls}>
                {TIPOS_VENTA.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
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

    </div>
  );
}

function Tabla({ ventas, isViewer, editId, edit, setEdit, onStartEdit, onSaveEdit, onCancelEdit, onDelete }) {
  const cellInput = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500';
  return (
    <>
    {/* Mobile: cards. La edición inline de una tabla de 5 columnas dentro de un
        scroll horizontal es impracticable con el pulgar; acá los campos se apilan
        a ancho completo. */}
    <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700/60">
      {ventas.map(v => editId === v.id ? (
        <div key={v.id} className="px-3 py-3 bg-blue-50/50 dark:bg-blue-900/10 space-y-2">
          <select value={edit.tipo} onChange={e => setEdit(p => ({ ...p, tipo: e.target.value }))} className={`${cellInput} min-h-11`}>
            {TIPOS_VENTA.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <input type="date" value={edit.fecha} onChange={e => setEdit(p => ({ ...p, fecha: e.target.value }))} className={`${cellInput} min-h-11`} />
          <input type="text" value={edit.concepto} onChange={e => setEdit(p => ({ ...p, concepto: e.target.value }))} placeholder="Detalle" className={`${cellInput} min-h-11`} />
          <input type="number" inputMode="decimal" min="0" step="0.01" value={edit.monto} onChange={e => setEdit(p => ({ ...p, monto: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit(); }}
            className={`${cellInput} min-h-11 text-right`} autoFocus />
          <div className="flex gap-2 pt-0.5">
            <button onClick={onCancelEdit} className="flex-1 min-h-11 rounded-lg border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300">Cancelar</button>
            <button onClick={onSaveEdit} className="flex-1 min-h-11 rounded-lg bg-blue-600 text-white text-sm font-medium">Guardar</button>
          </div>
        </div>
      ) : (
        <div key={v.id} className="flex items-center gap-2 px-3 py-2.5">
          <div className="flex-1 min-w-0">
            {(() => {
              const def = tipoDef(v.tipo);
              return <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${def.text}`}><def.Icon size={13} /> {def.label}</span>;
            })()}
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              <span className="tabular-nums">{v.fecha}</span>
              {v.concepto && <> · {v.concepto}</>}
            </p>
          </div>
          <span className="shrink-0 text-base font-bold text-slate-700 dark:text-slate-200 tabular-nums">{fmt(v.monto)}</span>
          {!isViewer && (
            <RowActions
              title={v.concepto || tipoDef(v.tipo).label}
              acciones={[
                { key: 'editar', label: 'Editar', icon: <Pencil size={16} />, onClick: () => onStartEdit(v) },
                { key: 'eliminar', label: 'Eliminar', icon: <Trash2 size={16} />, tone: 'danger', onClick: () => onDelete(v) },
              ]}
            />
          )}
        </div>
      ))}
    </div>

    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-slate-400 text-xs">
          <tr>
            <th className="text-left px-4 py-1.5 font-medium w-32">Tipo</th>
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
                <select value={edit.tipo} onChange={e => setEdit(p => ({ ...p, tipo: e.target.value }))} className={cellInput}>
                  {TIPOS_VENTA.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </td>
              <td className="px-4 py-1.5">
                <input type="date" value={edit.fecha} onChange={e => setEdit(p => ({ ...p, fecha: e.target.value }))} onClick={e => e.currentTarget.showPicker?.()} className={cellInput} />
              </td>
              <td className="px-4 py-1.5">
                <input type="text" value={edit.concepto} onChange={e => setEdit(p => ({ ...p, concepto: e.target.value }))} placeholder="Detalle" className={cellInput} />
              </td>
              <td className="px-4 py-1.5">
                <input type="number" inputMode="decimal" min="0" step="0.01" value={edit.monto} onChange={e => setEdit(p => ({ ...p, monto: e.target.value }))}
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
              <td className="px-4 py-2">
                {(() => {
                  const def = tipoDef(v.tipo);
                  return <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${def.text}`}><def.Icon size={13} /> {def.label}</span>;
                })()}
              </td>
              <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{v.fecha}</td>
              <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{v.concepto || <span className="text-slate-400">—</span>}</td>
              <td className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmt(v.monto)}</td>
              <td className="px-2 py-2">
                {!isViewer && (
                  <div className="flex items-center justify-end gap-1 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition">
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
    </>
  );
}
