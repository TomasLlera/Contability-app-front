import { useState, useEffect } from 'react';
import { appConfigApi, usersApi, auditApi, rubrosApi, subrubrosApi, authApi, backupApi, getErrorMsg } from '../api';
import toast from 'react-hot-toast';
import { Mail, Bell, Send, CheckCircle, Clock, Globe, DollarSign, Building2, Users, Plus, Trash2, KeyRound, Eye, EyeOff, ShieldCheck, ShieldAlert, History, LayoutDashboard, Crown, Database, Download, Upload, AlertTriangle } from 'lucide-react';
import AuditDetailModal from '../components/AuditDetailModal';
import InfoTooltip from '../components/InfoTooltip';

// Metadatos visuales por rol (jerarquía: superadmin > admin > viewer).
const ROLE_META = {
  superadmin: { label: 'Super Admin',   desc: 'Control total + gestión de usuarios', icon: Crown,       box: 'bg-amber-100 dark:bg-amber-900/40', iconCls: 'text-amber-600 dark:text-amber-400' },
  admin:      { label: 'Administrador',  desc: 'Administra funcionalidades',          icon: ShieldCheck, box: 'bg-blue-100 dark:bg-blue-900/40',   iconCls: 'text-blue-600 dark:text-blue-400' },
  viewer:     { label: 'Solo lectura',   desc: 'Acceso limitado (lectura)',           icon: ShieldAlert, box: 'bg-slate-200 dark:bg-slate-600',    iconCls: 'text-slate-500 dark:text-slate-400' },
};

const SECCIONES = [
  { key: 'alertas',   label: 'Alertas',    icon: Bell,           ready: true },
  { key: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard, ready: true },
  { key: 'usuarios',  label: 'Usuarios',   icon: Users,          ready: true },
  { key: 'auditoria', label: 'Auditoría',  icon: History,        ready: true },
  { key: 'backup',    label: 'Backup',     icon: Database,       ready: true },
  { key: 'idioma',    label: 'Idioma',     icon: Globe,      ready: false },
  { key: 'moneda',    label: 'Moneda',     icon: DollarSign, ready: false },
  { key: 'negocio',   label: 'Negocio',    icon: Building2,  ready: false },
];

function AuditoriaSection() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filtroRecurso, setFiltroRecurso] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [subrubros, setSubrubros] = useState({}); // id → { nombre, razon_social } para traducir el modal
  const limit = 25;

  // Carga (una vez) un mapa de subrubros para que el modal muestre nombres/proveedor
  // en lugar de IDs crudos. Tolerante a fallos: si falla, el modal cae a "#id".
  useEffect(() => {
    (async () => {
      try {
        const rubros = await rubrosApi.getAll();
        const listas = await Promise.all((rubros || []).map(r => subrubrosApi.getByRubro(r.id).catch(() => [])));
        const map = {};
        for (const lista of listas) for (const s of (lista || [])) map[s.id] = { nombre: s.nombre, razon_social: s.razon_social };
        setSubrubros(map);
      } catch { /* sin lookup: el modal usa #id */ }
    })();
  }, []);

  const cargar = async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit };
      if (filtroRecurso) params.recurso = filtroRecurso;
      if (filtroUsuario) params.usuario = filtroUsuario;
      const res = await auditApi.list(params);
      setItems(res.items || []);
      setTotal(res.total || 0);
      setPage(p);
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(1); }, []); // eslint-disable-line

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const accionColor = (a) => ({
    create: 'text-green-600 dark:text-green-400',
    update: 'text-blue-600 dark:text-blue-400',
    delete: 'text-red-600 dark:text-red-400',
    login: 'text-slate-500 dark:text-slate-400',
    login_failed: 'text-orange-600 dark:text-orange-400',
  }[a] || 'text-slate-500');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-0.5">Auditoría</h2>
        <p className="text-xs text-slate-400">Historial de cambios en el sistema ({total} registros)</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Filtrar por recurso (ej: movimiento)"
          value={filtroRecurso}
          onChange={e => setFiltroRecurso(e.target.value)}
          className="flex-1 min-w-40 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Usuario"
          value={filtroUsuario}
          onChange={e => setFiltroUsuario(e.target.value)}
          className="flex-1 sm:flex-none sm:w-40 min-w-24 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={() => cargar(1)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0">
          Filtrar
        </button>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="max-h-125 overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
              <tr className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                <th className="text-left px-3 py-2 font-medium">Fecha</th>
                <th className="text-left px-3 py-2 font-medium">Usuario</th>
                <th className="text-left px-3 py-2 font-medium">Acción</th>
                <th className="text-left px-3 py-2 font-medium">Recurso</th>
                <th className="text-left px-3 py-2 font-medium">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Sin registros</td></tr>
              ) : items.map(it => (
                <tr key={it._id} onClick={() => setDetalle(it)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(it.fecha).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
                  </td>
                  <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200">{it.usuario}</td>
                  <td className={`px-3 py-1.5 font-medium ${accionColor(it.accion)}`}>{it.accion}</td>
                  <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{it.recurso}</td>
                  <td className="px-3 py-1.5">
                    <span className="text-blue-600 dark:text-blue-400 font-mono text-xs hover:underline">{it.recurso_id ?? '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Página {page} de {totalPages}</span>
        <div className="flex gap-1">
          <button
            disabled={page <= 1 || loading}
            onClick={() => cargar(page - 1)}
            className="px-3 py-1 border border-slate-200 dark:border-slate-600 rounded disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-700"
          >Anterior</button>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => cargar(page + 1)}
            className="px-3 py-1 border border-slate-200 dark:border-slate-600 rounded disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-700"
          >Siguiente</button>
        </div>
      </div>

      {detalle && <AuditDetailModal item={detalle} onClose={() => setDetalle(null)} lookups={{ subrubros }} />}
    </div>
  );
}

function Proximamente({ label }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <p className="text-2xl mb-3">🚧</p>
      <p className="font-semibold text-slate-600 dark:text-slate-300">{label}</p>
      <p className="text-sm text-slate-400 mt-1">Próximamente</p>
    </div>
  );
}

