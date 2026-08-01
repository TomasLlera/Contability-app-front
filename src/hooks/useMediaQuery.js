import { useCallback, useSyncExternalStore } from 'react';

// Breakpoints de la app (ver MOBILE.md). Son los mismos de Tailwind v4 para que
// la lógica de JS y las clases `sm:`/`md:` no se puedan desfasar.
export const BP = { sm: 640, md: 768, lg: 1024 };

/**
 * Suscripción a una media query.
 *
 * `useSyncExternalStore` en vez de useState+useEffect: matchMedia es una fuente
 * externa, y así el primer render ya lee el valor real en vez de pintar el
 * layout de desktop y corregirlo en el efecto.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback((onChange) => {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

// <640px — layout mobile: tablas como cards, modales full-screen, acciones en menú ⋮.
export const useIsMobile = () => useMediaQuery(`(max-width: ${BP.sm - 1}px)`);

// <768px — shell mobile: sidebar en drawer + bottom navigation.
export const useIsMobileShell = () => useMediaQuery(`(max-width: ${BP.md - 1}px)`);

// Dispositivo sin hover real. Distinto de "pantalla chica": una tablet grande
// también es touch y tampoco puede alcanzar acciones escondidas tras :hover.
export const useIsTouch = () => useMediaQuery('(hover: none)');

const subscribeViewport = (onChange) => {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  vv.addEventListener('resize', onChange);
  return () => vv.removeEventListener('resize', onChange);
};

/**
 * Alto del viewport *visible*, en px. Distinto de `100vh`/`100dvh`: cuando se
 * abre el teclado virtual, `visualViewport` encoge y `vh` no. Es lo que permite
 * que un modal full-screen no quede tapado por el teclado.
 *
 * Devuelve null si el navegador no expone la API, para que el consumidor caiga
 * a su valor CSS por defecto.
 */
export function useViewportHeight() {
  return useSyncExternalStore(
    subscribeViewport,
    () => window.visualViewport?.height ?? null,
    () => null
  );
}
