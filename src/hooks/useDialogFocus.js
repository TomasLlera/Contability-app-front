import { useEffect } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Manejo de foco de un diálogo modal:
 *  - al abrir enfoca el elemento con `data-autofocus`, si no el primer campo
 *    (un input con `autoFocus` ya enfocado se respeta);
 *  - Tab / Shift+Tab ciclan dentro del diálogo en vez de irse a la página de atrás;
 *  - al cerrar devuelve el foco al elemento que lo abrió.
 * Antes Modal y ConfirmModal no hacían nada de esto: con teclado o lector de
 * pantalla el foco quedaba detrás del overlay.
 */
export default function useDialogFocus(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const previo = document.activeElement;

    if (!el.contains(document.activeElement)) {
      const destino = el.querySelector('[data-autofocus]')
        || el.querySelector('input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])')
        || el.querySelector(FOCUSABLE);
      destino?.focus({ preventScroll: true });
    }

    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const items = [...el.querySelectorAll(FOCUSABLE)].filter(n => n.offsetParent !== null);
      if (items.length === 0) return;
      const primero = items[0];
      const ultimo = items[items.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    };
    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('keydown', onKey);
      if (previo && typeof previo.focus === 'function' && document.contains(previo)) previo.focus({ preventScroll: true });
    };
  }, [ref]);
}
