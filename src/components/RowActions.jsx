import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import ActionSheet from './ActionSheet';
import { useIsMobile } from '../hooks/useMediaQuery';

/**
 * Acciones de una fila / card.
 *
 * Desktop: los íconos en línea, igual que antes (la vista de escritorio no cambia).
 * Mobile:  un solo botón ⋮ de 44×44 que abre una hoja con las acciones etiquetadas.
 *
 * Motivo: en mobile no entran 3-4 íconos de 44px sin comerse el ancho del
 * concepto, y a 22px se falla el tap — encima sobre acciones destructivas.
 *
 * acciones: [{ key, label, icon, onClick, tone?, hint?, disabled?, iconDesktop?, className? }]
 *   icon        — el que va en la hoja mobile (tamaño uniforme, con etiqueta al lado)
 *   iconDesktop — opcional, para conservar el ícono compuesto que ya tenía la fila
 *                 en escritorio (p. ej. % + chevron del acordeón de descuento)
 */
export default function RowActions({ acciones = [], title, className = '', iconGap = 'gap-3' }) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const visibles = acciones.filter(Boolean);

  if (visibles.length === 0) return null;

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          aria-label="Acciones"
          aria-haspopup="menu"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className={`shrink-0 w-11 h-11 -mr-1.5 flex items-center justify-center rounded-full
                      text-slate-400 active:bg-slate-100 dark:active:bg-slate-700/60 transition-colors ${className}`}
        >
          <MoreVertical size={18} />
        </button>
        {open && (
          <ActionSheet
            title={title}
            acciones={visibles}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className={`flex items-center ${iconGap} ${className}`}>
      {visibles.map(a => (
        <button
          key={a.key}
          type="button"
          title={a.label}
          aria-label={a.label}
          disabled={a.disabled}
          onClick={(e) => { e.stopPropagation(); a.onClick?.(); }}
          className={a.className || 'p-1.5 rounded-lg text-slate-400 hover:text-blue-500 transition-colors shrink-0 disabled:opacity-40'}
        >
          {a.iconDesktop || a.icon}
        </button>
      ))}
    </div>
  );
}
