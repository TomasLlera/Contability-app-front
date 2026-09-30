// Reemplazo de `window.confirm` con el diálogo de la app. Devuelve una promesa
// que resuelve true/false, así el código que usaba el confirm nativo queda igual
// de lineal:
//
//   if (!(await confirmar({ message: '¿Borrar…?', confirmLabel: 'Borrar' }))) return;
//
// El confirm nativo no respeta el tema oscuro, no se puede estilizar como
// acción peligrosa y en mobile muestra la URL del sitio como título.
// Lo renderiza <ConfirmHost> (montado una vez en App).

let oyente = null;

export function suscribirConfirm(fn) {
  oyente = fn;
  return () => { if (oyente === fn) oyente = null; };
}

export function confirmar(opciones) {
  const o = typeof opciones === 'string' ? { message: opciones } : opciones;
  return new Promise((resolver) => {
    if (!oyente) { resolver(window.confirm(typeof o.message === 'string' ? o.message : '¿Confirmar?')); return; }
    oyente({ opciones: o, resolver });
  });
}
