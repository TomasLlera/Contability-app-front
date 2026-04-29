import { useState, useEffect } from 'react';
import { rubrosApi, subrubrosApi, localesApi, authApi } from './api';
import RubroView from './components/RubroView';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import ConfirmModal from './components/ConfirmModal';
import { Home, ChevronDown, ChevronRight, Plus, X, Pencil, Trash2, Check, LogOut, Menu } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import './index.css';

const RUBRO_ICONS = ['📁', '👥', '🏭', '🏪', '🚚', '💼', '🏗️', '📦'];
const ICON_LIST = ['📁','📂','👥','🏭','🏪','🚚','💼','🏗️','📦','💰','🧾','📊','🏦','⚡','🔧','🛠️','🏠','🌐','📮','🚗','🎯','📝','🔑','💡','🌿','🔒','⭐','✈️','🎨','🔋'];

function getRubroIcon(rubro) {
  if (rubro.icon) return rubro.icon;
  const n = rubro.nombre.toLowerCase();
  if (n.includes('emple') || n.includes('person') || n.includes('staff')) return '👥';
  if (n.includes('provee') || n.includes('vendor')) return '🚚';
  if (n.includes('client') || n.includes('venta')) return '🏪';
  if (n.includes('empresa') || n.includes('socio')) return '🏭';
  if (n.includes('gasto') || n.includes('servicio')) return '💼';
  return RUBRO_ICONS[rubro.nombre.charCodeAt(0) % RUBRO_ICONS.length];
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(authApi.isLoggedIn());
  const [locales, setLocales] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [rubroStats, setRubroStats] = useState({});
  const [activeView, setActiveView] = useState('inicio');
  const [initialSubrubro, setInitialSubrubro] = useState(null);
  const [expandedLocales, setExpandedLocales] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Local CRUD
  const [showNewLocal, setShowNewLocal] = useState(false);
  const [nuevoLocal, setNuevoLocal] = useState('');
  const [editingLocal, setEditingLocal] = useState(null);
  const [editLocalNombre, setEditLocalNombre] = useState('');
  const [editLocalIcon, setEditLocalIcon] = useState('🏠');
  const [showLocalIconPicker, setShowLocalIconPicker] = useState(false);

  // Rubro CRUD
  const [showNewRubro, setShowNewRubro] = useState(null);
  const [nuevoRubro, setNuevoRubro] = useState('');
  const [editingRubro, setEditingRubro] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => { if (loggedIn) cargar(); else setLoading(false); }, [loggedIn]);

  const cargar = async () => {
    const [ls, rs] = await Promise.all([localesApi.getAll(), rubrosApi.getAll()]);
    setLocales(ls);
    setRubros(rs);
    setLoading(false);
    const stats = {};
    await Promise.all(rs.map(async r => {
      const subs = await subrubrosApi.getByRubro(r.id);
      stats[r.id] = subs.length;
    }));
    setRubroStats(stats);
  };

  const toggleLocal = (id) => {
    setExpandedLocales(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // --- Local handlers ---
  const handleAddLocal = async () => {
    if (!nuevoLocal.trim()) return;
    const local = await localesApi.create(nuevoLocal.trim(), '🏠');
    setLocales(prev => [...prev, local].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setNuevoLocal('');
    setShowNewLocal(false);
    setExpandedLocales(prev => new Set([...prev, local.id]));
    toast.success('Local creado');
  };

  const handleSaveLocalEdit = async (local, e) => {
    e.stopPropagation();
    await localesApi.update(local.id, editLocalNombre, editLocalIcon);
    setLocales(prev =>
      prev.map(l => l.id === local.id ? { ...l, nombre: editLocalNombre, icon: editLocalIcon } : l)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
    );
    setEditingLocal(null);
    setShowLocalIconPicker(false);
    toast.success('Local actualizado');
  };

  const handleDeleteLocal = (id, e) => {
    e.stopPropagation();
    setConfirmModal({
      message: '¿Borrar este local y todo su contenido? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        await localesApi.delete(id);
        setLocales(prev => prev.filter(l => l.id !== id));
        setRubros(prev => prev.filter(r => r.local_id !== id));
        if (activeView?.local_id === id) setActiveView('inicio');
        setConfirmModal(null);
        toast.success('Local eliminado');
      },
    });
  };

  // --- Rubro handlers ---
  const handleAddRubro = async (localId) => {
    if (!nuevoRubro.trim()) return;
    try {
      const rubro = await rubrosApi.create(localId, nuevoRubro.trim());
      setRubros(prev => [...prev, rubro].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setRubroStats(prev => ({ ...prev, [rubro.id]: 0 }));
      setNuevoRubro('');
      setShowNewRubro(null);
      toast.success('Rubro creado');
    } catch {
      toast.error('El rubro ya existe');
    }
  };

  const handleSaveRubroEdit = async (rubro, e) => {
    e.stopPropagation();
    await rubrosApi.update(rubro.id, editNombre, editIcon);
    setRubros(prev =>
      prev.map(r => r.id === rubro.id ? { ...r, nombre: editNombre, icon: editIcon } : r)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
    );
    if (activeView?.id === rubro.id) setActiveView({ ...rubro, nombre: editNombre, icon: editIcon });
    setEditingRubro(null);
    setShowIconPicker(false);
    toast.success('Rubro actualizado');
  };

  const handleDeleteRubro = (id, e) => {
    e.stopPropagation();
    setConfirmModal({
      message: '¿Borrar este rubro y todo su contenido? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        await rubrosApi.delete(id);
        setRubros(prev => prev.filter(r => r.id !== id));
        if (activeView?.id === id) setActiveView('inicio');
        setConfirmModal(null);
        toast.success('Rubro eliminado');
      },
    });
  };

  const handleNavigateFromVenc = (rubro, subrubro) => {
    if (rubro && subrubro) {
      setActiveView(rubro);
      setInitialSubrubro(subrubro);
    }
  };

  const isRubroActive = activeView !== 'inicio' && activeView?.id;
  const activeLocal = isRubroActive ? locales.find(l => l.id === activeView.local_id) : null;

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
    <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
    {confirmModal && (
      <ConfirmModal
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />
    )}
    <div className="min-h-screen bg-slate-50 flex">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 z-30 w-64 bg-slate-900 flex flex-col shrink-0 h-screen transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="px-4 py-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">C</div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Contabilidad</p>
                <p className="text-slate-400 text-xs">Gestión de cuentas</p>
              </div>
            </div>
            <button onClick={() => { authApi.logout(); setLoggedIn(false); }} title="Cerrar sesión" className="text-slate-400 hover:text-white transition">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
          <button
            onClick={() => { setActiveView('inicio'); setInitialSubrubro(null); closeSidebar(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'inicio' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
            }`}
          >
            <Home size={15} />
            Inicio
          </button>

          <div className="pt-4">
            <div className="flex items-center px-3 py-1 mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex-1">Locales</span>
              <span className="text-xs text-slate-600">{locales.length}</span>
            </div>

            {locales.map(local => {
              const localRubros = rubros.filter(r => r.local_id === local.id);
              const isExpanded = expandedLocales.has(local.id);
              return (
                <div key={local.id}>
                  {editingLocal === local.id ? (
                    <div className="px-2 py-1.5 space-y-1.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button type="button"
                          onClick={() => setShowLocalIconPicker(o => !o)}
                          className="text-base bg-slate-700 hover:bg-slate-600 rounded px-1.5 py-0.5 shrink-0"
                        >{editLocalIcon}</button>
                        <input
                          className="flex-1 min-w-0 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={editLocalNombre}
                          onChange={e => setEditLocalNombre(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveLocalEdit(local, e)}
                          autoFocus
                        />
                        <button onClick={e => handleSaveLocalEdit(local, e)} className="text-green-400 hover:text-green-300 shrink-0"><Check size={13} /></button>
                        <button onClick={e => { e.stopPropagation(); setEditingLocal(null); setShowLocalIconPicker(false); }} className="text-slate-500 hover:text-slate-300 shrink-0"><X size={13} /></button>
                      </div>
                      {showLocalIconPicker && (
                        <div className="grid grid-cols-6 gap-0.5 bg-slate-800 rounded-lg p-1.5">
                          {ICON_LIST.map(ic => (
                            <button key={ic} type="button"
                              onClick={() => { setEditLocalIcon(ic); setShowLocalIconPicker(false); }}
                              className={`text-sm p-1 rounded hover:bg-slate-600 transition-colors ${editLocalIcon === ic ? 'bg-slate-600' : ''}`}
                            >{ic}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="group relative">
                      <button
                        onClick={() => toggleLocal(local.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-slate-300 hover:bg-slate-700/50 hover:text-slate-200"
                      >
                        {isExpanded ? <ChevronDown size={11} className="shrink-0" /> : <ChevronRight size={11} className="shrink-0" />}
                        <span className="shrink-0">{local.icon || '🏠'}</span>
                        <span className="flex-1 text-left truncate text-xs font-medium">{local.nombre}</span>
                        <span className="text-xs text-slate-600 group-hover:hidden">{localRubros.length}</span>
                        <span className="hidden group-hover:flex items-center gap-0.5">
                          <span role="button"
                            onClick={e => { e.stopPropagation(); setEditingLocal(local.id); setEditLocalNombre(local.nombre); setEditLocalIcon(local.icon || '🏠'); setShowLocalIconPicker(false); }}
                            className="text-slate-400 hover:text-blue-400 transition-colors p-0.5 rounded"
                          ><Pencil size={11} /></span>
                          <span role="button"
                            onClick={e => handleDeleteLocal(local.id, e)}
                            className="text-slate-400 hover:text-red-400 transition-colors p-0.5 rounded"
                          ><Trash2 size={11} /></span>
                        </span>
                      </button>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700/40 pl-2">
                      {localRubros.map(rubro => (
                        <div key={rubro.id} className="group relative">
                          {editingRubro === rubro.id ? (
                            <div className="py-1 space-y-1.5" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <button type="button"
                                  onClick={() => setShowIconPicker(o => !o)}
                                  className="text-base bg-slate-700 hover:bg-slate-600 rounded px-1.5 py-0.5 shrink-0"
                                >{editIcon}</button>
                                <input
                                  className="flex-1 min-w-0 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={editNombre}
                                  onChange={e => setEditNombre(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleSaveRubroEdit(rubro, e)}
                                  autoFocus
                                />
                                <button onClick={e => handleSaveRubroEdit(rubro, e)} className="text-green-400 hover:text-green-300 shrink-0"><Check size={13} /></button>
                                <button onClick={e => { e.stopPropagation(); setEditingRubro(null); setShowIconPicker(false); }} className="text-slate-500 hover:text-slate-300 shrink-0"><X size={13} /></button>
                              </div>
                              {showIconPicker && (
                                <div className="grid grid-cols-6 gap-0.5 bg-slate-800 rounded-lg p-1.5">
                                  {ICON_LIST.map(ic => (
                                    <button key={ic} type="button"
                                      onClick={() => { setEditIcon(ic); setShowIconPicker(false); }}
                                      className={`text-sm p-1 rounded hover:bg-slate-600 transition-colors ${editIcon === ic ? 'bg-slate-600' : ''}`}
                                    >{ic}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => { setActiveView(rubro); setInitialSubrubro(null); closeSidebar(); }}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                                isRubroActive && activeView.id === rubro.id
                                  ? 'bg-slate-700 text-white'
                                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                              }`}
                            >
                              <span className="text-sm shrink-0">{getRubroIcon(rubro)}</span>
                              <span className="flex-1 text-left truncate text-xs">{rubro.nombre}</span>
                              <span className="text-xs text-slate-600 group-hover:hidden">{rubroStats[rubro.id] ?? 0}</span>
                              <span className="hidden group-hover:flex items-center gap-0.5">
                                <span role="button"
                                  onClick={e => { e.stopPropagation(); setEditingRubro(rubro.id); setEditNombre(rubro.nombre); setEditIcon(getRubroIcon(rubro)); setShowIconPicker(false); }}
                                  className="text-slate-400 hover:text-blue-400 transition-colors p-0.5 rounded"
                                ><Pencil size={11} /></span>
                                <span role="button"
                                  onClick={e => handleDeleteRubro(rubro.id, e)}
                                  className="text-slate-400 hover:text-red-400 transition-colors p-0.5 rounded"
                                ><Trash2 size={11} /></span>
                              </span>
                            </button>
                          )}
                        </div>
                      ))}

                      {showNewRubro === local.id ? (
                        <div className="py-2 space-y-1.5">
                          <input
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Nombre del rubro"
                            value={nuevoRubro}
                            onChange={e => setNuevoRubro(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddRubro(local.id)}
                            autoFocus
                          />
                          <div className="flex gap-1.5">
                            <button onClick={() => handleAddRubro(local.id)}
                              className="flex-1 bg-blue-600 text-white rounded-lg py-1 text-xs hover:bg-blue-700 transition-colors"
                            >Crear</button>
                            <button onClick={() => { setShowNewRubro(null); setNuevoRubro(''); }}
                              className="px-2 text-slate-400 hover:text-white transition-colors"
                            ><X size={13} /></button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowNewRubro(local.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-700/40"
                        >
                          <Plus size={12} /> Nuevo rubro
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {showNewLocal ? (
              <div className="px-2 py-2 space-y-1.5 mt-1">
                <input
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Nombre del local"
                  value={nuevoLocal}
                  onChange={e => setNuevoLocal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddLocal()}
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <button onClick={handleAddLocal}
                    className="flex-1 bg-blue-600 text-white rounded-lg py-1 text-xs hover:bg-blue-700 transition-colors"
                  >Crear</button>
                  <button onClick={() => { setShowNewLocal(false); setNuevoLocal(''); }}
                    className="px-2 text-slate-400 hover:text-white transition-colors"
                  ><X size={13} /></button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewLocal(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-700/40 mt-1"
              >
                <Plus size={12} /> Nuevo local
              </button>
            )}
          </div>
        </nav>

        <div className="px-4 py-3 border-t border-slate-700/50">
          <p className="text-xs text-slate-500">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3.5 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(o => !o)} className="md:hidden text-slate-500 hover:text-slate-800 transition">
            <Menu size={20} />
          </button>
          {isRubroActive ? (
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{getRubroIcon(activeView)}</span>
              <div>
                {activeLocal && (
                  <p className="text-xs text-slate-400 leading-none mb-0.5">{activeLocal.icon || '🏠'} {activeLocal.nombre}</p>
                )}
                <p className="font-semibold text-slate-800 leading-tight">{activeView.nombre}</p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="font-semibold text-slate-800">Panel de inicio</h1>
              <p className="text-xs text-slate-400">Resumen general del sistema</p>
            </div>
          )}
        </header>

        <main className="flex-1 px-3 md:px-6 py-4 md:py-6 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
          ) : isRubroActive ? (
            <RubroView
              rubro={activeView}
              initialSubrubro={initialSubrubro}
              onBack={() => { setActiveView('inicio'); setInitialSubrubro(null); cargar(); }}
            />
          ) : (
            <Dashboard
              locales={locales}
              rubros={rubros}
              rubroStats={rubroStats}
              onNavigate={handleNavigateFromVenc}
              onSelectRubro={(r) => { setActiveView(r); setInitialSubrubro(null); }}
            />
          )}
        </main>
      </div>

    </div>
    </>
  );
}
