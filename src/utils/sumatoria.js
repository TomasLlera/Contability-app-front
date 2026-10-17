// Utilidades de los subrubros de tipo Sumatoria.

// Paleta para los conceptos. El color se usa solo como punto en el badge: el texto
// queda en neutro para que se lea igual en tema claro y oscuro.
export const COLORES_CONCEPTO = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2', '#64748b'];

export const ORIGENES = [
  { key: 'todos', label: 'Todos' },
  { key: 'caja', label: 'Desde caja' },
  { key: 'subrubro', label: 'Solo subrubro' },
];

export const METODO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia' };

// 'YYYY-MM' ± n meses.
export const sumarMeses = (mes, n) => {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

// Filtros de la API a partir del período elegido en pantalla.
//   periodo: { modo: 'mes' | 'rango' | 'todo', mes, desde, hasta }
export const paramsPeriodo = (periodo) => {
  if (periodo.modo === 'mes') return { mes: periodo.mes };
  if (periodo.modo === 'rango') return { desde: periodo.desde || undefined, hasta: periodo.hasta || undefined };
  return {};
};
