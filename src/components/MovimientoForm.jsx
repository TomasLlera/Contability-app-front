import { useState, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);

const TIPOS = [
  { value: 'factura',      label: 'Factura',          icon: '📄', hint: 'Boleta o importe a cobrar/pagar' },
  { value: 'pago',         label: 'Pago',             icon: '💳', hint: 'Abono o pago realizado' },
  { value: 'nota_credito', label: 'Nota de Crédito',  icon: '📋', hint: 'Crédito emitido por el proveedor' },
];

export default function MovimientoForm({ campos = [], movimiento, todasFacturasPendientes = [], onSave, onCancel }) {
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
  const [conceptoDiferencia, setConceptoDiferencia] = useState('Diferencia');

  const setExtra = (nombre, val) => setCamposExtra(prev => ({ ...prev, [nombre]: val }));

  const esPagoONC = tipo === 'pago' || tipo === 'nota_credito';

  const toggleFactura = (id) => {
    setFacturasSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalSeleccionado = todasFacturasPendientes
    .filter(f => facturasSeleccionadas.has(f.id))
    .reduce((s, f) => s + (f.monto || 0), 0);

  useEffect(() => {
    if (facturasSeleccionadas.size > 0) setPago(String(totalSeleccionado));
  }, [facturasSeleccionadas]);

  const montoPago = Number(pago) || 0;
  const diferencia = Math.round((totalSeleccionado - montoPago) * 100) / 100;
  const hayVinculacion = facturasSeleccionadas.size > 0;

  const previewFIFO = () => {
    if (!montoPago || montoPago <= 0 || hayVinculacion) return null;
    let restante = montoPago;
    const cubiertas = [];
    for (const b of todasFacturasPendientes) {
      if (restante >= b.monto) {
        cubiertas.push(b);
        restante -= b.monto;
      } else {
        break;
      }
    }
    return { cubiertas, restante };
  };
  const preview = !esPagoONC ? null : previewFIFO();

  const handleChangeTipo = (t) => {
    setTipo(t);
    if (t === 'factura') {
      setPago('');
      setFacturasSeleccionadas(new Set());
    } else {
      setMonto('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (esPagoONC) {
      const p = Number(pago) || 0;
      if (!p) return;
      onSave({
        tipo,
        pago: p,
        monto: 0,
        fecha,
        fecha_vencimiento: null,
        campos_extra: camposExtra,
        facturas_vinculadas_ids: [...facturasSeleccionadas],
        concepto_diferencia: conceptoDiferencia,
      });
    } else {
      const m = Number(monto) || 0;
      if (!m) return;
      onSave({
        tipo: 'factura',
        monto: m,
        pago: 0,
        fecha,
        fecha_vencimiento: fechaVenc || null,
        campos_extra: camposExtra,
        facturas_vinculadas_ids: [],
      });
    }
  };

  const camposSuma  = campos.filter(c => c.tipo === 'suma');
  const camposResta = campos.filter(c => c.tipo === 'resta');
  const camposTexto = campos.filter(c => c.tipo === 'texto');

  const inputCls    = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const inputNumCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls    = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Selector de tipo */}
      <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-sm font-medium">
        {TIPOS.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => handleChangeTipo(t.value)}
            className={`flex-1 py-2 px-1 text-center transition-colors ${
              tipo === t.value
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
            }`}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Fecha */}
      <div>
        <label className={labelCls}>Fecha</label>
        <input type="date" className={inputCls} value={fecha} onChange={e => setFecha(e.target.value)} required />
      </div>

      {/* ── FACTURA ── */}
      {tipo === 'factura' && (
        <>
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
            <input type="date" className={inputCls} value={fechaVenc} onChange={e => setFechaVenc(e.target.value)} />
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
          <div>
            <label className={labelCls}>
              {tipo === 'nota_credito' ? 'Monto de la nota de crédito' : 'Monto del pago'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 text-sm font-semibold">−</span>
              <input type="number" min="0" step="any"
                className={`${inputNumCls} ${hayVinculacion ? 'bg-slate-50 dark:bg-slate-600 cursor-not-allowed' : ''}`}
                placeholder="0"
                value={pago}
                onChange={e => setPago(e.target.value)}
                readOnly={hayVinculacion} />
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
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex-1">{fmt(f.monto)}</span>
                      {f.campos_extra?.nro_factura && (
                        <span className="text-xs text-slate-400 truncate max-w-24">#{f.campos_extra.nro_factura}</span>
                      )}
                    </label>
                  );
                })}
              </div>

              {hayVinculacion && (
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Total facturas seleccionadas:</span>
                    <span className="font-semibold">{fmt(totalSeleccionado)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Monto del {tipo === 'nota_credito' ? 'crédito' : 'pago'}:</span>
                    <span className="font-semibold">{fmt(montoPago)}</span>
                  </div>
                  {diferencia > 0.005 && (
                    <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium">
                      <span>Diferencia (se generará ajuste automático):</span>
                      <span>{fmt(diferencia)}</span>
                    </div>
                  )}
                  {diferencia < -0.005 && (
                    <div className="flex justify-between text-blue-600 dark:text-blue-400 font-medium">
                      <span>Excedente (queda como crédito libre):</span>
                      <span>{fmt(Math.abs(diferencia))}</span>
                    </div>
                  )}
                </div>
              )}

              {hayVinculacion && diferencia > 0.005 && (
                <div className="mt-2">
                  <label className={labelCls}>Concepto del ajuste automático</label>
                  <input type="text" className={inputCls} placeholder="Ej: Descuento, Retención, Ajuste..."
                    value={conceptoDiferencia} onChange={e => setConceptoDiferencia(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {!hayVinculacion && preview && (
            <div className={`rounded-lg border p-3 text-sm ${
              preview.cubiertas.length > 0
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            }`}>
              <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1.5 text-xs">
                Se aplicará automáticamente (más antiguas primero):
              </p>
              {preview.cubiertas.length > 0 && (
                <ul className="space-y-0.5 mb-1">
                  {preview.cubiertas.map(b => (
                    <li key={b.id} className="flex items-center gap-1.5 text-green-700 dark:text-green-400 text-xs">
                      <span>✓</span>
                      <span>{b.fecha} — {fmt(b.monto)} → <strong>PAGADA</strong></span>
                    </li>
                  ))}
                </ul>
              )}
              {preview.restante > 0 && (
                <p className="text-slate-500 dark:text-slate-400 text-xs">Quedan {fmt(preview.restante)} sin asignar.</p>
              )}
              {preview.cubiertas.length === 0 && (
                <p className="text-amber-700 dark:text-amber-400 text-xs">No alcanza para cubrir ninguna factura completa.</p>
              )}
            </div>
          )}

          {hayVinculacion && facturasSeleccionadas.size > 0 && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 text-xs">
              <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                Facturas que quedarán marcadas como pagadas:
              </p>
              <ul className="space-y-0.5">
                {todasFacturasPendientes
                  .filter(f => facturasSeleccionadas.has(f.id))
                  .map(f => (
                    <li key={f.id} className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                      <span>✓</span>
                      <span>{f.fecha} — {fmt(f.monto)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-600">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={esPagoONC ? !Number(pago) : !Number(monto)}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40">
          Guardar
        </button>
      </div>
    </form>
  );
}
