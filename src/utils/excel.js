import * as XLSX from 'xlsx';

// Helpers puros de parseo de Excel, compartidos entre los importadores
// (ImportModal de Proveedores y ComprasImportModal de IVA).

// Tokens que delatan la fila de encabezado real de un Excel genérico de movimientos.
export const DEFAULT_HEADER_TOKENS = [
  'fecha', 'importe', 'monto', 'debe', 'haber', 'pago', 'abono', 'cobrado', 'pagado',
  'factura', 'comprobante', 'saldo', 'total', 'vencimiento', 'venc', 'vto', 'concepto', 'descripcion', 'detalle',
];

// Rellena celdas combinadas con el valor de la celda de origen.
export function expandMergedCells(sheet) {
  const merges = sheet['!merges'] || [];
  for (const merge of merges) {
    const origin = XLSX.utils.encode_cell(merge.s);
    const originVal = sheet[origin];
    if (!originVal) continue;
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!sheet[addr]) sheet[addr] = { ...originVal };
      }
    }
  }
  return sheet;
}

function scoreHeaderRow(row, tokens) {
  let score = 0;
  for (const v of (row || [])) {
    if (v == null) continue;
    const s = String(v).toLowerCase().trim();
    if (!s) continue;
    if (tokens.some(t => s === t || s.includes(t))) score++;
  }
  return score;
}

// Detecta la fila de encabezado escaneando desde `desde`. Cada hoja se alinea
// sola aunque tenga filas de título por encima.
export function detectHeaderRow(matrix, desde = 0, maxScan = 15, tokens = DEFAULT_HEADER_TOKENS) {
  let bestIdx = desde, bestScore = -1;
  const end = Math.min(matrix.length, desde + maxScan);
  for (let i = desde; i < end; i++) {
    const score = scoreHeaderRow(matrix[i], tokens);
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestScore >= 2 ? bestIdx : desde;
}

// Devuelve, por hoja, { name, headers, samples, headerIdx } detectando el encabezado.
export function parseWorkbook(wb, skip = 0, tokens = DEFAULT_HEADER_TOKENS) {
  return wb.SheetNames.map(name => {
    expandMergedCells(wb.Sheets[name]);
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true });
    const headerIdx = detectHeaderRow(raw, skip, 15, tokens);
    const headerRow = raw[headerIdx] || [];
    const headers = headerRow.map(v => (v == null ? '' : String(v).trim()));
    const dataRows = raw.slice(headerIdx + 1, headerIdx + 4);
    const samples = headers.map((_, ci) => dataRows.map(r => r[ci] ?? null));
    return { name, headers, samples, headerIdx };
  }).filter(s => s.headers.some(h => h.length > 0));
}

export function isNumericCol(samples) {
  const vals = samples.filter(v => v !== null && v !== undefined && v !== '');
  if (vals.length === 0) return false;
  return vals.some(v => typeof v === 'number' || !isNaN(parseFloat(String(v).replace(',', '.'))));
}

export function fmtSample(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (v instanceof Date) return v.toLocaleDateString('es-AR');
  if (typeof v === 'number') return v.toLocaleString('es-AR');
  return String(v).substring(0, 20);
}
