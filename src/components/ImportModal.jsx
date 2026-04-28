import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { movimientosApi, camposApi, rubrosApi } from '../api';
import { Upload, FileSpreadsheet, Check, X, AlertCircle } from 'lucide-react';

const META_ROLES = [
  { value: 'fecha',             label: '📅 Fecha',             hint: 'Fecha del movimiento' },
  { value: 'monto',             label: '+ Monto (boleta)',     hint: 'Importe que suma al total' },
  { value: 'pago',              label: '− Pago',               hint: 'Importe que resta del total' },
  { value: 'fecha_vencimiento', label: '⏰ Vencimiento',       hint: 'Fecha de vencimiento' },
];

const META_ALIASES = {
  fecha:             ['fecha', 'date', 'fecha pago', 'fecha factura'],
  monto:             ['monto', 'importe', 'debe', 'amount', 'valor', 'precio'],
  pago:              ['pago', 'abono', 'pagado', 'payment', 'haber', 'cobrado'],
  fecha_vencimiento: ['vencimiento', 'venc', 'vto', 'expira', 'fecha venc'],
};

function autoDetectRole(headerName, camposRubro) {
  const hl = headerName.toLowerCase().trim();
  for (const [field, aliases] of Object.entries(META_ALIASES)) {
    if (aliases.some(a => hl.includes(a))) return field;
  }
  for (const campo of camposRubro) {
    if (hl === campo.nombre.toLowerCase()) return `campo:${campo.nombre}`;
  }
  return 'ignore';
}

function isNumericCol(samples) {
  const vals = samples.filter(v => v !== null && v !== undefined && v !== '');
  if (vals.length === 0) return false;
  return vals.some(v => typeof v === 'number' || !isNaN(parseFloat(String(v).replace(',', '.'))));
}

function fmtSample(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (v instanceof Date) return v.toLocaleDateString('es-AR');
  if (typeof v === 'number') return v.toLocaleString('es-AR');
  return String(v).substring(0, 20);
}

