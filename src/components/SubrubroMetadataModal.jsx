import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { Building2, Hash, CreditCard, AtSign, FileText, CalendarClock, Ban, Wallet, HandCoins, Receipt, Percent, ChevronDown, Landmark, Sigma, Plus, X } from 'lucide-react';
import { EntityIcon } from '../icons';
import { ICON_LIST } from '../iconos';
import InfoTooltip from './InfoTooltip';


// Índice = Date.getDay() → 0=domingo … 6=sábado (debe coincidir con el backend).
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1';

// El botón de guardar vive en el footer fijo del Modal, fuera del <form>. El atributo
// `form` los vuelve a unir, así el submit sigue siendo el mismo de siempre.
const FORM_ID = 'subrubro-metadata-form';

// Conceptos sugeridos al crear un subrubro Sumatoria (editables y ampliables).
// "Retiro mercadería" no se ofrece en la Caja del Día: es un retiro sin plata.
const CONCEPTOS_SUGERIDOS = [
  { nombre: 'Retiro mercadería', mostrar_en_caja: false },
  { nombre: 'Retiro efectivo', mostrar_en_caja: true },
  { nombre: 'Retiro transferencia', mostrar_en_caja: true },
];

const TIPOS_SUBRUBRO = [
  { value: 'factura',   label: 'Facturas / Gastos', corto: 'Facturas', Icon: Receipt,   activeCls: 'bg-blue-600 text-white' },
  { value: 'deuda',     label: 'Deuda a cobrar',    corto: 'Deuda',    Icon: HandCoins, activeCls: 'bg-orange-500 text-white' },
  { value: 'sumatoria', label: 'Sumatoria',         corto: 'Sumatoria', Icon: Sigma,    activeCls: 'bg-violet-600 text-white' },
];

const AYUDA_TIPO = {
  factura: 'Registra facturas de proveedores a pagar y sus pagos (comportamiento clásico).',
  deuda: 'Registra plata que te DEBEN (préstamos a otros locales/personas). Cargás deudas y abonos; los abonos entran como ingresos en la Caja del Día.',
  sumatoria: 'Suma cargas por concepto (ej. retiros de un socio), sin estados ni vencimientos. Lo cargado desde la Caja del Día descuenta del día; lo cargado desde el subrubro solo suma acá.',
};

/**
 * Sección plegable del formulario. Cerrada muestra un resumen de lo que contiene, para
 * no tener que abrirla solo para ver si hay algo cargado.
 */
