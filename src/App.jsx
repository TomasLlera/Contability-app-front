import { useState, useEffect, useRef } from 'react';
import { rubrosApi, subrubrosApi, localesApi, authApi, getErrorMsg } from './api';
import RubroView from './views/RubroView';
import Dashboard from './views/Dashboard';
import Graficas from './views/Graficas';
import CajaView from './views/CajaView';
import SettingsView from './views/SettingsView';
import StockView from './views/StockView';
import IvaView from './views/IvaView';
import VentaSistemaView from './views/VentaSistemaView';
import TarjetasView from './views/TarjetasView';
import Login from './views/Login';
import BuscadorGlobal from './components/BuscadorGlobal';
import CargaRapidaModal from './components/CargaRapidaModal';
import ConfirmModal from './components/ConfirmModal';
import BottomNav from './components/BottomNav';
import RecordatorioPopup from './components/RecordatorioPopup';
import useRecordatorios from './hooks/useRecordatorios';
import { Home, BarChart2, ChevronDown, ChevronRight, ChevronLeft, ChevronsLeft, Plus, X, Pencil, Trash2, Check, LogOut, Menu, Moon, Sun, PanelLeft, PanelRight, ChevronUp, Search, Zap, Wallet, Settings, Boxes, Building2, Receipt, ClipboardList, BellRing } from 'lucide-react';
import { useIsMobileShell } from './hooks/useMediaQuery';
import ConfirmHost from './components/ConfirmHost';
import { EntityIcon } from './icons';
import { ICON_LIST, resolveIconKey } from './iconos';
import toast, { Toaster } from 'react-hot-toast';
import './index.css';

const RUBRO_ICONS = ['folder', 'users', 'factory', 'store', 'truck', 'briefcase', 'construction', 'package'];

