import { useState, useEffect } from 'react';
import { subrubrosApi, rubrosApi } from '../api';
import Modal from './Modal';
import CamposManager from './CamposManager';
import SubrubroView from './SubrubroView';
import ImportModal from './ImportModal';
import ConfirmModal from './ConfirmModal';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);

const ICON_LIST = ['📁','📂','👥','🏭','🏪','🚚','💼','🏗️','📦','💰','🧾','📊','🏦','⚡','🔧','🛠️','🏠','🌐','📮','🚗','🎯','📝','🔑','💡','🌿','🔒','⭐','✈️','🎨','🔋'];

export default function RubroView({ rubro, onBack, initialSubrubro }) {
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

  const cargar = () => subrubrosApi.getByRubro(rubro.id).then(setSubrubros);
  useEffect(() => {
    cargar();
    setSelectedSubrubro(initialSubrubro ?? null);
  }, [rubro.id]);

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
      />
    );
  }

  const filtrados = subrubros.filter(s =>
    s.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <input
          className="flex-1 min-w-40 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          placeholder={`Buscar en ${rubro.nombre}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          onClick={() => setShowImport(true)}
          className="bg-white border border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-1.5"
        >
          ↑ Importar Excel
        </button>
        <button
          onClick={() => setShowCampos(true)}
          className="bg-white border border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-1.5"
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
          className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm hover:bg-red-100 flex items-center gap-1.5"
        >
          🗑 Vaciar todo
        </button>
      </div>

      {/* Grid de subrubros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtrados.map(sub => (
          <div
            key={sub.id}
            className="bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-slate-300 transition-all group overflow-hidden"
          >
            {editingId === sub.id ? (
              <div className="p-4 space-y-2" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(o => !o)}
                    className="text-xl bg-slate-100 hover:bg-slate-200 rounded-lg px-2 py-1 shrink-0"
                    title="Cambiar ícono"
                  >{editIcon || '📁'}</button>
                  <input
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre"
                    value={editNombre}
                    onChange={e => setEditNombre(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit(sub)}
                    autoFocus
                  />
                </div>
                {showIconPicker && (
                  <div className="grid grid-cols-6 gap-0.5 border border-slate-200 rounded-lg p-1.5 bg-white">
                    {ICON_LIST.map(ic => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => { setEditIcon(ic); setShowIconPicker(false); }}
                        className={`text-lg p-1 rounded hover:bg-slate-100 transition-colors ${editIcon === ic ? 'bg-blue-100' : ''}`}
                      >{ic}</button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleSaveEdit(sub)} className="flex-1 bg-green-600 text-white rounded-lg py-1.5 text-sm hover:bg-green-700">Guardar</button>
                  <button onClick={() => { setEditingId(null); setShowIconPicker(false); }} className="flex-1 bg-slate-100 rounded-lg py-1.5 text-sm hover:bg-slate-200">Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setSelectedSubrubro(sub)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {sub.icon && <span className="text-2xl block mb-1">{sub.icon}</span>}
                      <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                        {sub.nombre}
                      </p>
                    </div>
                    <span className="text-slate-300 group-hover:text-blue-400 transition-colors text-lg ml-2 mt-0.5">→</span>
                  </div>
                </button>
                <div className="px-4 pb-3 flex gap-3 border-t border-slate-100 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Nuevo {rubro.nombre.toLowerCase()}
          </p>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
