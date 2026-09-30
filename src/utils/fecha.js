// Fechas de negocio en la zona horaria de Argentina.
//
// `new Date().toISOString()` es UTC: entre las 21:00 y la medianoche de Argentina
// devuelve el día siguiente. Todas las fechas de la app son strings 'YYYY-MM-DD'
// sin hora, así que "hoy" se resuelve explícito en la zona del negocio y la
// aritmética de días se hace en UTC puro (no hay cambio de horario que corregir).
// Es el espejo de backend/utils/tz.js.
const TZ = 'America/Argentina/Buenos_Aires';

const fmtDia = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

// 'YYYY-MM-DD' del día en curso en Argentina.
export const hoyAR = (d = new Date()) => fmtDia.format(d);

// 'YYYY-MM' del mes en curso en Argentina.
export const mesAR = (d = new Date()) => hoyAR(d).slice(0, 7);

// Suma (o resta) días a una fecha 'YYYY-MM-DD'.
export const sumarDias = (fecha, n) => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// ── Presentación ────────────────────────────────────────────────────────────
// Formato argentino en toda la app. Antes convivían '2026-09-01', '23 May',
// '30/09' y 'Mié, 30 sept' según la pantalla. Todas reciben 'YYYY-MM-DD' (o un
// ISO con hora, del que se toma la fecha) y devuelven '' si no hay fecha.
const partes = (f) => {
  if (!f) return null;
  const [y, m, d] = String(f).slice(0, 10).split('-');
  return y && m && d ? { y, m, d } : null;
};

// '30/09/2026'
export const fmtFecha = (f) => {
  const p = partes(f);
  return p ? `${p.d}/${p.m}/${p.y}` : '';
};

// '30/09' si es del año en curso, '30/09/25' si no.
export const fmtFechaCorta = (f) => {
  const p = partes(f);
  if (!p) return '';
  return p.y === hoyAR().slice(0, 4) ? `${p.d}/${p.m}` : `${p.d}/${p.m}/${p.y.slice(2)}`;
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// 'Septiembre 2026' a partir de 'YYYY-MM' o 'YYYY-MM-DD'.
export const fmtMesAnio = (f) => {
  if (!f) return '';
  const [y, m] = String(f).split('-');
  const nombre = MESES[Number(m) - 1] || '';
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${y}`;
};
