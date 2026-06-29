import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { ivaApi, getErrorMsg } from '../api';
import { parseWorkbook, fmtSample } from '../utils/excel';
import { Upload, FileSpreadsheet, Check, X, AlertCircle } from 'lucide-react';

// Campos destino del Excel de compras (espejo de COLUMNS en backend/routes/iva.js).
const IVA_FIELDS = [
  { key: 'fecha',           label: 'Fecha',           required: true,  sum: false, syn: ['Fecha', 'Fecha Comprobante', 'Fecha Emisión'] },
  { key: 'tipo',            label: 'Tipo',            required: false, sum: false, syn: ['Tipo', 'Tipo Comprobante'] },
  { key: 'documento',       label: 'Documento',       required: false, sum: false, syn: ['Documento', 'Tipo Doc', 'Tipo Documento'] },
  { key: 'nro_doc',         label: 'Nro Doc Emisor',  required: false, sum: false, syn: ['Nro Doc Emisor', 'Nro Doc', 'Número Doc Emisor', 'CUIT'] },
  { key: 'razon_social',    label: 'Razón Social',    required: false, sum: false, syn: ['Razón Social', 'Razon Social', 'Proveedor', 'Denominación'] },
  { key: 'iva_21',          label: 'IVA 21%',         required: false, sum: true,  syn: ['IVA 21%', 'IVA 21', 'IVA21'] },
  { key: 'neto_grav_21',    label: 'Neto Grav. 21%',  required: false, sum: false, syn: ['Neto Grav. 21%', 'Neto Grav 21%', 'Neto Gravado 21%'] },
  { key: 'neto_gravado',    label: 'Neto Gravado',    required: false, sum: true,  syn: ['Neto Gravado', 'Neto Grav.', 'Neto'] },
  { key: 'otros_atributos', label: 'Otros Atributos', required: false, sum: false, syn: ['Otros Atributos', 'Otros', 'Otros Tributos'] },
  { key: 'total_iva',       label: 'Total IVA',       required: false, sum: true,  syn: ['Total IVA', 'Total I.V.A.', 'IVA Total'] },
  { key: 'imp_total',       label: 'Imp. Total',      required: true,  sum: true,  syn: ['Imp. Total', 'Imp Total', 'Importe Total', 'Total Comprobante', 'Total'] },
];

// Tokens para detectar la fila de encabezado (compras AFIP).
const IVA_TOKENS = ['fecha', 'tipo', 'documento', 'doc', 'emisor', 'razon', 'social', 'iva', 'neto', 'gravado', 'total', 'imp', 'importe', 'comprobante', 'cuit'];

