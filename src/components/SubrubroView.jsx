import { useState, useEffect } from 'react';
import { movimientosApi, camposApi, subrubrosApi } from '../api';
import Modal from './Modal';
import MovimientoForm from './MovimientoForm';
import CalendarioSubrubro from './CalendarioSubrubro';
import ConfirmModal from './ConfirmModal';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);

function vencimientoLabel(fechaVenc) {
  if (!fechaVenc) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVenc + 'T00:00:00');
  const dias = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
  if (dias < 0) return { label: `Vencida ${Math.abs(dias)}d`, cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' };
  if (dias === 0) return { label: 'Vence hoy', cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' };
  if (dias <= 7) return { label: `Vence en ${dias}d`, cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
  return { label: fechaVenc, cls: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600' };
}

function parseMes(key) {
  const [y, m] = key.split('-');
  return `${m}/${y}`;
}
function mesAnterior(key) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function mesSiguiente(key) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function mesActualKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function TipoBadge({ mov }) {
  if (mov.tipo === 'nota_credito')
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full">📋 NC</span>;
  if (mov.tipo === 'ajuste')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-800 px-2 py-0.5 rounded-full">
        ⚡ {mov.concepto || 'Ajuste'}
      </span>
    );
  if (mov.tipo === 'pago' || ((mov.pago || 0) > 0 && !(mov.monto > 0)))
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">↓ Pago</span>;
  if (mov.pagado)
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full">✓ Pagada</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">● Pendiente</span>;
}

export default function SubrubroView({ rubro, subrubro, onBack, sidebarRight }) {
  const [data, setData] = useState({ movimientos: [], monto_base: 0, saldo_total: null });
  const [campos, setCampos] = useState([]);
  const [mesActual, setMesActual] = useState(mesActualKey);
  const [showForm, setShowForm] = useState(false);
  const [editingMov, setEditingMov] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('tabla');
  const [todosMovs, setTodosMovs] = useState([]);
  const [todasFacturasPendientes, setTodasFacturasPendientes] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);

  const cargar = async (mes) => {
    const [y, m] = mes.split('-');
    const [d, cs] = await Promise.all([
      movimientosApi.getBySubrubro(subrubro.id, y, m),
      camposApi.getByRubro(rubro.id),
    ]);
    setData(d);
    setCampos(cs);
    setLoading(false);
  };

  const cargarTodos = async () => {
    const d = await movimientosApi.getBySubrubro(subrubro.id);
    setTodosMovs(d.movimientos);
    // Facturas pendientes para vinculación en el form
    const pendientes = d.movimientos.filter(m =>
      (m.tipo === 'factura' || (!m.tipo && (m.monto || 0) > 0)) && !m.pagado
    );
    setTodasFacturasPendientes(pendientes);
  };

  useEffect(() => { cargar(mesActual); }, [subrubro.id, mesActual]);
  useEffect(() => { cargarTodos(); }, [subrubro.id]);

  const handleSave = async (formData) => {
    const { tipo, facturas_vinculadas_ids, concepto_diferencia, ...rest } = formData;
    const tieneVinculacion = facturas_vinculadas_ids?.length > 0;
    const esPagoONC = tipo === 'pago' || tipo === 'nota_credito';

    try {
      if (esPagoONC && tieneVinculacion) {
        const payload = {
          tipo,
          fecha: rest.fecha,
          monto_pago: rest.pago,
          facturas_vinculadas_ids,
          concepto_diferencia,
          campos_extra: rest.campos_extra,
        };
        if (editingMov) {
          await movimientosApi.actualizarPagoVinculado(editingMov.id, payload);
        } else {
          await movimientosApi.pagoVinculado(subrubro.id, payload);
        }
      } else {
        const payload = { ...rest, tipo };
        if (editingMov) await movimientosApi.update(editingMov.id, payload);
        else await movimientosApi.create(subrubro.id, payload);
      }

      setShowForm(false);
      setEditingMov(null);
      cargar(mesActual);
      cargarTodos();
      toast.success(editingMov ? 'Movimiento actualizado' : 'Movimiento guardado');
    } catch {
      toast.error('No se pudo guardar el movimiento');
    }
  };

  const handleDelete = (mov) => {
    const message = mov._ajuste_pago_id
      ? '¿Borrar este ajuste automático?'
      : mov.tipo === 'pago' || mov.tipo === 'nota_credito'
        ? '¿Borrar este pago? También se borrará su ajuste automático si tiene uno.'
        : '¿Borrar este movimiento?';
    setConfirmModal({
      message,
      onConfirm: async () => {
        await movimientosApi.delete(mov.id);
        setConfirmModal(null);
        cargar(mesActual);
        cargarTodos();
        toast.success('Movimiento eliminado');
      },
    });
  };

  const handleEdit = (m) => {
    // No editar ajustes auto: deben editarse desde el pago padre
    if (m.tipo === 'ajuste' && m._ajuste_pago_id) {
      alert('Este ajuste fue generado automáticamente. Para modificarlo, editá el pago vinculado correspondiente.');
      return;
    }
    setEditingMov(m);
    setShowForm(true);
  };

  const camposSumaSet = new Set(campos.filter(c => c.tipo === 'suma').map(c => c.nombre));
  const camposRestaSet = new Set(campos.filter(c => c.tipo === 'resta').map(c => c.nombre));

  const movsConTotal = () => {
    let total = data.monto_base || 0;
    return data.movimientos.map(m => {
      const extra = m.campos_extra || {};
      let extraEfecto = 0;
      for (const [k, v] of Object.entries(extra)) {
        const n = Number(v);
        if (!isNaN(n) && n !== 0) {
          if (camposSumaSet.has(k)) extraEfecto += n;
          if (camposRestaSet.has(k)) extraEfecto -= n;
        }
      }
      total += (m.monto || 0) - (m.pago || 0) + extraEfecto;
      return { ...m, _total: total };
    });
  };

  const saldoFinal = data.saldo_total ?? (data.monto_base || 0);
  const saldoPositivo = saldoFinal >= 0;

  const camposTexto = campos.filter(c => c.tipo === 'texto');
  const camposNumericos = campos.filter(c => c.tipo === 'suma' || c.tipo === 'resta');
  const hayVencimientos = data.movimientos.some(m => m.fecha_vencimiento);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>;

  const movsDetallados = movsConTotal();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm flex items-center gap-1">
          ← Volver
        </button>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{rubro.nombre}</p>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{subrubro.nombre}</h1>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className={`rounded-xl p-4 border ${saldoPositivo ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'}`}>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Saldo total</p>
          <p className={`text-xl font-bold mt-1 ${saldoPositivo ? 'text-slate-800 dark:text-slate-100' : 'text-red-600'}`}>{fmt(saldoFinal)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Pendiente</p>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {fmt(todasFacturasPendientes.reduce((s, m) => s + m.monto, 0))}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{todasFacturasPendientes.length} factura{todasFacturasPendientes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total facturado</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
            {fmt(data.movimientos.reduce((s, m) => s + (m.monto || 0), 0))}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total pagado</p>
          <p className="text-xl font-bold text-green-700 mt-1">
            {fmt(data.movimientos.reduce((s, m) => s + (m.pago || 0), 0))}
          </p>
        </div>
      </div>

      {/* Toggle vista */}
      <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 text-xs font-medium mb-4 w-fit">
        {[['tabla', 'Tabla'], ['calendario', 'Calendario']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => { setViewMode(v); if (v === 'calendario') cargarTodos(); }}
            className={`px-4 py-1.5 rounded-md transition-colors ${viewMode === v ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >{l}</button>
        ))}
      </div>

      {/* Selector mes + acciones */}
      <div className={`flex flex-wrap gap-2 items-center justify-between mb-4 ${viewMode === 'calendario' ? 'hidden' : ''}`}>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
          <button onClick={() => setMesActual(mesAnterior(mesActual))} className="px-2 py-1 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium">‹</button>
          <span className="px-3 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-20 text-center">{parseMes(mesActual)}</span>
          <button
            onClick={() => setMesActual(mesSiguiente(mesActual))}
            disabled={mesActual >= mesActualKey()}
            className="px-2 py-1 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium disabled:opacity-30"
          >›</button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => movimientosApi.exportExcel(subrubro.id, subrubro.nombre)}
            className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
          >↓ Excel</button>
          <button
            onClick={() => setConfirmModal({
              message: `¿Borrar TODOS los movimientos de "${subrubro.nombre}"? Esta acción no se puede deshacer.`,
              onConfirm: async () => {
                await subrubrosApi.clearMovimientos(subrubro.id);
                setConfirmModal(null);
                cargar(mesActual);
                cargarTodos();
                toast.success('Movimientos eliminados');
              },
            })}
            className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/50"
          >🗑 Limpiar</button>
          <button
            onClick={() => { setEditingMov(null); setShowForm(true); }}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 shadow-sm"
          >+ Movimiento</button>
        </div>
      </div>

      {viewMode === 'calendario' && <CalendarioSubrubro movimientos={todosMovs} />}

      {/* Tabla */}
      {viewMode === 'tabla' && (data.movimientos.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <p className="text-4xl mb-3">💸</p>
          <p className="font-medium">Sin movimientos en {parseMes(mesActual)}</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-blue-600 hover:underline text-sm">
            Agregar el primero
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Monto</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Pago</th>
                {camposNumericos.map(c => (
                  <th key={c.id} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{c.nombre}</th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Estado</th>
                {camposTexto.map(c => (
                  <th key={c.id} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{c.nombre}</th>
                ))}
                {hayVencimientos && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Vencimiento</th>
                )}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {movsDetallados.map(m => {
                const esFactura = m.tipo === 'factura';
                const esPago = m.tipo === 'pago';
                const esNC = m.tipo === 'nota_credito';
                const esAjuste = m.tipo === 'ajuste';
                const esAutoAjuste = esAjuste && m._ajuste_pago_id;
                const venc = vencimientoLabel(m.fecha_vencimiento);

                const rowCls = esFactura && m.pagado
                  ? 'bg-green-50/50 dark:bg-green-900/10'
                  : (esPago || esNC) ? 'bg-blue-50/30 dark:bg-blue-900/10'
                  : esAjuste ? 'bg-orange-50/30 dark:bg-orange-900/10'
                  : '';

                return (
                  <tr key={m.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${rowCls}`}>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {m.fecha
                        ? <span className="text-slate-600 dark:text-slate-300">{m.fecha}</span>
                        : <span className="text-amber-500 text-xs italic">Sin fecha</span>
                      }
                    </td>

                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      {(m.monto || 0) > 0
                        ? <span className="text-slate-800 dark:text-slate-100">+{fmt(m.monto)}</span>
                        : <span className="text-slate-300 dark:text-slate-600">—</span>
                      }
                    </td>

                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      {(m.pago || 0) > 0
                        ? <span className={esNC ? 'text-purple-600' : esAjuste ? 'text-orange-600' : 'text-blue-600'}>
                            −{fmt(m.pago)}
                          </span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>

                    {camposNumericos.map(c => {
                      const val = m.campos_extra?.[c.nombre];
                      const n = Number(val);
                      return (
                        <td key={c.id} className="px-4 py-3 text-right whitespace-nowrap">
                          {val !== undefined && val !== '' && !isNaN(n)
                            ? <span className={c.tipo === 'suma' ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                                {c.tipo === 'suma' ? '+' : '−'}{fmt(n)}
                              </span>
                            : <span className="text-slate-300">—</span>
                          }
                        </td>
                      );
                    })}

                    <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${m._total >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600'}`}>
                      {fmt(m._total)}
                    </td>

                    <td className="px-4 py-3">
                      <TipoBadge mov={m} />
                    </td>

                    {camposTexto.map(c => (
                      <td key={c.id} className="px-4 py-3 text-slate-500 text-xs max-w-36 truncate">
                        {m.campos_extra?.[c.nombre] || <span className="text-slate-300">—</span>}
                      </td>
                    ))}

                    {hayVencimientos && (
                      <td className="px-4 py-3">
                        {venc
                          ? <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${venc.cls}`}>{venc.label}</span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                    )}

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {!esAutoAjuste && (
                        <button onClick={() => handleEdit(m)} className="text-blue-500 hover:text-blue-700 text-xs mr-3">Editar</button>
                      )}
                      <button onClick={() => handleDelete(m)} className="text-red-400 hover:text-red-600 text-xs">Borrar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* Botón flotante de volver */}
      <button
        onClick={onBack}
        className={`fixed bottom-6 z-40 flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-lg rounded-full px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:shadow-xl ${sidebarRight ? 'left-6' : 'right-6'}`}
      >
        <ArrowLeft size={15} />
        Volver
      </button>

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {showForm && (
        <Modal
          title={editingMov ? 'Editar movimiento' : `Nuevo movimiento — ${subrubro.nombre}`}
          onClose={() => { setShowForm(false); setEditingMov(null); }}
        >
          <MovimientoForm
            campos={campos}
            movimiento={editingMov}
            todasFacturasPendientes={(() => {
              // Al editar un pago vinculado, incluir también las facturas ya pagadas
              // por ese pago (que no aparecerían en la lista de pendientes)
              if (!editingMov?.facturas_vinculadas_ids?.length) return todasFacturasPendientes;
              const linkedIds = new Set(editingMov.facturas_vinculadas_ids);
              const yaIncluidas = new Set(todasFacturasPendientes.map(f => f.id));
              const extra = todosMovs.filter(m => linkedIds.has(m.id) && m.tipo === 'factura' && !yaIncluidas.has(m.id));
              return [...todasFacturasPendientes, ...extra].sort((a, b) => {
                if (!a.fecha && !b.fecha) return a.id - b.id;
                if (!a.fecha) return 1;
                if (!b.fecha) return -1;
                return a.fecha.localeCompare(b.fecha) || a.id - b.id;
              });
            })()}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingMov(null); }}
          />
        </Modal>
      )}
    </div>
  );
}
