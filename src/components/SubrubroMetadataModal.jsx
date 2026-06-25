import { useState, useEffect } from 'react';
import Modal from './Modal';
import { Building2, Hash, CreditCard, AtSign, FileText, CalendarClock } from 'lucide-react';

const ICON_LIST = ['📁','📂','👥','🏭','🏪','🚚','💼','🏗️','📦','💰','🧾','📊','🏦','⚡','🔧','🛠️','🏠','🌐','📮','🚗','🎯','📝','🔑','💡','🌿','🔒','⭐','✈️','🎨','🔋'];

const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1';

/**
 * Modal de edición completa de subrubro: nombre, ícono y metadata fiscal/bancaria.
 * onSave recibe el objeto con todos los campos editables.
 */
export default function SubrubroMetadataModal({ subrubro, onSave, onClose }) {
  const [nombre, setNombre] = useState(subrubro?.nombre || '');
  const [icon, setIcon] = useState(subrubro?.icon || '');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [razonSocial, setRazonSocial] = useState(subrubro?.razon_social || '');
  const [cuit, setCuit] = useState(subrubro?.cuit || '');
  const [cbu, setCbu] = useState(subrubro?.cbu || '');
  const [alias, setAlias] = useState(subrubro?.alias || '');
  const [diaVencimiento, setDiaVencimiento] = useState(
    subrubro?.dia_vencimiento != null ? String(subrubro.dia_vencimiento) : ''
  );
  const [notas, setNotas] = useState(subrubro?.notas || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNombre(subrubro?.nombre || '');
    setIcon(subrubro?.icon || '');
    setShowIconPicker(false);
    setRazonSocial(subrubro?.razon_social || '');
    setCuit(subrubro?.cuit || '');
    setCbu(subrubro?.cbu || '');
    setAlias(subrubro?.alias || '');
    setDiaVencimiento(subrubro?.dia_vencimiento != null ? String(subrubro.dia_vencimiento) : '');
    setNotas(subrubro?.notas || '');
  }, [subrubro?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('El nombre no puede estar vacío.');
      return;
    }
    // Validación día de vencimiento
    let dia = null;
    if (diaVencimiento.trim() !== '') {
      const n = Number(diaVencimiento);
      if (!Number.isInteger(n) || n < 1 || n > 31) {
        alert('El día de vencimiento debe ser un número entero entre 1 y 31.');
        return;
      }
      dia = n;
    }
    setSaving(true);
    try {
      await onSave({
        nombre: nombre.trim(),
        icon,
        razon_social: razonSocial.trim(),
        cuit: cuit.trim(),
        cbu: cbu.trim(),
        alias: alias.trim(),
        dia_vencimiento: dia,
        notas: notas.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={`Editar ${subrubro?.nombre || 'subrubro'}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Nombre + ícono */}
        <div>
          <label className={labelCls}>Nombre</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowIconPicker(o => !o)}
              className="text-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg px-2 py-1.5 shrink-0"
              title="Cambiar ícono"
            >{icon || '📁'}</button>
            <input
              type="text"
              className={inputCls}
              placeholder="Ej: Juan Pérez"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              autoFocus
            />
          </div>
          {showIconPicker && (
            <div className="mt-2 grid grid-cols-10 gap-0.5 border border-slate-200 dark:border-slate-600 rounded-lg p-1.5 bg-white dark:bg-slate-700">
              {ICON_LIST.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => { setIcon(ic); setShowIconPicker(false); }}
                  className={`text-lg p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600 ${ic === icon ? 'bg-blue-100 dark:bg-blue-900/40' : ''}`}
                >{ic}</button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 my-2 pt-1">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
            Datos fiscales y bancarios
          </p>
        </div>
        <div>
          <label className={labelCls}>
            <Building2 size={11} className="inline mr-1" /> Razón social
          </label>
          <input
            type="text"
            className={inputCls}
            placeholder="Ej: Distribuidora del Norte S.A."
            value={razonSocial}
            onChange={e => setRazonSocial(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>
              <Hash size={11} className="inline mr-1" /> CUIT
            </label>
            <input
              type="text"
              className={inputCls}
              placeholder="30-12345678-9"
              value={cuit}
              onChange={e => setCuit(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>
              <CalendarClock size={11} className="inline mr-1" /> Días de vencimiento
            </label>
            <input
              type="number"
              min="1"
              max="365"
              step="1"
              className={inputCls}
              placeholder="Ej: 30 (sin valor = sin plazo)"
              value={diaVencimiento}
              onChange={e => setDiaVencimiento(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Cada factura vence N días después de su fecha (ej: 30 = vence 30 días después de emitida).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>
              <CreditCard size={11} className="inline mr-1" /> CBU
            </label>
            <input
              type="text"
              className={inputCls}
              placeholder="22 dígitos"
              value={cbu}
              onChange={e => setCbu(e.target.value)}
              maxLength={32}
            />
          </div>
          <div>
            <label className={labelCls}>
              <AtSign size={11} className="inline mr-1" /> Alias CBU
            </label>
            <input
              type="text"
              className={inputCls}
              placeholder="empresa.banco.alias"
              value={alias}
              onChange={e => setAlias(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>
            <FileText size={11} className="inline mr-1" /> Notas
          </label>
          <textarea
            rows={3}
            className={inputCls}
            placeholder="Cualquier detalle adicional (condiciones de pago, contactos, etc.)"
            value={notas}
            onChange={e => setNotas(e.target.value)}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
