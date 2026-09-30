import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  BellRing, Plus, Pencil, Trash2, Pause, Play, CalendarDays, Clock, Users, User,
  Archive, History, CheckCircle2, XCircle, Star,
} from 'lucide-react';
import { recordatoriosApi, rubrosApi, subrubrosApi, usersApi, authApi, getErrorMsg } from '../api';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import InfoTooltip from './InfoTooltip';
import Skeleton from './Skeleton';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const hoyStr = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });

const sumarDias = (fecha, n) => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const fmtFechaCorta = (f) => {
  const d = new Date(`${f}T00:00:00`);
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' });
};

// "Hoy · 09:00" / "Mañana al iniciar sesión" / "lun 11/08 · 13:00"
function textoProxima(rec) {
  if (!rec.activo) return 'Pausado';
  if (rec.archivado) return 'Archivado';
  if (!rec.proxima_fecha) return 'Sin próxima aparición';
  const hoy = hoyStr();
  const dia = rec.proxima_fecha === hoy ? 'Hoy'
    : rec.proxima_fecha === sumarDias(hoy, 1) ? 'Mañana'
    : fmtFechaCorta(rec.proxima_fecha);
  return rec.proxima_hora ? `${dia} · ${rec.proxima_hora}` : `${dia}, al iniciar sesión`;
}

function textoProgramacion(rec) {
  if (rec.tipo_programacion === 'semanal') {
    return `Cada ${(rec.dias_semana || []).map(d => DIAS[d]).join(', ')}`;
  }
  return rec.fecha_especifica ? `El ${fmtFechaCorta(rec.fecha_especifica)}` : 'Sin fecha';
}

function textoFrecuencia(rec) {
  switch (rec.frecuencia_tipo) {
    case 'cada_x_horas': return `Cada ${rec.frecuencia_valor} h`;
    case 'n_veces': return `${rec.frecuencia_valor} ${rec.frecuencia_valor === 1 ? 'vez' : 'veces'} al día`;
    case 'horarios_fijos': return (rec.horarios || []).join(' · ');
    default: return 'Una vez al día';
  }
}

// --- Formulario -------------------------------------------------------------

const FORM_VACIO = {
  titulo: '',
  mensaje: '',
  tipo_programacion: 'hoy',
  fecha_especifica: '',
  dias_semana: [],
  frecuencia_tipo: 'una_vez',
  frecuencia_valor: 3,
  horarios: [],
  rubro_id: '',
  subrubros_ids: [],
  subrubros_prioritarios_ids: [],
  alcance: 'global',
  usuario_id: '',
};

