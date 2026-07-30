import { useState, useEffect } from 'react';
import { registroApi } from '../api';
import { Scale, TriangleAlert, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import InfoTooltip from './InfoTooltip';

const fmt = (n) => (n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const labelMes = (mes) => {
  if (!mes) return '';
  const [y, m] = mes.split('-');
  return `${MESES[Number(m) - 1] || m} ${y}`;
};

// Estilo por estado del cruce. 'faltan_en_tarjetas' va en ámbar y no en rojo: que
// Venta Sistema supere a Tarjetas es esperable cuando hubo ventas en efectivo.
const ESTILOS = {
  coincide: {
    Icon: CheckCircle2, simbolo: '✓',
    box: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    texto: 'text-emerald-700 dark:text-emerald-400',
  },
  faltan_en_sistema: {
    Icon: TriangleAlert, simbolo: '⚠️',
    box: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    texto: 'text-red-600 dark:text-red-400',
  },
  faltan_en_tarjetas: {
    Icon: TriangleAlert, simbolo: '⚠️',
    box: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    texto: 'text-amber-600 dark:text-amber-400',
  },
  sin_datos: {
    Icon: Scale, simbolo: '',
    box: 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700',
    texto: 'text-slate-500 dark:text-slate-400',
  },
};

/**
 * Cruce del total FACTURADO en Venta Sistema contra el total cobrado con tarjeta, para
 * un mes. Sirve para verificar si lo que se facturó se condice con lo que efectivamente
 * entró por tarjeta. El ticket no entra en la comparación (no es facturación), pero se
 * informa aparte: una diferencia suele explicarse justo ahí.
 *
 * Se usa en Registro → Tarjetas y en Registro → Venta Sistema: los dos leen el mismo
 * endpoint, así que muestran el mismo número sin copiarlo ni sincronizarlo a mano.
 *
 * `reloadKey` fuerza el refetch: la vista de Tarjetas lo incrementa al cargar o
 * borrar un ingreso, que es lo que mueve el total del mes.
 *
 * `bare` saca el marco y el encabezado propios, para cuando ya va dentro de un modal
 * que aporta su propio título (si no, el mes queda escrito dos veces).
 */
export default function ComparativaVentasPanel({ mes, reloadKey = 0, titulo = 'Comparativa mensual', bare = false }) {
  // La respuesta se guarda junto al mes que la originó. Así el panel sabe cuándo lo
  // que tiene en pantalla todavía no corresponde al mes pedido y muestra el spinner,
  // en vez de rotular los números del mes anterior con el nuevo título.
  const [res, setRes] = useState({ mes: null, data: null });
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let vivo = true;
    registroApi.comparativaVentas(mes)
      .then(d => { if (vivo) setRes({ mes, data: d }); })
      .catch(() => { if (vivo) setRes({ mes, data: null }); });
    return () => { vivo = false; };
  }, [mes, reloadKey]);

  const loading = res.mes !== mes;
  const data = res.data;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 py-3 px-4">
        <Loader2 size={12} className="animate-spin" /> Calculando comparativa…
      </div>
    );
  }
  if (!data) return null;

  const est = ESTILOS[data.estado] || ESTILOS.sin_datos;
  // Días con diferencia: es donde conviene mirar primero cuando el mes no cierra.
  const diasConDif = (data.por_dia || []).filter(d => Math.abs(d.diferencia) > data.tolerancia);

  return (
    <div className={bare ? '' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden'}>
      {!bare && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40">
          <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Scale size={14} className="text-slate-400" /> {titulo} — {labelMes(data.mes)}
            <InfoTooltip text="Compara el total FACTURADO del mes en Venta Sistema contra el total cobrado con tarjeta. El ticket no entra: no es facturación. Sirve para detectar cobros con tarjeta que quedaron sin facturar. Diferencias de hasta $1 se toman como redondeo." />
          </span>
        </div>
      )}

      <div className={bare ? 'space-y-3' : 'p-4 space-y-3'}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Celda
            label="Total Facturado"
            valor={data.total_facturado}
            sub={`IVA 21%: ${fmt(data.venta_sistema.iva_21)}`}
            color="text-blue-600 dark:text-blue-400"
          />
          <Celda
            label="Total Ventas Tarjeta"
            valor={data.total_tarjetas}
            sub={`${data.tarjetas.transacciones} ${data.tarjetas.transacciones === 1 ? 'ingreso' : 'ingresos'}`}
            color="text-slate-700 dark:text-slate-200"
          />
          {/* Diferencia en valor absoluto: de qué lado falta la carga lo dice el
              cartel de estado de abajo, no el signo. */}
          <Celda
            label="Diferencia"
            valor={Math.abs(data.diferencia)}
            sub={data.porcentaje !== null ? `${Math.abs(data.porcentaje).toFixed(1)}% sobre el mayor` : 'Sin base de comparación'}
            color={est.texto}
          />
        </div>

        {/* El ticket queda fuera del cruce, pero es el primer lugar donde mirar cuando
            las tarjetas superan lo facturado: puede haber cobros con tarjeta cargados
            como ticket. */}
        {data.venta_sistema.total_ticket > 0 && (
          <p className="text-xs text-slate-400">
            Fuera del cruce — Ticket del mes: <span className="font-medium text-violet-600 dark:text-violet-400 tabular-nums">{fmt(data.venta_sistema.total_ticket)}</span>
            {' · '}Total Venta Sistema: <span className="font-medium text-slate-500 dark:text-slate-300 tabular-nums">{fmt(data.venta_sistema.total)}</span>
          </p>
        )}

        <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 ${est.box}`}>
          <est.Icon size={15} className={`${est.texto} shrink-0 mt-0.5`} />
          <div className="min-w-0">
            <p className={`text-sm font-medium ${est.texto}`}>{data.mensaje}</p>
            {data.sugerencia && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{data.sugerencia}</p>
            )}
          </div>
        </div>

        {diasConDif.length > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-700/60 pt-2">
            <button type="button" onClick={() => setAbierto(v => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors">
              <ChevronDown size={13} className={`transition-transform ${abierto ? 'rotate-180' : ''}`} />
              Ver los {diasConDif.length} {diasConDif.length === 1 ? 'día' : 'días'} con diferencia
            </button>
            {abierto && (
              <div className="mt-2 max-h-56 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="text-left py-1 font-medium">Día</th>
                      <th className="text-right py-1 font-medium">Facturado</th>
                      <th className="text-right py-1 font-medium">Tarjetas</th>
                      <th className="text-right py-1 font-medium">Ticket</th>
                      <th className="text-right py-1 font-medium">Dif.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {diasConDif.map(d => (
                      <tr key={d.fecha}>
                        <td className="py-1 text-slate-500 tabular-nums">{d.fecha}</td>
                        <td className="py-1 text-right text-slate-600 dark:text-slate-300 tabular-nums">{fmt(d.total_facturado)}</td>
                        <td className="py-1 text-right text-slate-600 dark:text-slate-300 tabular-nums">{fmt(d.total_tarjetas)}</td>
                        <td className="py-1 text-right text-slate-400 tabular-nums">{d.total_ticket ? fmt(d.total_ticket) : '—'}</td>
                        <td className={`py-1 text-right font-medium tabular-nums ${d.diferencia > 0 ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
                          {d.diferencia > 0 ? '+' : ''}{fmt(d.diferencia)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Celda({ label, valor, sub, color }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-bold ${color} tabular-nums`}>{fmt(valor)}</p>
      <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
    </div>
  );
}
