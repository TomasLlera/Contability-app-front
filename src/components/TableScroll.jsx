import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronsRight } from 'lucide-react';

/**
 * Envoltorio para las tablas que se quedan como tabla en mobile (ver MOBILE.md).
 *
 * Aporta lo que al scroll horizontal a secas le falta: avisar que hay más
 * contenido. Muestra un degradé en el borde que todavía tiene contenido oculto
 * y, en mobile, un aviso que se va solo cuando el usuario ya scrolleó.
 *
 * Los indicadores se calculan del ancho real, así que no aparecen si la tabla
 * entra completa.
 */
export default function TableScroll({ children, className = '', hint = 'Deslizá para ver el resto de las columnas' }) {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const [tocada, setTocada] = useState(false);

  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // 2px de tolerancia: el redondeo subpíxel deja restos de 0.5px que si no
    // dejarían el degradé prendido para siempre en una tabla que ya entra.
    setEdges({ left: el.scrollLeft > 2, right: max > 2 && el.scrollLeft < max - 2 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => { el.removeEventListener('scroll', medir); ro.disconnect(); };
  }, [medir]);

  const hayScroll = edges.left || edges.right;

  return (
    <div className={`relative ${className}`}>
      {hint && hayScroll && !tocada && (
        <p className="sm:hidden flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mb-1.5">
          <ChevronsRight size={12} className="shrink-0 animate-pulse" /> {hint}
        </p>
      )}

      <div className="relative">
        <div
          ref={ref}
          onScroll={() => !tocada && setTocada(true)}
          className="overflow-x-auto overscroll-x-contain"
        >
          {children}
        </div>

        {/* Degradés de borde: pointer-events-none para no robarle el tap a la tabla. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 w-6 transition-opacity duration-200
                      bg-linear-to-r from-slate-900/10 to-transparent dark:from-black/40
                      ${edges.left ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 right-0 w-6 transition-opacity duration-200
                      bg-linear-to-l from-slate-900/10 to-transparent dark:from-black/40
                      ${edges.right ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
    </div>
  );
}
