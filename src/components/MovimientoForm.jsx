import { useState, useEffect, useRef } from 'react';
import { FileText, CreditCard, FileMinus, Check, Banknote, ArrowLeftRight, Loader2 } from 'lucide-react';
import { newIdemKey } from '../api';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

const TIPOS = [
  { value: 'factura',      label: 'Factura',          Icon: FileText,   hint: 'Boleta o importe a cobrar/pagar' },
  { value: 'pago',         label: 'Pago',             Icon: CreditCard, hint: 'Abono o pago realizado' },
  { value: 'nota_credito', label: 'Nota de Crédito',  Icon: FileMinus,  hint: 'Crédito emitido por el proveedor' },
];

export default function MovimientoForm({ campos = [], movimiento, todasFacturasPendientes = [], onSave, onCancel, metodoDefault = 'ambas' }) {
  const today = new Date().toISOString().split('T')[0];

  const tipoInicial = movimiento?.tipo || 'factura';
  const [tipo, setTipo] = useState(tipoInicial);
  const [monto, setMonto] = useState(movimiento?.monto > 0 ? movimiento.monto : '');
  const [pago, setPago] = useState(movimiento?.pago > 0 ? movimiento.pago : '');
  const [fecha, setFecha] = useState(movimiento?.fecha ?? today);
  const [fechaVenc, setFechaVenc] = useState(movimiento?.fecha_vencimiento ?? '');
  const [camposExtra, setCamposExtra] = useState(movimiento?.campos_extra ?? {});

  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState(
    new Set(movimiento?.facturas_vinculadas_ids || [])
  );
  // Ya no se genera ajuste por diferencia (modelo de saldo); se mantiene el valor
  // por compatibilidad del payload, pero el backend lo ignora.
  const conceptoDiferencia = 'Diferencia';
  // Método de pago: solo aplica a pagos / notas de crédito.
  // Si el subrubro tiene un método fijo ('efectivo'/'transferencia'), se preselecciona
  // y se bloquea el selector. Con 'ambas' el usuario elige libremente.
  const metodoFijo = metodoDefault === 'efectivo' || metodoDefault === 'transferencia';
  const [metodoPago, setMetodoPago] = useState(
    movimiento?.metodo_pago ?? (metodoFijo ? metodoDefault : null)
  );
  // Tipo de documento: solo aplica a facturas. Default 'factura'.
  const [documento, setDocumento] = useState(movimiento?.documento || 'factura');

  // Percepción IVA / Ingresos Brutos: aplican a facturas y notas de crédito. NO suman
  // al total del comprobante; se acumulan aparte por mes en la sección IVA.
  const [percepcionIva, setPercepcionIva] = useState(movimiento?.percepcion_iva > 0 ? movimiento.percepcion_iva : '');
  const [ingresosBrutos, setIngresosBrutos] = useState(movimiento?.ingresos_brutos > 0 ? movimiento.ingresos_brutos : '');

  // Estado de guardado: deshabilita el botón y bloquea reenvíos mientras la alta
  // está en vuelo (defensa contra el doble clic). El ref bloquea de forma síncrona
  // incluso antes de que React re-renderice el botón deshabilitado.
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  // Clave de idempotencia estable por cada apertura del formulario (una alta lógica).
  // Si el alta se reintenta con la misma clave, el backend no la duplica.
  const idemKeyRef = useRef(null);
  if (idemKeyRef.current === null) idemKeyRef.current = newIdemKey();

  const setExtra = (nombre, val) => setCamposExtra(prev => ({ ...prev, [nombre]: val }));

  const esPagoONC = tipo === 'pago' || tipo === 'nota_credito';
  // Remito: no lleva percepciones y se paga siempre en efectivo (automático).
  const esRemito = tipo === 'factura' && documento === 'remito';
  // Método de pago de la factura: viaja a la Caja del Día cuando vence. El remito
  // queda fijo en efectivo; si el subrubro tiene método fijo, tampoco es editable.
  const metodoBloqueado = esRemito || metodoFijo;
  const metodoFacturaActivo = esRemito ? 'efectivo' : metodoPago;

  const toggleFactura = (id) => {
    setFacturasSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Saldo restante de la factura (monto original − NC/pagos ya aplicados). Si el
  // backend no lo manda, cae al monto. Es lo que se debe vincular/mostrar para no
  // pisar créditos previos: una 2da NC ve el saldo, no el monto original.
  const saldoBase = (f) => (f.saldo != null ? f.saldo : (f.monto || 0));

  // Al EDITAR un pago/NC vinculado, el saldo del backend ya descuenta ESTE
  // movimiento. Como la edición reemplaza su aplicación (no la suma), hay que
  // devolvérsela para mostrar/validar el saldo real disponible: se reparte
  // mov.pago entre sus facturas vinculadas (en orden por fecha), sin exceder lo
  // que a cada una le falta hasta su monto original.
  const saldosSinEsteMov = (() => {
    if (!movimiento?.id || !movimiento.facturas_vinculadas_ids?.length) return null;
    if (movimiento.tipo !== 'pago' && movimiento.tipo !== 'nota_credito') return null;
    const linked = new Set(movimiento.facturas_vinculadas_ids);
    let restante = movimiento.pago || 0;
    const map = new Map();
    for (const f of todasFacturasPendientes) {
      if (!linked.has(f.id) || restante <= 0.005) continue;
      const s = saldoBase(f);
      const devolver = Math.min(restante, Math.max(0, (f.monto || 0) - s));
      map.set(f.id, Math.round((s + devolver) * 100) / 100);
      restante = Math.round((restante - devolver) * 100) / 100;
    }
    return map;
  })();

  const saldoFactura = (f) => saldosSinEsteMov?.get(f.id) ?? saldoBase(f);
  const tieneCreditoPrevio = (f) => saldoFactura(f) < (f.monto || 0) - 0.005;

  const totalSeleccionado = todasFacturasPendientes
    .filter(f => facturasSeleccionadas.has(f.id))
    .reduce((s, f) => s + saldoFactura(f), 0);

  // Autocompletar el monto con el saldo seleccionado SOLO cuando el usuario cambia
  // la selección. En el primer render (modo edición) se saltea: si no, pisaría el
  // monto original del pago/NC que se está editando.
  const selInicialRef = useRef(true);
  useEffect(() => {
    if (selInicialRef.current) { selInicialRef.current = false; return; }
    if (facturasSeleccionadas.size > 0) setPago(String(totalSeleccionado));
  }, [facturasSeleccionadas]);

  const montoPago = Number(pago) || 0;
  const diferencia = Math.round((totalSeleccionado - montoPago) * 100) / 100;
  const hayVinculacion = facturasSeleccionadas.size > 0;
  // Una NC nunca puede superar el saldo de las facturas a las que se aplica
  // (un pago sí: el excedente queda como crédito libre). Bloquea el guardado.
  const excedeNC = tipo === 'nota_credito' && hayVinculacion && diferencia < -0.005;

  const r2 = (n) => Math.round(n * 100) / 100;

  // Preview de la aplicación automática (FIFO): igual que el backend, aplica
  // contra el SALDO restante de cada factura (no el monto original) y admite
  // aplicación parcial sobre la última.
  const previewFIFO = () => {
    if (!montoPago || montoPago <= 0 || hayVinculacion) return null;
    let restante = montoPago;
    const aplicadas = [];
    for (const b of todasFacturasPendientes) {
      if (restante <= 0.005) break;
      const s = saldoFactura(b);
      if (s <= 0.005) continue;
      const aplicado = Math.min(restante, s);
      aplicadas.push({ id: b.id, fecha: b.fecha, saldo: s, aplicado, saldoNuevo: r2(s - aplicado) });
      restante = r2(restante - aplicado);
    }
    return { aplicadas, restante };
  };
  const preview = !esPagoONC ? null : previewFIFO();

  // Aplicación sobre las facturas seleccionadas, en el mismo orden (por fecha)
  // que usa el backend: contra el saldo, con parcial sobre la última.
  const previewVinculadas = () => {
    let restante = montoPago;
    return todasFacturasPendientes
      .filter(f => facturasSeleccionadas.has(f.id))
      .map(f => {
        const s = saldoFactura(f);
        const aplicado = Math.min(restante, s);
        restante = r2(restante - aplicado);
        return { f, saldo: s, aplicado, saldoNuevo: r2(s - aplicado) };
      });
  };

  const handleChangeTipo = (t) => {
    setTipo(t);
    if (t === 'factura') {
      setPago('');
      setFacturasSeleccionadas(new Set());
    } else {
      setMonto('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Guarda síncrona anti doble-clic: si ya hay un alta en vuelo, ignorar.
    if (savingRef.current) return;

    let payload;
    if (esPagoONC) {
      const p = Number(pago) || 0;
      if (!p) return;
      // NC mayor al saldo de las facturas vinculadas: bloqueada (el backend
      // también la rechaza con 400).
      if (excedeNC) return;
      payload = {
        tipo,
        pago: p,
        monto: 0,
        fecha,
        fecha_vencimiento: null,
        campos_extra: camposExtra,
        facturas_vinculadas_ids: [...facturasSeleccionadas],
        concepto_diferencia: conceptoDiferencia,
        metodo_pago: tipo === 'pago' ? metodoPago : null,
        // Percepciones: solo aplican a la NC (no al pago). No suman al monto.
        percepcion_iva: tipo === 'nota_credito' ? (Number(percepcionIva) || 0) : 0,
        ingresos_brutos: tipo === 'nota_credito' ? (Number(ingresosBrutos) || 0) : 0,
        idempotency_key: idemKeyRef.current,
      };
    } else {
      const m = Number(monto) || 0;
      if (!m) return;
      payload = {
        tipo: 'factura',
        monto: m,
        pago: 0,
        fecha,
        fecha_vencimiento: fechaVenc || null,
        campos_extra: camposExtra,
        facturas_vinculadas_ids: [],
        documento,
        // Método de pago de la factura: viaja a la Caja del Día al vencer. Remito = efectivo.
        metodo_pago: esRemito ? 'efectivo' : (metodoPago || null),
        // Un remito nunca lleva percepciones (el backend también las fuerza a 0).
        percepcion_iva: esRemito ? 0 : (Number(percepcionIva) || 0),
        ingresos_brutos: esRemito ? 0 : (Number(ingresosBrutos) || 0),
        idempotency_key: idemKeyRef.current,
      };
    }

    savingRef.current = true;
    setSaving(true);
    try {
      await onSave(payload);
      // Éxito: el padre cierra el formulario (se desmonta), no hace falta resetear.
    } catch {
      // Error: rehabilitar para permitir reintento (con la MISMA clave → sin duplicar).
      savingRef.current = false;
      setSaving(false);
    }
  };

  const camposSuma  = campos.filter(c => c.tipo === 'suma');
  const camposResta = campos.filter(c => c.tipo === 'resta');
  const camposTexto = campos.filter(c => c.tipo === 'texto');

  const inputCls    = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const inputNumCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls    = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1';
  const inputVioletCls = 'w-full border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
  const labelVioletCls = 'block text-xs font-medium text-violet-600 dark:text-violet-400 mb-1';

  // Percepción IVA / Ingresos Brutos — aplican a facturas y notas de crédito.
  // No suman al total; el backend las acumula por mes en la sección IVA. Se muestran
  // como dos inputs simétricos con el resto (sin caja), justo arriba del monto.
  const percepcionesBlock = (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelVioletCls}>Percepción IVA <span className="font-normal text-violet-400/70">(no suma)</span></label>
        <input type="number" min="0" step="any" className={inputVioletCls} placeholder="0"
          value={percepcionIva} onChange={e => setPercepcionIva(e.target.value)} />
      </div>
      <div>
        <label className={labelVioletCls}>Ingresos Brutos <span className="font-normal text-violet-400/70">(no suma)</span></label>
        <input type="number" min="0" step="any" className={inputVioletCls} placeholder="0"
          value={ingresosBrutos} onChange={e => setIngresosBrutos(e.target.value)} />
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Selector de tipo */}
      <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-sm font-medium">
        {TIPOS.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => handleChangeTipo(t.value)}
            className={`flex-1 py-2 px-1 flex items-center justify-center gap-1.5 transition-colors ${
              tipo === t.value
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
            }`}
          >
            <t.Icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Fecha */}
      <div>
        <label className={labelCls}>Fecha</label>
        <input type="date" className={inputCls} value={fecha} max={today} onChange={e => setFecha(e.target.value)} required />
      </div>

      {/* ── FACTURA ── */}
      {tipo === 'factura' && (
        <>
          <div>
            <label className={labelCls}>Documento</label>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs font-medium">
              {[
                { value: 'factura', label: 'Factura' },
                { value: 'remito',  label: 'Remito'  },
              ].map(d => (
                <button key={d.value} type="button" onClick={() => setDocumento(d.value)}
                  className={`flex-1 py-2 transition-colors ${documento === d.value
                    ? 'bg-amber-500 text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Método de pago de la factura — viaja a la Caja del Día cuando vence.
              Remito: fijo en efectivo. Si el subrubro tiene método fijo, tampoco es editable. */}
          <div>
            <label className={labelCls}>
              Método de pago <span className="text-slate-400">(al vencer, aparece así en la Caja del Día)</span>
            </label>
            <div className={`flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-sm font-medium ${metodoBloqueado ? 'opacity-90' : ''}`}>
              {[
                { value: 'efectivo',      label: 'Efectivo',      Icon: Banknote },
                { value: 'transferencia', label: 'Transferencia', Icon: ArrowLeftRight },
              ].map(m => {
                const active = metodoFacturaActivo === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    disabled={metodoBloqueado}
                    onClick={() => { if (!metodoBloqueado) setMetodoPago(active ? null : m.value); }}
                    className={`flex-1 py-2 px-1 flex items-center justify-center gap-1.5 transition-colors ${
                      active
                        ? (m.value === 'efectivo' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white')
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                    } ${metodoBloqueado ? 'cursor-not-allowed' : ''}`}
                  >
                    <m.Icon size={14} />
                    {m.label}
                  </button>
                );
              })}
            </div>
            {esRemito ? (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">Remito — siempre en efectivo. Aparece en la Caja del Día pendiente de confirmar.</p>
            ) : metodoFijo ? (
              <p className="mt-1 text-xs text-slate-400">Predeterminado del subrubro — no editable.</p>
            ) : !metodoPago && (
              <p className="mt-1 text-xs text-slate-400">Sin definir — al vencer aparece en la Caja sin método asignado.</p>
            )}
          </div>

          {/* Percepciones — no aplican al remito. */}
          {!esRemito && percepcionesBlock}

          <div>
            <label className={labelCls}>
              Monto <span className="text-slate-400">(boleta/importe)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 text-sm font-semibold">+</span>
              <input type="number" min="0" step="any" className={inputNumCls} placeholder="0"
                value={monto} onChange={e => setMonto(e.target.value)} />
            </div>
          </div>

          {camposSuma.map(c => (
            <div key={c.id}>
              <label className={labelCls}>
                {c.nombre} <span className="text-green-600 text-xs">(suma al total)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 text-sm font-semibold">+</span>
                <input type="number" min="0" step="any" className={inputNumCls} placeholder="0"
                  value={camposExtra[c.nombre] ?? ''} onChange={e => setExtra(c.nombre, e.target.value)} />
              </div>
            </div>
          ))}
          {camposResta.map(c => (
            <div key={c.id}>
              <label className={labelCls}>
                {c.nombre} <span className="text-red-500 text-xs">(resta del total)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 text-sm font-semibold">−</span>
                <input type="number" min="0" step="any" className={inputNumCls} placeholder="0"
                  value={camposExtra[c.nombre] ?? ''} onChange={e => setExtra(c.nombre, e.target.value)} />
              </div>
            </div>
          ))}

          <div>
            <label className={labelCls}>
              Vencimiento <span className="text-slate-400">(opcional)</span>
            </label>
            <input type="date" className={inputCls} value={fechaVenc} min={fecha} onChange={e => setFechaVenc(e.target.value)} />
          </div>

          {camposTexto.map(c => (
            <div key={c.id}>
              <label className={labelCls}>{c.nombre}</label>
              <input type="text" className={inputCls} placeholder={c.nombre}
                value={camposExtra[c.nombre] ?? ''} onChange={e => setExtra(c.nombre, e.target.value)} />
            </div>
          ))}
        </>
      )}

      {/* ── PAGO / NOTA DE CRÉDITO ── */}
      {esPagoONC && (
        <>
          {tipo === 'pago' && (
            <div>
              <label className={labelCls}>Método de pago</label>
              <div className={`flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-sm font-medium ${metodoFijo ? 'opacity-90' : ''}`}>
                {[
                  { value: 'efectivo',      label: 'Efectivo',      Icon: Banknote },
                  { value: 'transferencia', label: 'Transferencia', Icon: ArrowLeftRight },
                ].map(m => {
                  const active = metodoPago === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      disabled={metodoFijo}
                      onClick={() => { if (!metodoFijo) setMetodoPago(active ? null : m.value); }}
                      className={`flex-1 py-2 px-1 flex items-center justify-center gap-1.5 transition-colors ${
                        active
                          ? (m.value === 'efectivo'
                              ? 'bg-green-600 text-white'
                              : 'bg-blue-600 text-white')
                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                      } ${metodoFijo ? 'cursor-not-allowed' : ''}`}
                    >
                      <m.Icon size={14} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
              {metodoFijo ? (
                <p className="mt-1 text-xs text-slate-400">Predeterminado del subrubro — no editable.</p>
              ) : !metodoPago && (
                <p className="mt-1 text-xs text-slate-400">Sin definir — el pago queda registrado sin método.</p>
              )}
            </div>
          )}
          {tipo === 'nota_credito' && percepcionesBlock}

          <div>
            <label className={labelCls}>
              {tipo === 'nota_credito' ? 'Monto de la nota de crédito' : 'Monto del pago'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 text-sm font-semibold">−</span>
              <input type="number" min="0" step="any"
                className={inputNumCls}
                placeholder="0"
                value={pago}
                onChange={e => setPago(e.target.value)} />
            </div>
          </div>

          {todasFacturasPendientes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls + ' mb-0'}>
                  Vincular a facturas específicas
                  <span className="ml-1 text-slate-400 font-normal">(opcional)</span>
                </label>
                {facturasSeleccionadas.size > 0 && (
                  <button type="button" onClick={() => setFacturasSeleccionadas(new Set())}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    Limpiar
                  </button>
                )}
              </div>
              <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                {todasFacturasPendientes.map(f => {
                  const sel = facturasSeleccionadas.has(f.id);
                  return (
                    <label key={f.id}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors ${
                        sel
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}>
                      <input type="checkbox" checked={sel} onChange={() => toggleFactura(f.id)}
                        className="shrink-0 accent-blue-600" />
                      <span className="text-xs text-slate-500 dark:text-slate-400 w-20 shrink-0">{f.fecha}</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex-1 flex items-center gap-1.5">
                        {fmt(saldoFactura(f))}
                        {tieneCreditoPrevio(f) && (
                          <>
                            <span className="text-[10px] font-normal text-slate-400 line-through">{fmt(f.monto)}</span>
                            <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">NC/pago aplicado</span>
                          </>
                        )}
                      </span>
                      {f.campos_extra?.nro_factura && (
                        <span className="text-xs text-slate-400 truncate max-w-24">#{f.campos_extra.nro_factura}</span>
                      )}
                    </label>
                  );
                })}
              </div>

              {hayVinculacion && (
                <div className="mt-2 space-y-1 text-xs">
                  {todasFacturasPendientes.some(f => facturasSeleccionadas.has(f.id) && tieneCreditoPrevio(f)) && (
                    <p className="text-amber-600 dark:text-amber-400">⚠ Esta factura ya tiene una NC/pago vinculado — se muestra el saldo restante.</p>
                  )}
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Saldo de facturas seleccionadas:</span>
                    <span className="font-semibold">{fmt(totalSeleccionado)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Monto del {tipo === 'nota_credito' ? 'crédito' : 'pago'}:</span>
                    <span className="font-semibold">{fmt(montoPago)}</span>
                  </div>
                  {diferencia > 0.005 && (
                    <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium">
                      <span>Saldo que queda pendiente en la factura:</span>
                      <span>{fmt(diferencia)}</span>
                    </div>
                  )}
                  {diferencia < -0.005 && (
                    tipo === 'nota_credito'
                      ? (
                        <div className="flex justify-between text-red-600 dark:text-red-400 font-medium">
                          <span>⚠ La NC supera el saldo de las facturas seleccionadas — bajá el monto:</span>
                          <span>{fmt(Math.abs(diferencia))} de más</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-blue-600 dark:text-blue-400 font-medium">
                          <span>Excedente (queda como crédito libre):</span>
                          <span>{fmt(Math.abs(diferencia))}</span>
                        </div>
                      )
                  )}
                </div>
              )}
            </div>
          )}

          {!hayVinculacion && preview && (
            <div className={`rounded-lg border p-3 text-sm ${
              preview.aplicadas.length > 0
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            }`}>
              <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1.5 text-xs">
                Se aplicará automáticamente al saldo (más antiguas primero):
              </p>
              {preview.aplicadas.length > 0 && (
                <ul className="space-y-0.5 mb-1">
                  {preview.aplicadas.map(a => (
                    <li key={a.id} className="flex items-center gap-1.5 text-green-700 dark:text-green-400 text-xs">
                      <Check size={11} />
                      <span>
                        {a.fecha} — saldo {fmt(a.saldo)} − {fmt(a.aplicado)} → {a.saldoNuevo <= 0.005 ? <strong>SALDADA</strong> : <>queda {fmt(a.saldoNuevo)}</>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {preview.restante > 0 && (
                <p className="text-slate-500 dark:text-slate-400 text-xs">Quedan {fmt(preview.restante)} sin asignar.</p>
              )}
              {preview.aplicadas.length === 0 && (
                <p className="text-amber-700 dark:text-amber-400 text-xs">No hay facturas con saldo pendiente.</p>
              )}
            </div>
          )}

          {hayVinculacion && !excedeNC && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 text-xs">
              <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                Cómo se aplica sobre el saldo de cada factura:
              </p>
              <ul className="space-y-0.5">
                {previewVinculadas().map(({ f, saldo, aplicado, saldoNuevo }) => (
                  <li key={f.id} className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                    <Check size={11} />
                    <span>
                      {f.fecha} — saldo {fmt(saldo)} − {fmt(aplicado)} → {saldoNuevo <= 0.005 ? <strong>SALDADA</strong> : <>queda {fmt(saldoNuevo)} pendiente</>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={saving}
          className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || excedeNC || (esPagoONC ? !Number(pago) : !Number(monto))}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center gap-1.5">
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
