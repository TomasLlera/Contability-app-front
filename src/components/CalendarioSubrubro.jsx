import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);
const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date;
};

const DIAS    = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_C = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function getDayInfo(movimientos, dateStr) {
  const movs    = movimientos.filter(m => m.fecha === dateStr);
  const montos  = movs.reduce((s, m) => s + (m.monto || 0), 0);
  const pagos   = movs.reduce((s, m) => s + (m.pago  || 0), 0);
  return { movs, montos, pagos, count: movs.length };
}

// ─── Vista MES ───────────────────────────────────────────────────────────────
function VistaMes({ fecha, movimientos, diaSeleccionado, onSelectDay }) {
  const año  = fecha.getFullYear();
  const mes  = fecha.getMonth();
  const hoy  = toDateStr(new Date());

  const diasEnMes   = new Date(año, mes + 1, 0).getDate();
  const startOffset = (new Date(año, mes, 1).getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= diasEnMes; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const panelInfo = diaSeleccionado ? getDayInfo(movimientos, diaSeleccionado) : null;

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DIAS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-600 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 h-20" />;

          const dateStr = `${año}-${String(mes + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const info    = getDayInfo(movimientos, dateStr);
          const esHoy   = dateStr === hoy;
          const sel     = diaSeleccionado === dateStr;

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(sel ? null : dateStr)}
              className={`h-20 p-1.5 text-left flex flex-col transition-colors ${
                sel
                  ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-inset ring-blue-400'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
            >
              <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                esHoy ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
              }`}>
                {day}
              </span>

              {info.count > 0 && (
                <div className="mt-auto w-full space-y-0.5">
                  {info.montos > 0 && (
                    <div className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded truncate font-medium leading-tight">
                      +{fmt(info.montos)}
                    </div>
                  )}
                  {info.pagos > 0 && (
                    <div className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded truncate font-medium leading-tight">
                      -{fmt(info.pagos)}
                    </div>
                  )}
                  {info.count > 0 && !info.montos && !info.pagos && (
                    <div className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded truncate leading-tight">
                      {info.count} mov.
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel de día seleccionado */}
      {diaSeleccionado && panelInfo && (
        <div className="mt-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            {Number(diaSeleccionado.split('-')[2])} de {MESES[Number(diaSeleccionado.split('-')[1]) - 1]} {diaSeleccionado.split('-')[0]}
            <span className="ml-2 text-xs font-normal text-slate-400">
              {panelInfo.count} movimiento{panelInfo.count !== 1 ? 's' : ''}
            </span>
          </p>
          {panelInfo.count === 0 ? (
            <p className="text-sm text-slate-400">Sin movimientos este día.</p>
          ) : (
            <div className="space-y-2">
              {panelInfo.movs.map(m => {
                const esBoleta = (m.monto || 0) > 0;
                const esPago   = (m.pago  || 0) > 0;
                return (
                  <div key={m.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${
                        esBoleta && m.pagado
                          ? 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                          : esBoleta
                          ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                          : esPago
                          ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'
                      }`}>
                        {esBoleta && m.pagado ? '✓ Pagada' : esBoleta ? 'Pendiente' : esPago ? 'Pago' : 'Mov.'}
                      </span>
                      {m.campos_extra?.nro_factura && (
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate">
                          #{m.campos_extra.nro_factura}
                        </span>
                      )}
                      {m.campos_extra?.descripcion && (
                        <span className="text-xs text-slate-400 truncate">{m.campos_extra.descripcion}</span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {esBoleta && (
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">+{fmt(m.monto)}</p>
                      )}
                      {esPago && (
                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">-{fmt(m.pago)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Vista SEMANA ─────────────────────────────────────────────────────────────
function VistaSemana({ fecha, movimientos }) {
  const lunes = getMonday(fecha);
  const hoy   = toDateStr(new Date());

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="overflow-x-auto -mx-1 px-1">
    <div className="grid grid-cols-7 gap-2 min-w-[560px]">
      {dias.map((dia, idx) => {
        const dateStr = toDateStr(dia);
        const info    = getDayInfo(movimientos, dateStr);
        const esHoy   = dateStr === hoy;

        return (
          <div key={idx} className={`min-h-36 rounded-xl border flex flex-col ${
            esHoy
              ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/20'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
          }`}>
            <div className={`px-2 py-2 border-b ${esHoy ? 'border-blue-200 dark:border-blue-800' : 'border-slate-100 dark:border-slate-700'}`}>
              <p className="text-xs text-slate-400">{DIAS[idx]}</p>
              <p className={`text-lg font-bold leading-none mt-0.5 ${esHoy ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {dia.getDate()}
              </p>
              <p className="text-xs text-slate-400">{MESES_C[dia.getMonth()]}</p>
            </div>
            <div className="p-1.5 flex-1 space-y-1 overflow-hidden">
              {info.movs.map(m => {
                const esBoleta = (m.monto || 0) > 0;
                const esPago   = (m.pago  || 0) > 0;
                return (
                  <div key={m.id} className={`text-xs px-1.5 py-1 rounded-lg leading-tight ${
                    esBoleta && m.pagado
                      ? 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                      : esBoleta
                      ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                      : esPago
                      ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {esBoleta && <p className="font-semibold truncate">+{fmt(m.monto)}</p>}
                    {esPago   && <p className="font-semibold truncate">-{fmt(m.pago)}</p>}
                    {m.campos_extra?.nro_factura && (
                      <p className="opacity-70 truncate">#{m.campos_extra.nro_factura}</p>
                    )}
                  </div>
                );
              })}
              {info.count === 0 && (
                <p className="text-xs text-slate-300 dark:text-slate-600 text-center pt-3">—</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}

// ─── Vista AÑO ────────────────────────────────────────────────────────────────
function VistaAño({ fecha, movimientos, onSelectMes }) {
  const año = fecha.getFullYear();

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {Array.from({ length: 12 }, (_, mesIdx) => {
        const prefix   = `${año}-${String(mesIdx + 1).padStart(2, '0')}`;
        const movsMes  = movimientos.filter(m => m.fecha?.startsWith(prefix));
        const montos   = movsMes.reduce((s, m) => s + (m.monto || 0), 0);
        const pagos    = movsMes.reduce((s, m) => s + (m.pago  || 0), 0);
        const neto     = montos - pagos;
        const count    = movsMes.length;

        return (
          <button
            key={mesIdx}
            onClick={() => onSelectMes(new Date(año, mesIdx, 1))}
            className={`p-4 rounded-xl border text-left transition-all hover:shadow-md ${
              count > 0
                ? neto >= 0
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700'
                  : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{MESES_C[mesIdx]}</p>
            {count > 0 ? (
              <>
                <p className={`text-sm font-bold mt-1.5 ${neto >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                  {neto >= 0 ? '+' : ''}{fmt(neto)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{count} mov.</p>
              </>
            ) : (
              <p className="text-xs text-slate-300 dark:text-slate-600 mt-2">Sin datos</p>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CalendarioSubrubro({ movimientos }) {
  const [view, setView]           = useState('mes');
  const [fecha, setFecha]         = useState(new Date());
  const [diaSeleccionado, setDia] = useState(null);

  const navPrev = () => {
    setFecha(prev => {
      const d = new Date(prev);
      if (view === 'año')       d.setFullYear(d.getFullYear() - 1);
      else if (view === 'mes')  d.setMonth(d.getMonth() - 1);
      else                      d.setDate(d.getDate() - 7);
      return d;
    });
    setDia(null);
  };

  const navNext = () => {
    setFecha(prev => {
      const d = new Date(prev);
      if (view === 'año')       d.setFullYear(d.getFullYear() + 1);
      else if (view === 'mes')  d.setMonth(d.getMonth() + 1);
      else                      d.setDate(d.getDate() + 7);
      return d;
    });
    setDia(null);
  };

  const periodoLabel = () => {
    if (view === 'año') return String(fecha.getFullYear());
    if (view === 'mes') return `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
    const lunes   = getMonday(fecha);
    const domingo = new Date(lunes);
    domingo.setDate(domingo.getDate() + 6);
    if (lunes.getMonth() === domingo.getMonth()) {
      return `${lunes.getDate()} – ${domingo.getDate()} ${MESES[lunes.getMonth()]} ${lunes.getFullYear()}`;
    }
    return `${lunes.getDate()} ${MESES_C[lunes.getMonth()]} – ${domingo.getDate()} ${MESES_C[domingo.getMonth()]} ${domingo.getFullYear()}`;
  };

  const switchView = (v) => { setView(v); setDia(null); };

  return (
    <div>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 text-xs font-medium">
          {[['semana','Semana'],['mes','Mes'],['año','Año']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => switchView(v)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                view === v
                  ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >{l}</button>
          ))}
        </div>

        <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <button onClick={navPrev} className="px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-l-lg transition-colors">
            <ChevronLeft size={15} />
          </button>
          <span className="px-3 text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-44 text-center">
            {periodoLabel()}
          </span>
          <button onClick={navNext} className="px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-r-lg transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>

        <button
          onClick={() => { setFecha(new Date()); setDia(null); }}
          className="text-xs text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          Hoy
        </button>
      </div>

      {view === 'mes' && (
        <VistaMes
          fecha={fecha}
          movimientos={movimientos}
          diaSeleccionado={diaSeleccionado}
          onSelectDay={setDia}
        />
      )}
      {view === 'semana' && <VistaSemana fecha={fecha} movimientos={movimientos} />}
      {view === 'año' && (
        <VistaAño
          fecha={fecha}
          movimientos={movimientos}
          onSelectMes={(m) => { setFecha(m); switchView('mes'); }}
        />
      )}
    </div>
  );
}
