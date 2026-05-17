import { useState, useEffect } from 'react';
import { appConfigApi, usersApi, auditApi, getErrorMsg } from '../api';
import toast from 'react-hot-toast';
import { Mail, Bell, Send, CheckCircle, Clock, Globe, DollarSign, Building2, Users, Plus, Trash2, KeyRound, Eye, EyeOff, ShieldCheck, ShieldAlert, History } from 'lucide-react';

const SECCIONES = [
  { key: 'alertas',   label: 'Alertas',    icon: Bell,       ready: true },
  { key: 'usuarios',  label: 'Usuarios',   icon: Users,      ready: true },
  { key: 'auditoria', label: 'Auditoría',  icon: History,    ready: true },
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
  const limit = 25;

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

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Filtrar por recurso (ej: movimiento)"
          value={filtroRecurso}
          onChange={e => setFiltroRecurso(e.target.value)}
          className="flex-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Usuario"
          value={filtroUsuario}
          onChange={e => setFiltroUsuario(e.target.value)}
          className="w-40 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={() => cargar(1)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Filtrar
        </button>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="max-h-125 overflow-y-auto">
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
                <tr key={it._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(it.fecha).toLocaleString('es-AR')}
                  </td>
                  <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200">{it.usuario}</td>
                  <td className={`px-3 py-1.5 font-medium ${accionColor(it.accion)}`}>{it.accion}</td>
                  <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{it.recurso}</td>
                  <td className="px-3 py-1.5 text-slate-400 font-mono text-xs">{it.recurso_id ?? '-'}</td>
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
        <p className="text-xs text-slate-400">Gestioná quién puede acceder y con qué permisos</p>
      </div>

      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${u.role === 'admin' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-200 dark:bg-slate-600'}`}>
              {u.role === 'admin' ? <ShieldCheck size={14} className="text-blue-600 dark:text-blue-400" /> : <ShieldAlert size={14} className="text-slate-500 dark:text-slate-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{u.usuario}</p>
              <p className="text-xs text-slate-400">{u.role === 'admin' ? 'Administrador' : 'Solo lectura'}</p>
            </div>
            {changingPassId === u.id ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="password"
                  value={newPassValue}
                  onChange={e => setNewPassValue(e.target.value)}
                  placeholder="Nueva contraseña"
                  autoFocus
                  className="w-36 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={() => handleChangePass(u.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700">OK</button>
                <button onClick={() => { setChangingPassId(null); setNewPassValue(''); }} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => { setChangingPassId(u.id); setNewPassValue(''); }} className="text-slate-400 hover:text-blue-600 transition-colors" title="Cambiar contraseña">
                  <KeyRound size={14} />
                </button>
                <button onClick={() => handleDelete(u.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Eliminar">
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nuevo usuario</p>
        <div className="grid grid-cols-2 gap-2">
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
          </select>
          <button onClick={handleCreate} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
            <Plus size={14} /> {saving ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsView() {
  const [seccion, setSeccion] = useState('alertas');
  const activa = SECCIONES.find(s => s.key === seccion);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex gap-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">

        {/* Barra lateral de secciones */}
        <nav className="w-44 shrink-0 border-r border-slate-100 dark:border-slate-700 py-2">
          {SECCIONES.map(s => {
            const Icon = s.icon;
            const isActive = seccion === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSeccion(s.key)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium border-r-2 border-blue-600 dark:border-blue-400 -mr-px'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="flex-1">{s.label}</span>
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
        <div className="flex-1 p-6">
          {activa?.key === 'alertas' ? <AlertasSection />
            : activa?.key === 'usuarios' ? <UsuariosSection />
            : activa?.key === 'auditoria' ? <AuditoriaSection />
            : <Proximamente label={activa?.label} />
          }
        </div>

      </div>
    </div>
  );
}
