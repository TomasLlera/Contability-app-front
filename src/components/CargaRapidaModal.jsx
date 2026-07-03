import { useState, useEffect, useRef } from 'react';
import { X, Zap } from 'lucide-react';
import { subrubrosApi, movimientosApi, cajaApi, getErrorMsg, newIdemKey } from '../api';
import toast from 'react-hot-toast';

const today = () => new Date().toISOString().split('T')[0];
const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

const TIPOS = [
  { value: 'factura',      label: 'Factura',       color: 'bg-amber-500' },
  { value: 'pago',         label: 'Pago',          color: 'bg-blue-500' },
  { value: 'nota_credito', label: 'Nota Créd.',    color: 'bg-purple-500' },
];

const inputCls = 'w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const selectCls = inputCls;

export default function CargaRapidaModal({ rubros, onClose, onSaved }) {
  const [rubroId, setRubroId] = useState('');
  const [subrubros, setSubrubros] = useState([]);
  const [subrubroId, setSubrubroId] = useState('');
  const [tipo, setTipo] = useState('factura');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(today());
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
  const [facturas, setFacturas] = useState([]);
  const [facturaSel, setFacturaSel] = useState('');
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  // Clave de idempotencia estable por apertura del modal (una alta lógica).
  const idemKeyRef = useRef(null);
  if (idemKeyRef.current === null) idemKeyRef.current = newIdemKey();

  useEffect(() => {
    if (!rubroId) { setSubrubros([]); setSubrubroId(''); return; }
    setLoadingSubs(true);
    subrubrosApi.getByRubro(rubroId)
      .then(s => { setSubrubros(s); setSubrubroId(s[0]?.id || ''); })
      .finally(() => setLoadingSubs(false));
  }, [rubroId]);

  const esPago = tipo === 'pago' || tipo === 'nota_credito';
  // Remito: no lleva percepciones y se paga siempre en efectivo (automático).
  const esRemito = tipo === 'factura' && documento === 'remito';

  // Boletas pendientes del subrubro: permiten aplicar el pago/NC a una factura
  // puntual (y dejar saldo si es parcial). Solo aplica a pago / nota de crédito.
  useEffect(() => {
    if (!subrubroId || !esPago) { setFacturas([]); setFacturaSel(''); return; }
    setLoadingFacturas(true);
    cajaApi.getFacturasPendientes(subrubroId)
      .then(setFacturas)
      .catch(() => setFacturas([]))
      .finally(() => setLoadingFacturas(false));
  }, [subrubroId, esPago]);

  const handleFacturaSel = (id) => {
    setFacturaSel(id);
    const f = facturas.find(f => String(f.id) === String(id));
    // Prefill con el SALDO restante (no el monto original), editable para parciales.
    if (f) setMonto(String(f.saldo != null ? f.saldo : f.monto));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const n = Number(monto);
    if (!n || !subrubroId) return;
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
          fecha_vencimiento: null,
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
      onClose();
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const rubrosSorted = [...rubros].sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-blue-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Carga rápida</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Tipo */}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs font-medium">
            {TIPOS.map(t => (
              <button key={t.value} type="button" onClick={() => setTipo(t.value)}
                className={`flex-1 py-2 transition-colors ${tipo === t.value ? `${t.color} text-white` : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Rubro */}
          <select className={selectCls} value={rubroId} onChange={e => setRubroId(e.target.value)} required>
            <option value="">— Seleccionar rubro —</option>
            {rubrosSorted.map(r => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>

          {/* Subrubro */}
          <select className={selectCls} value={subrubroId} onChange={e => setSubrubroId(e.target.value)} required disabled={!rubroId || loadingSubs}>
            <option value="">— {loadingSubs ? 'Cargando...' : 'Seleccionar subrubro'} —</option>
            {subrubros.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>

          {/* Boleta a la que aplicar — solo Pago / Nota de crédito */}
          {esPago && subrubroId && (
            loadingFacturas
              ? <p className="text-xs text-slate-400">Cargando boletas...</p>
              : facturas.length === 0
                ? <p className="text-xs text-slate-400">Sin boletas pendientes en este subrubro.</p>
                : (
                  <select className={selectCls} value={facturaSel} onChange={e => handleFacturaSel(e.target.value)}>
                    <option value="">— Aplicar a boleta (opcional) —</option>
                    {facturas.map(f => {
                      const saldo = f.saldo != null ? f.saldo : f.monto;
                      const parcial = f.saldo != null && f.saldo < f.monto - 0.005;
                      return (
                        <option key={f.id} value={f.id}>
                          {(f.concepto || 'Factura')} — {fmt(saldo)}{parcial ? ' (saldo, ya tiene NC/pago)' : ''}{f.fecha ? ` — ${f.fecha}` : ''}
                        </option>
                      );
                    })}
                  </select>
                )
          )}

          {/* Fecha */}
          <input type="date" className={inputCls} value={fecha} max={today()} onChange={e => setFecha(e.target.value)} required />

          {/* Documento — solo en Factura */}
          {tipo === 'factura' && (
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs font-medium">
              <button type="button" onClick={() => setDocumento('factura')}
                className={`flex-1 py-2 transition-colors ${documento === 'factura' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                Factura
              </button>
              <button type="button" onClick={() => setDocumento('remito')}
                className={`flex-1 py-2 transition-colors ${documento === 'remito' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                Remito
              </button>
            </div>
          )}

          {/* Método de pago — solo en Pago */}
          {tipo === 'pago' && (
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs font-medium">
              <button type="button" onClick={() => setMetodoPago('efectivo')}
                className={`flex-1 py-2 transition-colors ${metodoPago === 'efectivo' ? 'bg-green-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                Efectivo
              </button>
              <button type="button" onClick={() => setMetodoPago('transferencia')}
                className={`flex-1 py-2 transition-colors ${metodoPago === 'transferencia' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                Transferencia
              </button>
            </div>
          )}

          {/* Método de pago de la factura — viaja a la Caja del Día al vencer. Remito = efectivo. */}
          {tipo === 'factura' && (
            <div>
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs font-medium">
                {[['efectivo', 'Efectivo', 'bg-green-600'], ['transferencia', 'Transferencia', 'bg-blue-600']].map(([v, l, bg]) => {
                  const active = (esRemito ? 'efectivo' : metodoFactura) === v;
                  return (
                    <button key={v} type="button" disabled={esRemito}
                      onClick={() => { if (!esRemito) setMetodoFactura(active ? null : v); }}
                      className={`flex-1 py-2 transition-colors ${active ? `${bg} text-white` : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'} ${esRemito ? 'cursor-not-allowed opacity-90' : ''}`}>
                      {l}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {esRemito
                  ? 'Remito — siempre efectivo. Aparece en la Caja del Día.'
                  : 'Opcional. Al vencer, aparece con este método en la Caja del Día.'}
              </p>
            </div>
          )}

          {/* Percepciones — solo Factura (no remito) / Nota de Crédito. No suman al
              monto. Se ubican arriba del monto (el monto es lo último que se carga). */}
          {((tipo === 'factura' && !esRemito) || tipo === 'nota_credito') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">Percepción IVA <span className="font-normal text-violet-400/70">(no suma)</span></label>
                <input type="number" min="0" step="any" placeholder="0"
                  className="w-full border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={percepcionIva} onChange={e => setPercepcionIva(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">Ingresos Brutos <span className="font-normal text-violet-400/70">(no suma)</span></label>
                <input type="number" min="0" step="any" placeholder="0"
                  className="w-full border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={ingresosBrutos} onChange={e => setIngresosBrutos(e.target.value)} />
              </div>
            </div>
          )}

          {/* Monto */}
          <div className="relative">
            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold ${esPago ? 'text-blue-500' : 'text-green-600'}`}>
              {esPago ? '−' : '+'}
            </span>
            <input type="number" min="0" step="any" placeholder="0"
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={monto} onChange={e => setMonto(e.target.value)} required />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-600">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !Number(monto) || !subrubroId}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
