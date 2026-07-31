import { useState, useEffect, useCallback, useRef } from 'react';
import { ivaApi, getErrorMsg } from '../api';
import ComprasImportModal from '../components/ComprasImportModal';
import Modal from '../components/Modal';
import InfoTooltip from '../components/InfoTooltip';
import { Upload, Plus, Trash2, FileSpreadsheet, TrendingUp, TrendingDown, Minus, FileClock, FileText, Search, ChevronLeft, ChevronRight, ChevronDown, CalendarDays, X, ArrowUp, Columns3, Pencil, RotateCcw, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => (n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Mismo redondeo que el backend: encadenar restas de acumulados deja restos binarios
// (…0000004) que se colarían en el input del ajuste manual.
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
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
// Grilla compartida por el encabezado de columnas y por cada fila del listado de
// ventas: es lo que mantiene alineadas las columnas sin repetir un <thead> por mes.
// En mobile la fecha se angosta para que el concepto no quede aplastado.
const GRID_VENTAS = 'grid grid-cols-[4.9rem_1fr_auto_1.25rem] sm:grid-cols-[7rem_1fr_auto_1.75rem] gap-2';
// Misma grilla para créditos fiscales, con una columna extra de acciones: además de
// eliminar se pueden editar, así que hacen falta dos botones por fila.
const GRID_CREDITOS = 'grid grid-cols-[4.9rem_1fr_auto_3rem] sm:grid-cols-[7rem_1fr_auto_3.5rem] gap-2';
// Encabezados de columna: con peso y versalita se leen como la estructura de la
// tabla y no como una fila más de datos. TH va sin color para que cada columna le
// sume el suyo (dos clases de color en el mismo elemento no tienen orden garantizado).
const TH = 'text-[11px] font-semibold uppercase tracking-wide';
const TH_MUTED = `${TH} text-slate-500 dark:text-slate-300`;
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
  const [creditos, setCreditos] = useState([]);
  const [resumen, setResumen] = useState({ meses: [], totales: {} });
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState(null);     // null | { files: File[] }
  const [importSeq, setImportSeq] = useState(0);  // cada import colapsa los meses de Compras

  const [vFecha, setVFecha] = useState(hoy());
  const [vTotal, setVTotal] = useState('');
  const [vConcepto, setVConcepto] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [c, l, v, cf, r] = await Promise.all([
        ivaApi.getCompras(), ivaApi.getLotes(), ivaApi.getVentas(), ivaApi.getCreditos(), ivaApi.getResumen(),
      ]);
      setCompras(c); setLotes(l); setVentas(v); setCreditos(cf); setResumen(r);
      // Debug: los tres acumulados que restan del saldo, por mes (las percepciones
      // combinan IvaCompra + facturas de subrubro; los créditos son carga manual).
      console.debug('[IVA] deducciones acumuladas por mes:',
        (r.meses || []).map(m => ({
          mes: m.mes,
          percepcion_iva: m.compras?.percepcion_iva,
          ingresos_brutos: m.compras?.ingresos_brutos,
          creditos_fiscales: m.creditos_fiscales,
          calculada: m.diferencia_calculada,
          ajustada: m.diferencia_ajustada,
        })));
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

  // Tras importar desde el wizard: refresca compras + cruce + lotes. El resultado se
  // avisa por toast y se colapsan los meses: lo importado se revisa por totales, no
  // leyendo las cientos de filas que acaban de entrar.
  const onWizardDone = async (res) => {
    const [c] = await Promise.all([ivaApi.getCompras(), refrescarDerivados()]);
    setCompras(c);
    const n = res?.importadas || 0;
    if (n > 0) toast.success(`${n} comprobante${n === 1 ? '' : 's'} importado${n === 1 ? '' : 's'}`);
    else toast('No se importaron comprobantes nuevos');
    setImportSeq(s => s + 1);
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

  const handleAddCompra = async (payload) => {
    const compra = await ivaApi.createCompra(payload);
    setCompras(prev => [compra, ...prev]);
    refrescarDerivados();
    toast.success('Comprobante cargado');
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

  // --- Créditos fiscales -----------------------------------------------------
  // Restan del saldo mensual igual que las percepciones, pero se cargan a mano:
  // no salen de ningún comprobante.
  const ordenarCreditos = (lista) =>
    [...lista].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || b.id - a.id);

  const handleAddCredito = async (payload) => {
    const credito = await ivaApi.createCredito(payload);
    setCreditos(prev => ordenarCreditos([credito, ...prev]));
    refrescarDerivados();
    toast.success('Crédito fiscal registrado');
  };

  const handleUpdateCredito = async (id, payload) => {
    const credito = await ivaApi.updateCredito(id, payload);
    setCreditos(prev => ordenarCreditos(prev.map(c => (c.id === id ? credito : c))));
    refrescarDerivados();
    toast.success('Crédito fiscal actualizado');
  };

  const handleDeleteCredito = async (id) => {
    try {
      await ivaApi.deleteCredito(id);
      setCreditos(prev => prev.filter(c => c.id !== id));
      refrescarDerivados();
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  // --- Ajuste manual del saldo del mes ---------------------------------------
  const handleSaveAjuste = async (mes, monto) => {
    await ivaApi.saveAjuste(mes, monto);
    await refrescarDerivados();
    toast.success(`Saldo de ${labelMes(mes)} ajustado`);
  };

  const handleRestaurarAjuste = async (mes) => {
    await ivaApi.deleteAjuste(mes);
    await refrescarDerivados();
    toast.success(`Saldo de ${labelMes(mes)} restaurado al calculado`);
  };

  const ventasPorMes = ventas.reduce((acc, v) => { (acc[v.mes] ||= []).push(v); return acc; }, {});
  const mesesVentas = Object.keys(ventasPorMes).sort((a, b) => b.localeCompare(a));
  const creditosPorMes = creditos.reduce((acc, c) => { (acc[c.mes] ||= []).push(c); return acc; }, {});
  const mesesCreditos = Object.keys(creditosPorMes).sort((a, b) => b.localeCompare(a));

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando…</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <CrucePanel
        resumen={resumen} isViewer={isViewer}
        onSaveAjuste={handleSaveAjuste} onRestaurarAjuste={handleRestaurarAjuste}
      />

      {/* Corte explícito entre el resumen (solo lectura) y la zona de carga: sin él
          los tabs se leían como parte de la tabla de arriba. */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Cargar movimiento</h3>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 -mt-4">
        {[['compras', 'Compras'], ['ventas', 'Ventas'], ['creditos', 'Créditos fiscales']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >{label}</button>
        ))}
      </div>

      {tab === 'compras' && (
        <ComprasTab
          isViewer={isViewer} onOpenWizard={openWizard}
          compras={compras} lotes={lotes} importSeq={importSeq}
          onDeleteCompra={handleDeleteCompra} onDeleteLote={handleDeleteLote}
          onAddCompra={handleAddCompra}
        />
      )}
      {tab === 'ventas' && (
        <VentasTab
          isViewer={isViewer}
          vFecha={vFecha} setVFecha={setVFecha} vTotal={vTotal} setVTotal={setVTotal}
          vConcepto={vConcepto} setVConcepto={setVConcepto} onAdd={handleAddVenta}
          mesesVentas={mesesVentas} ventasPorMes={ventasPorMes} onDelete={handleDeleteVenta}
          totalVentas={resumen.totales.ventas}
        />
      )}
      {tab === 'creditos' && (
        <CreditosTab
          isViewer={isViewer}
          mesesCreditos={mesesCreditos} creditosPorMes={creditosPorMes}
          onAdd={handleAddCredito} onUpdate={handleUpdateCredito} onDelete={handleDeleteCredito}
          totalCreditos={resumen.totales.creditos_fiscales}
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

// Etiqueta explícita del signo. El número solo no alcanza: "+$120.000" no dice si
// hay que pagarlo o si sobra, y el signo acá significa lo contrario de lo intuitivo.
const saldoTexto = (valor) => {
  if (valor > 0) return 'Saldo a pagar';
  if (valor < 0) return 'Saldo libre disponible';
  return 'Sin saldo';
};

// Monto con signo, flecha y color. OJO con la semántica: positivo = hay que pagar
// (rojo), negativo = queda saldo libre (verde). Es al revés de "más es mejor", por
// eso siempre va acompañado de la etiqueta que lo dice con palabras.
const Resultado = ({ valor, ajustado = false }) => {
  const Icono = valor === 0 ? Minus : valor > 0 ? TrendingUp : TrendingDown;
  const color = valor === 0 ? 'text-slate-400'
    : valor > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400';
  return (
    <span className={`inline-flex flex-col items-end leading-tight ${color}`}>
      <span className="inline-flex items-center gap-1 tabular-nums">
        <Icono size={12} className="shrink-0" />
        {valor > 0 ? '+' : ''}{fmt(valor)}
      </span>
      <span className="text-[10px] font-normal opacity-80 flex items-center gap-1">
        {ajustado && <Pencil size={9} className="shrink-0" />}
        {saldoTexto(valor)}
      </span>
    </span>
  );
};

// Detalle del ajuste manual para el tooltip del badge. Si el calculado de hoy no es
// el mismo que había cuando se ajustó, se dicen los dos: esa deriva es justo el dato
// que hace falta para decidir si conviene restaurar.
const tituloAjuste = (m) => {
  const quien = `Ajustado por ${m.ajustada_por || 'un usuario'}`;
  const cuando = m.ajustada_at ? ` el ${fmtFechaHora(m.ajustada_at)}` : '';
  const derivo = m.ajuste_base !== null && Math.abs(m.ajuste_base - m.calculada) > 0.005;
  const base = derivo ? ` (al ajustar era ${fmt(m.ajuste_base)})` : '';
  return `${quien}${cuando}. Calculado actual: ${fmt(m.calculada)}${base}.`;
};

// Rojo = a pagar, verde = saldo libre, gris = 0. Mismo criterio que <Resultado>.
const tonoSaldo = (v) => v > 0 ? 'text-red-600 dark:text-red-400'
  : v < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400';

// Cada lado de la comparación "original vs nuevo" del modal de ajuste.
const CeldaSaldo = ({ label, valor }) => (
  <div className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
    <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-0.5">{label}</p>
    <p className={`text-sm font-semibold tabular-nums ${tonoSaldo(valor)}`}>{fmt(valor)}</p>
    <p className="text-[10px] text-slate-400">{saldoTexto(valor)}</p>
  </div>
);

// Confirmación explícita antes de pisar un saldo calculado: se muestran los dos
// números uno al lado del otro para que el cambio no se haga a ciegas.
function AjusteSaldoModal({ mes, calculado, actual, ajustado, onClose, onGuardar, onRestaurar }) {
  const [monto, setMonto] = useState(String(actual ?? 0));
  const [saving, setSaving] = useState(false);
  const nuevo = Number(monto);
  const valido = monto !== '' && Number.isFinite(nuevo);
  const sinCambios = valido && Math.abs(nuevo - (actual || 0)) < 0.005;

  const guardar = async () => {
    if (!valido || saving) return;
    if (!window.confirm(
      `¿Estás seguro de modificar el saldo calculado de ${labelMes(mes)}?\n\n`
      + `El valor original era ${fmt(calculado)}.\n`
      + `Vas a guardar ${fmt(nuevo)}.`
    )) return;
    setSaving(true);
    try { await onGuardar(nuevo); onClose(); }
    catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSaving(false); }
  };

  const restaurar = async () => {
    if (saving) return;
    if (!window.confirm(`¿Descartar el ajuste manual y volver al valor calculado (${fmt(calculado)})?`)) return;
    setSaving(true);
    try { await onRestaurar(); onClose(); }
    catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={`Ajustar saldo — ${labelMes(mes)}`} onClose={onClose} size="md">
      <div className="space-y-4">
        <div className="flex gap-2">
          <CeldaSaldo label="Valor calculado" valor={calculado} />
          <CeldaSaldo label={valido ? 'Valor nuevo' : 'Valor actual'} valor={valido ? nuevo : actual} />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Saldo manual
            <span className="ml-1 text-slate-400">(positivo = a pagar, negativo = saldo libre)</span>
          </label>
          <input
            type="number" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} autoFocus
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1.5 text-[11px] text-slate-400">
            El valor calculado se conserva: podés volver a él cuando quieras. El cambio queda registrado en Auditoría.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {ajustado && (
            <button type="button" onClick={restaurar} disabled={saving}
              className="mr-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40">
              <RotateCcw size={14} /> Restaurar valor calculado
            </button>
          )}
          <button type="button" onClick={onClose} disabled={saving}
            className="px-3.5 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40">
            Cancelar
          </button>
          <button type="button" onClick={guardar} disabled={!valido || sinCambios || saving}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-3.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            <Check size={15} /> {saving ? 'Guardando…' : 'Guardar ajuste'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CrucePanel({ resumen, isViewer, onSaveAjuste, onRestaurarAjuste }) {
  const { meses = [], tipos = [] } = resumen;
  const sinDatos = meses.length === 0;
  const [tiposSel, setTiposSel] = useState([]); // [] = todos
  const [ajustando, setAjustando] = useState(null); // mes en edición | null

  const incluido = (tipo) => tiposSel.length === 0 || tiposSel.includes(tipo);
  const toggleTipo = (tipo) =>
    setTiposSel(prev => prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]);
  const filtrando = tiposSel.length > 0;

  // Recalcula compras neteadas (facturas suman, NC restan) según el filtro de tipos.
  const netoMes = (m) => {
    const pt = m.compras?.por_tipo || {};
    let imp = 0, iva = 0;
    for (const k of Object.keys(pt)) {
      if (!incluido(k)) continue;
      const r = pt[k], s = r.es_nc ? -1 : 1;
      imp += s * r.imp_total; iva += s * r.total_iva;
    }
    return { imp, iva };
  };

  const vista = meses.map(m => {
    const { imp, iva } = netoMes(m);
    // Percepciones y créditos fiscales no dependen del filtro por tipo de comprobante:
    // son acumulados del mes que el backend ya neteó por NC. Ausencia = 0, nunca null.
    const percepcion_iva = m.compras?.percepcion_iva || 0;
    const ingresos_brutos = m.compras?.ingresos_brutos || 0;
    const creditos_fiscales = m.creditos_fiscales || 0;
    const ventas = m.ventas || 0;
    // (Ventas − IVA compras) − Percep. IVA − Créditos fiscales. Se recalcula en el
    // front porque el filtro por tipo cambia el IVA de compras.
    // Ingresos Brutos NO entra: es un impuesto provincial, se muestra pero no opera.
    const calculada = round2((ventas - iva) - percepcion_iva - creditos_fiscales);
    // El ajuste manual vale para el mes completo: con un filtro de tipos activo la
    // tabla muestra un subconjunto, así que ahí se ve el recalculado y no el ajuste.
    const ajustado = !filtrando && m.diferencia_ajustada !== null && m.diferencia_ajustada !== undefined;
    return {
      mes: m.mes, ventas, imp, iva, percepcion_iva, ingresos_brutos, creditos_fiscales,
      calculada, ajustado,
      diferencia: ajustado ? m.diferencia_ajustada : calculada,
      // Base contra la que se hizo el ajuste (lo que el modal muestra como "original").
      ajuste_base: m.ajuste_base ?? null,
      ajustada_por: m.ajustada_por || '',
      ajustada_at: m.ajustada_at || null,
    };
  });
  const mesActual = hoy().slice(0, 7);
  // Con un filtro de tipos activo el saldo mostrado es parcial: ajustarlo a mano ahí
  // guardaría un número que no corresponde al mes completo.
  const puedeAjustar = !isViewer && !filtrando;
  const hayAjustes = meses.some(m => m.diferencia_ajustada !== null && m.diferencia_ajustada !== undefined);

  // Comprobantes por tipo, para que cada chip diga cuántos hay detrás. Un chip en 0
  // no está "deshabilitado": simplemente no tiene comprobantes de ese tipo cargados.
  const itemsPorTipo = {};
  for (const m of meses) {
    for (const [k, r] of Object.entries(m.compras?.por_tipo || {})) {
      itemsPorTipo[k] = (itemsPorTipo[k] || 0) + (r.items || 0);
    }
  }


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

      {/* Filtro por tipo de comprobante. Cada chip lleva su contador: un 0 dice
          "no hay comprobantes de este tipo", que es distinto de estar deshabilitado. */}
      {tipos.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mb-2">
          <button onClick={() => setTiposSel([])}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              !filtrando ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}>
            Todas
          </button>
          {tipos.map(({ tipo, es_nc }) => {
            const n = itemsPorTipo[tipo] || 0;
            const activo = incluido(tipo) && filtrando;
            return (
              <button key={tipo} onClick={() => toggleTipo(tipo)}
                title={n === 0 ? 'Sin comprobantes de este tipo en los meses cargados' : `${n} comprobante${n === 1 ? '' : 's'}${es_nc ? ' · resta del total' : ''}`}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  activo ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}>
                {tipo}
                {es_nc && <span className="ml-1 opacity-60">−</span>}
                <span className={`ml-1 ${activo ? 'opacity-70' : 'text-slate-400'}`}>{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filtrando por tipo la Diferencia se recalcula sobre el subconjunto, así que
          los ajustes manuales (que valen para el mes entero) quedan fuera. Decirlo
          evita que un saldo distinto al de siempre se lea como un error. */}
      {filtrando && hayAjustes && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2">
          Con el filtro por tipo activo se muestra el saldo recalculado del subconjunto: los ajustes manuales no se aplican.
        </p>
      )}

      {meses.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          Cargá compras, ventas o créditos fiscales para ver el saldo mensual.
        </p>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            {/* Cada bloque de columnas tiene su color: compras ámbar, IVA celeste,
                percepciones violeta (no suman), resultado verde/rojo. */}
            <thead className="bg-slate-100 dark:bg-slate-900/60">
              <tr>
                <th className={`sticky left-0 z-10 bg-slate-100 dark:bg-slate-900 text-left px-3 py-2 ${TH_MUTED}`}>Mes</th>
                <th className={`text-right px-3 py-2 ${TH} text-amber-600 dark:text-amber-400`}>Compras (Imp.Total)</th>
                <th className={`text-right px-3 py-2 ${TH} text-sky-600 dark:text-sky-400`}>IVA compras</th>
                <th className={`text-right px-3 py-2 border-l border-slate-200 dark:border-slate-700 ${TH} text-violet-600 dark:text-violet-400`}>
                  <span className="inline-flex items-center gap-1">
                    Percep. IVA
                    <InfoTooltip text="Percepciones de IVA sufridas en las compras. Son un pago a cuenta del impuesto: se acumulan aparte y no modifican la diferencia mensual." />
                  </span>
                </th>
                <th className={`text-right px-3 py-2 ${TH} text-violet-600 dark:text-violet-400`}>
                  <span className="inline-flex items-center gap-1">
                    Ing. Brutos
                    <InfoTooltip text="Percepciones de Ingresos Brutos sufridas en las compras. Es un impuesto provincial distinto del IVA: se informa acá como referencia, pero no suma ni resta en la Diferencia." />
                  </span>
                </th>
                <th className={`text-right px-3 py-2 ${TH} text-indigo-600 dark:text-indigo-400`}>
                  <span className="inline-flex items-center gap-1">
                    Créditos Fiscales
                    <InfoTooltip text="Créditos fiscales cargados a mano en la pestaña “Créditos fiscales” (saldos a favor, retenciones sufridas, saldo técnico del período anterior). Se acumulan por mes y se restan del saldo. Un mes sin créditos cargados resta $0." />
                  </span>
                </th>
                <th className={`text-right px-3 py-2 border-l border-slate-200 dark:border-slate-700 ${TH_MUTED}`}>Ventas</th>
                <th className={`text-right px-3 py-2 ${TH_MUTED}`}>
                  <span className="inline-flex items-center gap-1">
                    Diferencia
                    <InfoTooltip width="w-72" text={
                      <span className="block space-y-1.5">
                        <span className="block font-semibold">Cómo se calcula</span>
                        <span className="block font-mono text-[11px] leading-relaxed">
                          (IVA Ventas − IVA Compras)<br />
                          − Percep. IVA<br />
                          − Créditos Fiscales
                        </span>
                        <span className="block pt-1">
                          <span className="text-red-300">Positivo (+)</span> = saldo a pagar.<br />
                          <span className="text-emerald-300">Negativo (−)</span> = saldo libre disponible.
                        </span>
                        <span className="block pt-1 text-slate-300">
                          Ing. Brutos se informa aparte: no entra en el cálculo.
                        </span>
                        <span className="block pt-1 text-slate-300">
                          Clickeá el monto para ajustarlo a mano. El valor calculado se conserva y se puede restaurar.
                        </span>
                      </span>
                    } />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {vista.map(m => {
                const esActual = m.mes === mesActual;
                // Fondo propio para la celda sticky: al quedar fija sobre el resto de
                // la fila necesita ser opaca, no puede heredar el fondo del <tr>.
                const bgMes = esActual ? 'bg-blue-50 dark:bg-slate-800' : 'bg-white dark:bg-slate-800';
                return (
                  <tr key={m.mes} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 ${esActual ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <td className={`sticky left-0 z-10 px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200 border-l-2 ${bgMes} ${esActual ? 'border-blue-500' : 'border-transparent'}`}>
                      {labelMes(m.mes)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-amber-600 dark:text-amber-400 tabular-nums">{fmt(m.imp)}</td>
                    <td className="px-3 py-1.5 text-right text-sky-600 dark:text-sky-400 tabular-nums">{fmt(m.iva)}</td>
                    <td className="px-3 py-1.5 text-right text-violet-600 dark:text-violet-400 tabular-nums border-l border-slate-100 dark:border-slate-700/60">
                      {m.percepcion_iva ? fmt(m.percepcion_iva) : <span className="text-slate-300 dark:text-slate-600">·</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right text-violet-600 dark:text-violet-400 tabular-nums">
                      {m.ingresos_brutos ? fmt(m.ingresos_brutos) : <span className="text-slate-300 dark:text-slate-600">·</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {m.creditos_fiscales ? fmt(m.creditos_fiscales) : <span className="text-slate-300 dark:text-slate-600">·</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-700 dark:text-slate-200 tabular-nums border-l border-slate-100 dark:border-slate-700/60">{fmt(m.ventas)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold">
                      {/* El monto es el disparador del ajuste manual: clickeable para
                          quien puede editar, texto plano para un viewer o mientras
                          hay un filtro por tipo (ahí el número es parcial). */}
                      {puedeAjustar ? (
                        <button type="button" onClick={() => setAjustando(m.mes)}
                          title={m.ajustado ? 'Saldo ajustado a mano — click para editar o restaurar' : 'Click para ajustar el saldo a mano'}
                          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -mr-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors">
                          {m.ajustado && (
                            <span title={tituloAjuste(m)}
                              className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                              <Pencil size={9} /> Ajustado
                            </span>
                          )}
                          <Resultado valor={m.diferencia} />
                        </button>
                      ) : (
                        <Resultado valor={m.diferencia} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ajustando && (() => {
        const m = vista.find(x => x.mes === ajustando);
        if (!m) return null;
        return (
          <AjusteSaldoModal
            mes={m.mes}
            // El "original" es el calculado de hoy; si el mes ya estaba ajustado se
            // muestra igual el calculado actual, que es al que se restaura.
            calculado={m.calculada}
            actual={m.diferencia}
            ajustado={m.ajustado}
            onClose={() => setAjustando(null)}
            onGuardar={(monto) => onSaveAjuste(m.mes, monto)}
            onRestaurar={() => onRestaurarAjuste(m.mes)}
          />
        );
      })()}
    </div>
  );
}

// Un mes puede traer cientos de comprobantes: se listan de a tandas para no
// montar miles de <tr> ni obligar a scrollear el mes entero para llegar al que sigue.
const FILAS_POR_PAGINA = 50;

// Tooltip nativo solo cuando el texto quedó cortado: si entra completo, el title
// repetiría lo que ya se lee.
function TextoTruncado({ texto, className = '' }) {
  const ref = useRef(null);
  const [title, setTitle] = useState(undefined);
  const medir = () => {
    const el = ref.current;
    if (el) setTitle(el.scrollWidth > el.clientWidth ? (texto || '') : undefined);
  };
  return (
    <span ref={ref} onMouseEnter={medir} title={title} className={`block truncate ${className}`}>
      {texto || '—'}
    </span>
  );
}

// Une dos columnas que casi siempre dicen lo mismo (Neto Grav. 21% / Neto Gravado,
// IVA 21% / Total IVA) en un número. Cuando difieren —comprobante con alícuotas
// mezcladas— queda subrayado y la apertura se ve en el tooltip.
function MontoUnificado({ total, parcial, labelTotal, labelParcial }) {
  const valor = total || parcial || 0;
  const difiere = (total || 0) !== 0 && Math.abs((total || 0) - (parcial || 0)) > 0.005;
  if (!difiere) return fmtNum(valor);
  return (
    <span className="underline decoration-dotted decoration-slate-300 dark:decoration-slate-600 underline-offset-2"
      title={`${labelParcial}: ${fmtNum(parcial)} · ${labelTotal}: ${fmtNum(total)}`}>
      {fmtNum(valor)}
    </span>
  );
}

function PaginacionMes({ total, pagina, onPagina }) {
  const paginas = Math.ceil(total / FILAS_POR_PAGINA);
  if (paginas <= 1) return null;
  const desde = pagina * FILAS_POR_PAGINA + 1;
  const hasta = Math.min(total, (pagina + 1) * FILAS_POR_PAGINA);
  const btn = 'p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors';
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 text-[11px] text-slate-400">
      <span className="tabular-nums">{desde}–{hasta} de {total}</span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onPagina(pagina - 1)} disabled={pagina === 0} title="Página anterior" aria-label="Página anterior" className={btn}>
          <ChevronLeft size={13} />
        </button>
        <span className="px-1 tabular-nums text-slate-500 dark:text-slate-400">{pagina + 1}/{paginas}</span>
        <button onClick={() => onPagina(pagina + 1)} disabled={pagina >= paginas - 1} title="Página siguiente" aria-label="Página siguiente" className={btn}>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// Los archivos importados son referencia, no contenido: la card queda en una línea
// con el resumen y se despliega solo para borrar una importación.
function LotesCard({ lotes, isViewer, onDeleteLote }) {
  const [abierto, setAbierto] = useState(false);
  if (lotes.length === 0) return null;
  const filas = lotes.reduce((s, l) => s + (l.filas || 0), 0);
  const total = lotes.reduce((s, l) => s + (l.imp_total || 0), 0);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors text-left">
        <FileClock size={13} className="text-slate-400 shrink-0" />
        <span className="font-semibold text-slate-600 dark:text-slate-300 shrink-0">Archivos cargados</span>
        <span className="text-slate-400 shrink-0">({lotes.length})</span>
        <span className="text-slate-400 truncate hidden sm:inline">· {filas.toLocaleString('es-AR')} filas</span>
        <span className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-amber-600 dark:text-amber-400 tabular-nums">{fmt(total)}</span>
          <ChevronDown size={13} className={`text-slate-400 transition-transform ${abierto ? '' : '-rotate-90'}`} />
        </span>
      </button>

      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${abierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <ul className="border-t border-slate-100 dark:border-slate-700/60">
            {lotes.map(l => (
              <li key={l.lote} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                <FileSpreadsheet size={13} className="text-emerald-500 shrink-0" />
                <span className="truncate font-medium">{l.archivo}</span>
                <span className="text-slate-400 shrink-0 hidden sm:inline">· {l.filas} filas · {fmtFechaHora(l.created_at)}</span>
                <span className="ml-auto flex items-center gap-2 shrink-0">
                  <span className="text-amber-600 dark:text-amber-400 tabular-nums">{fmt(l.imp_total)}</span>
                  {!isViewer && (
                    <button onClick={() => onDeleteLote(l.lote)} title="Eliminar importación" aria-label="Eliminar importación"
                      className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Dato secundario de la barra de totales del mes: chico y de peso normal, para que
// el Imp. Total (grande y ámbar) siga siendo lo primero que se lee.
const TotalMes = ({ label, valor, tono = 'text-slate-600 dark:text-slate-300' }) => (
  <span className="text-xs text-slate-400 whitespace-nowrap">
    {label} <span className={`font-medium tabular-nums ${tono}`}>{fmt(valor)}</span>
  </span>
);

function ComprasTab({ isViewer, onOpenWizard, compras, lotes, onDeleteCompra, onDeleteLote, onAddCompra, importSeq = 0 }) {
  const [showManual, setShowManual] = useState(false);
  const [tipoSel, setTipoSel] = useState(''); // '' = todas las boletas
  const [busqueda, setBusqueda] = useState('');
  const [mesSel, setMesSel] = useState(new Date().toISOString().slice(0, 7)); // arranca en el mes actual; '' = todos
  const [desde, setDesde] = useState('');     // YYYY-MM-DD
  const [hasta, setHasta] = useState('');     // YYYY-MM-DD
  const [detalle, setDetalle] = useState(false); // columnas 21% + otros atributos
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

  // Acordeón del rango de fechas: arranca contraído porque el filtro habitual es el
  // mes. El estado vive en el componente, así que se conserva mientras se navega
  // dentro de la sección y se olvida al recargar (nada va a localStorage).
  const [fechasAbierto, setFechasAbierto] = useState(false);
  // `hayRango` es solo desde/hasta: el mes tiene su propio control siempre visible,
  // y contarlo como "filtro del acordeón" dejaría el chip encendido permanentemente.
  const hayRango = Boolean(desde || hasta);
  const ddmm = (f) => (f ? `${f.slice(8, 10)}/${f.slice(5, 7)}` : '');
  const resumenRango = !hayRango ? ''
    : desde && hasta ? `${ddmm(desde)} → ${ddmm(hasta)}`
    : desde ? `desde ${ddmm(desde)}`
    : `hasta ${ddmm(hasta)}`;

  // Agrupar filas por mes. Subtotales netos: las NC restan (factura suma).
  const porMes = visibles.reduce((acc, c) => { (acc[c.mes] ||= []).push(c); return acc; }, {});
  const meses = Object.keys(porMes).sort((a, b) => b.localeCompare(a));
  const subtotalF = (filas, fn) => filas.reduce((s, f) => s + (esNC(f.tipo) ? -1 : 1) * (fn(f) || 0), 0);
  const subtotal = (filas, campo) => subtotalF(filas, f => f[campo]);
  // Valor unificado de cada par de columnas: si el total no vino mapeado, cae al 21%.
  const netoDe = (c) => (c.neto_gravado || 0) || (c.neto_grav_21 || 0);
  const ivaDe = (c) => (c.total_iva || 0) || (c.iva_21 || 0);
  const impAcum = subtotal(visibles, 'imp_total');
  const ivaAcum = subtotalF(visibles, ivaDe);

  // Mes plegable. Qué viene abierto depende del contexto y se recalcula solo, sin
  // efectos que sincronicen: al importar quedan todos cerrados (lo recién cargado se
  // revisa por totales, no leyendo el volcado del Excel), buscando se abren los meses
  // con coincidencias, y de arranque solo el mes en curso: los anteriores ya se vieron.
  const mesEnCurso = hoy().slice(0, 7);
  const ctx = `${importSeq}|${q}`;
  const [abiertos, setAbiertos] = useState(() => ({ ctx: '0|', set: new Set([mesEnCurso]) }));
  const mesesAbiertos = abiertos.ctx === ctx
    ? abiertos.set
    : new Set(q ? meses : (importSeq > 0 ? [] : [mesEnCurso]));
  const toggleMes = (mes) => {
    const next = new Set(mesesAbiertos);
    next.has(mes) ? next.delete(mes) : next.add(mes);
    setAbiertos({ ctx, set: next });
  };

  // La página de cada mes se guarda junto al filtro que la produjo: si el filtro
  // cambia, el conjunto es otro y todos vuelven a la primera página.
  const filtroKey = `${ctx}|${tipoSel}|${mesSel}|${desde}|${hasta}`;
  const [paginas, setPaginas] = useState({ key: '', mapa: {} });
  const paginaDe = (mes) => (paginas.key === filtroKey ? paginas.mapa[mes] : 0) || 0;
  const setPagina = (mes, p) => setPaginas(prev => ({
    key: filtroKey,
    mapa: { ...(prev.key === filtroKey ? prev.mapa : {}), [mes]: Math.max(0, p) },
  }));

  const topRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setShowScrollTop(!e.isIntersecting));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="space-y-5">
      <div ref={topRef} aria-hidden />
      {showScrollTop && (
        <button
          onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth' })}
          title="Volver arriba"
          aria-label="Volver arriba"
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-colors animate-[fadeIn_150ms_ease-out]"
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      )}
      {/* Resumen + filtro por tipo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Imp. Total {tipoSel ? `(${tipoSel})` : 'acumulado'}: <strong className="text-amber-600 dark:text-amber-400">{fmt(impAcum)}</strong>
          {' · '}IVA total: <strong className="text-slate-600 dark:text-slate-300">{fmt(ivaAcum)}</strong>
        </p>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 min-w-36 sm:flex-none">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar monto, razón social o factura…"
              className="w-full sm:w-56 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 rounded-lg pl-7 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
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
            <button onClick={() => setShowManual(v => !v)} title="Cargar un comprobante a mano"
              className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-1.5 text-xs">
              <Plus size={13} /> <span className="hidden sm:inline">Cargar manual</span>
            </button>
          )}
          {!isViewer && (
            <button onClick={() => onOpenWizard([])} title="Importar Excel y mapear columnas"
              className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-1.5 text-xs">
              <Upload size={13} /> <span className="hidden sm:inline">Importar</span>
            </button>
          )}
        </div>
      </div>

      {/* Formulario de carga manual (modal) */}
      {showManual && !isViewer && (
        <Modal title="Cargar comprobante manual" onClose={() => setShowManual(false)} size="2xl">
          <CompraManualForm
            onSubmit={async (payload) => { await onAddCompra(payload); setShowManual(false); }}
            onCancel={() => setShowManual(false)}
          />
        </Modal>
      )}

      {/* Navegación por mes + acordeón de rango de fechas */}
      <div className="text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Navegador de mes (segmented) — siempre visible: es el filtro de uso diario */}
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

          {/* Disparador del acordeón. El rango de fechas se usa a veces, no siempre:
              contraído es un chip; con rango activo se pinta de acento y muestra el
              resumen, para que un filtro aplicado nunca quede escondido. */}
          <button type="button" onClick={() => setFechasAbierto(v => !v)}
            aria-expanded={fechasAbierto} aria-controls="filtro-rango-fechas"
            title={hayRango ? `Rango activo: ${resumenRango}` : 'Filtrar por rango de fechas'}
            className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border transition-colors ${
              hayRango
                ? 'bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-500/15 dark:border-blue-500 dark:text-blue-300'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
            <ChevronDown size={13} className={`shrink-0 transition-transform ${fechasAbierto ? 'rotate-180' : ''}`} />
            <CalendarDays size={13} className="shrink-0" />
            <span className="hidden sm:inline">Rango de fechas</span>
            {hayRango && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <span className="opacity-50 hidden sm:inline">•</span>
                {resumenRango}
              </span>
            )}
          </button>

          {/* Vista compacta ↔ todas las columnas */}
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => setDetalle(v => !v)} aria-pressed={detalle} title="Ver detalle completo"
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border transition-colors ${
                detalle ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-600 dark:border-slate-500'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
              <Columns3 size={13} /> <span className="hidden sm:inline">Ver detalle completo</span>
            </button>
            <InfoTooltip width="w-64" text="La vista compacta muestra un solo Neto Gravado y un solo Total IVA, que es lo que coincide en casi todos los comprobantes. El detalle completo agrega Neto Grav. 21%, IVA 21% y Otros Atributos, útil cuando hay alícuotas distintas del 21%. Los importes que no coinciden quedan subrayados con el detalle en el tooltip." />
          </div>
        </div>

        {/* Panel expandible. grid-rows 1fr↔0fr: la misma técnica de colapso animado
            que usan los meses, sin medir alturas a mano. */}
        <div id="filtro-rango-fechas"
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${fechasAbierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="inline-flex items-center h-8 gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5">
                <CalendarDays size={13} className="text-slate-400 shrink-0" />
                <input type="date" value={desde} onChange={e => setDesde(e.target.value)} title="Desde"
                  tabIndex={fechasAbierto ? 0 : -1}
                  className="bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none" />
                <span className="text-slate-300 dark:text-slate-500">→</span>
                <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} title="Hasta"
                  tabIndex={fechasAbierto ? 0 : -1}
                  className="bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none" />
              </div>
              {/* Mostrar todos los meses */}
              <button onClick={() => { setMesSel(''); setDesde(''); setHasta(''); }} title="Ver todos los meses"
                tabIndex={fechasAbierto ? 0 : -1}
                className={`inline-flex items-center h-8 px-2.5 rounded-lg border transition-colors ${
                  mesSel === '' && !desde && !hasta
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                Mostrar todos
              </button>
              {hayFiltroFecha && (
                <button onClick={limpiarFechas} title="Quitar filtros"
                  tabIndex={fechasAbierto ? 0 : -1}
                  className="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors">
                  <X size={13} /> Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Archivos cargados (lotes) */}
      <LotesCard lotes={lotes} isViewer={isViewer} onDeleteLote={onDeleteLote} />

      {/* Tablas por mes con todas las columnas */}
      {meses.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          {mesSel ? `Sin comprobantes en ${labelMes(mesSel)}.`
            : (q || tipoSel || desde || hasta) ? 'No hay comprobantes que coincidan con el filtro.'
            : 'Todavía no hay compras importadas.'}
        </p>
      ) : meses.map(mes => {
        const filas = porMes[mes];
        const abierto = mesesAbiertos.has(mes);
        const totalPaginas = Math.max(1, Math.ceil(filas.length / FILAS_POR_PAGINA));
        const pagina = Math.min(paginaDe(mes), totalPaginas - 1);
        const pagFilas = filas.slice(pagina * FILAS_POR_PAGINA, (pagina + 1) * FILAS_POR_PAGINA);
        const percep = subtotal(filas, 'percepcion_iva');
        const iibb = subtotal(filas, 'ingresos_brutos');

        return (
          <div key={mes} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            {/* Barra de totales = cabecera plegable del mes. Imp. Total es el acento:
                más grande, más peso y solo, a la derecha. */}
            <button type="button" onClick={() => toggleMes(mes)}
              className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-3 sm:px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/70 transition-colors text-left">
              <span className="flex items-center gap-1.5 min-w-32 mr-1">
                <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${abierto ? '' : '-rotate-90'}`} />
                <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{labelMes(mes)}</span>
                <span className="text-xs font-normal text-slate-400">({filas.length})</span>
              </span>
              <TotalMes label="Neto Grav." valor={subtotalF(filas, netoDe)} />
              {detalle && <TotalMes label="Neto Grav. 21%" valor={subtotal(filas, 'neto_grav_21')} />}
              {detalle && <TotalMes label="IVA 21%" valor={subtotal(filas, 'iva_21')} tono="text-sky-600 dark:text-sky-400" />}
              <TotalMes label="Total IVA" valor={subtotalF(filas, ivaDe)} tono="text-sky-600 dark:text-sky-400" />
              {/* Percepciones/IIBB: violeta porque no suman a ningún total del mes */}
              {(percep || iibb) ? (
                <span className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-700"
                  title="Percepciones sufridas en las compras. Son pago a cuenta: se acumulan aparte y no suman al Imp. Total.">
                  {percep ? <TotalMes label="Percep. IVA" valor={percep} tono="text-violet-600 dark:text-violet-400" /> : null}
                  {iibb ? <TotalMes label="Ing. Brutos" valor={iibb} tono="text-violet-600 dark:text-violet-400" /> : null}
                </span>
              ) : null}
              <span className="ml-auto flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-[11px] uppercase tracking-wide text-slate-400">Imp. Total</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">{fmt(subtotal(filas, 'imp_total'))}</span>
              </span>
            </button>

            {/* grid-rows 1fr↔0fr: colapso animado sin medir alturas a mano. */}
            <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${abierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                {/* El scroll vive en la card (no en la página) para que el encabezado
                    quede fijo arriba y la Razón Social fija a la izquierda en mobile. */}
                <div className="overflow-auto max-h-[70vh] border-t border-slate-100 dark:border-slate-700/60">
                  <table className="w-full text-xs whitespace-nowrap">
                    <thead>
                      <tr className="[&>th]:sticky [&>th]:top-0 [&>th]:z-20 [&>th]:bg-slate-100 dark:[&>th]:bg-slate-900 [&>th]:border-b [&>th]:border-slate-200 dark:[&>th]:border-slate-700">
                        <th className={`text-left px-3 py-2 ${TH_MUTED}`}>Fecha</th>
                        <th className={`text-left px-3 py-2 ${TH_MUTED}`}>Tipo</th>
                        <th className={`text-left px-3 py-2 ${TH_MUTED}`}>Documento</th>
                        <th className={`text-left px-3 py-2 ${TH_MUTED}`}>Nro Doc Emisor</th>
                        {/* z-30! gana sobre el z-20 del selector [&>th]: la Razón Social
                            fija tiene que pasar por encima de las columnas que scrollean. */}
                        <th className={`left-0 z-30! text-left px-3 py-2 border-r border-slate-200 dark:border-slate-700 ${TH_MUTED}`}>Razón Social</th>
                        {detalle && <th className={`text-right px-3 py-2 ${TH_MUTED}`}>Neto Grav. 21%</th>}
                        <th className={`text-right px-3 py-2 ${TH_MUTED}`}>Neto Gravado</th>
                        {detalle && <th className={`text-right px-3 py-2 ${TH} text-sky-600 dark:text-sky-400`}>IVA 21%</th>}
                        <th className={`text-right px-3 py-2 ${TH} text-sky-600 dark:text-sky-400`}>Total IVA</th>
                        {detalle && <th className={`text-left px-3 py-2 ${TH_MUTED}`}>Otros Atrib.</th>}
                        <th className={`text-right px-3 py-2 ${TH} text-amber-600 dark:text-amber-400`}>Imp. Total</th>
                        <th className={`text-right px-3 py-2 ${TH} text-violet-600 dark:text-violet-400`}>Percep. IVA</th>
                        <th className={`text-right px-3 py-2 ${TH} text-violet-600 dark:text-violet-400`}>Ing. Brutos</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
                      {pagFilas.map((c, i) => {
                        // La fecha repetida se atenúa: el ojo baja por los cambios de día
                        // en vez de releer la misma fecha veinte veces.
                        const repetida = i > 0 && pagFilas[i - 1].fecha === c.fecha;
                        return (
                          <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 group">
                            <td className={`px-3 py-1 tabular-nums ${repetida ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'}`}>{c.fecha}</td>
                            <td className="px-3 py-1">{c.tipo || '—'}</td>
                            <td className="px-3 py-1">{c.documento || '—'}</td>
                            <td className="px-3 py-1">{c.nro_doc || '—'}</td>
                            <td className="sticky left-0 z-10 px-3 py-1 max-w-36 sm:max-w-56 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/30 border-r border-slate-100 dark:border-slate-700/60">
                              <TextoTruncado texto={c.razon_social} />
                            </td>
                            {detalle && <td className="px-3 py-1 text-right tabular-nums">{fmtNum(c.neto_grav_21)}</td>}
                            <td className="px-3 py-1 text-right tabular-nums">
                              <MontoUnificado total={c.neto_gravado} parcial={c.neto_grav_21} labelTotal="Neto Gravado" labelParcial="Neto Grav. 21%" />
                            </td>
                            {detalle && <td className="px-3 py-1 text-right tabular-nums text-sky-600 dark:text-sky-400">{fmtNum(c.iva_21)}</td>}
                            <td className="px-3 py-1 text-right tabular-nums text-sky-700 dark:text-sky-400">
                              <MontoUnificado total={c.total_iva} parcial={c.iva_21} labelTotal="Total IVA" labelParcial="IVA 21%" />
                            </td>
                            {detalle && <td className="px-3 py-1 max-w-30"><TextoTruncado texto={c.otros_atributos} /></td>}
                            <td className="px-3 py-1 text-right font-medium tabular-nums text-amber-600 dark:text-amber-400">{fmtNum(c.imp_total)}</td>
                            <td className="px-3 py-1 text-right tabular-nums text-violet-600 dark:text-violet-400">{(c.percepcion_iva || 0) ? fmtNum(c.percepcion_iva) : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                            <td className="px-3 py-1 text-right tabular-nums text-violet-600 dark:text-violet-400">{(c.ingresos_brutos || 0) ? fmtNum(c.ingresos_brutos) : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                            <td className="px-2 py-1 text-right">
                              {!isViewer && (
                                <button onClick={() => onDeleteCompra(c.id)} title="Eliminar comprobante" aria-label="Eliminar comprobante"
                                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"><Trash2 size={12} /></button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <PaginacionMes total={filas.length} pagina={pagina} onPagina={(p) => setPagina(mes, p)} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

// Carga manual de un comprobante de compra. Percepción IVA e Ingresos Brutos se
// guardan aparte y NO se suman al Imp. Total ni a ningún otro total del comprobante.
function CompraManualForm({ onSubmit, onCancel }) {
  const [f, setF] = useState({
    fecha: hoy(), tipo: '', documento: '', nro_doc: '', razon_social: '',
    neto_gravado: '', iva_21: '', total_iva: '', imp_total: '',
    percepcion_iva: '', ingresos_brutos: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!f.fecha) { toast.error('La fecha es obligatoria'); return; }
    setSaving(true);
    try {
      await onSubmit({ ...f });
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-[11px] text-slate-400 mb-0.5';
  const num = (k, label, extraCls = '') => (
    <div>
      <label className={labelCls}>{label}</label>
      <input type="number" step="0.01" value={f[k]} onChange={e => set(k, e.target.value)} placeholder="0" className={`${inputCls} ${extraCls}`} />
    </div>
  );
  // Percepciones/IIBB: mismo input que el resto (simétrico), con label violeta que
  // aclara que no suman al Imp. Total. Van arriba del Imp. Total (que se carga último).
  const numV = (k, label) => (
    <div>
      <label className="block text-[11px] text-violet-500 dark:text-violet-400 mb-0.5">{label} <span className="text-violet-400/70">(no suma)</span></label>
      <input type="number" step="0.01" value={f[k]} onChange={e => set(k, e.target.value)} placeholder="0" className={`${inputCls} border-violet-200 dark:border-violet-800 focus:ring-violet-500`} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div>
          <label className={labelCls}>Fecha *</label>
          <input type="date" value={f.fecha} onChange={e => set('fecha', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Tipo</label>
          <input type="text" value={f.tipo} onChange={e => set('tipo', e.target.value)} placeholder="Factura A…" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Documento</label>
          <input type="text" value={f.documento} onChange={e => set('documento', e.target.value)} placeholder="CUIT…" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Nro Doc Emisor</label>
          <input type="text" value={f.nro_doc} onChange={e => set('nro_doc', e.target.value)} className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Razón Social</label>
          <input type="text" value={f.razon_social} onChange={e => set('razon_social', e.target.value)} placeholder="Proveedor" className={inputCls} />
        </div>
        {num('neto_gravado', 'Neto Gravado')}
        {num('iva_21', 'IVA 21%')}
        {num('total_iva', 'Total IVA')}
        {/* Percepciones/IIBB simétricas con el resto y arriba del Imp. Total (que va último) */}
        {numV('percepcion_iva', 'Percepción IVA')}
        {numV('ingresos_brutos', 'Ingresos Brutos')}
        {num('imp_total', 'Imp. Total')}
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3.5 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-3.5 py-1.5 disabled:opacity-40">
          <Plus size={15} /> {saving ? 'Guardando…' : 'Guardar comprobante'}
        </button>
      </div>
    </form>
  );
}


function VentasTab({ isViewer, vFecha, setVFecha, vTotal, setVTotal, vConcepto, setVConcepto, onAdd, mesesVentas, ventasPorMes, onDelete, totalVentas }) {
  // Solo el mes en curso arranca abierto: los anteriores ya se revisaron, y tenerlos
  // desplegados es justamente lo que obligaba a scrollear.
  const [abiertos, setAbiertos] = useState(() => new Set([hoy().slice(0, 7)]));
  const toggleMes = (mes) => setAbiertos(prev => {
    const next = new Set(prev);
    next.has(mes) ? next.delete(mes) : next.add(mes);
    return next;
  });

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

      <p className="text-sm text-slate-500">Total ventas IVA: <strong className="text-blue-600 dark:text-blue-400">{fmt(totalVentas)}</strong></p>

      {/* Listado compacto: un solo encabezado de columnas para todos los meses, y cada
          mes como fila divisoria plegable en vez de una card propia. Las columnas se
          alinean con un grid compartido entre el encabezado y las filas. */}
      {mesesVentas.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Todavía no hay ventas cargadas.</p>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className={`${GRID_VENTAS} sticky top-0 z-10 px-3 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 ${TH_MUTED}`}>
            <span>Fecha</span>
            <span>Concepto</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          {mesesVentas.map(mes => {
            const filas = ventasPorMes[mes] || [];
            const sub = filas.reduce((s, v) => s + (v.total || 0), 0);
            const abierto = abiertos.has(mes);
            const cantidad = filas.length;

            return (
              <div key={mes}>
                <button type="button" onClick={() => toggleMes(mes)}
                  className="w-full flex items-center gap-2 px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/70 transition-colors text-left">
                  <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform ${abierto ? '' : '-rotate-90'}`} />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{labelMes(mes)}</span>
                  <span className="text-xs text-slate-400 shrink-0">({cantidad})</span>
                  <span className="ml-auto text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums shrink-0">{fmt(sub)}</span>
                </button>

                {/* grid-rows 1fr↔0fr: colapso animado sin medir alturas a mano. */}
                <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${abierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    {filas.map(v => (
                      <div key={v.id}
                        className={`${GRID_VENTAS} items-center px-3 py-1.5 border-t border-slate-100 dark:border-slate-700/60 group hover:bg-slate-50 dark:hover:bg-slate-700/30`}>
                        <span className="text-xs text-slate-400 tabular-nums truncate">{v.fecha}</span>
                        <span className="min-w-0">
                          <span className="text-sm truncate text-slate-700 dark:text-slate-200">
                            {v.concepto || '—'}
                          </span>
                        </span>
                        <span className="text-sm text-right tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-200">
                          {fmt(v.total)}
                        </span>
                        <span className="text-right">
                          {!isViewer && (
                            <button onClick={() => onDelete(v.id)} title="Eliminar"
                              className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

// Créditos fiscales: carga manual por mes, misma mecánica que Ventas pero con
// edición además de borrado (son ajustes contables que suelen corregirse). El
// acumulado del mes se resta del saldo en la tabla de arriba.
function CreditosTab({ isViewer, mesesCreditos, creditosPorMes, onAdd, onUpdate, onDelete, totalCreditos }) {
  const [fecha, setFecha] = useState(hoy());
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(null); // id en edición | null
  const [abiertos, setAbiertos] = useState(() => new Set([hoy().slice(0, 7)]));

  const toggleMes = (mes) => setAbiertos(prev => {
    const next = new Set(prev);
    next.has(mes) ? next.delete(mes) : next.add(mes);
    return next;
  });

  const agregar = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!monto || Number(monto) <= 0) { toast.error('Ingresá un monto válido'); return; }
    setSaving(true);
    try {
      await onAdd({ fecha, monto, concepto });
      setMonto(''); setConcepto('');
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSaving(false); }
  };

  const eliminar = (id) => {
    if (!window.confirm('¿Eliminar este crédito fiscal? El saldo del mes se recalcula.')) return;
    onDelete(id);
  };

  const inputCls = 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="space-y-5">
      {!isViewer && (
        <form onSubmit={agregar} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                Monto del crédito
                <InfoTooltip text="Se acumula con los demás créditos del mismo mes y se resta del saldo mensual de IVA. Cargalo en positivo: la resta la hace el cálculo." />
              </label>
              <input type="number" min="0" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0"
                className={`w-full ${inputCls}`} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Concepto (opcional)</label>
              <input type="text" value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Saldo técnico, retención sufrida…"
                className={`w-full ${inputCls}`} />
            </div>
            <button type="submit" disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-40">
              <Plus size={15} /> {saving ? 'Guardando…' : 'Agregar'}
            </button>
          </div>
        </form>
      )}

      <p className="text-sm text-slate-500">
        Total créditos fiscales: <strong className="text-indigo-600 dark:text-indigo-400">{fmt(totalCreditos)}</strong>
      </p>

      {mesesCreditos.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Todavía no hay créditos fiscales cargados. Los meses sin créditos restan $0.
        </p>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className={`${GRID_CREDITOS} sticky top-0 z-10 px-3 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 ${TH_MUTED}`}>
            <span>Fecha</span>
            <span>Concepto</span>
            <span className="text-right">Monto</span>
            <span />
          </div>

          {mesesCreditos.map(mes => {
            const filas = creditosPorMes[mes] || [];
            const sub = filas.reduce((s, c) => s + (c.monto || 0), 0);
            const abierto = abiertos.has(mes);

            return (
              <div key={mes}>
                <button type="button" onClick={() => toggleMes(mes)}
                  className="w-full flex items-center gap-2 px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/70 transition-colors text-left">
                  <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform ${abierto ? '' : '-rotate-90'}`} />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{labelMes(mes)}</span>
                  <span className="text-xs text-slate-400 shrink-0">({filas.length})</span>
                  <span className="ml-auto text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums shrink-0">{fmt(sub)}</span>
                </button>

                <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${abierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    {filas.map(c => (
                      editando === c.id ? (
                        <CreditoEditRow key={c.id} credito={c}
                          onCancel={() => setEditando(null)}
                          onSave={async (payload) => { await onUpdate(c.id, payload); setEditando(null); }} />
                      ) : (
                        <div key={c.id}
                          className={`${GRID_CREDITOS} items-center px-3 py-1.5 border-t border-slate-100 dark:border-slate-700/60 group hover:bg-slate-50 dark:hover:bg-slate-700/30`}>
                          <span className="text-xs text-slate-400 tabular-nums truncate">{c.fecha}</span>
                          <span className="min-w-0">
                            <TextoTruncado texto={c.concepto} className="text-sm text-slate-700 dark:text-slate-200" />
                          </span>
                          <span className="text-sm text-right tabular-nums whitespace-nowrap text-indigo-600 dark:text-indigo-400">
                            {fmt(c.monto)}
                          </span>
                          <span className="flex items-center justify-end gap-1">
                            {!isViewer && (
                              <>
                                <button onClick={() => setEditando(c.id)} title="Editar"
                                  className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => eliminar(c.id)} title="Eliminar"
                                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Edición en la propia fila: son tres campos cortos, abrir un modal para eso
// obligaría a perder de vista el resto del mes.
function CreditoEditRow({ credito, onSave, onCancel }) {
  const [fecha, setFecha] = useState(credito.fecha || hoy());
  const [monto, setMonto] = useState(String(credito.monto ?? ''));
  const [concepto, setConcepto] = useState(credito.concepto || '');
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (saving) return;
    if (!monto || Number(monto) <= 0) { toast.error('Ingresá un monto válido'); return; }
    setSaving(true);
    try { await onSave({ fecha, monto, concepto }); }
    catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSaving(false); }
  };

  const cls = 'w-full bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-md px-1.5 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className={`${GRID_CREDITOS} items-center px-3 py-1.5 border-t border-slate-100 dark:border-slate-700/60 bg-blue-50/50 dark:bg-blue-900/10`}>
      <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={cls} />
      <input type="text" value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Concepto" className={cls} />
      <input type="number" min="0" step="0.01" value={monto} onChange={e => setMonto(e.target.value)}
        className={`${cls} text-right tabular-nums w-28`} />
      <span className="flex items-center justify-end gap-1">
        <button onClick={guardar} disabled={saving} title="Guardar"
          className="text-emerald-600 hover:text-emerald-700 disabled:opacity-40"><Check size={14} /></button>
        <button onClick={onCancel} disabled={saving} title="Cancelar"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-40"><X size={14} /></button>
      </span>
    </div>
  );
}
