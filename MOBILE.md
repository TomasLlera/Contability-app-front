# Guía mobile — Kontia / CA-Gestión

Referencia de los breakpoints y las reglas de layout responsive de la app.
Si vas a tocar una vista, leé esto antes.

## Breakpoints

Coinciden con los de Tailwind v4 por defecto. **No definir breakpoints propios**:
si necesitás uno en JS, usá los helpers de `src/hooks/useMediaQuery.js`, que leen
las mismas constantes.

| Rango | Nombre | Prefijo Tailwind | Qué cambia |
|---|---|---|---|
| `< 640px` | **mobile** | (base, sin prefijo) | Tablas → cards · modales full-screen · formularios apilados · acciones en menú ⋮ |
| `640–767px` | **tablet chico** | `sm:` | Vuelven las tablas y las grillas de 2 columnas. El shell sigue siendo mobile |
| `768–1023px` | **tablet** | `md:` | Shell desktop: sidebar fijo, sin bottom nav |
| `≥ 1024px` | **desktop** | `lg:` | Grillas de 2 columnas en Dashboard y Gráficas |

Dos umbrales importan de verdad:

- **`sm` (640px) — layout.** Debajo de esto una tabla no entra: se renderiza como
  cards. Es el corte que usan `useIsMobile()` y las clases `sm:hidden` / `hidden sm:block`.
- **`md` (768px) — shell.** Debajo de esto el sidebar es un drawer y aparece la
  bottom navigation. Es el corte que ya usaba el sidebar; se mantiene para no
  regresionar tablets.

## Reglas

### Áreas táctiles
- **Mínimo 44×44px** en todo lo interactivo. Usá la clase `.tap` (definida en
  `index.css`) para llegar a 44px sin agrandar el ícono: expande el área con un
  pseudo-elemento, sin afectar el layout.
- **Mínimo 8px de separación** entre botones adyacentes.
- Nunca `p-1 -m-1`: el margen negativo anula el padding y deja el hit area del
  tamaño del ícono.

### Hover
- `:hover` **no existe en touch**. Cualquier acción escondida tras `group-hover`
  es inalcanzable en un teléfono.
- Si querés que algo aparezca solo con mouse, envolvelo en la variante `hover`
  (`hover:opacity-0 hover:group-hover:opacity-100`), que se apoya en
  `@media (hover: hover)` — no en `sm:`.
- Los tooltips de datos tienen que abrirse **también** con tap.

### Tablas
Dos estrategias, según qué hace el usuario con la tabla:

| Tabla | Estrategia | Por qué |
|---|---|---|
| IVA Compras / Ventas (comprobantes) | **Cards** | Es una lista de registros; se leen de a uno |
| Detalle de Subrubro | **Cards** | Idem, y las columnas crecen con los campos del rubro |
| Venta Sistema / Tarjetas | **Cards** | Idem |
| Auditoría | **Cards** | Idem |
| **Diferencia mensual IVA** | **Cards** expandibles (`MesCard`) | 8 columnas: en 375px entraban 3, y *Ventas* y *Diferencia* —los dos datos que se vienen a buscar— quedaban detrás del scroll horizontal. La card los pone arriba y guarda el desglose en un acordeón. La tabla sigue viva en `sm:` para comparar meses entre sí |

Toda tabla que quede como tabla va envuelta en `<TableScroll>`, que agrega el
degradé en el borde y el aviso de "deslizá" solo cuando hay overflow real. Si la
tabla se reemplaza por cards debajo de `sm`, el `<TableScroll>` va adentro de un
`hidden sm:block`: así el aviso de "deslizá" no se calcula sobre un nodo oculto.

### Filtros
- Una fila de chips no entra en mobile: seis chips con contador se van a tres
  líneas, más de un tercio de la pantalla. Debajo de `sm` se colapsan en **un
  disparador de una línea** con badge de cuántos hay activos, y la lista completa
  se abre en `<FiltroSheet>` (multi-selección: tocar una opción no cierra la hoja).
- Los chips se conservan en `sm:` — ahí sí se leen de un vistazo.

### Modales
- `<640px`: full-screen, entran deslizando desde abajo.
- El alto se toma de `visualViewport`, no de `vh`: así el teclado virtual
  encoge el modal en vez de tapar el input enfocado.
- Los botones de acción van en la prop `footer` de `<Modal>`, que los fija al
  pie. Nunca al final del contenido scrolleable.

### Formularios
- Inputs a ancho completo y apilados en mobile (`grid-cols-1 sm:grid-cols-2`).
- Montos: `inputMode="decimal"` (teclado numérico con separador decimal).
- Fechas: `type="date"` nativo. No usar date pickers custom.

### Tipografía
- **14px (`text-sm`) mínimo para contenido.** `text-xs` (12px) solo para labels
  secundarios y badges.
- Los **montos nunca bajan de `text-sm`**. Son el dato que se lee de reojo.
- `text-[10px]` / `text-[11px]` solo para badges de estado, nunca para datos.

### Espaciado
- El padding del contenedor baja en mobile: `px-3 sm:px-6`, `p-4 sm:p-6`.
- Evitar scroll anidado: si un bloque ya tiene `max-h-*` con scroll propio,
  quitarlo en mobile (`max-h-none sm:max-h-64`) y dejar que scrollee la página.

### Bottom navigation
- El contenedor scrolleable lleva `.pb-bottomnav` (`index.css`): reserva el alto
  de la barra (3.5rem) + 1rem de aire + `env(safe-area-inset-bottom)`. Sin el
  1rem el último ítem queda pegado al borde y se lee como cortado.
- Cualquier elemento `fixed` cerca del pie (FABs, "volver arriba") se levanta con
  `bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6`. En `bottom-6`
  queda debajo de la barra y es intocable.