function RecordatorioForm({ inicial, rubros, usuarios, onClose, onSaved }) {
  const yoId = authApi.getUserId();
  const [form, setForm] = useState(() => (inicial ? {
    ...FORM_VACIO,
    ...inicial,
    fecha_especifica: inicial.fecha_especifica || '',
    rubro_id: inicial.rubro_id ?? '',
    usuario_id: inicial.usuario_id ?? '',
  } : { ...FORM_VACIO, fecha_especifica: hoyStr() }));
  const [subrubros, setSubrubros] = useState([]);
  const [nuevoHorario, setNuevoHorario] = useState('09:00');
  const [saving, setSaving] = useState(false);

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));

  // Los subrubros del rubro elegido. Vaciar la lista al cambiar de rubro lo hace el
  // propio `onChange` del select —junto con descartar los ya tildados—, así el efecto
  // solo trae datos y no arrastra los del rubro anterior mientras carga.
  useEffect(() => {
    if (!form.rubro_id) return;
    let cancelado = false;
    subrubrosApi.getByRubro(form.rubro_id)
      .then(list => { if (!cancelado) setSubrubros(list || []); })
      .catch(() => { if (!cancelado) setSubrubros([]); });
    return () => { cancelado = true; };
  }, [form.rubro_id]);

  const toggleDia = (d) => set('dias_semana', form.dias_semana.includes(d)
    ? form.dias_semana.filter(x => x !== d)
    : [...form.dias_semana, d].sort());

  // Desvincular un subrubro también le saca la prioridad: si no, quedaría marcado como
  // urgente algo que el recordatorio ya no menciona.
  const toggleSub = (id) => setForm(f => {
    const dentro = f.subrubros_ids.includes(id);
    return {
      ...f,
      subrubros_ids: dentro ? f.subrubros_ids.filter(x => x !== id) : [...f.subrubros_ids, id],
      subrubros_prioritarios_ids: dentro
        ? f.subrubros_prioritarios_ids.filter(x => x !== id)
        : f.subrubros_prioritarios_ids,
    };
  });

  // La prioridad solo tiene sentido sobre un subrubro ya vinculado, así que tildar la
  // estrella lo vincula de paso en vez de no hacer nada.
  const togglePrioritario = (id) => setForm(f => ({
    ...f,
    subrubros_ids: f.subrubros_ids.includes(id) ? f.subrubros_ids : [...f.subrubros_ids, id],
    subrubros_prioritarios_ids: f.subrubros_prioritarios_ids.includes(id)
      ? f.subrubros_prioritarios_ids.filter(x => x !== id)
      : [...f.subrubros_prioritarios_ids, id],
  }));

  const agregarHorario = () => {
    if (!/^\d{2}:\d{2}$/.test(nuevoHorario) || form.horarios.includes(nuevoHorario)) return;
    set('horarios', [...form.horarios, nuevoHorario].sort());
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        rubro_id: form.rubro_id === '' ? null : Number(form.rubro_id),
        frecuencia_valor: Number(form.frecuencia_valor),
        // Sin destinatario elegido, un recordatorio personal queda para quien lo crea.
        usuario_id: form.alcance !== 'personal' ? null
          : form.usuario_id === '' ? yoId
          : Number(form.usuario_id),
      };
      if (inicial) await recordatoriosApi.update(inicial.id, payload);
      else await recordatoriosApi.create(payload);
      toast.success(inicial ? 'Recordatorio actualizado' : 'Recordatorio creado');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400';
  const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5';

  const chip = (activo) => `px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
    activo
      ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-300'
      : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
  }`;

  return (
    <Modal
      title={inicial ? 'Editar recordatorio' : 'Nuevo recordatorio'}
      onClose={onClose}
      size="xl"
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="press flex-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.titulo.trim()}
            className="press flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Crear recordatorio'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className={labelCls}>Título</label>
          <input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Hacer pedidos" maxLength={120} className={inputCls} autoFocus />
        </div>

        <div>
          <label className={labelCls}>Mensaje</label>
          <textarea
            value={form.mensaje}
            onChange={e => set('mensaje', e.target.value)}
            rows={2}
            placeholder="Hoy hay que hacer pedidos a los siguientes proveedores:"
            className={`${inputCls} resize-y`}
          />
        </div>

        {/* Programación */}
        <div>
          <label className={`${labelCls} flex items-center gap-1.5`}>
            <CalendarDays size={12} /> Cuándo se activa
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {[
              ['hoy', 'Solo hoy'],
              ['unico', 'Día único'],
              ['semanal', 'Semanal'],
            ].map(([val, label]) => (
              <button key={val} type="button" onClick={() => set('tipo_programacion', val)} className={chip(form.tipo_programacion === val)}>
                {label}
              </button>
            ))}
          </div>

          {form.tipo_programacion === 'unico' && (
            <input type="date" value={form.fecha_especifica} onChange={e => set('fecha_especifica', e.target.value)} className={inputCls} />
          )}
          {form.tipo_programacion === 'semanal' && (
            <div className="flex flex-wrap gap-1.5">
              {DIAS.map((d, i) => (
                <button key={i} type="button" onClick={() => toggleDia(i)} className={chip(form.dias_semana.includes(i))}>
                  {d}
                </button>
              ))}
            </div>
          )}
          {form.tipo_programacion === 'hoy' && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Aparece solo hoy ({fmtFechaCorta(hoyStr())}) y después se archiva.</p>
          )}
        </div>

        {/* Frecuencia */}
        <div>
          <label className={`${labelCls} flex items-center gap-1.5`}>
            <Clock size={12} /> Cada cuánto reaparece
            <InfoTooltip
              text="La primera vez del día siempre aparece al iniciar sesión, sea cual sea la frecuencia. Después sigue este intervalo. Si lo marcás como completado no vuelve hasta el día siguiente."
              width="w-64"
            />
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {[
              ['una_vez', 'Una vez'],
              ['cada_x_horas', 'Cada X horas'],
              ['n_veces', 'N veces por día'],
              ['horarios_fijos', 'Horarios fijos'],
            ].map(([val, label]) => (
              <button key={val} type="button" onClick={() => set('frecuencia_tipo', val)} className={chip(form.frecuencia_tipo === val)}>
                {label}
              </button>
            ))}
          </div>

          {(form.frecuencia_tipo === 'cada_x_horas' || form.frecuencia_tipo === 'n_veces') && (
            <div className="flex items-center gap-2">
              <input
                type="number" min={1} max={24}
                value={form.frecuencia_valor}
                onChange={e => set('frecuencia_valor', e.target.value)}
                className={`${inputCls} w-24`}
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {form.frecuencia_tipo === 'cada_x_horas'
                  ? 'horas entre apariciones'
                  : 'veces, repartidas entre las 08:00 y las 15:00'}
              </span>
            </div>
          )}

          {form.frecuencia_tipo === 'horarios_fijos' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="time" value={nuevoHorario} onChange={e => setNuevoHorario(e.target.value)} className={`${inputCls} w-32`} />
                <button type="button" onClick={agregarHorario} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600">
                  Agregar
                </button>
              </div>
              {form.horarios.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.horarios.map(h => (
                    <button key={h} type="button" onClick={() => set('horarios', form.horarios.filter(x => x !== h))} className={`${chip(true)} flex items-center gap-1`}>
                      {h} <span className="opacity-60">✕</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Vínculo con rubro/subrubros */}
        <div>
          <label className={labelCls}>
            Rubro vinculado <span className="text-slate-500 dark:text-slate-400 font-normal">(opcional)</span>
          </label>
          <select
            value={form.rubro_id}
            onChange={e => { setSubrubros([]); setForm(f => ({ ...f, rubro_id: e.target.value, subrubros_ids: [] })); }}
            className={inputCls}
          >
            <option value="">Sin vínculo</option>
            {rubros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>

          {form.rubro_id !== '' && (
            <div className="mt-2.5">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                Elegí los subrubros que el aviso tiene que listar. Cada uno se puede tildar como hecho.
                <InfoTooltip
                  text="La estrella marca los prioritarios: van primero y resaltados en el aviso. Sirve para no tener que nombrarlos otra vez dentro del mensaje."
                  width="w-64"
                />
              </p>
              {subrubros.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Este rubro no tiene subrubros.</p>
              ) : (
                <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                  {subrubros.map(s => {
                    const elegido = form.subrubros_ids.includes(s.id);
                    const prioritario = form.subrubros_prioritarios_ids.includes(s.id);
                    return (
                      <div key={s.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                        <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                          <input type="checkbox" checked={elegido} onChange={() => toggleSub(s.id)} className="w-4 h-4 rounded accent-blue-600 shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{s.nombre}</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => togglePrioritario(s.id)}
                          aria-pressed={prioritario}
                          title={prioritario ? 'Quitar prioridad' : 'Marcar como prioritario'} aria-label={prioritario ? 'Quitar prioridad' : 'Marcar como prioritario'}
                          className={`tap shrink-0 transition-colors ${
                            prioritario ? 'text-amber-600 dark:text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                          }`}
                        >
                          <Star size={15} className={prioritario ? 'fill-current' : ''} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alcance */}
        <div>
          <label className={labelCls}>
            Para quién
            <InfoTooltip
              text="Todos: lo ven todos los usuarios. Un usuario: solo el que elijas. En los dos casos, completar o postergar es individual — que otro lo marque no te lo silencia."
              width="w-64"
            />
          </label>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => set('alcance', 'global')} className={`${chip(form.alcance === 'global')} flex items-center gap-1.5`}>
              <Users size={12} /> Todos
            </button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, alcance: 'personal', usuario_id: f.usuario_id === '' ? (yoId ?? '') : f.usuario_id }))}
              className={`${chip(form.alcance === 'personal')} flex items-center gap-1.5`}
            >
              <User size={12} /> Un usuario
            </button>
          </div>

          {form.alcance === 'personal' && (
            <select
              value={form.usuario_id}
              onChange={e => set('usuario_id', e.target.value)}
              className={`${inputCls} mt-2`}
            >
              {usuarios.length === 0 && <option value="">Cargando usuarios…</option>}
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>
                  {u.usuario}{u.id === yoId ? ' (vos)' : ''}{u.activo === false ? ' — inactivo' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </Modal>
  );
}

// --- Historial --------------------------------------------------------------

function Historial() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    recordatoriosApi.getHistorial(30).then(setItems).catch(() => setItems([]));
  }, []);

  if (items === null) return <p className="text-xs text-slate-500 dark:text-slate-400">Cargando historial…</p>;
  if (!items.length) return <p className="text-xs text-slate-500 dark:text-slate-400">Todavía no se mostró ningún recordatorio.</p>;

  const META = {
    completado: { icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400', label: 'Completado' },
    ignorado:   { icon: XCircle,      cls: 'text-slate-500 dark:text-slate-400',                          label: 'Ignorado' },
    postergado: { icon: Clock,        cls: 'text-amber-600 dark:text-amber-400',      label: 'Postergado' },
    pendiente:  { icon: Clock,        cls: 'text-blue-500 dark:text-blue-400',        label: 'Pendiente' },
  };

  return (
    <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
      {items.map(e => {
        const meta = META[e.estado] || META.pendiente;
        const Icon = meta.icon;
        return (
          <li key={e.id} className="flex items-center gap-2.5 py-2 text-xs">
            <Icon size={14} className={`shrink-0 ${meta.cls}`} />
            <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-200">{e.titulo}</span>
            <span className={`shrink-0 ${meta.cls}`}>{meta.label}</span>
            <span className="shrink-0 text-slate-500 dark:text-slate-400 tabular-nums">{fmtFechaCorta(e.fecha)}</span>
          </li>
        );
      })}
    </ul>
  );
}

// --- Sección ----------------------------------------------------------------

export default function RecordatoriosManager() {
  const isAdmin = authApi.getRole() !== 'viewer';
  const [items, setItems] = useState(null);
  const [rubros, setRubros] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [editando, setEditando] = useState(undefined);   // undefined = cerrado · null = alta · obj = edición
  const [aBorrar, setABorrar] = useState(null);
  const [verHistorial, setVerHistorial] = useState(false);

  const cargar = () => recordatoriosApi.getAll().then(setItems).catch(err => { toast.error(getErrorMsg(err)); setItems([]); });

  useEffect(() => {
    cargar();
    rubrosApi.getAll().then(setRubros).catch(() => setRubros([]));
    // Solo un admin puede listar usuarios; un viewer no ve el formulario, así que la
    // lista vacía no le falta a nadie.
    if (isAdmin) usersApi.getAll().then(setUsuarios).catch(() => setUsuarios([]));
  }, [isAdmin]);

  const { vigentes, archivados } = useMemo(() => ({
    vigentes: (items || []).filter(r => !r.archivado),
    archivados: (items || []).filter(r => r.archivado),
  }), [items]);

  const togglePausa = async (rec) => {
    try {
      await recordatoriosApi.update(rec.id, { activo: !rec.activo });
      toast.success(rec.activo ? 'Recordatorio pausado' : 'Recordatorio activado');
      cargar();
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const borrar = async () => {
    try {
      await recordatoriosApi.delete(aBorrar.id);
      toast.success('Recordatorio eliminado');
      setABorrar(null);
      cargar();
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  if (items === null) return <Skeleton variante="lista" filas={3} />;

  const Fila = ({ rec }) => (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 ${!rec.activo || rec.archivado ? 'opacity-60' : ''}`}>
      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
        <BellRing size={14} className="text-amber-600 dark:text-amber-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
          {rec.titulo}
          {rec.alcance === 'personal' && (
            <span className="text-xs uppercase tracking-wide bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded">
              Solo {rec.usuario_nombre || `#${rec.usuario_id}`}
            </span>
          )}
          {rec.archivado && (
            <span className="text-xs uppercase tracking-wide bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded">Archivado</span>
          )}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {textoProgramacion(rec)} · {textoFrecuencia(rec)}
          {rec.subrubros?.length > 0 && ` · ${rec.subrubros.length} subrubro${rec.subrubros.length !== 1 ? 's' : ''}`}
          {rec.subrubros_prioritarios_ids?.length > 0 && ` (${rec.subrubros_prioritarios_ids.length} prioritario${rec.subrubros_prioritarios_ids.length !== 1 ? 's' : ''})`}
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400">{textoProxima(rec)}</p>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto justify-end">
          {!rec.archivado && (
            <button onClick={() => togglePausa(rec)} className="tap text-slate-500 dark:text-slate-400 hover:text-amber-600 transition-colors" title={rec.activo ? 'Pausar' : 'Activar'} aria-label={rec.activo ? 'Pausar' : 'Activar'}>
              {rec.activo ? <Pause size={15} /> : <Play size={15} />}
            </button>
          )}
          <button onClick={() => setEditando(rec)} className="tap text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors" title="Editar" aria-label="Editar">
            <Pencil size={15} />
          </button>
          <button onClick={() => setABorrar(rec)} className="tap text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors" title="Eliminar" aria-label="Eliminar">
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-0.5 flex items-center gap-1.5">
            Recordatorios
            <InfoTooltip
              text="Avisos que aparecen como tarjeta en el Dashboard: memos, tareas recurrentes, pedidos a proveedores. Solo un administrador los crea o edita; cualquier usuario los ve y los marca como completados. Nunca bloquean la app y se cierran con Esc."
              width="w-72"
            />
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Aparecen en el Dashboard según su programación.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setEditando(null)}
            className="shrink-0 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5"
          >
            <Plus size={14} /> Nuevo
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          <BellRing size={14} /> Solo un administrador puede crear o editar recordatorios. Vos los ves en el Dashboard.
        </div>
      )}

      {vigentes.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No hay recordatorios cargados.</p>
      ) : (
        <div className="space-y-2">
          {vigentes.map(rec => <Fila key={rec.id} rec={rec} />)}
        </div>
      )}

      {archivados.length > 0 && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <Archive size={12} /> Archivados ({archivados.length})
          </p>
          {archivados.map(rec => <Fila key={rec.id} rec={rec} />)}
        </div>
      )}

      {isAdmin && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={() => setVerHistorial(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hover:text-slate-700 dark:hover:text-slate-200"
          >
            <History size={12} /> Historial (últimos 30 días)
          </button>
          {verHistorial && <div className="mt-2"><Historial /></div>}
        </div>
      )}

      {editando !== undefined && (
        <RecordatorioForm
          inicial={editando}
          rubros={rubros}
          usuarios={usuarios}
          onClose={() => setEditando(undefined)}
          onSaved={cargar}
        />
      )}

      {aBorrar && (
        <ConfirmModal
          message={`¿Eliminar el recordatorio "${aBorrar.titulo}"? También se borra su historial de apariciones.`}
          onConfirm={borrar}
          onCancel={() => setABorrar(null)}
        />
      )}
    </div>
  );
}
