import { useState, useEffect, useRef } from 'react';
import { subrubrosApi, rubrosApi, dashboardApi, getErrorMsg } from '../api';
import Modal from '../components/Modal';
import CamposManager from '../components/CamposManager';
import SubrubroView from './SubrubroView';
import ImportModal from '../components/ImportModal';
import ConfirmModal from '../components/ConfirmModal';
import SubrubroMetadataModal from '../components/SubrubroMetadataModal';
import ReporteMensualModal from '../components/ReporteMensualModal';
import toast from 'react-hot-toast';
import { Upload, Settings2, Trash2, ChevronRight, Plus, IdCard, Eraser, ArrowUp, FileSpreadsheet } from 'lucide-react';
import { EntityIcon, ICON_LIST } from '../icons';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

// '2026-08-15' → '15 Ago'. Devuelve '—' si no hay fecha.
const MESES_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const fmtFechaCorta = (iso) => {
  if (!iso) return '—';
  const [, m, d] = iso.split('-');
  const mi = Number(m) - 1;
  if (!d || mi < 0 || mi > 11) return '—';
  return `${Number(d)} ${MESES_ABBR[mi]}`;
};

const METODO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia', ambas: 'Ambas' };
const fmtMetodo = (m) => METODO_LABEL[m] || '—';


