import { useState, useEffect, useCallback } from 'react';
import { ivaApi, getErrorMsg } from '../api';
import ComprasImportModal from '../components/ComprasImportModal';
import { Upload, Plus, Trash2, FileSpreadsheet, TrendingUp, TrendingDown, Minus, FileClock, FileText, Search, ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => (n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (n) => (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const labelMes = (mes) => {
  if (!mes) return '';
  const [y, m] = mes.split('-');
  return `${MESES[Number(m) - 1]} ${y}`;
};
// Una Nota de Crédito resta (no suma). Se detecta por el texto del tipo.
const normTipo = (s) => (s ?? '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const esNC = (tipo) => normTipo(tipo).includes('credito');
const hoy = () => new Date().toISOString().slice(0, 10);
const fmtFechaHora = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function IvaView({ initialTab = 'compras', role }) {
  const isViewer = role === 'viewer';
  const [tab, setTab] = useState(initialTab);
  const [compras, setCompras] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [resumen, setResumen] = useState({ meses: [], totales: {} });
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState(null);     // null | { files: File[] }

  const [vFecha, setVFecha] = useState(hoy());
  const [vTotal, setVTotal] = useState('');
  const [vConcepto, setVConcepto] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [c, l, v, r] = await Promise.all([
        ivaApi.getCompras(), ivaApi.getLotes(), ivaApi.getVentas(), ivaApi.getResumen(),
      ]);
      setCompras(c); setLotes(l); setVentas(v); setResumen(r);
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Recalcula cruce + lotes tras cada import/carga (tiempo real)
  const refrescarDerivados = useCallback(async () => {
    try {
      const [r, l] = await Promise.all([ivaApi.getResumen(), ivaApi.getLotes()]);
      setResumen(r); setLotes(l);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Abre el wizard de mapeo (opcionalmente con archivos ya soltados)
  const openWizard = (files = []) => setWizard({ files: Array.from(files || []) });

  // Tras importar desde el wizard: refresca compras + cruce + lotes
  const onWizardDone = async () => {
    const [c] = await Promise.all([ivaApi.getCompras(), refrescarDerivados()]);
    setCompras(c);
  };

  const handleDeleteCompra = async (id) => {
    try {
      await ivaApi.deleteCompra(id);
      setCompras(prev => prev.filter(c => c.id !== id));
      refrescarDerivados();
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const handleDeleteLote = async (lote) => {
    if (!window.confirm('¿Borrar todas las filas de este archivo?')) return;
    try {
      await ivaApi.clearCompras(lote);
      setCompras(prev => prev.filter(c => c.lote !== lote));
      refrescarDerivados();
      toast.success('Archivo eliminado');
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const handleAddVenta = async (e) => {
    e.preventDefault();
    if (!vTotal || Number(vTotal) <= 0) { toast.error('Ingresá un monto válido'); return; }
    try {
      const venta = await ivaApi.createVenta({ fecha: vFecha, total: vTotal, concepto: vConcepto });
      setVentas(prev => [venta, ...prev]);
      setVTotal(''); setVConcepto('');
      refrescarDerivados();
      toast.success('Venta registrada');
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const handleDeleteVenta = async (id) => {
    try {
      await ivaApi.deleteVenta(id);
      setVentas(prev => prev.filter(v => v.id !== id));
      refrescarDerivados();
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const ventasPorMes = ventas.reduce((acc, v) => { (acc[v.mes] ||= []).push(v); return acc; }, {});
  const mesesVentas = Object.keys(ventasPorMes).sort((a, b) => b.localeCompare(a));

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando…</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <CrucePanel resumen={resumen} />

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {[['compras', 'Compras'], ['ventas', 'Ventas']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >{label}</button>
        ))}
      </div>

      {tab === 'compras' ? (
        <ComprasTab
          isViewer={isViewer} onOpenWizard={openWizard}
          compras={compras} lotes={lotes}
          onDeleteCompra={handleDeleteCompra} onDeleteLote={handleDeleteLote}
        />
      ) : (
        <VentasTab
          isViewer={isViewer}
          vFecha={vFecha} setVFecha={setVFecha} vTotal={vTotal} setVTotal={setVTotal}
          vConcepto={vConcepto} setVConcepto={setVConcepto} onAdd={handleAddVenta}
          mesesVentas={mesesVentas} ventasPorMes={ventasPorMes} onDelete={handleDeleteVenta}
          totalVentas={resumen.totales.ventas}
        />
      )}

      {wizard && (
        <ComprasImportModal
          initialFiles={wizard.files}
          onClose={() => setWizard(null)}
          onDone={onWizardDone}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function CrucePanel({ resumen }) {
  const { meses = [], totales = {}, tipos = [] } = resumen;
  const sinDatos = meses.length === 0;
  const [tiposSel, setTiposSel] = useState([]); // [] = todos

  const incluido = (tipo) => tiposSel.length === 0 || tiposSel.includes(tipo);
  const toggleTipo = (tipo) =>
    setTiposSel(prev => prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]);

  // Recalcula compras neteadas (facturas suman, NC restan) según el filtro de tipos.
  const netoMes = (m) => {
    const pt = m.compras?.por_tipo || {};
    let imp = 0, iva = 0;
    for (const k of Object.keys(pt)) {
      if (!incluido(k)) continue;
      const r = pt[k], s = r.es_nc ? -1 : 1;
      imp += s * r.imp_total; iva += s * r.total_iva;
    }
    return { imp, iva, diferencia: (m.ventas || 0) - iva };
  };

  const vista = meses.map(m => ({ mes: m.mes, ventas: m.ventas || 0, ...netoMes(m) }));
  const filtrando = tiposSel.length > 0;

  const exportExcel = async () => {
    try { await ivaApi.exportResumenExcel(); }
    catch (err) { toast.error(getErrorMsg(err)); }
  };
  const exportPdf = async () => {
    try { await ivaApi.exportResumenPdf(); }
    catch (err) { toast.error(getErrorMsg(err)); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Diferencia mensual IVA
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} disabled={sinDatos}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 disabled:opacity-40 disabled:cursor-not-allowed">
            <FileSpreadsheet size={14} /> Exportar Excel
          </button>
          <button onClick={exportPdf} disabled={sinDatos}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 disabled:opacity-40 disabled:cursor-not-allowed">
            <FileText size={14} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Filtro por tipo de comprobante */}
      {tipos.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <button onClick={() => setTiposSel([])}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              !filtrando ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}>
            Todas
          </button>
          {tipos.map(({ tipo, es_nc }) => (
            <button key={tipo} onClick={() => toggleTipo(tipo)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                incluido(tipo) && filtrando
                  ? (es_nc ? 'bg-red-600 text-white border-red-600' : 'bg-blue-600 text-white border-blue-600')
                  : 'border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}>
              {tipo}{es_nc && <span className="ml-1 opacity-70">(resta)</span>}
            </button>
          ))}
        </div>
      )}


      {meses.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          Cargá compras o ventas para ver el cruce mensual.
        </p>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Mes</th>
                <th className="text-right px-4 py-2.5 font-medium">Compras (Imp.Total)</th>
                <th className="text-right px-4 py-2.5 font-medium">IVA compras</th>
                <th className="text-right px-4 py-2.5 font-medium">Ventas</th>
                <th className="text-right px-4 py-2.5 font-medium">Diferencia</th>
                <th className="text-right px-4 py-2.5 font-medium w-28">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {vista.map(m => {
                const positivo = m.diferencia >= 0;
                return (
                  <tr key={m.mes} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{labelMes(m.mes)}</td>
                    <td className="px-4 py-2.5 text-right text-amber-600 dark:text-amber-400">{fmt(m.imp)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{fmt(m.iva)}</td>
                    <td className="px-4 py-2.5 text-right text-blue-600 dark:text-blue-400">{fmt(m.ventas)}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${positivo ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{fmt(m.diferencia)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        positivo ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                        {m.diferencia === 0 ? <Minus size={12} /> : positivo ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {positivo ? 'A favor' : 'En contra'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ComprasTab({ isViewer, onOpenWizard, compras, lotes, onDeleteCompra, onDeleteLote }) {
  const [tipoSel, setTipoSel] = useState(''); // '' = todas las boletas
  const [busqueda, setBusqueda] = useState('');
  const [mesSel, setMesSel] = useState('');   // '' = todos los meses
  const [desde, setDesde] = useState('');     // YYYY-MM-DD
  const [hasta, setHasta] = useState('');     // YYYY-MM-DD
  const tipoDe = (c) => (c.tipo || '').trim() || 'Sin tipo';
  const tiposDisponibles = [...new Set(compras.map(tipoDe))].sort();
  const q = busqueda.trim().toLowerCase();
  const coincide = (c) => {
    if (!q) return true;
    const heno = `${c.razon_social || ''} ${c.documento || ''} ${c.nro_doc || ''} ${c.imp_total ?? ''}`.toLowerCase();
    return heno.includes(q);
  };
  const visibles = compras.filter(c =>
    (!tipoSel || tipoDe(c) === tipoSel) &&
    coincide(c) &&
    (!mesSel || c.mes === mesSel) &&
    (!desde || (c.fecha || '') >= desde) &&
    (!hasta || (c.fecha || '') <= hasta)
  );

  // Navegación por mes (incluye meses futuros o sin comprobantes).
  const mesesConDatos = [...new Set(compras.map(c => c.mes).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  const mesActual = () => new Date().toISOString().slice(0, 7);
  const shiftMes = (mes, d) => {
    const [y, m] = (mes || mesesConDatos[0] || mesActual()).split('-').map(Number);
    const dt = new Date(y, m - 1 + d, 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
  };
  const irMes = (d) => setMesSel(mesSel ? shiftMes(mesSel, d) : (mesesConDatos[0] || mesActual()));
  const hayFiltroFecha = mesSel || desde || hasta;
  const limpiarFechas = () => { setMesSel(''); setDesde(''); setHasta(''); };

  // Agrupar filas por mes. Subtotales netos: las NC restan (factura suma).
  const porMes = visibles.reduce((acc, c) => { (acc[c.mes] ||= []).push(c); return acc; }, {});
  const meses = Object.keys(porMes).sort((a, b) => b.localeCompare(a));
  const subtotal = (filas, campo) => filas.reduce((s, f) => s + (esNC(f.tipo) ? -1 : 1) * (f[campo] || 0), 0);
  const impAcum = subtotal(visibles, 'imp_total');
  const ivaAcum = subtotal(visibles, 'total_iva');

  return (
    <div className="space-y-5">
      {/* Resumen + filtro por tipo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Imp. Total {tipoSel ? `(${tipoSel})` : 'acumulado'}: <strong className="text-amber-600 dark:text-amber-400">{fmt(impAcum)}</strong>
          {' · '}IVA total: <strong className="text-slate-600 dark:text-slate-300">{fmt(ivaAcum)}</strong>
        </p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar monto, razón social o factura…"
              className="w-56 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 rounded-lg pl-7 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
            {busqueda && (
              <button onClick={() => setBusqueda('')} title="Limpiar"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">×</button>
            )}
          </div>
          {tiposDisponibles.length > 0 && (
            <select value={tipoSel} onChange={e => setTipoSel(e.target.value)}
              className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <option value="">Todas las boletas</option>
              {tiposDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {!isViewer && (
            <button onClick={() => onOpenWizard([])} title="Importar Excel y mapear columnas"
              className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-1.5 text-xs">
              <Upload size={13} /> <span className="hidden sm:inline">Importar</span>
            </button>
          )}
        </div>
      </div>

      {/* Navegación por mes + filtro por fecha */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Navegador de mes (segmented) */}
        <div className="inline-flex items-center h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 overflow-hidden">
          <button onClick={() => irMes(-1)} title="Mes anterior"
            className="h-full px-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <div className="relative h-full flex items-center justify-center border-x border-slate-300 dark:border-slate-600 px-2 min-w-18 cursor-pointer">
            <span className="text-slate-700 dark:text-slate-200 tabular-nums">
              {mesSel ? `${mesSel.slice(5, 7)}/${mesSel.slice(0, 4)}` : 'Todos'}
            </span>
            <input type="month" value={mesSel} onChange={e => setMesSel(e.target.value)} title="Elegir mes"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
          <button onClick={() => irMes(1)} title="Mes siguiente"
            className="h-full px-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
        {/* Rango de fechas (segmented) */}
        <div className="inline-flex items-center h-8 gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5">
          <CalendarDays size={13} className="text-slate-400 shrink-0" />
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} title="Desde"
            className="bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none" />
          <span className="text-slate-300 dark:text-slate-500">→</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} title="Hasta"
            className="bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none" />
        </div>
        {hayFiltroFecha && (
          <button onClick={limpiarFechas} title="Quitar filtros"
            className="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors">
            <X size={13} /> Limpiar
          </button>
        )}
      </div>

      {/* Archivos cargados (lotes) */}
      {lotes.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
          <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><FileClock size={13} /> Archivos cargados</p>
          <ul className="space-y-1">
            {lotes.map(l => (
              <li key={l.lote} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700/40 group">
                <span className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet size={13} className="text-emerald-500 shrink-0" />
                  <span className="truncate font-medium">{l.archivo}</span>
                  <span className="text-slate-400 shrink-0">· {l.filas} filas · {fmtFechaHora(l.created_at)}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-amber-600 dark:text-amber-400">{fmt(l.imp_total)}</span>
                  {!isViewer && (
                    <button onClick={() => onDeleteLote(l.lote)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={13} /></button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tablas por mes con todas las columnas */}
      {meses.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          {mesSel ? `Sin comprobantes en ${labelMes(mesSel)}.`
            : (q || tipoSel || desde || hasta) ? 'No hay comprobantes que coincidan con el filtro.'
            : 'Todavía no hay compras importadas.'}
        </p>
      ) : meses.map(mes => {
        const filas = porMes[mes];
        return (
          <div key={mes} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40">
              <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{labelMes(mes)} <span className="text-xs font-normal text-slate-400">({filas.length})</span></span>
              <span className="text-xs text-slate-500">IVA 21%: <strong className="text-slate-700 dark:text-slate-200">{fmt(subtotal(filas, 'iva_21'))}</strong></span>
              <span className="text-xs text-slate-500">Neto Grav.: <strong className="text-slate-700 dark:text-slate-200">{fmt(subtotal(filas, 'neto_gravado'))}</strong></span>
              <span className="text-xs text-slate-500">Total IVA: <strong className="text-slate-700 dark:text-slate-200">{fmt(subtotal(filas, 'total_iva'))}</strong></span>
              <span className="text-xs text-slate-500">Imp. Total: <strong className="text-amber-600 dark:text-amber-400">{fmt(subtotal(filas, 'imp_total'))}</strong></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead className="text-slate-400">
                  <tr className="border-b border-slate-100 dark:border-slate-700/60">
                    <th className="text-left px-3 py-1.5 font-medium">Fecha</th>
                    <th className="text-left px-3 py-1.5 font-medium">Tipo</th>
                    <th className="text-left px-3 py-1.5 font-medium">Documento</th>
                    <th className="text-left px-3 py-1.5 font-medium">Nro Doc Emisor</th>
                    <th className="text-left px-3 py-1.5 font-medium">Razón Social</th>
                    <th className="text-right px-3 py-1.5 font-medium">IVA 21%</th>
                    <th className="text-right px-3 py-1.5 font-medium">Neto Grav. 21%</th>
                    <th className="text-right px-3 py-1.5 font-medium">Neto Gravado</th>
                    <th className="text-left px-3 py-1.5 font-medium">Otros Atrib.</th>
                    <th className="text-right px-3 py-1.5 font-medium">Total IVA</th>
                    <th className="text-right px-3 py-1.5 font-medium">Imp. Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
                  {filas.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 group">
                      <td className="px-3 py-1.5 text-slate-500">{c.fecha}</td>
                      <td className="px-3 py-1.5">{c.tipo || '—'}</td>
                      <td className="px-3 py-1.5">{c.documento || '—'}</td>
                      <td className="px-3 py-1.5">{c.nro_doc || '—'}</td>
                      <td className="px-3 py-1.5 max-w-50 truncate" title={c.razon_social}>{c.razon_social || '—'}</td>
                      <td className="px-3 py-1.5 text-right">{fmtNum(c.iva_21)}</td>
                      <td className="px-3 py-1.5 text-right">{fmtNum(c.neto_grav_21)}</td>
                      <td className="px-3 py-1.5 text-right">{fmtNum(c.neto_gravado)}</td>
                      <td className="px-3 py-1.5 max-w-30 truncate" title={c.otros_atributos}>{c.otros_atributos || '—'}</td>
                      <td className="px-3 py-1.5 text-right">{fmtNum(c.total_iva)}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-amber-600 dark:text-amber-400">{fmtNum(c.imp_total)}</td>
                      <td className="px-2 py-1.5 text-right">
                        {!isViewer && (
                          <button onClick={() => onDeleteCompra(c.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={12} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

function VentasTab({ isViewer, vFecha, setVFecha, vTotal, setVTotal, vConcepto, setVConcepto, onAdd, mesesVentas, ventasPorMes, onDelete, totalVentas }) {
  return (
    <div className="space-y-5">
      {!isViewer && (
        <form onSubmit={onAdd} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha</label>
              <input type="date" value={vFecha} onChange={e => setVFecha(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Monto de ventas</label>
              <input type="number" min="0" step="0.01" value={vTotal} onChange={e => setVTotal(e.target.value)} placeholder="0"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Concepto (opcional)</label>
              <input type="text" value={vConcepto} onChange={e => setVConcepto(e.target.value)} placeholder="Detalle"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <button type="submit" className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
              <Plus size={15} /> Agregar
            </button>
          </div>
        </form>
      )}

      <p className="text-sm text-slate-500">Total ventas: <strong className="text-blue-600 dark:text-blue-400">{fmt(totalVentas)}</strong></p>

      {mesesVentas.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Todavía no hay ventas cargadas.</p>
      ) : mesesVentas.map(mes => {
        const filas = ventasPorMes[mes];
        const sub = filas.reduce((s, v) => s + (v.total || 0), 0);
        return (
          <div key={mes} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40">
              <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{labelMes(mes)}</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{fmt(sub)} <span className="text-xs font-normal text-slate-400">({filas.length})</span></span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-1.5 font-medium w-28">Fecha</th>
                  <th className="text-left px-4 py-1.5 font-medium">Concepto</th>
                  <th className="text-right px-4 py-1.5 font-medium w-32">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filas.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 group">
                    <td className="px-4 py-2 text-slate-500">{v.fecha}</td>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{v.concepto || <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-200">{fmt(v.total)}</td>
                    <td className="px-2 py-2 text-right">
                      {!isViewer && (
                        <button onClick={() => onDelete(v.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={13} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
