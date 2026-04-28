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

  // Vinculación manual de facturas
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

  // Auto-rellenar y bloquear el monto cuando hay facturas seleccionadas
  useEffect(() => {
    if (facturasSeleccionadas.size > 0) setPago(String(totalSeleccionado));
  }, [facturasSeleccionadas]);

  const montoPago = Number(pago) || 0;
  const diferencia = Math.round((totalSeleccionado - montoPago) * 100) / 100;
  const hayVinculacion = facturasSeleccionadas.size > 0;

  // Preview FIFO (cuando pago sin vinculación manual)
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

  const camposSuma = campos.filter(c => c.tipo === 'suma');
  const camposResta = campos.filter(c => c.tipo === 'resta');
  const camposTexto = campos.filter(c => c.tipo === 'texto');

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const inputNumCls = 'w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Selector de tipo */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm font-medium">
        {TIPOS.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => handleChangeTipo(t.value)}
            className={`flex-1 py-2 px-1 text-center transition-colors ${
              tipo === t.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Fecha */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Fecha</label>
        <input type="date" className={inputCls} value={fecha} onChange={e => setFecha(e.target.value)} required />
      </div>

      {/* ── FACTURA ── */}
      {tipo === 'factura' && (
        <>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Monto <span className="text-slate-400">(boleta/importe)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 text-sm font-semibold">+</span>
              <input type="number" min="0" step="any" className={inputNumCls} placeholder="0"
                value={monto} onChange={e => setMonto(e.target.value)} />
            </div>
          </div>

          {/* Campos numéricos custom */}
          {camposSuma.map(c => (
            <div key={c.id}>
              <label className="block text-xs font-medium text-slate-600 mb-1">
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
              <label className="block text-xs font-medium text-slate-600 mb-1">
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
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Vencimiento <span className="text-slate-400">(opcional)</span>
            </label>
            <input type="date" className={inputCls} value={fechaVenc} onChange={e => setFechaVenc(e.target.value)} />
          </div>

          {camposTexto.map(c => (
            <div key={c.id}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{c.nombre}</label>
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
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {tipo === 'nota_credito' ? 'Monto de la nota de crédito' : 'Monto del pago'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 text-sm font-semibold">−</span>
              <input type="number" min="0" step="any"
                className={`${inputNumCls} ${hayVinculacion ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                placeholder="0"
                value={pago}
                onChange={e => setPago(e.target.value)}
                readOnly={hayVinculacion} />
            </div>
          </div>

          {/* Lista de facturas pendientes para vincular */}
          {todasFacturasPendientes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-600">
                  Vincular a facturas específicas
                  <span className="ml-1 text-slate-400 font-normal">(opcional)</span>
                </label>
                {facturasSeleccionadas.size > 0 && (
                  <button type="button" onClick={() => setFacturasSeleccionadas(new Set())}
                    className="text-xs text-slate-400 hover:text-slate-600">
                    Limpiar
                  </button>
                )}
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                {todasFacturasPendientes.map(f => {
                  const sel = facturasSeleccionadas.has(f.id);
                  return (
                    <label key={f.id}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-slate-100 last:border-0 transition-colors ${sel ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={sel} onChange={() => toggleFactura(f.id)}
                        className="shrink-0 accent-blue-600" />
                      <span className="text-xs text-slate-500 w-20 shrink-0">{f.fecha}</span>
                      <span className="text-xs font-semibold text-slate-800 flex-1">{fmt(f.monto)}</span>
                      {f.campos_extra?.nro_factura && (
                        <span className="text-xs text-slate-400 truncate max-w-24">#{f.campos_extra.nro_factura}</span>
                      )}
                    </label>
                  );
                })}
              </div>

              {/* Resumen de vinculación */}
              {hayVinculacion && (
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total facturas seleccionadas:</span>
                    <span className="font-semibold">{fmt(totalSeleccionado)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Monto del {tipo === 'nota_credito' ? 'crédito' : 'pago'}:</span>
                    <span className="font-semibold">{fmt(montoPago)}</span>
                  </div>
                  {diferencia > 0.005 && (
                    <div className="flex justify-between text-amber-700 font-medium">
                      <span>Diferencia (se generará ajuste automático):</span>
                      <span>{fmt(diferencia)}</span>
                    </div>
                  )}
                  {diferencia < -0.005 && (
                    <div className="flex justify-between text-blue-600 font-medium">
                      <span>Excedente (queda como crédito libre):</span>
                      <span>{fmt(Math.abs(diferencia))}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Concepto de diferencia */}
              {hayVinculacion && diferencia > 0.005 && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Concepto del ajuste automático
                  </label>
                  <input type="text" className={inputCls} placeholder="Ej: Descuento, Retención, Ajuste..."
                    value={conceptoDiferencia} onChange={e => setConceptoDiferencia(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* Preview FIFO (sin vinculación manual) */}
          {!hayVinculacion && preview && (
            <div className={`rounded-lg border p-3 text-sm ${preview.cubiertas.length > 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className="font-semibold text-slate-700 mb-1.5 text-xs">
                Se aplicará automáticamente (más antiguas primero):
              </p>
              {preview.cubiertas.length > 0 ? (
                <ul className="space-y-0.5 mb-1">
                  {preview.cubiertas.map(b => (
                    <li key={b.id} className="flex items-center gap-1.5 text-green-700 text-xs">
                      <span>✓</span>
                      <span>{b.fecha} — {fmt(b.monto)} → <strong>PAGADA</strong></span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {preview.restante > 0 && (
                <p className="text-slate-500 text-xs">Quedan {fmt(preview.restante)} sin asignar.</p>
              )}
              {preview.cubiertas.length === 0 && (
                <p className="text-amber-700 text-xs">No alcanza para cubrir ninguna factura completa.</p>
              )}
            </div>
          )}

          {/* Vinculación: resumen de facturas que quedarán pagas */}
          {hayVinculacion && facturasSeleccionadas.size > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs">
              <p className="font-semibold text-blue-800 mb-1">
                Facturas que quedarán marcadas como pagadas:
              </p>
              <ul className="space-y-0.5">
                {todasFacturasPendientes
                  .filter(f => facturasSeleccionadas.has(f.id))
                  .map(f => (
                    <li key={f.id} className="flex items-center gap-1.5 text-blue-700">
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
          className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-200">
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
