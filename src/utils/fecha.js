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
