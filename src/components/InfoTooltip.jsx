import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Ícono de ayuda (ⓘ) reutilizable. Reemplaza los textos de ayuda largos y
 * visibles: el usuario ve solo un iconito y despliega la explicación al pasar
 * el mouse o clickear. Cierra al hacer click afuera.
 *
 * Uso:  Título <InfoTooltip text="Explicación de la sección…" />
 *
 * Props:
 *   text  — contenido de la ayuda (string o JSX)
 *   side  — 'top' (por defecto) o 'bottom'. Si no se pasa, se elige solo según
 *           el espacio disponible arriba del icono.
 *   size  — tamaño del icono en px (default 13)
 *   width — ancho del popover (clase tailwind, default 'w-56')
 */
export default function InfoTooltip({ text, side, size = 13, width = 'w-56' }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState(side || 'top');
  const ref = useRef(null);

  useEffect(() => {
    if (!show) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show]);

  // Posición inteligente: si el usuario no fija `side`, abrimos hacia abajo
  // cuando no hay lugar arriba (icono cerca del borde superior del viewport).
  const recalcPos = () => {
    if (!side && ref.current) {
      setPos(ref.current.getBoundingClientRect().top < 120 ? 'bottom' : 'top');
    }
  };
  const toggle = () => { recalcPos(); setShow(v => !v); };
  const open = () => { recalcPos(); setShow(true); };

  const esTop = pos === 'top';

  return (
    <div
      ref={ref}
      className="relative inline-flex shrink-0 align-middle"
      onMouseEnter={open}
      onMouseLeave={() => setShow(false)}
    >
      <button
        type="button"
        aria-label="Ayuda"
        onClick={toggle}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      >
        <HelpCircle size={size} />
      </button>
      {show && (
        <div
          role="tooltip"
          className={`absolute left-1/2 -translate-x-1/2 ${width} bg-slate-800 text-white text-xs rounded-lg px-3 py-2.5 z-30 shadow-lg leading-relaxed font-normal normal-case tracking-normal text-left ${esTop ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          {text}
          <div
            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${esTop ? 'top-full border-t-slate-800' : 'bottom-full border-b-slate-800'}`}
          />
        </div>
      )}
    </div>
  );
}
