/**
 * Estado de carga con la forma de la pantalla (usa `.skeleton`, index.css).
 * Reemplaza los "Cargando..." sueltos: la pantalla no salta al llegar los datos
 * y se entiende que algo está en camino.
 *
 * variante: 'vista'  — tarjetas de resumen + filas (Subrubro, IVA, Registro, Stock)
 *           'lista'  — solo filas (secciones de Configuración)
 */
export default function Skeleton({ variante = 'vista', filas = 5 }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      {variante === 'vista' && (
        <>
          <div className="skeleton h-7 w-56" />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-20" />)}
          </div>
        </>
      )}
      {Array.from({ length: filas }, (_, i) => <div key={i} className="skeleton h-14" />)}
    </div>
  );
}
