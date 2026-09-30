import { useState, useEffect, useRef, useId } from 'react';
import { hoyAR, fmtFecha } from '../utils/fecha';
import { Zap, Loader2, ChevronDown } from 'lucide-react';
import Modal from './Modal';
import { subrubrosApi, movimientosApi, cajaApi, getErrorMsg, newIdemKey } from '../api';
import toast from 'react-hot-toast';
import InfoTooltip from './InfoTooltip';
import { fmtMoneda } from '../utils/formato';

const today = () => hoyAR();
const fmt = fmtMoneda;

// ── Vencimiento automático del subrubro (espejo de calcularVencimientoSub del backend) ──
// 'dias' → emisión + N días; 'dia_semana' → próximo día fijo de la semana (nunca el
// mismo día); 'dia_mes' → día fijo del mes (o el del mes siguiente si ya pasó).
const addDias = (fechaStr, dias) => {
  const d = new Date(fechaStr + 'T00:00:00');
  d.setDate(d.getDate() + Number(dias));
  return d.toISOString().split('T')[0];
};
const proximoDiaSemana = (fechaStr, target) => {
  const d = new Date(fechaStr + 'T00:00:00');
  const diff = ((Number(target) - d.getDay() + 6) % 7) + 1; // 1..7 → nunca el mismo día
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
};
const proximoDiaMes = (fechaStr, target) => {
  const t = Number(target);
  const d = new Date(fechaStr + 'T00:00:00');
  let anio = d.getFullYear(), mes = d.getMonth();
  if (t < d.getDate()) { mes += 1; if (mes > 11) { mes = 0; anio += 1; } }
  const ultimo = new Date(anio, mes + 1, 0).getDate(); // último día del mes destino
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(Math.min(t, ultimo)).padStart(2, '0')}`;
};
const calcVencimientoSub = (fechaStr, sub) => {
  if (!fechaStr || !sub) return null;
  if (sub.modo_vencimiento === 'dia_semana') {
    return sub.dia_semana_vencimiento == null ? null : proximoDiaSemana(fechaStr, sub.dia_semana_vencimiento);
  }
  if (sub.modo_vencimiento === 'dia_mes') {
    return sub.dia_mes_vencimiento == null ? null : proximoDiaMes(fechaStr, sub.dia_mes_vencimiento);
  }
  return sub.dia_vencimiento ? addDias(fechaStr, sub.dia_vencimiento) : null;
};

const TIPOS = [
  { value: 'factura',      label: 'Factura',       color: 'bg-amber-500' },
  { value: 'pago',         label: 'Pago',          color: 'bg-blue-500' },
  { value: 'nota_credito', label: 'Nota de crédito', color: 'bg-purple-500' },
];

const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const selectCls = inputCls;

export default function CargaRapidaModal({ rubros, onClose, onSaved }) {
  const uid = useId();
  // Errores visibles junto a cada campo (antes: botón deshabilitado o un toast).
  const [errores, setErrores] = useState({});
  const limpiarError = (c) => setErrores(e => (e[c] ? { ...e, [c]: null } : e));
  const montoRef = useRef(null);
  const subRef = useRef(null);
  const vencRef = useRef(null);
  const [masDatos, setMasDatos] = useState(false);
  const [rubroId, setRubroId] = useState('');
  const [subrubros, setSubrubros] = useState([]);
  const [subrubroId, setSubrubroId] = useState('');
  const [tipo, setTipo] = useState('factura');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(today());
  // Vencimiento de la factura: se pre-llena con el criterio del subrubro (si tiene)
  // y es editable. El ref marca que el usuario lo tocó a mano: el auto-cálculo deja
  // de pisarlo hasta que cambie de subrubro.
  const [fechaVenc, setFechaVenc] = useState('');
  const vencManualRef = useRef(false);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [documento, setDocumento] = useState('factura');
  // Método de pago de la factura (opcional): viaja a la Caja del Día al vencer.
  // Independiente de metodoPago (que es para el tipo 'pago'). Remito = efectivo.
  const [metodoFactura, setMetodoFactura] = useState(null);
  // Percepción IVA / Ingresos Brutos: aplican a facturas y NC. No suman al monto.
  const [percepcionIva, setPercepcionIva] = useState('');
  const [ingresosBrutos, setIngresosBrutos] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [facturaSel, setFacturaSel] = useState('');
  // Clave de idempotencia estable por apertura del modal (una alta lógica).
  const idemKeyRef = useRef(null);
  if (idemKeyRef.current === null) idemKeyRef.current = newIdemKey();

  // Al elegir rubro se cargan sus subrubros (en el handler, no en un efecto).
  const elegirRubro = (id) => {
    setRubroId(id);
    setSubrubros([]);
    setSubrubroId('');
    if (!id) return;
    setLoadingSubs(true);
    subrubrosApi.getByRubro(id)
      .then(s => { setSubrubros(s); setSubrubroId(s[0]?.id || ''); })
      .finally(() => setLoadingSubs(false));
  };

  const esPago = tipo === 'pago' || tipo === 'nota_credito';
  // Remito: no lleva percepciones y se paga siempre en efectivo (automático).
  const esRemito = tipo === 'factura' && documento === 'remito';

  // Al cambiar de subrubro, el override manual del vencimiento pierde sentido.
  // (Declarado antes del efecto de abajo: los refs se actualizan en forma síncrona.)
  useEffect(() => { vencManualRef.current = false; }, [subrubroId]);

  // Auto-vencimiento: pre-llenar con el criterio del subrubro cada vez que cambia
  // el subrubro o la fecha de emisión, salvo que el usuario lo haya editado a mano.
  useEffect(() => {
    if (vencManualRef.current) return;
    const sub = subrubros.find(s => String(s.id) === String(subrubroId));
    setFechaVenc((sub && fecha) ? (calcVencimientoSub(fecha, sub) || '') : '');
  }, [subrubroId, fecha, subrubros]);

  // Boletas pendientes del subrubro: permiten aplicar el pago/NC a una factura
  // puntual (y dejar saldo si es parcial). Solo aplica a pago / nota de crédito.
  // La lista guardada lleva la clave (subrubro) a la que corresponde: "cargando" y
  // "vacía" se derivan de eso, sin setState síncrono dentro del efecto.
  const claveFacturas = subrubroId && esPago ? String(subrubroId) : null;
  const [respFacturas, setRespFacturas] = useState({ clave: null, items: [] });
  const facturas = claveFacturas && respFacturas.clave === claveFacturas ? respFacturas.items : [];
  const loadingFacturas = !!claveFacturas && respFacturas.clave !== claveFacturas;
  const recargarFacturas = (clave) => cajaApi.getFacturasPendientes(clave)
    .then(items => setRespFacturas({ clave, items }))
    .catch(() => setRespFacturas({ clave, items: [] }));
  useEffect(() => {
    if (claveFacturas) recargarFacturas(claveFacturas);
  }, [claveFacturas]);

  // Si cambia el subrubro o el tipo, la boleta elegida deja de valer. Se ajusta
  // durante el render (patrón recomendado por React en vez de un efecto).
  const [clavePrevia, setClavePrevia] = useState(claveFacturas);
  if (clavePrevia !== claveFacturas) {
    setClavePrevia(claveFacturas);
    setFacturaSel('');
  }

  const handleFacturaSel = (id) => {
    setFacturaSel(id);
    const f = facturas.find(f => String(f.id) === String(id));
    // Prefill con el SALDO restante (no el monto original), editable para parciales.
    if (f) setMonto(String(f.saldo != null ? f.saldo : f.monto));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const n = Number(monto);
    // Vencimiento: obligatorio en facturas y nunca anterior a la emisión.
    const nuevos = {
      subrubro: !subrubroId ? 'Elegí el rubro y el subrubro' : null,
      monto: !n ? 'Ingresá un monto mayor a 0' : null,
      venc: tipo !== 'factura' ? null
        : !fechaVenc ? 'Ingresá la fecha de vencimiento'
        : fechaVenc < fecha ? 'No puede ser anterior a la emisión' : null,
    };
    if (nuevos.subrubro || nuevos.monto || nuevos.venc) {
      setErrores(nuevos);
      (nuevos.subrubro ? subRef : nuevos.monto ? montoRef : vencRef).current?.focus();
      return;
    }
    // Una NC aplicada a una boleta puntual nunca puede superar su saldo pendiente
    // (el backend también la rechaza con 400).
    if (tipo === 'nota_credito' && facturaSel) {
      const f = facturas.find(x => String(x.id) === String(facturaSel));
      const saldoSel = f ? (f.saldo != null ? f.saldo : f.monto) : null;
      if (saldoSel != null && n > saldoSel + 0.005) {
        toast.error(`La nota de crédito supera el saldo pendiente de la boleta (${fmt(saldoSel)})`);
        return;
      }
    }
    setSaving(true);
    try {
      if (esPago && facturaSel) {
        // Pago / NC vinculado a una factura puntual → deja saldo si es parcial.
        await movimientosApi.pagoVinculado(subrubroId, {
          tipo,
          monto_pago: n,
          fecha,
          facturas_vinculadas_ids: [Number(facturaSel)],
          metodo_pago: tipo === 'pago' ? metodoPago : null,
          // Percepciones solo para NC (backend las ignora si es 'pago').
          percepcion_iva: tipo === 'nota_credito' ? (Number(percepcionIva) || 0) : 0,
          ingresos_brutos: tipo === 'nota_credito' ? (Number(ingresosBrutos) || 0) : 0,
          idempotency_key: idemKeyRef.current,
        });
      } else {
        await movimientosApi.create(subrubroId, {
          tipo,
          monto: esPago ? 0 : n,
          pago: esPago ? n : 0,
          fecha,
          // Vencimiento: solo aplica a facturas (elegido a mano o auto del subrubro).
          fecha_vencimiento: tipo === 'factura' ? (fechaVenc || null) : null,
          campos_extra: {},
          facturas_vinculadas_ids: [],
          // metodo_pago: en 'pago' es el método del pago; en 'factura' es el método que
          // viajará a la Caja del Día al vencer (remito = efectivo). En NC no aplica.
          metodo_pago: tipo === 'pago' ? metodoPago : (esRemito ? 'efectivo' : (tipo === 'factura' ? metodoFactura : null)),
          // documento solo aplica al tipo 'factura'
          documento: tipo === 'factura' ? documento : null,
          // Percepciones para factura / NC (el backend guarda 0 en pago y en remito).
          percepcion_iva: (tipo === 'pago' || esRemito) ? 0 : (Number(percepcionIva) || 0),
          ingresos_brutos: (tipo === 'pago' || esRemito) ? 0 : (Number(ingresosBrutos) || 0),
          idempotency_key: idemKeyRef.current,
        });
      }
      toast.success('Movimiento guardado');
      onSaved?.();
      // Mantener el modal abierto conservando rubro/subrubro/tipo para encadenar
      // varias cargas sin re-ingresar. Se limpian solo los datos propios de la
      // boleta y se renueva la clave de idempotencia (si no, el backend
      // deduplicaría la próxima alta por ser la misma clave).
      idemKeyRef.current = newIdemKey();
      setMonto('');
      setFacturaSel('');
      setPercepcionIva('');
      setIngresosBrutos('');
      // Tras un pago/NC cambió el saldo de las boletas: refrescar el listado.
      if (esPago && subrubroId) {
        recargarFacturas(String(subrubroId));
      }
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const rubrosSorted = [...rubros].sort((a, b) => a.nombre.localeCompare(b.nombre));

  const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1';
  const hintCls = 'font-normal text-slate-500 dark:text-slate-400';
  const errCls = 'mt-1 text-xs text-red-600 dark:text-red-400';
  const conError = (c) => errores[c] ? 'border-red-400 dark:border-red-500 focus:ring-red-500' : '';
  const segWrap = 'flex rounded-lg bg-slate-100 dark:bg-slate-700/60 p-0.5 text-sm font-medium';
  const segCls = (activo) => `flex-1 min-h-11 sm:min-h-9 px-1 rounded-md transition-colors ${
    activo ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-100'
  }`;
  const hayPercepciones = (tipo === 'factura' && !esRemito) || tipo === 'nota_credito';

  return (
    // <Modal> como el resto de la app: full-screen en mobile con Guardar fijo al pie
    // (antes era una tarjeta flotante propia, sin role="dialog" ni Escape).
    <Modal
      title={<span className="inline-flex items-center gap-2"><Zap size={16} className="text-blue-600 dark:text-blue-400" /> Carga rápida</span>}
      ariaLabel="Carga rápida"
      size="md"
      onClose={onClose}
      closeOnBackdrop={false}
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 min-h-11 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600">
            Cerrar
          </button>
          <button type="submit" form={`${uid}-form`} disabled={saving}
            className="flex-1 min-h-11 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      }
    >
        <form id={`${uid}-form`} onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Tipo */}
          <div role="radiogroup" aria-label="Tipo" className={segWrap}>
            {TIPOS.map(t => (
              <button key={t.value} type="button" role="radio" aria-checked={tipo === t.value}
                onClick={() => setTipo(t.value)} className={segCls(tipo === t.value)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Proveedor: rubro + subrubro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${uid}-rubro`} className={labelCls}>Rubro</label>
              <select id={`${uid}-rubro`} className={`${selectCls} ${conError('subrubro')}`} value={rubroId} onChange={e => { elegirRubro(e.target.value); limpiarError('subrubro'); }}>
                <option value="">— Elegir —</option>
                {rubrosSorted.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${uid}-sub`} className={labelCls}>Subrubro</label>
              <select id={`${uid}-sub`} ref={subRef} className={`${selectCls} ${conError('subrubro')}`} value={subrubroId}
                onChange={e => { setSubrubroId(e.target.value); limpiarError('subrubro'); }}
                disabled={!rubroId || loadingSubs}
                aria-invalid={!!errores.subrubro} aria-describedby={errores.subrubro ? `${uid}-sub-err` : undefined}>
                <option value="">— {loadingSubs ? 'Cargando...' : 'Elegir'} —</option>
                {subrubros.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            {errores.subrubro && <p id={`${uid}-sub-err`} className={`${errCls} sm:col-span-2 -mt-2`}>{errores.subrubro}</p>}
          </div>

          {/* Boleta a la que aplicar — solo Pago / Nota de crédito */}
          {esPago && subrubroId && (
            loadingFacturas
              ? <p className="text-xs text-slate-500 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Cargando boletas...</p>
              : facturas.length === 0
                ? <p className="text-xs text-slate-500 dark:text-slate-400">Sin boletas pendientes en este subrubro.</p>
                : (
                  <div>
                    <label htmlFor={`${uid}-boleta`} className={labelCls}>Aplicar a boleta <span className={hintCls}>(opcional)</span></label>
                    <select id={`${uid}-boleta`} className={selectCls} value={facturaSel} onChange={e => handleFacturaSel(e.target.value)}>
                      <option value="">— Automático (más antiguas primero) —</option>
                      {facturas.map(f => {
                        const saldo = f.saldo != null ? f.saldo : f.monto;
                        const parcial = f.saldo != null && f.saldo < f.monto - 0.005;
                        return (
                          <option key={f.id} value={f.id}>
                            {(f.concepto || 'Factura')} — {fmt(saldo)}{parcial ? ' (saldo, ya tiene NC/pago)' : ''}{f.fecha ? ` — ${fmtFecha(f.fecha)}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )
          )}

          {/* Monto */}
          <div>
            <label htmlFor={`${uid}-monto`} className={labelCls}>
              {tipo === 'factura' ? 'Monto' : tipo === 'pago' ? 'Monto del pago' : 'Monto de la nota de crédito'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 dark:text-slate-400">$</span>
              <input id={`${uid}-monto`} ref={montoRef} type="number" inputMode="decimal" min="0" step="any" placeholder="0,00"
                className={`w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg pl-7 pr-3 py-2 text-base font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 ${conError('monto')}`}
                value={monto} onChange={e => { setMonto(e.target.value); limpiarError('monto'); }}
                aria-invalid={!!errores.monto} aria-describedby={errores.monto ? `${uid}-monto-err` : undefined} />
            </div>
            {errores.monto && <p id={`${uid}-monto-err`} className={errCls}>{errores.monto}</p>}
          </div>

          {/* Fecha de emisión + vencimiento (el vencimiento solo aplica a facturas) */}
          <div className={tipo === 'factura' ? 'grid grid-cols-2 gap-3' : ''}>
            <div>
              <label htmlFor={`${uid}-fecha`} className={labelCls}>{tipo === 'factura' ? 'Emisión' : 'Fecha'}</label>
              <input id={`${uid}-fecha`} type="date" className={inputCls} value={fecha} max={today()} onChange={e => setFecha(e.target.value)} required />
            </div>
            {tipo === 'factura' && (
              <div>
                <label htmlFor={`${uid}-venc`} className={`${labelCls} flex items-center gap-1`}>
                  Vencimiento
                  <InfoTooltip text="Si el subrubro tiene un criterio de vencimiento configurado, se calcula solo — podés cambiarlo. Al vencer, la factura aparece en la Caja del Día." />
                </label>
                <input id={`${uid}-venc`} ref={vencRef} type="date" className={`${inputCls} ${conError('venc')}`} value={fechaVenc} min={fecha}
                  onChange={e => { vencManualRef.current = true; setFechaVenc(e.target.value); limpiarError('venc'); }}
                  aria-invalid={!!errores.venc} aria-describedby={errores.venc ? `${uid}-venc-err` : undefined} />
                {errores.venc && <p id={`${uid}-venc-err`} className={errCls}>{errores.venc}</p>}
              </div>
            )}
          </div>

          {/* Documento — solo en Factura */}
          {tipo === 'factura' && (
            <div>
              <span id={`${uid}-doc`} className={labelCls}>Documento</span>
              <div role="radiogroup" aria-labelledby={`${uid}-doc`} className={segWrap}>
                {[['factura', 'Factura'], ['remito', 'Remito']].map(([v, l]) => (
                  <button key={v} type="button" role="radio" aria-checked={documento === v} onClick={() => setDocumento(v)} className={segCls(documento === v)}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {/* Método: del pago, o el que la factura lleva a la Caja del Día al vencer. */}
          {(tipo === 'pago' || tipo === 'factura') && (
            <div>
              <span id={`${uid}-metodo`} className={labelCls}>
                Método {tipo === 'factura' && <span className={hintCls}>(así aparece en la Caja al vencer)</span>}
              </span>
              <div role="radiogroup" aria-labelledby={`${uid}-metodo`} className={segWrap}>
                {[['efectivo', 'Efectivo'], ['transferencia', 'Transferencia']].map(([v, l]) => {
                  const active = tipo === 'pago' ? metodoPago === v : (esRemito ? 'efectivo' : metodoFactura) === v;
                  return (
                    <button key={v} type="button" role="radio" aria-checked={active} disabled={tipo === 'factura' && esRemito}
                      onClick={() => {
                        if (tipo === 'pago') setMetodoPago(v);
                        else if (!esRemito) setMetodoFactura(active ? null : v);
                      }}
                      className={`${segCls(active)} ${tipo === 'factura' && esRemito ? 'cursor-not-allowed' : ''}`}>
                      {l}
                    </button>
                  );
                })}
              </div>
              {tipo === 'factura' && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {esRemito ? 'Remito: siempre efectivo.' : 'Opcional.'}
                </p>
              )}
            </div>
          )}

          {/* Percepciones — no suman al monto; plegadas porque son opcionales. */}
          {hayPercepciones && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700">
              <button type="button" onClick={() => setMasDatos(v => !v)} aria-expanded={masDatos}
                className="w-full min-h-11 flex items-center gap-2 px-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                <span className="flex-1">Percepciones <span className={hintCls}>(IVA / IIBB, no suman)</span></span>
                <ChevronDown size={15} className={`shrink-0 transition-transform ${masDatos ? 'rotate-180' : ''}`} />
              </button>
              {masDatos && (
                <div className="px-3 pb-3 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`${uid}-perc`} className={labelCls}>Percepción IVA</label>
                    <input id={`${uid}-perc`} type="number" inputMode="decimal" min="0" step="any" placeholder="0,00" className={inputCls}
                      value={percepcionIva} onChange={e => setPercepcionIva(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor={`${uid}-iibb`} className={labelCls}>Ingresos Brutos</label>
                    <input id={`${uid}-iibb`} type="number" inputMode="decimal" min="0" step="any" placeholder="0,00" className={inputCls}
                      value={ingresosBrutos} onChange={e => setIngresosBrutos(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
    </Modal>
  );
}