export default function RubroView({ rubro, onBack, initialSubrubro, role }) {
  const isAdmin = role !== 'viewer';
  const [subrubros, setSubrubros] = useState([]);
  const [selectedSubrubro, setSelectedSubrubro] = useState(initialSubrubro ?? null);
  const [showCampos, setShowCampos] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const editingSubRef = useRef(null);
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showReporte, setShowReporte] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [stats, setStats] = useState({});
  const [editingMetadataSub, setEditingMetadataSub] = useState(null);
  const [creatingSub, setCreatingSub] = useState(false);
  const topRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setShowScrollTop(!e.isIntersecting));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const cargarStats = () => {
    dashboardApi.getComparacion(rubro.id)
      .then(d => {
        const map = {};
        (d.comparacion || []).forEach(s => { map[s.id] = s; });
        setStats(map);
      })
      .catch(() => {});
  };

  const cargar = () => {
    subrubrosApi.getByRubro(rubro.id).then(setSubrubros);
    cargarStats();
  };

  useEffect(() => {
    cargar();
  }, [rubro.id]);

  useEffect(() => {
    setSelectedSubrubro(initialSubrubro ?? null);
  }, [rubro.id, initialSubrubro?.id]);

  useEffect(() => {
    if (!editingId) return;
    const handler = (e) => {
      if (editingSubRef.current && !editingSubRef.current.contains(e.target)) {
        setEditingId(null); setShowIconPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editingId]);


  const handleCreateMetadata = async (payload) => {
    try {
      const sub = await subrubrosApi.create(rubro.id, payload);
      setSubrubros(prev => [...prev, sub].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setCreatingSub(false);
      toast.success(`${sub.nombre} creado`);
    } catch (err) {
      toast.error(getErrorMsg(err));
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({
      message: '¿Borrar este elemento y todos sus movimientos? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        await subrubrosApi.delete(id);
        setSubrubros(prev => prev.filter(s => s.id !== id));
        setConfirmModal(null);
        toast.success('Eliminado');
      },
    });
  };

  const handleSaveEdit = async (sub) => {
    try {
      await subrubrosApi.update(sub.id, editNombre, editIcon);
      setSubrubros(prev =>
        prev.map(s => s.id === sub.id ? { ...s, nombre: editNombre, icon: editIcon } : s)
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      setEditingId(null);
      setShowIconPicker(false);
      toast.success('Actualizado');
    } catch (err) {
      toast.error(getErrorMsg(err));
    }
  };

  const handleSaveMetadata = async (payload) => {
    if (!editingMetadataSub) return;
    try {
      await subrubrosApi.update(editingMetadataSub.id, payload);
      setSubrubros(prev =>
        prev.map(s => s.id === editingMetadataSub.id ? { ...s, ...payload } : s)
      );
      setEditingMetadataSub(null);
      toast.success('Datos guardados');
    } catch (err) {
      toast.error(getErrorMsg(err));
    }
  };

  if (selectedSubrubro) {
    const sub = subrubros.find(s => s.id === selectedSubrubro.id) || selectedSubrubro;
    return (
      <SubrubroView
        rubro={rubro}
        subrubro={sub}
        onBack={() => { setSelectedSubrubro(null); cargar(); }}
        role={role}
      />
    );
  }

  const filtrados = subrubros
    .filter(s => s.nombre.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (stats[b.id]?.saldo ?? 0) - (stats[a.id]?.saldo ?? 0));

  return (
    <div>
      <div ref={topRef} aria-hidden />
      {showScrollTop && (
        <button
          onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth' })}
          title="Volver arriba"
          aria-label="Volver arriba"
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-colors animate-[fadeIn_150ms_ease-out]"
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      )}
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <input
          className="flex-1 min-w-40 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400"
          placeholder={`Buscar en ${rubro.nombre}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {isAdmin && (
          <button
            onClick={() => setCreatingSub(true)}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5"
          >
            <Plus size={14} /> Nuevo subrubro
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setShowImport(true)}
            title="Importar Excel"
            className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-1.5"
          >
            <Upload size={14} /> <span className="hidden sm:inline">Importar Excel</span>
          </button>
        )}
        <button
          onClick={() => setShowCampos(true)}
          title="Columnas"
          className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-1.5"
        >
          <Settings2 size={14} /> <span className="hidden sm:inline">Columnas</span>
        </button>
        <button
          onClick={() => setShowReporte(true)}
          title="Análisis mensual (Excel)"
          className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-emerald-700 dark:text-emerald-400 px-2.5 py-1.5 rounded-lg text-sm hover:bg-emerald-50 dark:hover:bg-slate-600 flex items-center gap-1.5"
        >
          <FileSpreadsheet size={14} /> <span className="hidden sm:inline">Análisis mensual</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => setConfirmModal({
              message: `¿Vaciar TODOS los movimientos de todos los proveedores en "${rubro.nombre}"? Esta acción no se puede deshacer.`,
              onConfirm: async () => {
                await rubrosApi.clearAllMovimientos(rubro.id);
                setConfirmModal(null);
                cargar();
                toast.success('Movimientos eliminados');
              },
            })}
            title="Vaciar todo"
            className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-2.5 py-1.5 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-1.5"
          >
            <Trash2 size={14} /> <span className="hidden sm:inline">Vaciar todo</span>
          </button>
        )}
      </div>

      {/* Grid de subrubros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtrados.map(sub => (
          <div
            key={sub.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all group overflow-hidden"
          >
            {editingId === sub.id ? (
              <div ref={editingSubRef} className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(o => !o)}
                    className="text-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg px-2 py-1 shrink-0"
                    title="Cambiar ícono"
                  ><EntityIcon value={editIcon} size={18} /></button>
                  <input
                    className="flex-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre"
                    value={editNombre}
                    onChange={e => setEditNombre(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit(sub)}
                    autoFocus
                  />
                </div>
                {showIconPicker && (
                  <div className="grid grid-cols-6 gap-0.5 border border-slate-200 dark:border-slate-600 rounded-lg p-1.5 bg-white dark:bg-slate-700">
                    {ICON_LIST.map(ic => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => { setEditIcon(ic); setShowIconPicker(false); }}
                        className={`flex items-center justify-center p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300 ${editIcon === ic ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300' : ''}`}
                      ><EntityIcon value={ic} size={18} /></button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleSaveEdit(sub)} className="flex-1 bg-green-600 text-white rounded-lg py-1.5 text-sm hover:bg-green-700">Guardar</button>
                  <button onClick={() => { setEditingId(null); setShowIconPicker(false); }} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg py-1.5 text-sm hover:bg-slate-200 dark:hover:bg-slate-600">Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setSelectedSubrubro(sub)}
                  className="w-full text-left p-4"
                >
                  {/* Nombre + flecha */}
                  <div className="relative flex items-center justify-center mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {sub.icon && <span className="shrink-0 text-slate-700 dark:text-slate-200"><EntityIcon value={sub.icon} size={20} /></span>}
                      <p className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors truncate">
                        {sub.nombre}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400 transition-colors absolute right-0 shrink-0" />
                  </div>

                  {/* Indicadores: próximo vencimiento → importe a vencer → saldo pendiente → forma de pago */}
                  {stats[sub.id] !== undefined && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-2 text-center">
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mb-0.5 truncate">Próx. vencimiento</p>
                        <p className={`text-xs sm:text-sm font-semibold truncate ${stats[sub.id].vencido ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'}`}>
                          {fmtFechaCorta(stats[sub.id].proximo_vencimiento)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mb-0.5 truncate">Importe a vencer</p>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                          {stats[sub.id].importe_proximo_vencimiento != null ? fmt(stats[sub.id].importe_proximo_vencimiento) : '—'}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mb-0.5 truncate">Saldo pendiente</p>
                        <p className={`text-xs sm:text-sm font-bold truncate ${stats[sub.id].saldo > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {fmt(stats[sub.id].saldo)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mb-0.5 truncate">Forma de pago</p>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                          {fmtMetodo(sub.metodo_pago_default || 'ambas')}
                        </p>
                      </div>
                    </div>
                  )}
                </button>
                {/* Siempre visibles donde no hay hover (touch): con opacity-0 puro
                    estas acciones eran inalcanzables en mobile/tablet. */}
                {isAdmin && (
                  <div className="px-4 pb-3 flex justify-center gap-4 sm:gap-3 border-t border-slate-100 dark:border-slate-700 pt-2 opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
                    <button
                      onClick={e => { e.stopPropagation(); setEditingMetadataSub(sub); }}
                      className="text-xs text-slate-400 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                      title="Editar nombre, ícono y datos fiscales"
                    ><IdCard size={11} /> Editar</button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setConfirmModal({
                          message: `¿Vaciar todos los movimientos de "${sub.nombre}"? Esta acción no se puede deshacer.`,
                          onConfirm: async () => {
                            await subrubrosApi.clearMovimientos(sub.id);
                            setConfirmModal(null);
                            toast.success('Movimientos eliminados');
                          },
                        });
                      }}
                      className="text-xs text-slate-400 hover:text-orange-500 transition-colors inline-flex items-center gap-1"
                    ><Eraser size={11} /> Vaciar</button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(sub.id); }}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors inline-flex items-center gap-1"
                    ><Trash2 size={11} /> Borrar</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {filtrados.length === 0 && search && (
          <div className="col-span-full text-center py-8 text-slate-400">
            <p>Sin resultados para "<strong>{search}</strong>"</p>
          </div>
        )}
      </div>

      {showImport && (
        <ImportModal
          rubro={rubro}
          onClose={() => setShowImport(false)}
          onSuccess={() => cargar()}
        />
      )}

      {showCampos && (
        <Modal title={`Columnas de ${rubro.nombre}`} onClose={() => setShowCampos(false)}>
          <CamposManager rubro={rubro} onClose={() => setShowCampos(false)} />
        </Modal>
      )}

      {showReporte && (
        <ReporteMensualModal
          rubro={rubro}
          subrubros={subrubros}
          onClose={() => setShowReporte(false)}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {editingMetadataSub && (
        <SubrubroMetadataModal
          subrubro={editingMetadataSub}
          onSave={handleSaveMetadata}
          onClose={() => setEditingMetadataSub(null)}
        />
      )}

      {creatingSub && (
        <SubrubroMetadataModal
          subrubro={null}
          title={`Nuevo ${rubro.nombre.toLowerCase()}`}
          submitLabel="Crear"
          onSave={handleCreateMetadata}
          onClose={() => setCreatingSub(false)}
        />
      )}
    </div>
  );
}
