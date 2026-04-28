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

      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="bg-slate-50 h-20" />;

          const dateStr = `${año}-${String(mes + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const info    = getDayInfo(movimientos, dateStr);
          const esHoy   = dateStr === hoy;
          const sel     = diaSeleccionado === dateStr;

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(sel ? null : dateStr)}
              className={`h-20 p-1.5 text-left flex flex-col transition-colors ${
                sel ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : 'bg-white hover:bg-slate-50'
              }`}
            >
              <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                esHoy ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}>
                {day}
              </span>

              {info.count > 0 && (
                <div className="mt-auto w-full space-y-0.5">
                  {info.montos > 0 && (
                    <div className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded truncate font-medium leading-tight">
                      +{fmt(info.montos)}
                    </div>
                  )}
                  {info.pagos > 0 && (
                    <div className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded truncate font-medium leading-tight">
                      -{fmt(info.pagos)}
                    </div>
                  )}
                  {info.count > 0 && !info.montos && !info.pagos && (
                    <div className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded truncate leading-tight">
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
        <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">
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
                  <div key={m.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-lg gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${
                        esBoleta && m.pagado ? 'bg-green-50 text-green-700 border-green-200' :
                        esBoleta            ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        esPago              ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                              'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {esBoleta && m.pagado ? '✓ Pagada' : esBoleta ? 'Pendiente' : esPago ? 'Pago' : 'Mov.'}
                      </span>
                      {m.campos_extra?.nro_factura && (
                        <span className="font-mono text-xs text-slate-500 truncate">
                          #{m.campos_extra.nro_factura}
                        </span>
                      )}
                      {m.campos_extra?.descripcion && (
                        <span className="text-xs text-slate-400 truncate">{m.campos_extra.descripcion}</span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {esBoleta && (
                        <p className="text-sm font-semibold text-slate-800">+{fmt(m.monto)}</p>
                      )}
                      {esPago && (
                        <p className="text-sm font-semibold text-blue-600">-{fmt(m.pago)}</p>
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
    <div className="grid grid-cols-7 gap-2">
      {dias.map((dia, idx) => {
        const dateStr = toDateStr(dia);
        const info    = getDayInfo(movimientos, dateStr);
        const esHoy   = dateStr === hoy;

        return (
          <div key={idx} className={`min-h-36 rounded-xl border flex flex-col ${
            esHoy ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200 bg-white'
          }`}>
            <div className={`px-2 py-2 border-b ${esHoy ? 'border-blue-200' : 'border-slate-100'}`}>
              <p className="text-xs text-slate-400">{DIAS[idx]}</p>
              <p className={`text-lg font-bold leading-none mt-0.5 ${esHoy ? 'text-blue-600' : 'text-slate-700'}`}>
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
                    esBoleta && m.pagado ? 'bg-green-50 text-green-700' :
                    esBoleta            ? 'bg-amber-50 text-amber-700' :
                    esPago              ? 'bg-blue-50 text-blue-600'   :
                                          'bg-slate-100 text-slate-500'
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
                <p className="text-xs text-slate-300 text-center pt-3">—</p>
              )}
            </div>
          </div>
        );
      })}
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
                ? neto >= 0 ? 'border-green-200 bg-green-50 hover:border-green-300'
                            : 'border-red-200 bg-red-50 hover:border-red-300'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="text-sm font-semibold text-slate-700">{MESES_C[mesIdx]}</p>
            {count > 0 ? (
              <>
                <p className={`text-sm font-bold mt-1.5 ${neto >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {neto >= 0 ? '+' : ''}{fmt(neto)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{count} mov.</p>
              </>
            ) : (
              <p className="text-xs text-slate-300 mt-2">Sin datos</p>
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
        <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
          {[['semana','Semana'],['mes','Mes'],['año','Año']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => switchView(v)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >{l}</button>
          ))}
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-lg">
          <button onClick={navPrev} className="px-2 py-1.5 hover:bg-slate-50 text-slate-500 rounded-l-lg transition-colors">
            <ChevronLeft size={15} />
          </button>
          <span className="px-3 text-sm font-semibold text-slate-700 min-w-44 text-center">
            {periodoLabel()}
          </span>
          <button onClick={navNext} className="px-2 py-1.5 hover:bg-slate-50 text-slate-500 rounded-r-lg transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>

        <button
          onClick={() => { setFecha(new Date()); setDia(null); }}
          className="text-xs text-blue-600 border border-blue-200 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
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
