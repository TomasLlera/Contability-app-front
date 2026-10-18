import { useState, useId } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { cajaApi, getErrorMsg } from '../api';
import { fmtMoneda } from '../utils/formato';
import { fmtFecha } from '../utils/fecha';

const fmt = fmtMoneda;
const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500';

/**
 * Saldo en cuenta del día, un campo por banco activo (más los desactivados que ya
 * tengan saldo ese día). Si el banco todavía no tiene saldo hoy, se precarga con su
 * cierre de ayer (saldo − transferencias ± movimientos entre bancos) para revisarlo.
 * Vacío = sin saldo para ese banco. El total se calcula en vivo.
 */
export default function SaldosCuentaModal({ fecha, bancos, saldosHoy = {}, cierreAyer = {}, onSaved, onClose }) {
  const uid = useId();
  const [valores, setValores] = useState(() => Object.fromEntries(bancos.map(b => {
    const hoy = saldosHoy[b.id];
    const sugerido = cierreAyer[b.id];
    return [b.id, hoy != null ? String(hoy) : sugerido != null ? String(sugerido) : ''];
  })));
  const [saving, setSaving] = useState(false);
  const total = bancos.reduce((s, b) => s + (Number(valores[b.id]) || 0), 0);
  const precargados = bancos.filter(b => saldosHoy[b.id] == null && cierreAyer[b.id] != null);

  const guardar = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await cajaApi.saveSaldosCuenta(fecha, bancos.map(b => ({ banco_id: b.id, monto: valores[b.id] === '' ? '' : Number(valores[b.id]) })));
      toast.success('Saldos guardados ✓');
      onSaved?.();
    } catch (err) {
      toast.error(getErrorMsg(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={`Saldo en cuenta — ${fmtFecha(fecha)}`} size="md" onClose={saving ? undefined : onClose} closeOnBackdrop={false}
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
      <form id={`${uid}-form`} onSubmit={guardar} className="space-y-3">
        {bancos.map(b => (
          <div key={b.id} className="flex items-center gap-3">
            <label htmlFor={`${uid}-${b.id}`} className="flex-1 min-w-0 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span aria-hidden className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: b.color || '#2563eb' }} />
              <span className="truncate">{b.nombre}</span>
              {!b.activo && <span className="text-xs text-slate-500">(desactivado)</span>}
            </label>
            <input id={`${uid}-${b.id}`} type="number" inputMode="decimal" step="any" className={`${inputCls} w-40 sm:w-44 shrink-0`}
              placeholder="Sin cargar" value={valores[b.id]}
              onChange={e => setValores(v => ({ ...v, [b.id]: e.target.value }))} />
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Total en cuenta</span>
          <span className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">{fmt(total)}</span>
        </div>
        {precargados.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Precargado con el cierre de ayer de {precargados.map(b => b.nombre).join(', ')} (saldo − transferencias ± movimientos entre bancos). Revisalo antes de guardar.
          </p>
        )}
      </form>
    </Modal>
  );
}
