import { useState, useEffect } from 'react';
import Modal from './Modal';
import { Building2, Hash, CreditCard, AtSign, FileText, CalendarClock, Ban, Wallet } from 'lucide-react';
import { EntityIcon, ICON_LIST } from '../icons';


// Índice = Date.getDay() → 0=domingo … 6=sábado (debe coincidir con el backend).
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1';

/**
 * Modal de edición completa de subrubro: nombre, ícono y metadata fiscal/bancaria.
 * onSave recibe el objeto con todos los campos editables.
 */
export default function SubrubroMetadataModal({ subrubro, onSave, onClose, title, submitLabel }) {
  const [nombre, setNombre] = useState(subrubro?.nombre || '');
  const [icon, setIcon] = useState(subrubro?.icon || '');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [razonSocial, setRazonSocial] = useState(subrubro?.razon_social || '');
  const [cuit, setCuit] = useState(subrubro?.cuit || '');
  const [cbu, setCbu] = useState(subrubro?.cbu || '');
  const [alias, setAlias] = useState(subrubro?.alias || '');
  const [modoVencimiento, setModoVencimiento] = useState(subrubro?.modo_vencimiento || 'dias');
  const [diaVencimiento, setDiaVencimiento] = useState(
    subrubro?.dia_vencimiento != null ? String(subrubro.dia_vencimiento) : ''
  );
  const [diaSemanaVencimiento, setDiaSemanaVencimiento] = useState(
    subrubro?.dia_semana_vencimiento != null ? String(subrubro.dia_semana_vencimiento) : ''
  );
  const [diaMesVencimiento, setDiaMesVencimiento] = useState(
    subrubro?.dia_mes_vencimiento != null ? String(subrubro.dia_mes_vencimiento) : ''
  );
  const [notas, setNotas] = useState(subrubro?.notas || '');
  const [metodoPagoDefault, setMetodoPagoDefault] = useState(subrubro?.metodo_pago_default || 'ambas');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNombre(subrubro?.nombre || '');
    setIcon(subrubro?.icon || '');
    setShowIconPicker(false);
    setRazonSocial(subrubro?.razon_social || '');
    setCuit(subrubro?.cuit || '');
    setCbu(subrubro?.cbu || '');
    setAlias(subrubro?.alias || '');
    setModoVencimiento(subrubro?.modo_vencimiento || 'dias');
    setDiaVencimiento(subrubro?.dia_vencimiento != null ? String(subrubro.dia_vencimiento) : '');
    setDiaSemanaVencimiento(subrubro?.dia_semana_vencimiento != null ? String(subrubro.dia_semana_vencimiento) : '');
    setDiaMesVencimiento(subrubro?.dia_mes_vencimiento != null ? String(subrubro.dia_mes_vencimiento) : '');
    setNotas(subrubro?.notas || '');
    setMetodoPagoDefault(subrubro?.metodo_pago_default || 'ambas');
  }, [subrubro?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('El nombre no puede estar vacío.');
      return;
    }
    // Validación del vencimiento según el modo elegido
    let dia = null;
    let diaSemana = null;
    let diaMes = null;
    if (modoVencimiento === 'dia_semana') {
      if (diaSemanaVencimiento !== '') {
        const w = Number(diaSemanaVencimiento);
        if (!Number.isInteger(w) || w < 0 || w > 6) {
          alert('Elegí un día de la semana válido.');
          return;
        }
        diaSemana = w;
      }
    } else if (modoVencimiento === 'dia_mes') {
      if (diaMesVencimiento !== '') {
        const dm = Number(diaMesVencimiento);
        if (!Number.isInteger(dm) || dm < 1 || dm > 31) {
          alert('El día del mes debe ser un número entero entre 1 y 31.');
          return;
        }
        diaMes = dm;
      }
    } else {
      if (diaVencimiento.trim() !== '') {
        const n = Number(diaVencimiento);
        if (!Number.isInteger(n) || n < 1 || n > 365) {
          alert('Los días de vencimiento deben ser un número entero entre 1 y 365.');
          return;
        }
        dia = n;
      }
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
        modo_vencimiento: modoVencimiento,
        dia_vencimiento: dia,
        dia_semana_vencimiento: diaSemana,
        dia_mes_vencimiento: diaMes,
        metodo_pago_default: metodoPagoDefault,
        notas: notas.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={title || `Editar ${subrubro?.nombre || 'subrubro'}`}>
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
            ><EntityIcon value={icon} size={18} /></button>
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
              <button
                type="button"
                onClick={() => { setIcon(''); setShowIconPicker(false); }}
                title="Sin ícono"
                className={`flex items-center justify-center text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600 ${icon === '' ? 'bg-blue-100 dark:bg-blue-900/40' : ''}`}
              ><Ban size={16} /></button>
              {ICON_LIST.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => { setIcon(ic); setShowIconPicker(false); }}
                  className={`flex items-center justify-center p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 ${ic === icon ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300' : ''}`}
                ><EntityIcon value={ic} size={18} /></button>
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
              <CalendarClock size={11} className="inline mr-1" /> Modo de vencimiento
            </label>
            <select
              className={inputCls}
              value={modoVencimiento}
              onChange={e => setModoVencimiento(e.target.value)}
            >
              <option value="dias">Días desde emisión</option>
              <option value="dia_semana">Día fijo de la semana</option>
              <option value="dia_mes">Día fijo del mes</option>
            </select>

            {modoVencimiento === 'dias' && (
              <>
                <input
                  type="number"
                  min="1"
                  max="365"
                  step="1"
                  className={`${inputCls} mt-2`}
                  placeholder="Ej: 30 (sin valor = sin plazo)"
                  value={diaVencimiento}
                  onChange={e => setDiaVencimiento(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Cada factura vence N días después de su fecha (ej: 30 = vence 30 días después de emitida).
                </p>
              </>
            )}

            {modoVencimiento === 'dia_semana' && (
              <>
                <select
                  className={`${inputCls} mt-2`}
                  value={diaSemanaVencimiento}
                  onChange={e => setDiaSemanaVencimiento(e.target.value)}
                >
                  <option value="">Sin día definido</option>
                  {DIAS_SEMANA.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Cada factura vence el próximo día elegido. Si se emite ese mismo día, vence el de la semana siguiente.
                </p>
              </>
            )}

            {modoVencimiento === 'dia_mes' && (
              <>
                <select
                  className={`${inputCls} mt-2`}
                  value={diaMesVencimiento}
                  onChange={e => setDiaMesVencimiento(e.target.value)}
                >
                  <option value="">Sin día definido</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>Día {d}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Cada factura vence ese día fijo del mes. Si ese día ya pasó, vence el del mes siguiente. En meses más cortos (ej: febrero) se ajusta al último día.
                </p>
              </>
            )}
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
            <Wallet size={11} className="inline mr-1" /> Método de pago predeterminado
          </label>
          <select
            className={inputCls}
            value={metodoPagoDefault}
            onChange={e => setMetodoPagoDefault(e.target.value)}
          >
            <option value="ambas">Ambas (el usuario elige al cargar)</option>
            <option value="transferencia">Transferencia (automático)</option>
            <option value="efectivo">Efectivo (automático)</option>
          </select>
          <p className="mt-1 text-[11px] text-slate-400">
            Si elegís un método fijo, los pagos de este subrubro lo toman automáticamente y aparecen en esa sección de Caja del día. Con "Ambas" se elige al momento de cargar.
          </p>
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
            {saving ? 'Guardando…' : (submitLabel || 'Guardar')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