function Seccion({ icon, titulo, resumen, abierta, onToggle, children }) {
  const Icon = icon;
  return (
    <section className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierta}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left bg-slate-50 dark:bg-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors"
      >
        <Icon size={14} className="shrink-0 text-slate-500 dark:text-slate-400" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 shrink-0">{titulo}</span>
        {!abierta && resumen && (
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate min-w-0">· {resumen}</span>
        )}
        <ChevronDown
          size={16}
          className={`ml-auto shrink-0 text-slate-500 dark:text-slate-400 transition-transform ${abierta ? 'rotate-180' : ''}`}
        />
      </button>
      {abierta && <div className="p-3 space-y-3">{children}</div>}
    </section>
  );
}

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
  const [tipoSubrubro, setTipoSubrubro] = useState(subrubro?.tipo_subrubro || 'factura');
  const [aplicaDescuento, setAplicaDescuento] = useState(!!subrubro?.aplica_descuento);
  const [saving, setSaving] = useState(false);
  const esDeuda = tipoSubrubro === 'deuda';
  const esSumatoria = tipoSubrubro === 'sumatoria';
  // Conceptos iniciales: solo al CREAR. Los de un subrubro existente se gestionan
  // desde su vista (con el conteo de cargas, desactivar, reordenar).
  const esNuevo = !subrubro;
  const [conceptos, setConceptos] = useState(CONCEPTOS_SUGERIDOS);
  const [errorConceptos, setErrorConceptos] = useState(null);
  const setConcepto = (i, cambios) => {
    setErrorConceptos(null);
    setConceptos(cs => cs.map((c, j) => (j === i ? { ...c, ...cambios } : c)));
  };

  // Qué secciones arrancan abiertas: las que ya tienen algo cargado. Un subrubro nuevo
  // abre compacto (solo lo básico) y uno existente muestra de entrada lo que tiene.
  const [abiertas, setAbiertas] = useState(() => ({
    fiscal: !!(subrubro?.razon_social || subrubro?.cuit || subrubro?.cbu || subrubro?.alias),
    vencimiento: !!(subrubro?.dia_vencimiento != null || subrubro?.dia_semana_vencimiento != null
      || subrubro?.dia_mes_vencimiento != null || (subrubro?.metodo_pago_default && subrubro.metodo_pago_default !== 'ambas')),
    notas: !!subrubro?.notas,
  }));
  const toggleSeccion = (k) => setAbiertas(s => ({ ...s, [k]: !s[k] }));

  // Aviso de "hay más abajo". El centinela va al final del formulario: si el scroll del
  // modal lo tiene fuera de vista, se pinta el degradado; al llegar al fondo, se apaga.
  const finRef = useRef(null);
  const [hayMas, setHayMas] = useState(false);
  useEffect(() => {
    const el = finRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([e]) => setHayMas(!e.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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
    let conceptosPayload;
    if (esSumatoria && esNuevo) {
      conceptosPayload = conceptos
        .map(c => ({ ...c, nombre: c.nombre.replace(/\s+/g, ' ').trim() }))
        .filter(c => c.nombre);
      const claves = conceptosPayload.map(c => c.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
      if (conceptosPayload.length === 0) { setErrorConceptos('Agregá al menos un concepto'); return; }
      if (new Set(claves).size !== claves.length) { setErrorConceptos('Hay conceptos repetidos'); return; }
    }
    setSaving(true);
    try {
      await onSave({
        ...(conceptosPayload ? { conceptos: conceptosPayload } : {}),
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
        tipo_subrubro: tipoSubrubro,
        // Una deuda a cobrar o una sumatoria nunca llevan descuento por pago (el backend lo revalida).
        aplica_descuento: tipoSubrubro === 'factura' ? aplicaDescuento : false,
        notas: notas.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  // --- Resúmenes para las secciones cerradas ---
  const fiscalCargados = [razonSocial, cuit, cbu, alias].filter(v => v.trim()).length;
  const resumenFiscal = fiscalCargados ? `${fiscalCargados} de 4 cargados` : 'Sin cargar';

  const resumenVencimiento = [
    modoVencimiento === 'dias'
      ? (diaVencimiento.trim() ? `${diaVencimiento} días` : 'Sin plazo')
      : modoVencimiento === 'dia_semana'
        ? (diaSemanaVencimiento !== '' ? DIAS_SEMANA[Number(diaSemanaVencimiento)] : 'Sin día')
        : (diaMesVencimiento !== '' ? `Día ${diaMesVencimiento} del mes` : 'Sin día'),
    { ambas: 'ambos métodos', transferencia: 'transferencia', efectivo: 'efectivo' }[metodoPagoDefault],
  ].join(' · ');

  const resumenNotas = notas.trim()
    ? `${notas.trim().length} caracteres`
    : 'Sin notas';

  return (
    <Modal
      onClose={onClose}
      title={title || `Editar ${subrubro?.nombre || 'subrubro'}`}
      // 2xl (672px) le da lugar a las dos columnas sin que el modal tape la pantalla.
      // En mobile el propio Modal lo pasa a hoja completa y las columnas colapsan solas.
      size="2xl"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form={FORM_ID}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40"
          >
            {saving ? 'Guardando…' : (submitLabel || 'Guardar')}
          </button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-3">

        {/* --- Básico: siempre visible, sin plegar --- */}
        <div className="space-y-3">
          {/* Nombre + ícono */}
          <div>
            <label className={labelCls}>
              Nombre <span className="text-red-600 dark:text-red-400" title="Campo obligatorio">*</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowIconPicker(o => !o)}
                className="text-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg px-2 py-1.5 shrink-0"
                title="Cambiar ícono" aria-label="Cambiar ícono"
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
                  title="Sin ícono" aria-label="Sin ícono"
                  className={`flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600 ${icon === '' ? 'bg-blue-100 dark:bg-blue-900/40' : ''}`}
                ><Ban size={16} /></button>
                {ICON_LIST.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    aria-label={ic}
                    onClick={() => { setIcon(ic); setShowIconPicker(false); }}
                    className={`flex items-center justify-center p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 ${ic === icon ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300' : ''}`}
                  ><EntityIcon value={ic} size={18} /></button>
                ))}
              </div>
            )}
          </div>

          {/* Tipo de subrubro: proveedor (facturas a pagar), deuda (dinero a cobrar) o
              sumatoria (acumulador por conceptos). */}
          <div>
            <label className={labelCls}>Tipo de subrubro</label>
            <div role="radiogroup" aria-label="Tipo de subrubro" className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-sm font-medium">
              {TIPOS_SUBRUBRO.map(t => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={tipoSubrubro === t.value}
                  onClick={() => setTipoSubrubro(t.value)}
                  className={`flex-1 min-h-11 sm:min-h-0 py-2 px-1 flex items-center justify-center gap-1.5 transition-colors ${
                    tipoSubrubro === t.value
                      ? t.activeCls
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                  }`}
                >
                  <t.Icon size={14} className="shrink-0" />
                  <span className="sm:hidden">{t.corto}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{AYUDA_TIPO[tipoSubrubro] || AYUDA_TIPO.factura}</p>
          </div>

          {/* Conceptos de la sumatoria: al crear se ofrecen los sugeridos, editables. */}
          {esSumatoria && esNuevo && (
            <div className="rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50/60 dark:bg-violet-950/20 p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Conceptos</p>
                <InfoTooltip text="Cada carga se suma en un concepto. «En Caja» define si el concepto aparece al cargar desde la Caja del Día; desde el subrubro siempre están todos." />
              </div>
              {conceptos.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    className={`${inputCls} flex-1 min-w-0`}
                    placeholder="Nombre del concepto"
                    value={c.nombre}
                    maxLength={60}
                    aria-label={`Concepto ${i + 1}`}
                    onChange={e => setConcepto(i, { nombre: e.target.value })}
                  />
                  <label className="flex items-center gap-1.5 shrink-0 min-h-11 sm:min-h-0 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-violet-600" checked={c.mostrar_en_caja}
                      onChange={e => setConcepto(i, { mostrar_en_caja: e.target.checked })} />
                    En Caja
                  </label>
                  <button type="button" onClick={() => setConceptos(cs => cs.filter((_, j) => j !== i))}
                    aria-label={`Quitar ${c.nombre || 'concepto'}`}
                    className="shrink-0 w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-white dark:hover:bg-slate-700">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setConceptos(cs => [...cs, { nombre: '', mostrar_en_caja: true }])}
                className="min-h-11 sm:min-h-0 inline-flex items-center gap-1 text-xs font-medium text-violet-700 dark:text-violet-300 hover:underline">
                <Plus size={12} /> Agregar concepto
              </button>
              {errorConceptos && <p className="text-xs text-red-600 dark:text-red-400">{errorConceptos}</p>}
            </div>
          )}
          {esSumatoria && !esNuevo && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Los conceptos se crean, renombran y ordenan desde la vista del subrubro (botón «Conceptos»).
            </p>
          )}

          {/* Descuento por pago — solo para subrubros de facturas/gastos: una deuda a
              cobrar o una sumatoria no llevan descuento (el backend además fuerza el flag en false). */}
          {!esDeuda && !esSumatoria && (
            <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/30 px-3 py-2.5">
              <input
                type="checkbox"
                className="accent-purple-600 mt-0.5"
                checked={aplicaDescuento}
                onChange={e => setAplicaDescuento(e.target.checked)}
              />
              <span className="min-w-0">
                <span className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Percent size={12} className="text-purple-600 dark:text-purple-400 shrink-0" />
                  Este subrubro aplica descuentos por pago
                  <InfoTooltip text="Al confirmar un pago de este proveedor en la Caja del Día se habilita un acordeón para cargar el descuento. El monto descontado genera automáticamente una Nota de Crédito vinculada a la factura, para que el saldo cierre en cero." />
                </span>
              </span>
            </label>
          )}
        </div>

        {/* Una sumatoria no tiene facturas: sin datos fiscales ni vencimientos. */}
        {!esSumatoria && <>
        {/* --- Datos fiscales y bancarios --- */}
        <Seccion
          icon={Landmark}
          titulo="Datos fiscales y bancarios"
          resumen={resumenFiscal}
          abierta={abiertas.fiscal}
          onToggle={() => toggleSeccion('fiscal')}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                <CreditCard size={11} className="inline mr-1" /> CBU
              </label>
              <input
                type="text"
                className={inputCls}
                placeholder="0440015830000010754529"
                value={cbu}
                onChange={e => setCbu(e.target.value)}
                maxLength={32}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">22 dígitos, sin espacios ni guiones.</p>
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
        </Seccion>

        {/* --- Vencimiento y pagos --- */}
        <Seccion
          icon={CalendarClock}
          titulo="Vencimiento y pagos"
          resumen={resumenVencimiento}
          abierta={abiertas.vencimiento}
          onToggle={() => toggleSeccion('vencimiento')}
        >
          {/* Modo y valor en la misma fila: son una sola decisión partida en dos
              controles, y separados obligaban a mirar dos filas para entender el plazo. */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Modo de vencimiento</label>
                <select
                  className={inputCls}
                  value={modoVencimiento}
                  onChange={e => setModoVencimiento(e.target.value)}
                >
                  <option value="dias">Días desde emisión</option>
                  <option value="dia_semana">Día fijo de la semana</option>
                  <option value="dia_mes">Día fijo del mes</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>
                  {modoVencimiento === 'dias' ? 'Días de plazo'
                    : modoVencimiento === 'dia_semana' ? 'Día de la semana'
                    : 'Día del mes'}
                </label>

                {modoVencimiento === 'dias' && (
                  <input
                    type="number" inputMode="decimal"
                    min="1"
                    max="365"
                    step="1"
                    className={inputCls}
                    placeholder="Ej: 30 (sin valor = sin plazo)"
                    value={diaVencimiento}
                    onChange={e => setDiaVencimiento(e.target.value)}
                  />
                )}

                {modoVencimiento === 'dia_semana' && (
                  <select
                    className={inputCls}
                    value={diaSemanaVencimiento}
                    onChange={e => setDiaSemanaVencimiento(e.target.value)}
                  >
                    <option value="">Sin día definido</option>
                    {DIAS_SEMANA.map((d, i) => (
                      <option key={i} value={i}>{d}</option>
                    ))}
                  </select>
                )}

                {modoVencimiento === 'dia_mes' && (
                  <select
                    className={inputCls}
                    value={diaMesVencimiento}
                    onChange={e => setDiaMesVencimiento(e.target.value)}
                  >
                    <option value="">Sin día definido</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>Día {d}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Una sola nota al pie de la fila, no una por control. */}
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {modoVencimiento === 'dias' &&
                `Cada ${esDeuda ? 'deuda' : 'factura'} vence N días después de su fecha (ej: 30 = vence 30 días después de ${esDeuda ? 'registrada' : 'emitida'}).`}
              {modoVencimiento === 'dia_semana' &&
                `Cada ${esDeuda ? 'deuda' : 'factura'} vence el próximo día elegido. Si se ${esDeuda ? 'registra' : 'emite'} ese mismo día, vence el de la semana siguiente.`}
              {modoVencimiento === 'dia_mes' &&
                `Cada ${esDeuda ? 'deuda' : 'factura'} vence ese día fijo del mes. Si ese día ya pasó, vence el del mes siguiente. En meses más cortos (ej: febrero) se ajusta al último día.`}
            </p>
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
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {esDeuda
                ? 'Si elegís un método fijo, los abonos de este subrubro lo toman automáticamente y entran como ingresos con ese método en la Caja del día. Con "Ambas" se elige al momento de cargar.'
                : 'Si elegís un método fijo, los pagos de este subrubro lo toman automáticamente y aparecen en esa sección de Caja del día. Con "Ambas" se elige al momento de cargar.'}
            </p>
          </div>
        </Seccion>
        </>}

        {/* --- Notas --- */}
        <Seccion
          icon={FileText}
          titulo="Notas"
          resumen={resumenNotas}
          abierta={abiertas.notas}
          onToggle={() => toggleSeccion('notas')}
        >
          {/* Es el campo con más texto libre del formulario: arranca en 6 líneas y se
              puede estirar. Antes tenía 3 y obligaba a escribir mirando por una ranura. */}
          <textarea
            rows={6}
            className={`${inputCls} resize-y min-h-32`}
            placeholder="Cualquier detalle adicional (condiciones de pago, contactos, etc.)"
            value={notas}
            onChange={e => setNotas(e.target.value)}
          />
        </Seccion>

        {/* Centinela del indicador de scroll: no ocupa lugar, solo marca el final. */}
        <div ref={finRef} aria-hidden className="h-px" />
      </form>

      {/* Degradado de "sigue abajo", pegado al borde inferior del área scrolleable.
          Desaparece al llegar al fondo. `pointer-events-none` para no comerse clicks. */}
      {hayMas && (
        <div className="sticky bottom-0 -mt-6 h-6 pointer-events-none
                        bg-linear-to-t from-white dark:from-slate-800 to-transparent" />
      )}
    </Modal>
  );
}
