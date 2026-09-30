import { useEffect, useRef } from 'react';
import useDialogFocus from '../hooks/useDialogFocus';

/**
 * Overlay para los diálogos que arman su propio panel (exportar, importar,
 * detalle de auditoría…). Aporta lo que les faltaba respecto de <Modal>:
 * role="dialog", cierre con Escape, bloqueo del scroll de fondo, foco atrapado
 * y devuelto al cerrar, y scroll propio si el panel no entra en pantalla (en un
 * celular chico el botón de acción quedaba fuera de alcance).
 *
 * Para diálogos nuevos preferí <Modal>, que además resuelve el full-screen en
 * mobile y los botones fijos al pie.
 */
export default function DialogShell({ onClose, label, children, closeOnBackdrop = true }) {
  const ref = useRef(null);
  useDialogFocus(ref);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={closeOnBackdrop ? onClose : undefined}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain
                 bg-slate-950/60 backdrop-blur-sm animate-fade-in
                 [&>*]:max-h-full [&>*]:overflow-y-auto [&>*]:animate-modal-in"
    >
      {children}
    </div>
  );
}