// Devuelve siempre una key del registro de iconos (resuelve emojis viejos).
function getRubroIcon(rubro) {
  if (rubro.icon) return resolveIconKey(rubro.icon) || rubro.icon;
  const n = rubro.nombre.toLowerCase();
  if (n.includes('emple') || n.includes('person') || n.includes('staff')) return 'users';
  if (n.includes('provee') || n.includes('vendor')) return 'truck';
  if (n.includes('client') || n.includes('venta')) return 'store';
  if (n.includes('empresa') || n.includes('socio')) return 'factory';
  if (n.includes('gasto') || n.includes('servicio')) return 'briefcase';
  return RUBRO_ICONS[rubro.nombre.charCodeAt(0) % RUBRO_ICONS.length];
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => {
    if (authApi.checkInactivity()) return false;
    return authApi.isLoggedIn();
  });
  const [role, setRole] = useState(() => authApi.getRole());
  const [locales, setLocales] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [rubroStats, setRubroStats] = useState({});
  const [activeView, setActiveView] = useState('inicio');
  const [initialSubrubro, setInitialSubrubro] = useState(null);
  // Se incrementa para pedirle a RubroView que vuelva a la lista de subrubros.
  const [rubroNonce, setRubroNonce] = useState(0);
  const [expandedLocales, setExpandedLocales] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [localesSectionOpen, setLocalesSectionOpen] = useState(true);
  const [ivaSectionOpen, setIvaSectionOpen] = useState(false);
  const [registroSectionOpen, setRegistroSectionOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });
  const [sidebarRight, setSidebarRight] = useState(() => localStorage.getItem('sidebarSide') === 'right');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCargaRapida, setShowCargaRapida] = useState(false);
  const isMobileShell = useIsMobileShell();
  // Recordatorios del día. El estado vive acá —y no en el Dashboard— porque el botón
  // de la campana está en el header global. El popup, en cambio, se renderiza solo en
  // Inicio: trabajando en Caja o cargando un movimiento nada interrumpe.
  const recordatorios = useRecordatorios(loggedIn);
  const mainRef = useRef(null);
  const editingRubroRef = useRef(null);
  const editingLocalRef = useRef(null);
  const newRubroRef = useRef(null);

  // El que scrollea es <main> (el shell mide h-dvh): así el header queda fijo
  // arriba con Buscar y Carga rápida siempre a mano. Antes el shell era
  // min-h-screen, scrolleaba el document y este listener nunca se disparaba.
  // Depende de `loggedIn`: sin sesión <main> no existe y el ref está vacío.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 300);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [loggedIn]);

  // Cada sección arranca arriba: con un solo contenedor de scroll para toda la
  // app, cambiar de vista conservaba la posición de la anterior.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [activeView]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
  const [graficaRubroId, setGraficaRubroId] = useState(null); // rubro a preseleccionar al abrir Gráficas
  const [graficaMetrica, setGraficaMetrica] = useState(null); // métrica (facturado/pagado/diferencia) a mostrar
  const [editingRubro, setEditingRubro] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (!editingRubro) return;
    const handler = (e) => {
      if (editingRubroRef.current && !editingRubroRef.current.contains(e.target)) {
        setEditingRubro(null); setShowIconPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editingRubro]);

  useEffect(() => {
    if (showNewRubro === null) return;
    const handler = (e) => {
      if (newRubroRef.current && !newRubroRef.current.contains(e.target)) {
        setShowNewRubro(null); setNuevoRubro('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNewRubro]);

  useEffect(() => {
    if (!editingLocal) return;
    const handler = (e) => {
      if (editingLocalRef.current && !editingLocalRef.current.contains(e.target)) {
        setEditingLocal(null); setShowLocalIconPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editingLocal]);

  // Declarada antes del efecto que la usa (antes estaba más abajo: funcionaba, pero
  // el efecto accedía a una constante todavía no declarada en el código).
  // Cadena de promesas (no async/await): el estado solo se toca en los callbacks,
  // así el efecto que la llama no hace setState síncrono. Devuelve la promesa.
  const cargar = () => Promise.all([localesApi.getAll(), rubrosApi.getAll()])
    .then(([ls, rs]) => {
      setLocales(ls);
      setRubros(rs);
      setLoading(false);
      return Promise.all(rs.map(r => subrubrosApi.getByRubro(r.id).then(subs => [r.id, subs.length])));
    })
    .then(pares => setRubroStats(Object.fromEntries(pares)));

  useEffect(() => {
    if (loggedIn) {
      authApi.refreshIfNeeded();
      cargar();

      // Cierra sesión tras 1 hora de inactividad (persiste entre recargas)
      authApi.updateActivity();
      const updateActivity = () => authApi.updateActivity();
      window.addEventListener('mousemove', updateActivity);
      window.addEventListener('keydown', updateActivity);
      window.addEventListener('click', updateActivity);
      window.addEventListener('touchstart', updateActivity);
      const inactivityInterval = setInterval(() => {
        if (authApi.checkInactivity()) setLoggedIn(false);
      }, 60 * 1000);

      return () => {
        clearInterval(inactivityInterval);
        window.removeEventListener('mousemove', updateActivity);
        window.removeEventListener('keydown', updateActivity);
        window.removeEventListener('click', updateActivity);
        window.removeEventListener('touchstart', updateActivity);
      };
    }
    // Sin sesión no hace falta tocar `loading`: se muestra el login antes de mirarlo.
  }, [loggedIn]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleSidebarSide = () => setSidebarRight(v => {
    const next = !v;
    localStorage.setItem('sidebarSide', next ? 'right' : 'left');
    return next;
  });

  const toggleSidebarCollapsed = () => setSidebarCollapsed(v => {
    const next = !v;
    localStorage.setItem('sidebarCollapsed', String(next));
    return next;
  });


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
    } catch (err) {
      toast.error(getErrorMsg(err));
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
    if (rubro) {
      setActiveView(rubro);
      setInitialSubrubro(subrubro || null);
      closeSidebar();
    }
  };

  const isRubroActive = activeView !== 'inicio' && activeView !== 'graficas' && activeView?.id;
  const activeLocal = isRubroActive ? locales.find(l => l.id === activeView.local_id) : null;
  const enInicio = activeView === 'inicio';

  if (!loggedIn) return <Login onLogin={() => { setLoggedIn(true); setRole(authApi.getRole()); }} />;

  const closeSidebar = () => setSidebarOpen(false);

  const irA = (view) => { setActiveView(view); setInitialSubrubro(null); closeSidebar(); };

  // Vuelve a la lista de subrubros del rubro abierto (desde el breadcrumb del header).
  const irARubro = () => { setInitialSubrubro(null); setRubroNonce(n => n + 1); };

  const TITULOS = {
    inicio:              ['Inicio', 'Resumen general del sistema'],
    graficas:            ['Gráficas', 'Tendencias y resumen financiero'],
    caja:                ['Caja del día', 'Registro diario de movimientos'],
    stock:               ['Stock', 'Gestión de productos e inventario'],
    'iva-compras':       ['IVA', 'Compras, ventas y diferencia mensual'],
    'iva-ventas':        ['IVA', 'Compras, ventas y diferencia mensual'],
    'registro-ventas':   ['Venta Sistema', 'Registro diario y evolución mensual de ventas'],
    'registro-tarjetas': ['Tarjetas', 'QR, débito, crédito y prepagas'],
    config:              ['Configuración', 'Alertas y preferencias del sistema'],
  };
  const [titulo, subtitulo] = TITULOS[activeView] || TITULOS.inicio;

  return (
    <>
    <Toaster
      // En el shell mobile, abajo quedaba encima de la bottom navigation.
      position={isMobileShell ? 'top-center' : 'bottom-right'}
      toastOptions={{
        duration: 3000,
        // Tokens de index.css: cambian solos con el tema.
        style: { background: 'var(--color-surface)', color: 'var(--color-fg)', border: '1px solid var(--color-border)' },
      }}
    />
    {confirmModal && (
      <ConfirmModal
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />
    )}
    <ConfirmHost />
    {/* h-dvh (no min-h-screen): el shell mide exactamente el viewport y el que
        scrollea es <main>. Así el header queda fijo sin depender de `sticky`,
        que el overflow-hidden de la columna anulaba. */}
    <div className={`h-dvh bg-slate-50 dark:bg-slate-900 flex ${sidebarRight ? 'flex-row-reverse' : ''}`}>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static top-0 z-30 bg-slate-900 flex flex-col shrink-0 h-dvh transition-[width,transform] duration-200
        ${sidebarCollapsed ? 'w-64 lg:w-6' : 'w-64'}
        ${sidebarRight ? 'right-0 left-auto' : 'left-0'}
        ${sidebarOpen ? 'translate-x-0' : sidebarRight ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0`}>

        {/* Strip colapsado — solo desktop */}
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          aria-label="Mostrar barra lateral"
          className={`${sidebarCollapsed ? 'hidden lg:flex' : 'hidden'} flex-1 flex-col items-center justify-center cursor-pointer transition-colors group
            ${sidebarRight ? 'border-l-2' : 'border-r-2'} border-slate-500 hover:border-blue-400 bg-slate-900 hover:bg-slate-800`}
        >
          {sidebarRight
            ? <ChevronLeft size={12} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
            : <ChevronRight size={12} className="text-slate-500 group-hover:text-blue-400 transition-colors" />}
        </button>

        {/* Contenido completo */}
        <div className={`${sidebarCollapsed ? 'lg:hidden' : ''} flex flex-col flex-1 min-h-0`}>
        <div className="px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* El PNG trae fondo oscuro propio: el rounded-lg lo integra al sidebar
                  en vez de dejar un rectángulo duro recortado contra el fondo. */}
              <img src="/favicon.png" alt="" className="w-8 h-8 rounded-lg shrink-0" />
              <div>
                <p className="text-white font-bold text-sm leading-tight">Kontia</p>
                <p className="text-slate-400 text-xs">Gestión de cuentas</p>
              </div>
            </div>
            <button
              onClick={() => { authApi.logout(); setLoggedIn(false); }}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <nav aria-label="Secciones" className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
          <NavItem icon={Home} label="Inicio" active={activeView === 'inicio'} onClick={() => irA('inicio')} />
          <NavItem icon={BarChart2} label="Gráficas" active={activeView === 'graficas'} onClick={() => irA('graficas')} />
          <NavItem icon={Wallet} label="Caja del día" active={activeView === 'caja'} onClick={() => irA('caja')} />
          <NavItem icon={Boxes} label="Stock" active={activeView === 'stock'} onClick={() => irA('stock')} />

          <NavItem
            icon={Receipt} label="IVA"
            active={activeView === 'iva-compras' || activeView === 'iva-ventas'}
            expanded={ivaSectionOpen}
            onClick={() => setIvaSectionOpen(v => !v)}
          />
          {ivaSectionOpen && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700/40 pl-2">
              <NavSubItem label="Compras" active={activeView === 'iva-compras'} onClick={() => irA('iva-compras')} />
              <NavSubItem label="Ventas" active={activeView === 'iva-ventas'} onClick={() => irA('iva-ventas')} />
            </div>
          )}

          <NavItem
            icon={ClipboardList} label="Registro"
            active={activeView === 'registro-ventas' || activeView === 'registro-tarjetas'}
            expanded={registroSectionOpen}
            onClick={() => setRegistroSectionOpen(v => !v)}
          />
          {registroSectionOpen && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700/40 pl-2">
              <NavSubItem label="Venta Sistema" active={activeView === 'registro-ventas'} onClick={() => irA('registro-ventas')} />
              <NavSubItem label="Tarjetas" active={activeView === 'registro-tarjetas'} onClick={() => irA('registro-tarjetas')} />
            </div>
          )}

          <NavItem icon={Settings} label="Configuración" active={activeView === 'config'} onClick={() => irA('config')} />

          <div className="pt-1">
            <button
              onClick={() => setLocalesSectionOpen(v => !v)}
              aria-expanded={localesSectionOpen}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-11 rounded-lg text-sm font-medium transition-colors text-slate-300 hover:bg-slate-700/60 hover:text-white"
            >
              <Building2 size={15} />
              <span className="flex-1 text-left">Locales</span>
              <span className="text-xs text-slate-400 mr-1">{locales.length}</span>
              {localesSectionOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>

            {localesSectionOpen && <>
            {locales.map(local => {
              const localRubros = rubros.filter(r => r.local_id === local.id);
              const isExpanded = expandedLocales.has(local.id);
              return (
                <div key={local.id}>
                  {editingLocal === local.id ? (
                    <div ref={editingLocalRef} className="px-2 py-1.5 space-y-1.5">
                      <div className="flex items-center gap-1">
                        <button type="button"
                          onClick={() => setShowLocalIconPicker(o => !o)}
                          aria-label="Cambiar ícono"
                          className="bg-slate-700 hover:bg-slate-600 rounded px-1.5 py-1 shrink-0 text-slate-200"
                        ><EntityIcon value={editLocalIcon} fallback="home" size={16} /></button>
                        <input
                          aria-label="Nombre del local"
                          className="flex-1 min-w-0 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={editLocalNombre}
                          onChange={e => setEditLocalNombre(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveLocalEdit(local, e)}
                          autoFocus
                        />
                        <button onClick={e => handleSaveLocalEdit(local, e)} aria-label="Guardar" className="tap text-green-400 hover:text-green-300 shrink-0 p-1"><Check size={14} /></button>
                        <button onClick={e => { e.stopPropagation(); setEditingLocal(null); setShowLocalIconPicker(false); }} aria-label="Cancelar" className="tap text-slate-400 hover:text-slate-300 shrink-0 p-1 ml-1"><X size={14} /></button>
                      </div>
                      {showLocalIconPicker && (
                        <IconPicker value={editLocalIcon} onPick={(ic) => { setEditLocalIcon(ic); setShowLocalIconPicker(false); }} />
                      )}
                    </div>
                  ) : (
                    <SidebarRow
                      onClick={() => toggleLocal(local.id)}
                      ariaExpanded={isExpanded}
                      className="px-3 py-2 min-h-11 lg:min-h-0 text-slate-300 hover:bg-slate-700/50 hover:text-slate-200"
                      count={localRubros.length}
                      onEdit={() => { setEditingLocal(local.id); setEditLocalNombre(local.nombre); setEditLocalIcon(resolveIconKey(local.icon) || 'home'); setShowLocalIconPicker(false); }}
                      onDelete={(e) => handleDeleteLocal(local.id, e)}
                      editLabel={`Editar local ${local.nombre}`}
                      deleteLabel={`Borrar local ${local.nombre}`}
                    >
                      {isExpanded ? <ChevronDown size={11} className="shrink-0" /> : <ChevronRight size={11} className="shrink-0" />}
                      <span className="shrink-0"><EntityIcon value={local.icon} fallback="home" size={14} /></span>
                      <span className="flex-1 text-left truncate text-sm lg:text-xs font-medium">{local.nombre}</span>
                    </SidebarRow>
                  )}

                  {isExpanded && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700/40 pl-2">
                      {localRubros.map(rubro => (
                        <div key={rubro.id}>
                          {editingRubro === rubro.id ? (
                            <div ref={editingRubroRef} className="py-1 space-y-1.5">
                              <div className="flex items-center gap-1">
                                <button type="button"
                                  onClick={() => setShowIconPicker(o => !o)}
                                  aria-label="Cambiar ícono"
                                  className="bg-slate-700 hover:bg-slate-600 rounded px-1.5 py-1 shrink-0 text-slate-200"
                                ><EntityIcon value={editIcon} size={16} /></button>
                                <input
                                  aria-label="Nombre del rubro"
                                  className="flex-1 min-w-0 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={editNombre}
                                  onChange={e => setEditNombre(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleSaveRubroEdit(rubro, e)}
                                  autoFocus
                                />
                                <button onClick={e => handleSaveRubroEdit(rubro, e)} aria-label="Guardar" className="tap text-green-400 hover:text-green-300 shrink-0 p-1"><Check size={14} /></button>
                                <button onClick={e => { e.stopPropagation(); setEditingRubro(null); setShowIconPicker(false); }} aria-label="Cancelar" className="tap text-slate-400 hover:text-slate-300 shrink-0 p-1 ml-1"><X size={14} /></button>
                              </div>
                              {showIconPicker && (
                                <IconPicker value={editIcon} onPick={(ic) => { setEditIcon(ic); setShowIconPicker(false); }} />
                              )}
                            </div>
                          ) : (
                            <SidebarRow
                              onClick={() => irA(rubro)}
                              current={isRubroActive && activeView.id === rubro.id}
                              className={`px-2 py-1.5 min-h-11 lg:min-h-0 text-sm ${
                                isRubroActive && activeView.id === rubro.id
                                  ? 'bg-slate-700 text-white'
                                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                              }`}
                              count={rubroStats[rubro.id] ?? 0}
                              onEdit={() => { setEditingRubro(rubro.id); setEditNombre(rubro.nombre); setEditIcon(getRubroIcon(rubro)); setShowIconPicker(false); }}
                              onDelete={(e) => handleDeleteRubro(rubro.id, e)}
                              editLabel={`Editar rubro ${rubro.nombre}`}
                              deleteLabel={`Borrar rubro ${rubro.nombre}`}
                            >
                              <span className="shrink-0"><EntityIcon value={getRubroIcon(rubro)} size={14} /></span>
                              <span className="flex-1 text-left truncate text-sm lg:text-xs">{rubro.nombre}</span>
                            </SidebarRow>
                          )}
                        </div>
                      ))}

                      {showNewRubro === local.id ? (
                        <div ref={newRubroRef} className="py-2 space-y-1.5">
                          <input
                            aria-label="Nombre del rubro"
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Nombre del rubro"
                            value={nuevoRubro}
                            onChange={e => setNuevoRubro(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddRubro(local.id)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleAddRubro(local.id)}
                              className="flex-1 min-h-11 lg:min-h-0 bg-blue-600 text-white rounded-lg py-1 text-xs hover:bg-blue-700 transition-colors"
                            >Crear</button>
                            <button onClick={() => { setShowNewRubro(null); setNuevoRubro(''); }} aria-label="Cancelar"
                              className="min-w-11 lg:min-w-0 px-2 text-slate-400 hover:text-white transition-colors"
                            ><X size={13} /></button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowNewRubro(local.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 min-h-11 lg:min-h-0 text-sm lg:text-xs text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-700/40"
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
                  aria-label="Nombre del local"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Nombre del local"
                  value={nuevoLocal}
                  onChange={e => setNuevoLocal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddLocal()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleAddLocal}
                    className="flex-1 min-h-11 lg:min-h-0 bg-blue-600 text-white rounded-lg py-1 text-xs hover:bg-blue-700 transition-colors"
                  >Crear</button>
                  <button onClick={() => { setShowNewLocal(false); setNuevoLocal(''); }} aria-label="Cancelar"
                    className="min-w-11 lg:min-w-0 px-2 text-slate-400 hover:text-white transition-colors"
                  ><X size={13} /></button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewLocal(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 min-h-11 lg:min-h-0 text-sm lg:text-xs text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-700/40 mt-1"
              >
                <Plus size={12} /> Nuevo local
              </button>
            )}
            </>}
          </div>
        </nav>

        <div className="px-4 py-3 border-t border-slate-700/50 space-y-1">
          <p className="text-xs text-slate-400">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {/* Íconos con etiqueta corta: en 256px las tres etiquetas largas no
              entraban y "Ocultar" quedaba cortado contra el borde. */}
          <div className="flex items-center gap-1 -ml-2">
            <button
              onClick={() => setDarkMode(v => !v)}
              className="flex items-center gap-1.5 min-h-11 lg:min-h-9 px-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={darkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {darkMode ? <Sun size={13} /> : <Moon size={13} />}
              {darkMode ? 'Claro' : 'Oscuro'}
            </button>
            {/* Lado de la barra y ocultarla son preferencias de escritorio: en mobile
                el sidebar es un drawer y ninguna de las dos hace nada útil. */}
            <button
              onClick={toggleSidebarSide}
              className="hidden lg:flex items-center min-h-9 px-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={sidebarRight ? 'Mover la barra a la izquierda' : 'Mover la barra a la derecha'}
              aria-label={sidebarRight ? 'Mover la barra a la izquierda' : 'Mover la barra a la derecha'}
            >
              {sidebarRight ? <PanelLeft size={14} /> : <PanelRight size={14} />}
            </button>
            <button
              onClick={toggleSidebarCollapsed}
              className="hidden lg:flex items-center min-h-9 px-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Ocultar barra lateral"
              aria-label="Ocultar barra lateral"
            >
              <ChevronsLeft size={14} className={sidebarRight ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
        </div>{/* fin contenido completo */}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="shrink-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 lg:px-6 py-3 flex items-center gap-3">
          {!sidebarRight && (
            <button onClick={() => setSidebarOpen(o => !o)} aria-label="Abrir menú"
              className="lg:hidden shrink-0 w-11 h-11 -ml-2 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 active:bg-slate-100 dark:active:bg-slate-700/60 transition">
              <Menu size={22} />
            </button>
          )}
          {isRubroActive ? (
            // Breadcrumb Local › Rubro. Antes había dos "volver" apilados (la
            // flecha del header iba a Inicio y la del contenido al rubro); ahora el
            // header dice dónde estás y el nombre del rubro lleva a su lista.
            <nav aria-label="Ubicación" className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0 text-slate-500 dark:text-slate-400"><EntityIcon value={getRubroIcon(activeView)} size={20} /></span>
              <div className="min-w-0">
                {activeLocal && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-none mb-0.5 flex items-center gap-1 truncate"><EntityIcon value={activeLocal.icon} fallback="home" size={12} /> {activeLocal.nombre}</p>
                )}
                <button onClick={irARubro} className="block max-w-full truncate font-semibold text-slate-800 dark:text-slate-100 leading-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {activeView.nombre}
                </button>
              </div>
            </nav>
          ) : (
            <div className="min-w-0">
              <h1 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{titulo}</h1>
              {/* En mobile el subtítulo se partía en dos líneas y el header llegaba a 85px. */}
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 truncate">{subtitulo}</p>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {/* Campana: abre a mano los recordatorios del día sin esperar al próximo
                aviso. Solo en Inicio, que es donde se muestran. Un recordatorio sigue
                vivo todo el día —se puede abrir las veces que haga falta— hasta que
                se marca como completado. */}
            {enInicio && recordatorios.totalHoy > 0 && (
              <button
                onClick={recordatorios.abrirTodos}
                aria-label="Ver recordatorios del día"
                title="Recordatorios del día"
                className="relative flex items-center justify-center text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg w-11 h-11 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 gap-1.5 text-xs font-medium transition-colors"
              >
                <BellRing size={18} className="sm:w-3.25 sm:h-3.25" />
                <span className="hidden sm:block">Recordatorios</span>
                <span className="absolute -top-1 -right-1 sm:static min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                  {recordatorios.totalHoy}
                </span>
              </button>
            )}
            <button
              onClick={() => setShowSearch(true)}
              aria-label="Buscar"
              className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg w-11 h-11 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 transition-colors bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
              title="Buscar (Ctrl+K)"
            >
              <Search size={18} className="sm:w-3.25 sm:h-3.25" />
              <span className="hidden sm:block">Buscar</span>
              <kbd className="hidden sm:block font-sans opacity-60">Ctrl K</kbd>
            </button>
            <button
              onClick={() => setShowCargaRapida(true)}
              aria-label="Carga rápida"
              className="flex items-center justify-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg w-11 h-11 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 transition-colors font-medium shadow-sm"
              title="Carga rápida"
            >
              <Zap size={18} className="sm:w-3.25 sm:h-3.25" />
              <span className="hidden sm:block">Carga rápida</span>
            </button>
          </div>
          {sidebarRight && (
            <button onClick={() => setSidebarOpen(o => !o)} aria-label="Abrir menú"
              className="lg:hidden shrink-0 w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 active:bg-slate-100 dark:active:bg-slate-700/60 transition">
              <Menu size={22} />
            </button>
          )}
        </header>

        {/* Sin swipe para abrir el sidebar: capturaba cualquier arrastre horizontal
            del contenido (p. ej. scrollear la tabla de un subrubro) y lo abría solo.
            En mobile se abre únicamente con el botón de las tres líneas. */}
        <main
          ref={mainRef}
          className="flex-1 min-h-0 px-3 lg:px-6 py-4 lg:py-6 overflow-y-auto overflow-x-hidden overscroll-contain pb-bottomnav"
        >
          {loading ? (
            <CargandoSkeleton />
          ) : isRubroActive ? (
            <RubroView
              rubro={activeView}
              initialSubrubro={initialSubrubro}
              nonce={rubroNonce}
              onBack={() => { setActiveView('inicio'); setInitialSubrubro(null); cargar(); }}
              sidebarRight={sidebarRight}
              role={role}
            />
          ) : activeView === 'graficas' ? (
            <Graficas rubros={rubros} initialRubroId={graficaRubroId} initialMetrica={graficaMetrica} />
          ) : activeView === 'caja' ? (
            <CajaView rubros={rubros} onNavigate={handleNavigateFromVenc} />
          ) : activeView === 'stock' ? (
            <StockView role={role} />
          ) : activeView === 'iva-compras' || activeView === 'iva-ventas' ? (
            <IvaView key={activeView} initialTab={activeView === 'iva-ventas' ? 'ventas' : 'compras'} role={role} />
          ) : activeView === 'registro-ventas' ? (
            <VentaSistemaView role={role} />
          ) : activeView === 'registro-tarjetas' ? (
            <TarjetasView role={role} />
          ) : activeView === 'config' ? (
            <SettingsView />
          ) : (
            <Dashboard
              locales={locales}
              rubros={rubros}
              rubroStats={rubroStats}
              onNavigate={handleNavigateFromVenc}
              onViewChange={(view) => { setActiveView(view); closeSidebar(); }}
              onOpenGrafica={(rubroId, metrica = 'facturado') => { setGraficaRubroId(rubroId); setGraficaMetrica(metrica); setActiveView('graficas'); closeSidebar(); }}
            />
          )}
        </main>
      </div>

    </div>

    {/* La barra vive fuera del shell (hermana del div de arriba, hija directa del
        fragmento raíz) para que su `position: fixed` se resuelva contra el
        viewport: cualquier ancestro con transform/filter la convertiría en
        `absolute` y la dejaría flotando en medio del contenido.
        Se oculta con el drawer abierto: la barra es z-40 y el drawer z-30, así
        que si no quedaba pisándolo. */}
    {!sidebarOpen && (
      <BottomNav
        activeView={activeView}
        onNavigate={(view) => irA(view)}
        onOpenDrawer={() => setSidebarOpen(true)}
      />
    )}

    {showScrollTop && (
      <button
        onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        // `.bottom-above-nav` (index.css): por encima de la bottom nav en mobile,
        // el mismo offset que usan los demás elementos fijos.
        className={`fixed bottom-above-nav z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-lg rounded-full w-11 h-11 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-xl transition-all ${sidebarRight ? 'left-4 lg:left-6' : 'right-4 lg:right-6'}`}
        title="Volver arriba"
        aria-label="Volver arriba"
      >
        <ChevronUp size={20} />
      </button>
    )}

    {showSearch && (
      <BuscadorGlobal
        onNavigate={handleNavigateFromVenc}
        onClose={() => setShowSearch(false)}
      />
    )}

    {showCargaRapida && (
      <CargaRapidaModal
        rubros={rubros}
        onClose={() => setShowCargaRapida(false)}
        onSaved={() => { if (isRubroActive) cargar(activeView); }}
      />
    )}

    {/* Recordatorios: solo en Inicio, y nunca sobre un modal abierto (la pila es z-40,
        los modales z-50). El latido sigue corriendo en el resto de las secciones, así
        que al volver al inicio está todo lo que se acumuló mientras tanto. */}
    {enInicio && !showSearch && !showCargaRapida && (
      <RecordatorioPopup
        items={recordatorios.pendientes}
        onCompletar={recordatorios.completar}
        onPostergar={recordatorios.postergar}
        onDescartar={recordatorios.descartar}
        onToggleItem={recordatorios.toggleItem}
        onNavigate={handleNavigateFromVenc}
      />
    )}
    </>
  );
}

// ── Piezas del sidebar ──────────────────────────────────────────────────────
// Antes cada entrada repetía la misma cadena de clases de ~200 caracteres.

const NAV_ACTIVO = 'bg-linear-to-b from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-500/30 ring-1 ring-blue-400/30';
const NAV_INACTIVO = 'text-slate-300 hover:bg-slate-700/60 hover:text-white';

function NavItem({ icon, label, active, onClick, expanded }) {
  const Icon = icon;
  const esGrupo = expanded !== undefined;
  return (
    <button
      onClick={onClick}
      aria-current={active && !esGrupo ? 'page' : undefined}
      aria-expanded={esGrupo ? expanded : undefined}
      className={`press w-full flex items-center gap-2.5 px-3 py-2.5 min-h-11 rounded-lg text-sm font-medium ${active ? NAV_ACTIVO : NAV_INACTIVO}`}
    >
      <Icon size={15} />
      <span className="flex-1 text-left">{label}</span>
      {esGrupo && (expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
    </button>
  );
}

function NavSubItem({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center gap-2 px-2 py-1.5 min-h-11 lg:min-h-0 rounded-lg text-sm lg:text-xs transition-colors ${
        active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
      }`}
    >{label}</button>
  );
}

// Fila del árbol Locales/Rubros con editar y borrar. Las acciones son botones
// HERMANOS del botón principal (antes eran <span role=button> anidados dentro de
// otro <button>: HTML inválido y fuera del alcance del teclado). Con mouse
// aparecen al pasar por encima y ceden el lugar del contador; en touch están
// siempre, separadas 8px para que sus áreas de 44px no se pisen.
function SidebarRow({ children, onClick, className, count, onEdit, onDelete, editLabel, deleteLabel, current, ariaExpanded }) {
  return (
    <div className="group relative flex items-center rounded-lg">
      <button
        onClick={onClick}
        aria-current={current ? 'page' : undefined}
        aria-expanded={ariaExpanded}
        className={`flex-1 min-w-0 flex items-center gap-2 rounded-lg transition-colors ${className}`}
      >
        {children}
        <span className="text-xs text-slate-500 [@media(hover:none)]:hidden group-hover:hidden group-focus-within:hidden">{count}</span>
      </button>
      <span className="absolute right-1 flex items-center gap-2 [@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover:flex [@media(hover:hover)]:group-focus-within:flex">
        <button type="button" aria-label={editLabel} title={editLabel}
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="tap text-slate-400 hover:text-blue-400 transition-colors p-1 rounded"
        ><Pencil size={13} /></button>
        <button type="button" aria-label={deleteLabel} title={deleteLabel}
          onClick={(e) => { e.stopPropagation(); onDelete(e); }}
          className="tap text-slate-400 hover:text-red-400 transition-colors p-1 rounded"
        ><Trash2 size={13} /></button>
      </span>
    </div>
  );
}

function IconPicker({ value, onPick }) {
  return (
    <div className="grid grid-cols-6 gap-0.5 bg-slate-800 rounded-lg p-1.5">
      {ICON_LIST.map(ic => (
        <button key={ic} type="button" aria-label={ic}
          onClick={() => onPick(ic)}
          className={`flex items-center justify-center p-1.5 rounded hover:bg-slate-600 transition-colors ${value === ic ? 'bg-slate-600 text-white' : 'text-slate-300'}`}
        ><EntityIcon value={ic} size={16} /></button>
      ))}
    </div>
  );
}

// Carga inicial: la forma de la pantalla en vez de un "Cargando..." suelto.
function CargandoSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-4" aria-busy="true" aria-label="Cargando">
      <div className="skeleton h-7 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-24" />)}
      </div>
      {[0, 1, 2, 3, 4].map(i => <div key={i} className="skeleton h-16" />)}
    </div>
  );
}
