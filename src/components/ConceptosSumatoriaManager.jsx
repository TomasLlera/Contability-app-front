import { useState } from 'react';
import { ArrowUp, ArrowDown, Pencil, Trash2, Check, X, Plus, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { sumatoriasApi, getErrorMsg } from '../api';
import { confirmar } from '../utils/confirmar';
import { COLORES_CONCEPTO } from '../utils/sumatoria';

const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const iconBtn = 'shrink-0 w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent';

/**
 * Gestión de los conceptos de un subrubro Sumatoria: crear, renombrar, reordenar,
 * color, «En Caja» y activar/desactivar. Un concepto con cargas no se elimina: se
 * desactiva (deja de ofrecerse, pero sus cargas siguen sumando).
 *
 * conceptos — lista actual (con cantidad_movimientos); onChange() — pedir recarga.
 */
export default function ConceptosSumatoriaManager({ subrubro, conceptos, onChange, onClose }) {
  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [nuevo, setNuevo] = useState('');
  const [nuevoEnCaja, setNuevoEnCaja] = useState(true);
  const [ocupado, setOcupado] = useState(null); // id (o 'nuevo' / 'orden') en curso

  const ejecutar = async (clave, fn, okMsg) => {
    setOcupado(clave);
    try {
      const r = await fn();
      if (okMsg) toast.success(typeof okMsg === 'function' ? okMsg(r) : okMsg);
      await onChange?.();
      return r;
    } catch (err) {
      toast.error(getErrorMsg(err));
      return null;
    } finally {
      setOcupado(null);
    }
  };

  const actualizar = (c, cambios, okMsg) => ejecutar(c.id, () => sumatoriasApi.updateConcepto(c.id, cambios), okMsg);

  const guardarNombre = async (c) => {
    const nombre = editNombre.replace(/\s+/g, ' ').trim();
    if (!nombre || nombre === c.nombre) { setEditId(null); return; }
    const r = await actualizar(c, { nombre }, 'Concepto renombrado');
    if (r) setEditId(null);
  };

  const mover = (i, delta) => {
    const ids = conceptos.map(c => c.id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    ejecutar('orden', () => sumatoriasApi.reordenarConceptos(subrubro.id, ids));
  };

  const eliminar = async (c) => {
    const conCargas = c.cantidad_movimientos > 0;
    const ok = await confirmar({
      message: conCargas ? `¿Desactivar "${c.nombre}"?` : `¿Eliminar "${c.nombre}"?`,
      detail: conCargas
        ? `Tiene ${c.cantidad_movimientos} carga${c.cantidad_movimientos !== 1 ? 's' : ''}: no se elimina, se desactiva. Deja de ofrecerse al cargar, pero sus cargas siguen sumando.`
        : 'No tiene cargas, se elimina.',
      confirmLabel: conCargas ? 'Desactivar' : 'Eliminar',
    });
    if (!ok) return;
    ejecutar(c.id, () => sumatoriasApi.deleteConcepto(c.id), r => (r.desactivado ? 'Concepto desactivado' : 'Concepto eliminado'));
  };

  const crear = async (e) => {
    e?.preventDefault();
    const nombre = nuevo.replace(/\s+/g, ' ').trim();
    if (!nombre) return;
    const r = await ejecutar('nuevo', () => sumatoriasApi.createConcepto(subrubro.id, { nombre, mostrar_en_caja: nuevoEnCaja }), 'Concepto creado');
    if (r) { setNuevo(''); setNuevoEnCaja(true); }
  };

  return (
    <Modal title={`Conceptos — ${subrubro.nombre}`} size="xl" onClose={onClose}>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        <b>En Caja</b> define si el concepto aparece al cargar desde la Caja del Día. Desde el subrubro siempre están todos los activos.
      </p>
      <ul className="space-y-2 mb-4">
        {conceptos.map((c, i) => (
          <li key={c.id} className={`rounded-xl border border-slate-200 dark:border-slate-700 p-2 sm:p-3 ${c.activo ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
            <div className="flex items-center gap-2">
              <div className="flex flex-col sm:flex-row shrink-0">
                <button type="button" className={iconBtn} aria-label={`Subir ${c.nombre}`} disabled={i === 0 || !!ocupado} onClick={() => mover(i, -1)}><ArrowUp size={14} /></button>
                <button type="button" className={iconBtn} aria-label={`Bajar ${c.nombre}`} disabled={i === conceptos.length - 1 || !!ocupado} onClick={() => mover(i, 1)}><ArrowDown size={14} /></button>
              </div>
              <div className="flex-1 min-w-0">
                {editId === c.id ? (
                  <div className="flex items-center gap-1">
                    <input className={inputCls} value={editNombre} maxLength={60} autoFocus aria-label="Nuevo nombre"
                      onChange={e => setEditNombre(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') guardarNombre(c); if (e.key === 'Escape') setEditId(null); }} />
                    <button type="button" className={iconBtn} aria-label="Guardar nombre" onClick={() => guardarNombre(c)}><Check size={15} /></button>
                    <button type="button" className={iconBtn} aria-label="Cancelar" onClick={() => setEditId(null)}><X size={15} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <span aria-hidden className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color || '#7c3aed' }} />
                    <span className={`text-sm font-medium truncate ${c.activo ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 line-through'}`}>{c.nombre}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">· {c.cantidad_movimientos} carga{c.cantidad_movimientos !== 1 ? 's' : ''}</span>
                    {!c.activo && <span className="text-xs px-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">Desactivado</span>}
                  </div>
                )}
              </div>
              {ocupado === c.id && <Loader2 size={14} className="animate-spin text-slate-500 shrink-0" />}
              {editId !== c.id && (
                <>
                  <button type="button" className={iconBtn} aria-label={`Renombrar ${c.nombre}`} disabled={!!ocupado}
                    onClick={() => { setEditId(c.id); setEditNombre(c.nombre); }}><Pencil size={14} /></button>
                  {c.activo
                    ? <button type="button" className={`${iconBtn} hover:text-red-600`} aria-label={`Eliminar o desactivar ${c.nombre}`} disabled={!!ocupado} onClick={() => eliminar(c)}><Trash2 size={14} /></button>
                    : <button type="button" className={`${iconBtn} hover:text-green-600`} aria-label={`Reactivar ${c.nombre}`} title="Reactivar" disabled={!!ocupado}
                        onClick={() => actualizar(c, { activo: true }, 'Concepto reactivado')}><Eye size={14} /></button>}
                </>
              )}
            </div>
            {c.activo && editId !== c.id && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 pl-1 sm:pl-[4.5rem]">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer min-h-11 sm:min-h-0">
                  <input type="checkbox" className="w-4 h-4 accent-violet-600" checked={c.mostrar_en_caja} disabled={!!ocupado}
                    onChange={e => actualizar(c, { mostrar_en_caja: e.target.checked })} />
                  {c.mostrar_en_caja ? <Eye size={12} /> : <EyeOff size={12} />} En Caja
                </label>
                <div role="radiogroup" aria-label={`Color de ${c.nombre}`} className="flex items-center gap-1">
                  {COLORES_CONCEPTO.map(col => (
                    <button key={col} type="button" role="radio" aria-checked={(c.color || '#7c3aed') === col} aria-label={`Color ${col}`}
                      disabled={!!ocupado}
                      onClick={() => actualizar(c, { color: col })}
                      className="w-8 h-8 sm:w-6 sm:h-6 rounded-full flex items-center justify-center">
                      <span className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full ${(c.color || '#7c3aed') === col ? 'ring-2 ring-offset-2 ring-slate-500 dark:ring-offset-slate-800' : ''}`} style={{ background: col }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
        {conceptos.length === 0 && <li className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Sin conceptos todavía.</li>}
      </ul>

      <form onSubmit={crear} className="rounded-xl border border-dashed border-violet-300 dark:border-violet-800 p-3 space-y-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Nuevo concepto</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <input className={inputCls} placeholder="Ej: Retiro dólares" value={nuevo} maxLength={60}
            aria-label="Nombre del concepto nuevo" onChange={e => setNuevo(e.target.value)} />
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer shrink-0 min-h-11 sm:min-h-0">
            <input type="checkbox" className="w-4 h-4 accent-violet-600" checked={nuevoEnCaja} onChange={e => setNuevoEnCaja(e.target.checked)} />
            En Caja
          </label>
          <button type="submit" disabled={!nuevo.trim() || !!ocupado}
            className="shrink-0 min-h-11 sm:min-h-9 px-3 rounded-lg bg-violet-600 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1">
            {ocupado === 'nuevo' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Agregar
          </button>
        </div>
      </form>
    </Modal>
  );
}