function DashboardSection() {
  const [rubros, setRubros] = useState(null);
  const [seleccion, setSeleccion] = useState([]);   // rubro_ids elegidos
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([rubrosApi.getAll(), appConfigApi.get()])
      .then(([rs, cfg]) => {
        setRubros(rs);
        setSeleccion(cfg.dashboard_tablas || []);
      })
      .catch(err => toast.error(getErrorMsg(err)));
  }, []);

  const toggle = (id) => {
    setSeleccion(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await appConfigApi.update({ dashboard_tablas: seleccion });
      toast.success('Dashboard actualizado');
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  if (rubros === null) return <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Cargando...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-0.5">Tablas del dashboard</h2>
        <p className="text-xs text-slate-400">Elegí qué rubros mostrar como tablas de "Saldos mensuales". Cada uno incluye su gráfico. Si no elegís ninguno, se muestra Proveedores por defecto.</p>
      </div>

      {rubros.length === 0 ? (
        <p className="text-sm text-slate-400">No hay rubros creados todavía.</p>
      ) : (
        <div className="space-y-1.5">
          {rubros.map(r => {
            const checked = seleccion.includes(r.id);
            return (
              <label
                key={r.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  checked
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(r.id)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">{r.nombre}</span>
              </label>
            );
          })}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
      >
        <CheckCircle size={15} />
        {saving ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  );
}

function AlertasSection() {
  const [config, setConfig] = useState(null);
  const [email, setEmail] = useState('');
  const [activas, setActivas] = useState(false);
  const [dias, setDias] = useState(7);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    appConfigApi.get().then(cfg => {
      setConfig(cfg);
      setEmail(cfg.email_alertas || '');
      setActivas(cfg.alertas_activas || false);
      setDias(cfg.dias_anticipacion || 7);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await appConfigApi.update({ email_alertas: email.trim(), alertas_activas: activas, dias_anticipacion: Number(dias) });
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!email.trim()) { toast.error('Ingresá un email primero'); return; }
    setTesting(true);
    try {
      await appConfigApi.update({ email_alertas: email.trim(), alertas_activas: activas, dias_anticipacion: Number(dias) });
      const res = await appConfigApi.testEmail();
      toast.success(res.message);
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setTesting(false);
    }
  };

  if (!config) return <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Cargando...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-0.5">Alertas por email</h2>
        <p className="text-xs text-slate-400">Recibí un email cuando haya facturas por vencer</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Email de destino</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="ejemplo@mail.com"
            className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            <Clock size={12} className="inline mr-1" />Días de anticipación
          </label>
          <select
            value={dias}
            onChange={e => setDias(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[3, 5, 7, 10, 14, 30].map(d => (
              <option key={d} value={d}>{d} días antes del vencimiento</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setActivas(v => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${activas ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${activas ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <div className="flex items-center gap-1.5">
            <Bell size={13} className={activas ? 'text-blue-600' : 'text-slate-400'} />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {activas ? 'Alertas activadas' : 'Alertas desactivadas'}
            </span>
          </div>
        </label>
      </div>

      <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <CheckCircle size={14} />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          onClick={handleTestEmail}
          disabled={testing || !email.trim()}
          className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <Send size={14} />
          {testing ? 'Enviando...' : 'Enviar prueba'}
        </button>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">"Enviar prueba" manda un email ahora con los vencimientos actuales.</p>
    </div>
  );
}

function UsuariosSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevoUser, setNuevoUser] = useState('');
  const [nuevoPass, setNuevoPass] = useState('');
  const [nuevoRole, setNuevoRole] = useState('viewer');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassId, setChangingPassId] = useState(null);
  const [newPassValue, setNewPassValue] = useState('');

  const isSuper = authApi.getRole() === 'superadmin';

  const cargar = () => usersApi.getAll().then(setUsers).finally(() => setLoading(false));
  useEffect(() => { cargar(); }, []);

  const handleCreate = async () => {
    if (!nuevoUser.trim() || !nuevoPass.trim()) { toast.error('Completá usuario y contraseña'); return; }
    if (nuevoPass.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    setSaving(true);
    try {
      await usersApi.create(nuevoUser.trim(), nuevoPass, nuevoRole);
      toast.success('Usuario creado');
      setNuevoUser(''); setNuevoPass('');
      cargar();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await usersApi.delete(id);
      toast.success('Usuario eliminado');
      cargar();
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const handleChangeRole = async (id, role) => {
    try {
      await usersApi.update(id, { role });
      toast.success('Rol actualizado');
      cargar();
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const handleToggleActivo = async (u) => {
    try {
      await usersApi.update(u.id, { activo: !u.activo });
      toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado');
      cargar();
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const handleChangePass = async (id) => {
    if (!newPassValue || newPassValue.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    try {
      await usersApi.changePassword(id, newPassValue);
      toast.success('Contraseña actualizada');
      setChangingPassId(null); setNewPassValue('');
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  if (loading) return <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Cargando...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-0.5">Usuarios</h2>
        <p className="text-xs text-slate-400">
          {isSuper ? 'Gestioná quién puede acceder y con qué permisos' : 'Listado de usuarios del sistema'}
        </p>
      </div>

      {!isSuper && (
        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          <Crown size={14} /> Solo un Super Administrador puede crear, editar o eliminar usuarios.
        </div>
      )}

      <div className="space-y-2">
        {users.map(u => {
          const meta = ROLE_META[u.role] || ROLE_META.viewer;
          const Icon = meta.icon;
          return (
            <div key={u.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 ${u.activo === false ? 'opacity-60' : ''}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.box}`}>
                <Icon size={14} className={meta.iconCls} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                  {u.usuario}
                  {u.activo === false && <span className="text-[10px] uppercase tracking-wide bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded">Inactivo</span>}
                </p>
                <p className="text-xs text-slate-400">{meta.label}</p>
              </div>

              {isSuper && changingPassId === u.id ? (
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <input
                    type="password"
                    value={newPassValue}
                    onChange={e => setNewPassValue(e.target.value)}
                    placeholder="Nueva contraseña"
                    autoFocus
                    className="flex-1 sm:flex-none sm:w-36 min-w-0 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={() => handleChangePass(u.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700">OK</button>
                  <button onClick={() => { setChangingPassId(null); setNewPassValue(''); }} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
                </div>
              ) : isSuper ? (
                <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                  <select
                    value={u.role}
                    onChange={e => handleChangeRole(u.id, e.target.value)}
                    title="Cambiar rol"
                    className="text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="superadmin">Super Admin</option>
                    <option value="admin">Administrador</option>
                    <option value="viewer">Solo lectura</option>
                  </select>
                  <button onClick={() => handleToggleActivo(u)} className="text-slate-400 hover:text-amber-600 transition-colors text-xs px-1.5 py-1 rounded" title={u.activo === false ? 'Activar' : 'Desactivar'}>
                    {u.activo === false ? 'Activar' : 'Pausar'}
                  </button>
                  <button onClick={() => { setChangingPassId(u.id); setNewPassValue(''); }} className="text-slate-400 hover:text-blue-600 transition-colors" title="Cambiar contraseña">
                    <KeyRound size={14} />
                  </button>
                  <button onClick={() => handleDelete(u.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {isSuper && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nuevo usuario</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={nuevoUser} onChange={e => setNuevoUser(e.target.value)} placeholder="Usuario" className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400" />
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={nuevoPass} onChange={e => setNuevoPass(e.target.value)} placeholder="Contraseña (mín. 6)" className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400" />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <select value={nuevoRole} onChange={e => setNuevoRole(e.target.value)} className="flex-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="viewer">Solo lectura</option>
              <option value="admin">Administrador</option>
              <option value="superadmin">Super Admin</option>
            </select>
            <button onClick={handleCreate} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
              <Plus size={14} /> {saving ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BackupSection() {
  const isSuper = authApi.getRole() === 'superadmin';
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('merge');
  const [historial, setHistorial] = useState([]);

  const cargarHistorial = () => {
    auditApi.list({ recurso: 'backup_export', limit: 5 })
      .then(r => setHistorial(r.items || []))
      .catch(() => {});
  };
  useEffect(() => { if (isSuper) cargarHistorial(); }, [isSuper]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await backupApi.exportZip();
      toast.success('Backup descargado');
      cargarHistorial();
    } catch (err) { toast.error(err?.message || getErrorMsg(err)); }
    finally { setExporting(false); }
  };

  const handleImport = async () => {
    if (!file) { toast.error('Elegí un archivo de backup'); return; }
    if (mode === 'replace' && !window.confirm('Modo REEMPLAZAR: se borrarán los datos actuales de cada módulo antes de cargar el backup. ¿Continuar?')) return;
    setImporting(true);
    try {
      const res = await backupApi.importFile(file, mode);
      const total = Object.keys(res.importado || {}).length;
      toast.success(`Backup importado (${total} módulos)`);
      setFile(null);
    } catch (err) { toast.error(err?.message || getErrorMsg(err)); }
    finally { setImporting(false); }
  };

  if (!isSuper) {
    return (
      <div className="space-y-3">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Backup y Recuperación</h2>
        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          <Crown size={14} /> Solo un Super Administrador puede exportar o importar backups.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-0.5">Backup y Recuperación</h2>
        <p className="text-xs text-slate-400">Exportá todos los datos (sectorizados por módulo) o restaurá desde un backup anterior.</p>
      </div>

      {/* Exportar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Download size={15} className="text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Exportar backup completo</h3>
          <InfoTooltip text="Genera un ZIP con metadata, un JSON por módulo (rubros, movimientos, caja, stock, IVA, configuración, auditoría) y un volcado para reimportar. Los usuarios se exportan sin contraseñas." width="w-64" />
        </div>
        <button onClick={handleExport} disabled={exporting} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5">
          <Download size={14} /> {exporting ? 'Generando...' : 'Descargar backup (.zip)'}
        </button>
      </div>

      {/* Importar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Upload size={15} className="text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Importar backup</h3>
          <InfoTooltip text="Subí un .zip o .json generado por esta app. No modifica usuarios ni auditoría." width="w-64" />
        </div>
        <input
          type="file"
          accept=".zip,.json,application/zip,application/json"
          onChange={e => setFile(e.target.files?.[0] || null)}
          className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200 mb-3"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select value={mode} onChange={e => setMode(e.target.value)} className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="merge">Combinar (upsert por ID)</option>
            <option value="replace">Reemplazar (borra y carga)</option>
          </select>
          <button onClick={handleImport} disabled={importing || !file} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
            <Upload size={14} /> {importing ? 'Importando...' : 'Importar'}
          </button>
        </div>
        {mode === 'replace' && (
          <p className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 mt-2">
            <AlertTriangle size={13} /> Reemplazar borra los datos actuales de cada módulo del backup. Hacé un backup nuevo antes.
          </p>
        )}
      </div>

      {/* Historial */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Últimos backups exportados</h3>
        {historial.length === 0 ? (
          <p className="text-xs text-slate-400">Todavía no se exportó ningún backup.</p>
        ) : (
          <ul className="space-y-1.5">
            {historial.map(h => (
              <li key={h._id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">{new Date(h.fecha).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</span>
                <span className="text-slate-400">{h.usuario}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          Para backups automáticos de fin de mes, programá un Cron Job (Render) que descargue <code className="text-slate-500">/api/backup/export</code> el último día del mes.
        </p>
      </div>
    </div>
  );
}

export default function SettingsView() {
  const [seccion, setSeccion] = useState('alertas');
  const activa = SECCIONES.find(s => s.key === seccion);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">

        {/* Secciones: tabs horizontales con scroll en mobile, barra lateral en desktop.
            Fija, la barra de 11rem no deja ancho usable al contenido en un celular. */}
        <nav className="flex sm:flex-col sm:w-44 shrink-0 overflow-x-auto sm:overflow-x-visible border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-700 sm:py-2">
          {SECCIONES.map(s => {
            const Icon = s.icon;
            const isActive = seccion === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSeccion(s.key)}
                className={`shrink-0 sm:w-full flex items-center gap-2.5 px-4 py-2.5 text-sm whitespace-nowrap transition-colors text-left ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium border-b-2 sm:border-b-0 sm:border-r-2 border-blue-600 dark:border-blue-400 sm:-mr-px'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="sm:flex-1">{s.label}</span>
                {!s.ready && (
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 px-1 rounded">
                    pronto
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Contenido */}
        <div className="flex-1 min-w-0 p-4 sm:p-6">
          {activa?.key === 'alertas' ? <AlertasSection />
            : activa?.key === 'dashboard' ? <DashboardSection />
            : activa?.key === 'usuarios' ? <UsuariosSection />
            : activa?.key === 'auditoria' ? <AuditoriaSection />
            : activa?.key === 'backup' ? <BackupSection />
            : <Proximamente label={activa?.label} />
          }
        </div>

      </div>
    </div>
  );
}