export default function ImportModal({ rubro, onClose, onSuccess }) {
  const [step, setStep] = useState('upload');
  const [sheets, setSheets] = useState([]);
  const [selectedSheets, setSelectedSheets] = useState(new Set());
  const [colMapping, setColMapping] = useState({});
  const [campos, setCampos] = useState([]);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('skip_duplicates');
  const inputRef = useRef();

  useEffect(() => {
    Promise.all([
      camposApi.getByRubro(rubro.id),
      rubrosApi.getImportConfig(rubro.id),
    ]).then(([cs, cfg]) => {
      setCampos(cs);
      if (cfg?.mode) setMode(cfg.mode);
    });
  }, [rubro.id]);

  const handleFile = async (f) => {
    if (!f) return;
    setError(null);

    // Cargar config guardada del backend
    let savedConfig = null;
    try {
      savedConfig = await rubrosApi.getImportConfig(rubro.id);
    } catch { /* sin config guardada */ }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        const sheetData = wb.SheetNames.map(name => {
          const raw = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true });
          const headers = (raw[0] || []).map(v => (v == null ? '' : String(v).trim()));
          const dataRows = raw.slice(1, 4);
          const samples = headers.map((_, ci) => dataRows.map(r => r[ci] ?? null));
          return { name, headers, samples };
        }).filter(s => s.headers.some(h => h.length > 0));

        if (sheetData.length === 0) { setError('El archivo no tiene hojas con datos.'); return; }

        const allHeaders = [...new Set(sheetData.flatMap(s => s.headers))];
        const mapping = {};
        for (const h of allHeaders) {
          if (savedConfig?.mapping?.[h]) mapping[h] = savedConfig.mapping[h];
          else mapping[h] = autoDetectRole(h, campos);
        }
        if (savedConfig?.mode) setMode(savedConfig.mode);
        setColMapping(mapping);
        setSheets(sheetData);
        setSelectedSheets(new Set(sheetData.map(s => s.name)));
        setFile(f);
        setStep('map');
      } catch {
        setError('No se pudo leer el archivo. Verificá que sea .xlsx o .xls válido.');
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleImport = async () => {
    setStep('importing');
    setError(null);
    try {
      await rubrosApi.saveImportConfig(rubro.id, colMapping, mode);
      const res = await movimientosApi.importExcel(rubro.id, file, colMapping, mode, [...selectedSheets]);
      setResult(res);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al importar.');
      setStep('map');
    }
  };

  const allCols = [...new Set(sheets.flatMap(s => s.headers))].filter(h => h.length > 0);
  const getSamples = (col) => {
    for (const sheet of sheets) {
      const idx = sheet.headers.indexOf(col);
      if (idx !== -1) return sheet.samples[idx] || [];
    }
    return [];
  };

  const hasFecha = Object.values(colMapping).includes('fecha');
  const hasMonto = Object.values(colMapping).includes('monto') || Object.values(colMapping).includes('pago');
  const canImport = hasFecha && hasMonto;

  const roleLabel = (role) => {
    if (!role || role === 'ignore') return null;
    const meta = META_ROLES.find(r => r.value === role);
    if (meta) return meta.label;
    if (role.startsWith('campo:')) return `Campo: ${role.replace('campo:', '')}`;
    return role;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Importar Excel</p>
              <p className="text-xs text-slate-400">{rubro.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: upload */}
          {step === 'upload' && (
            <div>
              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors"
                onClick={() => inputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              >
                <Upload size={32} className="mx-auto mb-3 text-slate-400" />
                <p className="font-medium text-slate-600 text-sm">Arrastrá el archivo o hacé click</p>
                <p className="text-xs text-slate-400 mt-1">.xlsx / .xls</p>
              </div>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => handleFile(e.target.files[0])} />
              {error && <p className="mt-3 text-sm text-red-600 flex items-center gap-1"><AlertCircle size={14} />{error}</p>}
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-500 space-y-1">
                <p>• Cada <strong>hoja</strong> del Excel se crea como un subrubro bajo <strong>{rubro.nombre}</strong>.</p>
                <p>• Si la hoja ya existe, se agregan o reemplazan movimientos según el modo.</p>
                <p>• El mapeo de columnas se guarda automáticamente para importaciones futuras.</p>
              </div>
            </div>
          )}

          {/* Step: map */}
          {step === 'map' && (
            <div className="space-y-5">
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Hojas a importar ({selectedSheets.size}/{sheets.length})
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setSelectedSheets(new Set(sheets.map(s => s.name)))}
                      className="text-xs text-blue-600 hover:underline">Todas</button>
                    <button type="button" onClick={() => setSelectedSheets(new Set())}
                      className="text-xs text-slate-400 hover:text-slate-600 hover:underline">Ninguna</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sheets.map(s => {
                    const sel = selectedSheets.has(s.name);
                    return (
                      <label key={s.name} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors select-none ${
                        sel
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                          : 'bg-white border-slate-200 text-slate-400 line-through'
                      }`}>
                        <input type="checkbox" checked={sel} className="hidden"
                          onChange={() => setSelectedSheets(prev => {
                            const next = new Set(prev);
                            if (next.has(s.name)) next.delete(s.name);
                            else next.add(s.name);
                            return next;
                          })} />
                        {sel ? '✓' : '○'} {s.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Asigná un rol a cada columna
                </p>
                <div className="space-y-2">
                  {allCols.map(col => {
                    const samples = getSamples(col);
                    const numeric = isNumericCol(samples);
                    return (
                      <div key={col} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                        <div className="w-40 shrink-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">{col}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {samples.filter(v => v !== null).slice(0, 3).map(fmtSample).join(' · ') || '—'}
                          </p>
                        </div>
                        <select
                          value={colMapping[col] || 'ignore'}
                          onChange={e => setColMapping(prev => ({ ...prev, [col]: e.target.value }))}
                          className={`flex-1 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${
                            colMapping[col] && colMapping[col] !== 'ignore'
                              ? 'border-emerald-300 bg-emerald-50'
                              : 'border-slate-300'
                          }`}
                        >
                          <option value="ignore">— Ignorar —</option>
                          <optgroup label="Columnas base">
                            {META_ROLES.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </optgroup>
                          {campos.length > 0 && (
                            <optgroup label="Columnas personalizadas">
                              {campos.map(c => (
                                <option key={c.id} value={`campo:${c.nombre}`}>
                                  {c.nombre} ({c.tipo === 'suma' ? '+suma' : c.tipo === 'resta' ? '−resta' : 'texto'})
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        <div className="w-16 shrink-0 text-right">
                          {numeric
                            ? <span className="text-xs text-violet-500 font-medium">número</span>
                            : <span className="text-xs text-slate-400">texto</span>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {canImport && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
                  <p className="font-semibold mb-1">Se importará:</p>
                  <ul className="space-y-0.5">
                    {Object.entries(colMapping)
                      .filter(([, v]) => v && v !== 'ignore')
                      .map(([col, role]) => (
                        <li key={col}>• <strong>"{col}"</strong> → {roleLabel(role)}</li>
                      ))}
                  </ul>
                </div>
              )}

              {!canImport && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                  Necesitás asignar al menos: <strong>Fecha</strong> + <strong>Monto</strong> o <strong>Pago</strong>.
                </p>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Modo</p>
                <div className="space-y-2">
                  {[
                    { value: 'add',             label: 'Agregar todo',      desc: 'Importa todas las filas aunque existan.' },
                    { value: 'skip_duplicates', label: 'Omitir duplicados', desc: 'Saltea filas con el mismo N° factura (o fecha+monto).' },
                    { value: 'replace',         label: 'Reemplazar',        desc: 'Borra los movimientos existentes antes de importar.', danger: true },
                  ].map(opt => (
                    <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      mode === opt.value
                        ? opt.danger ? 'border-red-300 bg-red-50' : 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      <input type="radio" name="import-mode" value={opt.value} checked={mode === opt.value}
                        onChange={() => setMode(opt.value)} className="mt-0.5 shrink-0" />
                      <div>
                        <p className={`text-xs font-semibold ${opt.danger ? 'text-red-700' : 'text-slate-700'}`}>{opt.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle size={14} />{error}</p>}
            </div>
          )}

          {/* Step: importing */}
          {step === 'importing' && (
            <div className="py-10 text-center">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-600 text-sm">Importando datos...</p>
            </div>
          )}

          {/* Step: done */}
          {step === 'done' && result && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Check size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    {result.totalCreated} movimiento{result.totalCreated !== 1 ? 's' : ''} importado{result.totalCreated !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-slate-400">
                    {result.sheets.length} subrubro{result.sheets.length !== 1 ? 's' : ''}
                    {result.totalSkipped > 0 && ` · ${result.totalSkipped} duplicados omitidos`}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5 mb-5 max-h-52 overflow-y-auto">
                {result.sheets.map(s => (
                  <div key={s.name} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700 truncate mr-3">{s.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-green-600 font-medium">{s.created} importados</span>
                      {s.duplicates > 0 && <span className="text-xs text-amber-500">{s.duplicates} dup.</span>}
                      {s.skipped > 0 && <span className="text-xs text-slate-400">{s.skipped} vacíos</span>}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { onSuccess(); onClose(); }}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 font-medium"
              >
                Ver resultados
              </button>
            </div>
          )}
        </div>

        {step === 'map' && (
          <div className="px-6 py-4 border-t border-slate-200 flex gap-2 shrink-0">
            <button
              onClick={() => { setStep('upload'); setFile(null); setSheets([]); }}
              className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-xl text-sm hover:bg-slate-50"
            >
              ← Volver
            </button>
            <button
              onClick={handleImport}
              disabled={!canImport || selectedSheets.size === 0}
              className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-40 font-medium"
            >
              Importar {selectedSheets.size} hoja{selectedSheets.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
