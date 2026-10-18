import { useState, useEffect, useRef, useId } from 'react';
import { Loader2, Plus, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { sumatoriasApi, getErrorMsg, newIdemKey } from '../api';
import { hoyAR, fmtFecha } from '../utils/fecha';
import { METODO_LABEL } from '../utils/sumatoria';
import useBancos from '../hooks/useBancos';
import { BancoSelect } from './BancoBadge';

const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1';
const errCls = 'mt-1 text-xs text-red-600 dark:text-red-400';

/**
 * Alta / edición de una carga de un subrubro Sumatoria.
 *
 * El ORIGEN decide si toca la Caja:
 *   'caja'     → solo conceptos activos con «En Caja», con método; descuenta del día.
 *   'subrubro' → todos los conceptos activos, sin método; nunca aparece en la Caja.
 * En una edición el origen es el de la carga (no se puede cambiar).
 *
 * subrubro  — subrubro fijo; si no se pasa, se elige de `subrubros` (alta desde la Caja).
 * initial   — carga a editar: { id, subrubro_id, concepto_id, fecha, monto, metodo, descripcion, origen }.
 * prefill   — valores iniciales de un alta (p. ej. { monto, metodo } traídos del gasto).
 * elegirOrigen — el alta elige si impacta en la Caja (Carga rápida, que no es ni la
 *               Caja ni el subrubro): el método suma la opción «No impacta en caja».
 */
export default function SumatoriaMovForm({
  subrubro: subFijo = null, subrubros = [], origen: origenAlta = 'subrubro', initial = null,
  fechaDefault, prefill = {}, elegirOrigen = false, onSaved, onClose,
}) {
  const uid = useId();
  const [origenSel, setOrigenSel] = useState(origenAlta);
  const conOrigenElegible = elegirOrigen && !initial;
  const origen = initial?.origen || (conOrigenElegible ? origenSel : origenAlta);
  const esCaja = origen === 'caja';
  const [subId, setSubId] = useState(String(initial?.subrubro_id ?? subFijo?.id ?? (subrubros.length === 1 ? subrubros[0].id : '')));
  const sub = subFijo || subrubros.find(s => String(s.id) === subId) || null;

  const [conceptoId, setConceptoId] = useState(initial?.concepto_id != null ? String(initial.concepto_id) : '');
  const [monto, setMonto] = useState(initial?.monto ?? prefill.monto ?? '');
  const [fecha, setFecha] = useState(initial?.fecha || fechaDefault || hoyAR());
  const [metodo, setMetodo] = useState(initial?.metodo ?? prefill.metodo ?? (esCaja ? 'efectivo' : null));  const [descripcion, setDescripcion] = useState(initial?.descripcion || '');
  // Multi-banco: banco de una carga de Caja por transferencia.
  const { activos: bancosActivos, multi: multiBanco, bancoDe, bancoPara } = useBancos();
  const [bancoElegido, setBancoElegido] = useState(initial?.banco_id ?? null);
  const bancoId = bancoElegido ?? bancoPara(sub?.banco_default_id);
  const [errores, setErrores] = useState({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const idemKeyRef = useRef(null);
  if (idemKeyRef.current === null) idemKeyRef.current = newIdemKey();
  const montoRef = useRef(null);

  // Conceptos del subrubro elegido. La lista guardada lleva la clave (subrubro) a la
  // que corresponde: "cargando" se deriva de eso, sin setState síncrono en el efecto.
  const [resp, setResp] = useState({ clave: null, items: [] });
  const conceptos = resp.clave === subId ? resp.items : [];
  const cargandoConceptos = !!subId && resp.clave !== subId;
  const recargarConceptos = (clave) => sumatoriasApi.getConceptos(clave)
    .then(items => { setResp({ clave, items }); return items; })
    .catch(() => { setResp({ clave, items: [] }); return []; });
  useEffect(() => {
    if (subId) recargarConceptos(subId);
  }, [subId]);

  // Opciones: activos (y, desde la Caja, solo los que se ofrecen ahí). En una edición
  // el concepto actual se conserva aunque después se haya desactivado o sacado de Caja.
  const opciones = conceptos.filter(c =>
    (c.activo && (!esCaja || c.mostrar_en_caja)) || String(c.id) === String(initial?.concepto_id));
  // Un único concepto disponible: queda elegido (derivado, sin efecto). Si el elegido
  // dejó de ser una opción (se cambió a "impacta en caja"), se descarta.
  const conceptoValido = opciones.some(c => String(c.id) === conceptoId) ? conceptoId : '';
  const conceptoEfectivo = conceptoValido || (opciones.length === 1 ? String(opciones[0].id) : '');

  // Concepto nuevo en línea (solo desde el subrubro: desde la Caja se ofrecen los
  // conceptos ya configurados para la Caja).
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEnCaja, setNuevoEnCaja] = useState(true);
  const [creandoConcepto, setCreandoConcepto] = useState(false);
  const crearConcepto = async () => {
    if (!nuevoNombre.trim() || !subId) return;
    setCreandoConcepto(true);
    try {
      const c = await sumatoriasApi.createConcepto(subId, { nombre: nuevoNombre.trim(), mostrar_en_caja: nuevoEnCaja });
      await recargarConceptos(subId);
      setConceptoId(String(c.id));
      setNuevoAbierto(false); setNuevoNombre(''); setNuevoEnCaja(true);
      toast.success(`Concepto "${c.nombre}" creado`);
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setCreandoConcepto(false);
    }
  };

  const hoy = hoyAR();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (savingRef.current) return;
    const n = Number(monto);
    const nuevos = {
      sub: !subId ? 'Elegí el subrubro' : null,
      concepto: !conceptoEfectivo ? 'Elegí un concepto' : null,
      monto: !(n > 0) ? 'Ingresá un monto mayor a 0' : null,
      fecha: !fecha ? 'Ingresá la fecha' : fecha > hoy ? 'La fecha no puede ser posterior a hoy' : null,
      metodo: esCaja && !metodo ? 'Elegí el método' : null,
    };
    if (Object.values(nuevos).some(Boolean)) {
      setErrores(nuevos);
      if (nuevos.monto) montoRef.current?.focus();
      return;
    }
    const data = {
      concepto_id: Number(conceptoEfectivo),
      fecha,
      monto: n,
      descripcion: descripcion.trim(),
      ...(esCaja ? { metodo } : {}),
      ...(esCaja && metodo === 'transferencia' && multiBanco && bancoId != null ? { banco_id: bancoId } : {}),
    };
    savingRef.current = true;
    setSaving(true);
    try {
      const r = initial
        ? await sumatoriasApi.updateMovimiento(initial.id, data)
        : await sumatoriasApi.createMovimiento(subId, { ...data, origen, idempotency_key: idemKeyRef.current });
      toast.success(initial ? 'Carga actualizada' : esCaja ? 'Cargado — descontado de la caja' : 'Cargado en el subrubro');
      onSaved?.(r);
    } catch (err) {
      toast.error(getErrorMsg(err));
      savingRef.current = false;
      setSaving(false);
    }
  };

  const titulo = `${initial ? 'Editar carga' : 'Nueva carga'}${sub ? ` — ${sub.nombre}` : ''}`;
  const sinOpciones = !cargandoConceptos && subId && opciones.length === 0;

  return (
    <Modal
      title={titulo}
      size="md"
      onClose={saving ? undefined : onClose}
      closeOnBackdrop={false}
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={saving}
            className="flex-1 min-h-11 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm font-medium disabled:opacity-40">
            Cancelar
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
        {/* Qué hace esta carga con la Caja: es lo que más confunde, va primero. */}
        <p className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
          esCaja
            ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
            : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
        }`}>
          <Info size={14} className="shrink-0 mt-0.5" />
          {esCaja
            ? <span>Se registra como egreso de la Caja del <b>{fmtFecha(fecha)}</b>{metodo ? <> en <b>{METODO_LABEL[metodo].toLowerCase()}</b></> : null} y suma en el subrubro.</span>
            : <span>Solo suma en el subrubro: <b>no aparece en la Caja del Día</b> ni cambia sus totales.</span>}
        </p>

        {!subFijo && !initial && (
          <div>
            <label htmlFor={`${uid}-sub`} className={labelCls}>Subrubro</label>
            <select id={`${uid}-sub`} className={inputCls} value={subId}
              onChange={e => { setSubId(e.target.value); setConceptoId(''); setErrores(er => ({ ...er, sub: null })); }}>
              <option value="">— Elegí —</option>
              {subrubros.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            {errores.sub && <p className={errCls}>{errores.sub}</p>}
          </div>
        )}

        <div>
          <label htmlFor={`${uid}-concepto`} className={labelCls}>Concepto</label>
          {cargandoConceptos ? (
            <p className="text-xs text-slate-500 flex items-center gap-1.5 min-h-10"><Loader2 size={12} className="animate-spin" /> Cargando conceptos...</p>
          ) : (
            <select id={`${uid}-concepto`} className={inputCls} value={conceptoEfectivo} disabled={!subId}
              onChange={e => { setConceptoId(e.target.value); setErrores(er => ({ ...er, concepto: null })); }}
              aria-invalid={!!errores.concepto}>
              <option value="">— Elegí —</option>
              {opciones.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre}{!c.activo ? ' (desactivado)' : esCaja && !c.mostrar_en_caja ? ' (no se ofrece en Caja)' : ''}
                </option>
              ))}
            </select>
          )}
          {sinOpciones && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              {esCaja ? 'Este subrubro no tiene conceptos habilitados para la Caja.' : 'Este subrubro no tiene conceptos activos.'}
            </p>
          )}
          {errores.concepto && <p className={errCls}>{errores.concepto}</p>}
          {!esCaja && subId && (
            nuevoAbierto ? (
              <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 p-2 space-y-2">
                <input className={inputCls} placeholder="Nombre del concepto nuevo" value={nuevoNombre} maxLength={60}
                  aria-label="Nombre del concepto nuevo" autoFocus
                  onChange={e => setNuevoNombre(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); crearConcepto(); } }} />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 min-h-11 sm:min-h-0 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-violet-600" checked={nuevoEnCaja} onChange={e => setNuevoEnCaja(e.target.checked)} />
                    Ofrecer en la Caja
                  </label>
                  <button type="button" onClick={() => setNuevoAbierto(false)}
                    className="ml-auto min-h-11 sm:min-h-8 px-2 text-xs text-slate-500 hover:underline">Cancelar</button>
                  <button type="button" onClick={crearConcepto} disabled={!nuevoNombre.trim() || creandoConcepto}
                    className="min-h-11 sm:min-h-8 px-3 rounded-lg bg-violet-600 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-1">
                    {creandoConcepto && <Loader2 size={12} className="animate-spin" />} Crear
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setNuevoAbierto(true)}
                className="mt-1 min-h-11 sm:min-h-0 inline-flex items-center gap-1 text-xs font-medium text-violet-700 dark:text-violet-300 hover:underline">
                <Plus size={12} /> Nuevo concepto
              </button>
            )
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${uid}-monto`} className={labelCls}>Monto</label>
            <input id={`${uid}-monto`} ref={montoRef} type="number" inputMode="decimal" min="0" step="any"
              className={`${inputCls} text-base font-semibold tabular-nums`} placeholder="0,00"
              value={monto} autoFocus={!initial}
              onChange={e => { setMonto(e.target.value); setErrores(er => ({ ...er, monto: null })); }}
              aria-invalid={!!errores.monto} />
            {errores.monto && <p className={errCls}>{errores.monto}</p>}
          </div>
          <div>
            <label htmlFor={`${uid}-fecha`} className={labelCls}>Fecha</label>
            <input id={`${uid}-fecha`} type="date" className={inputCls} value={fecha} max={hoy}
              onChange={e => { setFecha(e.target.value); setErrores(er => ({ ...er, fecha: null })); }}
              aria-invalid={!!errores.fecha} />
            {errores.fecha && <p className={errCls}>{errores.fecha}</p>}
          </div>
        </div>

        {(esCaja || conOrigenElegible) && (
          <div>
            <span className={labelCls} id={`${uid}-metodo`}>Método</span>
            <div role="radiogroup" aria-labelledby={`${uid}-metodo`} className="flex flex-wrap rounded-lg bg-slate-100 dark:bg-slate-700/60 p-0.5 text-sm font-medium">
              {[
                ...Object.entries(METODO_LABEL),
                ...(conOrigenElegible ? [[null, 'No impacta en caja']] : []),
              ].map(([v, l]) => {
                const activo = v === null ? !esCaja : esCaja && metodo === v;
                return (
                  <button key={v ?? 'ninguno'} type="button" role="radio" aria-checked={activo}
                    onClick={() => {
                      setOrigenSel(v === null ? 'subrubro' : 'caja');
                      setMetodo(v);
                      setErrores(er => ({ ...er, metodo: null }));
                    }}
                    className={`flex-1 min-w-24 min-h-11 sm:min-h-9 rounded-md transition-colors ${activo ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-300'}`}>
                    {l}
                  </button>
                );
              })}
            </div>
            {errores.metodo && <p className={errCls}>{errores.metodo}</p>}
            {esCaja && metodo === 'transferencia' && multiBanco && (
              <div className="mt-3">
                <BancoSelect id={`${uid}-banco`} opciones={bancosActivos} value={bancoId} onChange={setBancoElegido}
                  bancoActual={initial?.banco_id != null ? bancoDe(initial.banco_id) : null} />
              </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor={`${uid}-desc`} className={labelCls}>Descripción <span className="font-normal text-slate-500 dark:text-slate-400">(opcional)</span></label>
          <input id={`${uid}-desc`} type="text" className={inputCls} maxLength={300}
            placeholder="Ej: mercadería para el evento" value={descripcion}
            onChange={e => setDescripcion(e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}
