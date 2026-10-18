import { useState, useRef, useId } from 'react';
import { Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { BancoSelect } from './BancoBadge';
import { bancosApi, getErrorMsg, newIdemKey } from '../api';
import { fmtMoneda } from '../utils/formato';
import { hoyAR } from '../utils/fecha';

const fmt = fmtMoneda;
const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1';

/**
 * Movimiento entre bancos propios (alta o edición). No es gasto ni ingreso: resta del
 * origen y suma al destino; el total en cuenta no cambia.
 *
 * activos — bancos activos; bancoDe(id) — para conservar uno desactivado al editar.
 * disponibleDe(id) — saldo disponible del banco en la Caja vista (null = sin cargar).
 */
export default function MovimientoBancoModal({ initial = null, fechaDefault, activos, bancoDe, disponibleDe, onSaved, onClose }) {
  const uid = useId();
  const [origen, setOrigen] = useState(initial?.banco_origen_id ?? activos[0]?.id ?? null);
  const [destino, setDestino] = useState(initial?.banco_destino_id ?? activos.find(b => b.id !== (initial?.banco_origen_id ?? activos[0]?.id))?.id ?? null);
  const [monto, setMonto] = useState(initial?.monto ?? '');
  const [fecha, setFecha] = useState(initial?.fecha || fechaDefault || hoyAR());
  const [descripcion, setDescripcion] = useState(initial?.descripcion || '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const idem = useRef(newIdemKey());

  const n = Number(monto) || 0;
  // Disponible del origen sin contar este mismo movimiento (al editar ya está restado).
  const dispBase = disponibleDe ? disponibleDe(origen) : null;
  const disponible = dispBase == null ? null
    : dispBase + (initial && initial.banco_origen_id === origen ? initial.monto : 0) - (initial && initial.banco_destino_id === origen ? initial.monto : 0);
  const quedaNegativo = disponible != null && n > 0 && disponible - n < -0.005;

  const elegirOrigen = (id) => {
    setOrigen(id);
    if (destino === id) setDestino(activos.find(b => b.id !== id)?.id ?? null);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!origen || !destino) return setError('Elegí el banco de origen y el de destino');
    if (origen === destino) return setError('El origen y el destino tienen que ser distintos');
    if (!(n > 0)) return setError('Ingresá un monto mayor a 0');
    setSaving(true);
    const data = { fecha, banco_origen_id: origen, banco_destino_id: destino, monto: n, descripcion: descripcion.trim() };
    try {
      if (initial) await bancosApi.updateMovimiento(initial.id, data);
      else await bancosApi.createMovimiento({ ...data, idempotency_key: idem.current });
      toast.success(initial ? 'Movimiento actualizado' : 'Movimiento entre bancos registrado');
      onSaved?.();
    } catch (err) {
      toast.error(getErrorMsg(err));
      setSaving(false);
    }
  };

  const opcionesDestino = activos.filter(b => b.id !== origen);
  return (
    <Modal title={initial ? 'Editar movimiento entre bancos' : 'Movimiento entre bancos'} size="md" onClose={saving ? undefined : onClose} closeOnBackdrop={false}
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={saving}
            className="flex-1 min-h-11 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm font-medium disabled:opacity-40">Cancelar</button>
          <button type="submit" form={`${uid}-form`} disabled={saving}
            className="flex-1 min-h-11 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
            {saving && <Loader2 size={14} className="animate-spin" />} Guardar
          </button>
        </div>
      }>
      <form id={`${uid}-form`} onSubmit={guardar} noValidate className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">Pasa plata entre tus cuentas: no es gasto ni ingreso y el total en cuenta no cambia.</p>
        <div>
          <BancoSelect id={`${uid}-o`} label="Desde" opciones={activos} value={origen} onChange={elegirOrigen} bancoActual={initial ? bancoDe(initial.banco_origen_id) : null} />
          {disponible != null && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Disponible: <b className="tabular-nums">{fmt(disponible)}</b></p>
          )}
        </div>
        <div className="flex justify-center text-slate-400" aria-hidden><ArrowRight size={16} className="rotate-90" /></div>
        <BancoSelect id={`${uid}-d`} label="Hacia" opciones={opcionesDestino} value={destino} onChange={setDestino} bancoActual={initial && initial.banco_destino_id !== origen ? bancoDe(initial.banco_destino_id) : null} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${uid}-monto`} className={labelCls}>Monto</label>
            <input id={`${uid}-monto`} type="number" inputMode="decimal" min="0" step="any" className={`${inputCls} text-base font-semibold tabular-nums`}
              placeholder="0,00" value={monto} onChange={e => { setMonto(e.target.value); setError(null); }} />
          </div>
          <div>
            <label htmlFor={`${uid}-fecha`} className={labelCls}>Fecha</label>
            <input id={`${uid}-fecha`} type="date" className={inputCls} value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor={`${uid}-desc`} className={labelCls}>Descripción <span className="font-normal text-slate-500 dark:text-slate-400">(opcional)</span></label>
          <input id={`${uid}-desc`} type="text" className={inputCls} maxLength={300} value={descripcion} onChange={e => setDescripcion(e.target.value)} />
        </div>
        {quedaNegativo && (
          <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" /> El banco de origen queda en negativo ({fmt(disponible - n)}). Se puede guardar igual.
          </p>
        )}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </Modal>
  );
}
