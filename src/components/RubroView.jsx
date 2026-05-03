import { useState, useEffect } from 'react';
import { subrubrosApi, rubrosApi, dashboardApi } from '../api';
import Modal from './Modal';
import CamposManager from './CamposManager';
import SubrubroView from './SubrubroView';
import ImportModal from './ImportModal';
import ConfirmModal from './ConfirmModal';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);

const ICON_LIST = ['📁','📂','👥','🏭','🏪','🚚','💼','🏗️','📦','💰','🧾','📊','🏦','⚡','🔧','🛠️','🏠','🌐','📮','🚗','🎯','📝','🔑','💡','🌿','🔒','⭐','✈️','🎨','🔋'];

export default function RubroView({ rubro, onBack, initialSubrubro, sidebarRight }) {
  const [subrubros, setSubrubros] = useState([]);
  const [selectedSubrubro, setSelectedSubrubro] = useState(initialSubrubro ?? null);
  const [showCampos, setShowCampos] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [stats, setStats] = useState({});

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

  const handleAdd = async () => {
    if (!nuevoNombre.trim()) return;
    try {
      const sub = await subrubrosApi.create(rubro.id, nuevoNombre.trim());
      setSubrubros(prev => [...prev, sub].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNuevoNombre('');
      toast.success(`${sub.nombre} creado`);
    } catch {
      toast.error('No se pudo crear');
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
    } catch {
      toast.error('No se pudo actualizar');
    }
  };

  if (selectedSubrubro) {
    const sub = subrubros.find(s => s.id === selectedSubrubro.id) || selectedSubrubro;
    return (
      <SubrubroView
        rubro={rubro}
        subrubro={sub}
        onBack={() => { setSelectedSubrubro(null); cargar(); }}
        sidebarRight={sidebarRight}
      />
    );
  }

  const filtrados = subrubros
    .filter(s => s.nombre.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (stats[b.id]?.saldo ?? 0) - (stats[a.id]?.saldo ?? 0));

  return (
    <div>
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <input
          className="flex-1 min-w-40 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400"
          placeholder={`Buscar en ${rubro.nombre}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          onClick={() => setShowImport(true)}
          className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-1.5"
        >
          ↑ Importar Excel
        </button>
        <button
          onClick={() => setShowCampos(true)}
          className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-1.5"
        >
          ⚙️ Columnas
        </button>
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
          className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-1.5"
        >
          🗑 Vaciar todo
        </button>
      </div>

      {/* Grid de subrubros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtrados.map(sub => (
          <div
            key={sub.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all group overflow-hidden"
          >
            {editingId === sub.id ? (
              <div className="p-4 space-y-2" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(o => !o)}
                    className="text-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg px-2 py-1 shrink-0"
                    title="Cambiar ícono"
                  >{editIcon || '📁'}</button>
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
                        className={`text-lg p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors ${editIcon === ic ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}
                      >{ic}</button>
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
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {sub.icon && <span className="text-xl shrink-0">{sub.icon}</span>}
                      <p className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors truncate">
                        {sub.nombre}
                      </p>
                    </div>
                    <span className="text-slate-300 group-hover:text-blue-400 transition-colors ml-2 shrink-0">→</span>
                  </div>

                  {/* Datos financieros */}
                  {stats[sub.id] !== undefined && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 grid grid-cols-4 gap-1 text-center">
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Monto</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{fmt(stats[sub.id].facturado)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Pago</p>
                        <p className="text-xs font-semibold text-emerald-600 truncate">{fmt(stats[sub.id].pagado)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Pendiente</p>
                        <p className={`text-xs font-semibold truncate ${stats[sub.id].pendiente > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmt(stats[sub.id].pendiente)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Saldo</p>
                        <p className={`text-xs font-bold truncate ${stats[sub.id].saldo > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(stats[sub.id].saldo)}</p>
                      </div>
                    </div>
                  )}
                </button>
                <div className="px-4 pb-3 flex gap-3 border-t border-slate-100 dark:border-slate-700 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); setEditingId(sub.id); setEditNombre(sub.nombre); setEditIcon(sub.icon || ''); setShowIconPicker(false); }}
                    className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
                  >Editar</button>
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
                    className="text-xs text-slate-400 hover:text-orange-500 transition-colors"
                  >Vaciar</button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(sub.id); }}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >Borrar</button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Nueva tarjeta */}
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Nuevo {rubro.nombre.toLowerCase()}
          </p>
          <input
            className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre (ej: Juan Pérez)"
            value={nuevoNombre}
            onChange={e => setNuevoNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 font-medium"
          >
            + Agregar
          </button>
        </div>

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

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
