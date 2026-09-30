// Formatos numéricos de la app, en un solo lugar. Antes había 14 copias locales
// de `fmt` con opciones distintas (con y sin centavos) y los porcentajes salían
// de `toFixed`, con punto decimal: "+3.1%" al lado de "$ 1.523.450,75".

const moneda2 = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneda0 = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const numero2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numero = new Intl.NumberFormat('es-AR');
const pct1 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// '$ 1.234.567,89'. `{ decimales: 0 }` para vistas de lectura rápida (gráficas).
export const fmtMoneda = (n, { decimales = 2 } = {}) =>
  (decimales === 0 ? moneda0 : moneda2).format(Number(n) || 0);

// '$ 6,17 M' / '$ 850 mil' — para ejes y espacios donde el valor completo no
// entra. Siempre acompañarlo del valor completo en `title`.
export const fmtMonedaCompacta = (n) => {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  const signo = v < 0 ? '−' : '';
  if (abs >= 1e9) return `${signo}$ ${numero2.format(abs / 1e9).replace(/,00$/, '')} mil M`;
  if (abs >= 1e6) return `${signo}$ ${numero2.format(abs / 1e6).replace(/,00$/, '')} M`;
  if (abs >= 1e3) return `${signo}$ ${numero.format(Math.round(abs / 1e3))} mil`;
  return `${signo}$ ${numero.format(Math.round(abs))}`;
};

// '1.234,50' (sin símbolo).
export const fmtNum2 = (n) => numero2.format(Number(n) || 0);

// '1.234' (entero, sin decimales forzados).
export const fmtNum = (n) => numero.format(Number(n) || 0);

// '+3,1 %' / '−24,2 %'. `signo: false` para el valor absoluto.
export const fmtPct = (n, { signo = true } = {}) => {
  const v = Number(n) || 0;
  const s = signo ? (v > 0 ? '+' : v < 0 ? '−' : '') : '';
  return `${s}${pct1.format(Math.abs(v))} %`;
};
