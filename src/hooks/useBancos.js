import { useSyncExternalStore } from 'react';
import { bancosApi } from '../api';

// Bancos de la Caja (multi-banco), compartidos por todas las pantallas que los usan:
// se piden una vez y cualquiera puede pedir una recarga (p. ej. después del ABM).
let estado = { cargado: false, bancos: [] };
const oyentes = new Set();
let enCurso = null;

function emitir(nuevo) {
  estado = nuevo;
  oyentes.forEach(fn => fn());
}

export function recargarBancos() {
  enCurso = bancosApi.getAll()
    .then(bancos => emitir({ cargado: true, bancos }))
    .catch(() => emitir({ ...estado, cargado: true }))
    .finally(() => { enCurso = null; });
  return enCurso;
}

function suscribir(fn) {
  oyentes.add(fn);
  if (!estado.cargado && !enCurso) recargarBancos();
  return () => oyentes.delete(fn);
}

/**
 * { bancos, activos, predeterminado, multi, bancoDe, recargar }
 *   activos — los que se ofrecen para cargas nuevas.
 *   multi   — hay 2 o más bancos activos: recién ahí se muestran selector, badges y
 *             movimientos entre bancos. Con uno solo la Caja se ve como antes.
 *   bancoDe(id) — banco por id (incluidos los desactivados, para el historial).
 */
export default function useBancos() {
  const { bancos, cargado } = useSyncExternalStore(suscribir, () => estado);
  const activos = bancos.filter(b => b.activo);
  const predeterminado = activos.find(b => b.es_predeterminado) || activos[0] || null;
  const porId = new Map(bancos.map(b => [b.id, b]));
  return {
    cargado,
    bancos,
    activos,
    predeterminado,
    multi: activos.length > 1,
    bancoDe: (id) => (id == null ? null : porId.get(Number(id)) || null),
    // Banco a preseleccionar: el por defecto del subrubro si sigue activo, si no el
    // predeterminado general.
    bancoPara: (bancoDefaultId) => (bancoDefaultId != null && porId.get(Number(bancoDefaultId))?.activo
      ? Number(bancoDefaultId)
      : predeterminado?.id ?? null),
    recargar: recargarBancos,
  };
}
