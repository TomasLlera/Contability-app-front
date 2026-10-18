import { useState } from 'react';
import { ArrowUp, ArrowDown, Pencil, Trash2, Check, X, Plus, Loader2, Star, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { bancosApi, getErrorMsg } from '../api';
import useBancos from '../hooks/useBancos';
import { confirmar } from '../utils/confirmar';

const COLORES = ['#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#64748b'];
const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const iconBtn = 'shrink-0 w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent';

/**
 * ABM de bancos de la Caja del Día: crear, editar (nombre, alias, color), reordenar,
 * elegir el predeterminado y activar/desactivar. Un banco con movimientos no se
 * elimina (solo se desactiva). Con un solo banco activo la Caja se ve como siempre.
 */
export default function BancosManager({ isAdmin = true }) {
  const { bancos, recargar } = useBancos();
  const [ocupado, setOcupado] = useState(null);
  const [edit, setEdit] = useState(null); // { id, nombre, alias }
  const [nuevo, setNuevo] = useState({ nombre: '', alias: '' });

  const ejecutar = async (clave, fn, okMsg) => {
    setOcupado(clave);
    try {
      const r = await fn();
      if (okMsg) toast.success(okMsg);
      await recargar();
      return r ?? true;
    } catch (err) {
      toast.error(getErrorMsg(err));
      return null;
    } finally {
      setOcupado(null);
    }
  };

  const mover = (i, delta) => {
    const ids = bancos.map(b => b.id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    ejecutar('orden', () => bancosApi.reordenar(ids));
  };

  const eliminar = async (b) => {
    if (b.cantidad_usos > 0) {
      toast.error(`"${b.nombre}" tiene movimientos: no se puede eliminar. Desactivalo.`);
      return;
    }
    if (!(await confirmar({ message: `¿Eliminar "${b.nombre}"?`, detail: 'No tiene movimientos.', confirmLabel: 'Eliminar' }))) return;
    ejecutar(b.id, () => bancosApi.delete(b.id), 'Banco eliminado');
  };

  const crear = async (e) => {
    e.preventDefault();
    if (!nuevo.nombre.trim()) return;
    const ok = await ejecutar('nuevo', () => bancosApi.create({ nombre: nuevo.nombre.trim(), alias: nuevo.alias.trim(), color: COLORES[bancos.length % COLORES.length] }), 'Banco creado');
    if (ok) setNuevo({ nombre: '', alias: '' });
  };

  const guardarEdit = async () => {
    const ok = await ejecutar(edit.id, () => bancosApi.update(edit.id, { nombre: edit.nombre, alias: edit.alias }), 'Banco actualizado');
    if (ok) setEdit(null);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Cuentas bancarias de la Caja del Día. El <b>predeterminado</b> se elige solo al cargar una transferencia. Con dos o más bancos activos aparecen el desglose por banco y los movimientos entre bancos.
      </p>
      <ul className="space-y-2">
        {bancos.map((b, i) => (
          <li key={b.id} className={`rounded-xl border border-slate-200 dark:border-slate-700 p-2 sm:p-3 ${b.activo ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <div className="flex flex-col sm:flex-row shrink-0">
                  <button type="button" className={iconBtn} aria-label={`Subir ${b.nombre}`} disabled={i === 0 || !!ocupado} onClick={() => mover(i, -1)}><ArrowUp size={14} /></button>
                  <button type="button" className={iconBtn} aria-label={`Bajar ${b.nombre}`} disabled={i === bancos.length - 1 || !!ocupado} onClick={() => mover(i, 1)}><ArrowDown size={14} /></button>
                </div>
              )}
              {edit?.id === b.id ? (
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_8rem_auto] gap-1 items-center">
                  <input className={inputCls} value={edit.nombre} maxLength={60} aria-label="Nombre" autoFocus onChange={e => setEdit(x => ({ ...x, nombre: e.target.value }))} />
                  <input className={inputCls} value={edit.alias} maxLength={20} aria-label="Alias" placeholder="Alias" onChange={e => setEdit(x => ({ ...x, alias: e.target.value }))} />
                  <div className="flex">
                    <button type="button" className={iconBtn} aria-label="Guardar" onClick={guardarEdit}><Check size={15} /></button>
                    <button type="button" className={iconBtn} aria-label="Cancelar" onClick={() => setEdit(null)}><X size={15} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span aria-hidden className="w-3 h-3 rounded-full shrink-0" style={{ background: b.color }} />
                  <span className={`text-sm font-medium truncate ${b.activo ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 line-through'}`}>{b.nombre}</span>
                  {b.alias && <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">({b.alias})</span>}
                  {b.es_predeterminado && <span className="text-xs px-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0 inline-flex items-center gap-0.5"><Star size={10} /> Predeterminado</span>}
                  {!b.activo && <span className="text-xs px-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">Desactivado</span>}
                </div>
              )}
              {ocupado === b.id && <Loader2 size={14} className="animate-spin text-slate-500 shrink-0" />}
              {isAdmin && edit?.id !== b.id && (
                <>
                  {b.activo && !b.es_predeterminado && (
                    <button type="button" className={iconBtn} title="Hacer predeterminado" aria-label={`Hacer predeterminado a ${b.nombre}`} disabled={!!ocupado}
                      onClick={() => ejecutar(b.id, () => bancosApi.update(b.id, { es_predeterminado: true }), `${b.nombre} es el predeterminado`)}><Star size={14} /></button>
                  )}
                  <button type="button" className={iconBtn} aria-label={`Editar ${b.nombre}`} disabled={!!ocupado} onClick={() => setEdit({ id: b.id, nombre: b.nombre, alias: b.alias || '' })}><Pencil size={14} /></button>
                  <button type="button" className={iconBtn} title={b.activo ? 'Desactivar' : 'Reactivar'} aria-label={`${b.activo ? 'Desactivar' : 'Reactivar'} ${b.nombre}`} disabled={!!ocupado}
                    onClick={() => ejecutar(b.id, () => bancosApi.update(b.id, { activo: !b.activo }), b.activo ? 'Banco desactivado' : 'Banco reactivado')}>
                    {b.activo ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button type="button" className={`${iconBtn} hover:text-red-600`} aria-label={`Eliminar ${b.nombre}`} disabled={!!ocupado} onClick={() => eliminar(b)}><Trash2 size={14} /></button>
                </>
              )}
            </div>
            {isAdmin && b.activo && edit?.id !== b.id && (
              <div role="radiogroup" aria-label={`Color de ${b.nombre}`} className="mt-2 flex items-center gap-1 pl-1 sm:pl-[4.5rem]">
                {COLORES.map(col => (
                  <button key={col} type="button" role="radio" aria-checked={b.color === col} aria-label={`Color ${col}`} disabled={!!ocupado}
                    onClick={() => ejecutar(b.id, () => bancosApi.update(b.id, { color: col }))}
                    className="w-8 h-8 sm:w-6 sm:h-6 rounded-full flex items-center justify-center">
                    <span className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full ${b.color === col ? 'ring-2 ring-offset-2 ring-slate-500 dark:ring-offset-slate-800' : ''}`} style={{ background: col }} />
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
        {bancos.length === 0 && <li className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Todavía no hay bancos. Cargá el primero (o corré la migración).</li>}
      </ul>
      {isAdmin && (
        <form onSubmit={crear} className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-3 flex flex-col sm:flex-row gap-2">
          <input className={inputCls} placeholder="Nombre del banco" value={nuevo.nombre} maxLength={60} aria-label="Nombre del banco nuevo" onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))} />
          <input className={`${inputCls} sm:w-40`} placeholder="Alias (opcional)" value={nuevo.alias} maxLength={20} aria-label="Alias del banco nuevo" onChange={e => setNuevo(n => ({ ...n, alias: e.target.value }))} />
          <button type="submit" disabled={!nuevo.nombre.trim() || !!ocupado}
            className="shrink-0 min-h-11 sm:min-h-9 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1">
            {ocupado === 'nuevo' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Agregar
          </button>
        </form>
      )}
    </div>
  );
}