const norm = s => (s ?? '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// Auto-detecta, para cada campo, el header que mejor matchea por sinónimos.
function autoDetect(headers, savedMapping) {
  const map = {};
  for (const f of IVA_FIELDS) {
    // 1) override guardado (si la columna existe en este Excel)
    const saved = savedMapping?.[f.key];
    if (saved && headers.some(h => norm(h) === norm(saved))) { map[f.key] = headers.find(h => norm(h) === norm(saved)); continue; }
    // 2) match por sinónimo
    const hit = headers.find(h => f.syn.some(s => norm(s) === norm(h)));
    map[f.key] = hit || '';
  }
  return map;
}

export default function ComprasImportModal({ initialFiles = [], onClose, onDone }) {
  const [step, setStep] = useState('upload');     // upload | map | importing | done
  const [files, setFiles] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [sheetName, setSheetName] = useState('');
  const [skipRows, setSkipRows] = useState(0);
  const [mapping, setMapping] = useState({});     // { fieldKey: 'NombreColumna' | '' }
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef();
  const wbRef = useRef(null);                      // workbook del primer archivo (para preview)
  const savedRef = useRef({});

  const sheet = sheets.find(s => s.name === sheetName) || sheets[0];
  const headers = (sheet?.headers || []).filter(h => h.length > 0);

  // Re-parsea el preview cuando cambia skipRows
  useEffect(() => {
    if (step !== 'map' || !wbRef.current) return;
    const data = parseWorkbook(wbRef.current, skipRows, IVA_TOKENS);
    if (!data.length) return;
    setSheets(data);
    const sel = data.find(s => s.name === sheetName) || data[0];
    setMapping(autoDetect(sel.headers.filter(h => h.length > 0), savedRef.current));
  }, [skipRows, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFirst = async (fileList) => {
    const arr = Array.from(fileList || []);
    if (!arr.length) return;
    setError(null);
    setFiles(arr);

    let saved = {};
    try { saved = (await ivaApi.getConfig()).mapping || {}; } catch { /* sin config */ }
    savedRef.current = saved;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        wbRef.current = wb;
        const data = parseWorkbook(wb, 0, IVA_TOKENS);
        if (!data.length) { setError('El archivo no tiene hojas con datos.'); return; }
        setSheets(data);
        setSheetName(data[0].name);
        setMapping(autoDetect(data[0].headers.filter(h => h.length > 0), saved));
        setStep('map');
      } catch {
        setError('No se pudo leer el archivo. Verificá que sea .xlsx o .xls válido.');
      }
    };
    reader.readAsArrayBuffer(arr[0]);
  };

  // Carga inicial si vino con archivos (drag&drop desde la vista)
  useEffect(() => {
    if (initialFiles.length) loadFirst(initialFiles);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const samplesFor = (col) => {
    if (!sheet) return [];
    const idx = sheet.headers.indexOf(col);
    return idx === -1 ? [] : (sheet.samples[idx] || []);
  };

  const missingRequired = IVA_FIELDS.filter(f => f.required && !mapping[f.key]);
  const canImport = missingRequired.length === 0;

  const handleImport = async () => {
    setStep('importing');
    setError(null);
    try {
      // Persistir el mapeo elegido (se reutiliza en próximas cargas)
      const clean = {};
      for (const f of IVA_FIELDS) if (mapping[f.key]) clean[f.key] = mapping[f.key];
      await ivaApi.saveConfig(clean);

      // 1) Dry-run: contamos duplicados (misma fecha + proveedor + importe) sin escribir.
      let dupsDetectados = 0;
      for (const file of files) {
        const res = await ivaApi.importCompras(file, sheetName, { dryRun: true });
        dupsDetectados += res.duplicadas || 0;
      }

      // 2) Si hay duplicados, preguntamos si guardarlos (notas de crédito repetidas) u omitirlos.
      let incluirDuplicados = false;
      if (dupsDetectados > 0) {
        incluirDuplicados = window.confirm(
          `Se detectaron ${dupsDetectados} comprobante(s) con la misma fecha, proveedor e importe (posibles notas de crédito repetidas).\n\n` +
          `Aceptar = guardarlos igual (duplicados)\nCancelar = omitirlos`
        );
      }

      // 3) Importación real con la decisión tomada.
      let importadas = 0, duplicadas = 0;
      const archivos = [];
      for (const file of files) {
        const res = await ivaApi.importCompras(file, sheetName, { incluirDuplicados });
        importadas += res.importadas || 0;
        duplicadas += res.duplicadas || 0;
        archivos.push({ archivo: res.archivo || file.name, importadas: res.importadas || 0, duplicadas: res.duplicadas || 0 });
      }
      setResult({ importadas, duplicadas, incluirDuplicados, archivos });
      setStep('done');
    } catch (err) {
      setError(getErrorMsg(err));
      setStep('map');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center">
              <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Importar compras (IVA)</p>
              <p className="text-xs text-slate-400">Mapeá cada campo a la columna de tu Excel</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: upload */}
          {step === 'upload' && (
            <div>
              <div
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/20 transition-colors"
                onClick={() => inputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); loadFirst(e.dataTransfer.files); }}
              >
                <Upload size={32} className="mx-auto mb-3 text-slate-400" />
                <p className="font-medium text-slate-600 dark:text-slate-300 text-sm">Arrastrá uno o más Excel, o hacé click</p>
                <p className="text-xs text-slate-400 mt-1">.xlsx / .xls · se mapean con las columnas del primero</p>
              </div>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={e => loadFirst(e.target.files)} />
              {error && <p className="mt-3 text-sm text-red-500 flex items-center gap-1"><AlertCircle size={14} />{error}</p>}
            </div>
          )}

          {/* Step: map */}
          {step === 'map' && sheet && (
            <div className="space-y-5">
              {files.length > 1 && (
                <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                  {files.length} archivos seleccionados. Se importarán todos con este mismo mapeo.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4">
                {sheets.length > 1 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Hoja</p>
                    <select value={sheetName} onChange={e => { setSheetName(e.target.value); const s = sheets.find(x => x.name === e.target.value); setMapping(autoDetect((s?.headers || []).filter(h => h.length > 0), savedRef.current)); }}
                      className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-xs">
                      {sheets.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Filas a saltear</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setSkipRows(r => Math.max(0, r - 1))} disabled={skipRows === 0}
                      className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-30 font-bold text-sm flex items-center justify-center">−</button>
                    <span className="w-5 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">{skipRows}</span>
                    <button type="button" onClick={() => setSkipRows(r => Math.min(10, r + 1))}
                      className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 font-bold text-sm flex items-center justify-center">+</button>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Asigná la columna de cada campo</p>
                <div className="space-y-2">
                  {IVA_FIELDS.map(f => {
                    const selected = mapping[f.key] || '';
                    const samples = samplesFor(selected);
                    return (
                      <div key={f.key} className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                        <div className="w-36 shrink-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {f.label}
                            {f.required && <span className="text-red-500 ml-0.5">*</span>}
                            {f.sum && <span className="text-[10px] text-amber-500 ml-1" title="Se suma por mes">∑</span>}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {selected ? (samples.filter(v => v !== null).slice(0, 2).map(fmtSample).join(' · ') || '—') : 'sin asignar'}
                          </p>
                        </div>
                        <select
                          value={selected}
                          onChange={e => setMapping(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className={`flex-1 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            selected
                              ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-slate-800 dark:text-slate-100'
                              : f.required
                                ? 'border-red-300 dark:border-red-700 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          <option value="">— Sin asignar —</option>
                          {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!canImport && (
                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-lg">
                  Asigná los campos obligatorios: {missingRequired.map(f => f.label).join(', ')}.
                </p>
              )}

              {error && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle size={14} />{error}</p>}
            </div>
          )}

          {/* Step: importing */}
          {step === 'importing' && (
            <div className="py-10 text-center">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-300 text-sm">Importando…</p>
            </div>
          )}

          {/* Step: done */}
          {step === 'done' && result && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                  <Check size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{result.importadas} fila{result.importadas !== 1 ? 's' : ''} importada{result.importadas !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-slate-400">{result.duplicadas > 0 ? `${result.duplicadas} duplicada(s) ${result.incluirDuplicados ? 'guardada(s)' : 'omitida(s)'}` : 'Sin duplicados'}</p>
                </div>
              </div>
              <div className="space-y-1.5 mb-5 max-h-52 overflow-y-auto">
                {result.archivos.map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <span className="text-sm text-slate-700 dark:text-slate-200 truncate mr-3">{a.archivo}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">{a.importadas} nuevas</span>
                      {a.duplicadas > 0 && <span className="text-xs text-amber-500">{a.duplicadas} dup.</span>}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => { onDone?.(); onClose(); }} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 font-medium">Listo</button>
            </div>
          )}
        </div>

        {step === 'map' && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-2 shrink-0">
            <button onClick={() => { setStep('upload'); setFiles([]); setSheets([]); }}
              className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-2 rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-700">← Volver</button>
            <button onClick={handleImport} disabled={!canImport}
              className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-40 font-medium">
              Importar {files.length > 1 ? `${files.length} archivos` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
