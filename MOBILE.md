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
| `640–1023px` | **tablet** | `sm:` / `md:` | Vuelven las tablas simples y las grillas de 2 columnas. **El shell sigue siendo mobile** (drawer + bottom nav) |
| `≥ 1024px` | **desktop** | `lg:` | Shell desktop: sidebar fijo, sin bottom nav. Tabla del detalle de subrubro |
| `≥ 1280px` | **desktop ancho** | `xl:` | Caja del Día en dos columnas (lista + cierre del día fijo) · KPIs de subrubro en 4 columnas |

Tres umbrales importan de verdad:

- **`sm` (640px) — layout.** Debajo de esto una tabla no entra: se renderiza como
  cards. Es el corte que usan `useIsMobile()` y las clases `sm:hidden` / `hidden sm:block`.
- **`lg` (1024px) — shell.** Debajo de esto el sidebar es un drawer y aparece la
  bottom navigation (`useIsMobileShell()`). Antes el corte era `md` (768px): con el
  sidebar fijo de 256px, una tablet vertical se quedaba con ~470px útiles y el
  detalle de subrubro mostraba 3 de 11 columnas. También cubre el celular en horizontal.
- **Touch (`pointer: coarse` / `hover: none`) — independiente del ancho.** Una
  tablet también es touch: `RowActions` usa el menú ⋮ (`useIsTouch()`), y los
  controles chicos crecen con la variante `pointer-coarse:` (`pointer-coarse:min-h-11`).

## Reglas

### Scroll y shell
- El shell mide `h-dvh` y **el que scrollea es `<main>`**, no el `document`. Por eso
  el header queda fijo sin `sticky`. Un elemento `sticky` dentro de una vista usa
  `top-0` (el tope de `<main>`), no un offset por el header.
- `App` vuelve `<main>` arriba al cambiar de sección.

### Áreas táctiles
- **Mínimo 44×44px** en todo lo interactivo. Usá la clase `.tap` (definida en
  `index.css`) para llegar a 44px sin agrandar el ícono: expande el área con un
  pseudo-elemento, sin afectar el layout.
- **Mínimo 8px de separación** entre botones adyacentes (dos `.tap` a 2px se pisan
  y el de la derecha le gana el toque al de la izquierda).
- En touch, `index.css` lleva **todos los inputs y selects a 16px y 44px de alto**
  (menos de 16px hace que iOS Safari haga zoom al enfocar). No hace falta repetirlo
  en cada componente; con mouse conservan su tamaño compacto.
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
| Detalle de Subrubro | **Cards hasta `lg`** | Idem, y las columnas crecen con los campos del rubro. La tabla (desde `lg`) junta *Doc.* con el estado y el *método* con el pago, y deja fecha y acciones fijas a los costados |
| Venta Sistema / Tarjetas | **Cards** | Idem |
| Auditoría | **Cards** | Idem |
| Stock, Usuarios | Tabla/lista con **`RowActions`** | Pocas columnas; las acciones van al menú ⋮ en mobile/touch |
| **Diferencia mensual IVA** | **Cards** expandibles (`MesCard`) | 8 columnas: en 375px entraban 3, y *Ventas* y *Diferencia* —los dos datos que se vienen a buscar— quedaban detrás del scroll horizontal. La card los pone arriba y guarda el desglose en un acordeón. La tabla sigue viva en `sm:` para comparar meses entre sí |

Toda tabla que quede como tabla va envuelta en `<TableScroll>`, que agrega el
degradé en el borde y el aviso de "deslizá" solo cuando hay overflow real. Si la
tabla se reemplaza por cards debajo de un corte, el `<TableScroll>` va adentro de un
`hidden sm:block` (o `hidden lg:block`): así el aviso no se calcula sobre un nodo oculto.
`<TableScroll hint={null}>` sirve también para tiras de tabs que scrollean.

**Una card de registro:** fila 1 concepto + monto (derecha, `tabular-nums`,
`whitespace-nowrap`, nunca truncado); fila 2 fecha + tipo; fila 3 estado con
ícono y texto (el color es refuerzo, no la única señal). Acciones en `RowActions`.

### Filtros
- Una fila de chips no entra en mobile: seis chips con contador se van a tres
  líneas, más de un tercio de la pantalla. Debajo de `sm` se colapsan en **un
  disparador de una línea** con badge de cuántos hay activos, y la lista completa
  se abre en `<FiltroSheet>` (multi-selección: tocar una opción no cierra la hoja).
- Los chips se conservan en `sm:` — ahí sí se leen de un vistazo.

### Modales y confirmaciones
- Usá `<Modal>`: `<640px` full-screen entrando desde abajo; el alto sale de
  `visualViewport`, así el teclado encoge el modal en vez de tapar el input.
- Los botones de acción van en la prop `footer` de `<Modal>`, que los fija al
  pie. Nunca al final del contenido scrolleable. Si el form está en el cuerpo,
  el botón submit del footer usa `form="id-del-form"`.
- `<Modal>`, `<DialogShell>`, `<ConfirmModal>` y las hojas manejan el foco
  (`useDialogFocus`): enfocan al abrir, atrapan Tab y lo devuelven al cerrar.
  `<DialogShell>` es solo para los paneles viejos hechos a mano; lo nuevo, `<Modal>`.
- **Confirmaciones: `await confirmar({...})`** (`utils/confirmar.js`), nunca
  `window.confirm`. El mensaje dice **qué** se afecta (concepto, monto, fecha) y
  `detail` las consecuencias. Para lo irreversible y masivo (vaciar un subrubro,
  restaurar backup) `requireText: 'BORRAR'` pide escribir la palabra.
- Toda acción destructiva o que registra plata en bloque pide confirmación
  (eliminar, revertir un pago confirmado, confirmar varios pagos, cambiar un rol).

### Formularios
- Inputs a ancho completo y apilados en mobile (`grid-cols-1 sm:grid-cols-2`).
- **El monto va primero** después del tipo/proveedor, con label visible. Lo
  opcional (percepciones, campos extra) va en un acordeón "Más datos".
- Cada input con `<label htmlFor>` (usá `useId()`); el placeholder no es un label.
- Validación visible: el botón Guardar no se deshabilita por datos faltantes. Al
  enviar se marca el campo (`aria-invalid` + mensaje con `aria-describedby`) y se
  lleva el foco al primero con error.
- Montos: `inputMode="decimal"` (teclado numérico con separador decimal).
- Fechas: `type="date"` nativo. No usar date pickers custom.
- Controles segmentados: un solo estilo (fondo `slate-100`, seleccionado blanco
  con sombra). Nada de azul en uno, naranja en otro y verde en un tercero.

### Formatos
- Montos: `fmtMoneda` (`utils/formato.js`) → `$ 1.234.567,89`. En gráficos,
  `{ decimales: 0 }` o `fmtMonedaCompacta` (`$ 6,17 M`) con el valor completo en `title`.
- Porcentajes: `fmtPct` → `+3,1 %` (coma decimal; nunca `toFixed`).
- Fechas: `fmtFecha` → `30/09/2026`, `fmtFechaCorta` → `30/09` (`utils/fecha.js`).
  Nunca mostrar el ISO `2026-09-30`.

### Tipografía
- **14px (`text-sm`) mínimo para contenido.** `text-xs` (12px) para labels
  secundarios y badges. **No usar `text-[9px]`/`[10px]`/`[11px]`.**
- Los **montos nunca bajan de `text-sm`** ni se truncan con `truncate`: si no
  entran, se cambia la grilla (menos columnas) o se usa el formato compacto.

### Color
- Estados con tokens semánticos (`index.css`): verde = pagado/confirmado, rojo =
  vencido/negativo, ámbar = por vencer/sin método. Los tipos de comprobante
  (Factura, Remito) van en neutro.
- Sobre fondo claro, verde/ámbar/naranja en `-700` (el `-600` no llega a 4,5:1);
  texto secundario en `slate-500`, no `slate-400`. Toda clase de color de texto
  lleva su variante `dark:`.

### Espaciado
- El padding del contenedor baja en mobile: `px-3 sm:px-6`, `p-4 sm:p-6`.
- Evitar scroll anidado: si un bloque ya tiene `max-h-*` con scroll propio,
  quitarlo en mobile (`max-h-none sm:max-h-64`) y dejar que scrollee la página.

### Bottom navigation
- `<main>` lleva `.pb-bottomnav` (`index.css`): reserva el alto de la barra
  (`--bottomnav-h`) + 1rem de aire + `env(safe-area-inset-bottom)`.
- Cualquier elemento `fixed` cerca del pie (FABs, "volver arriba", panel de
  selección) usa `.bottom-above-nav`, que se apoya en la misma variable. Nada de
  offsets escritos a mano.
- Los toasts van arriba (`top-center`) en el shell mobile: abajo tapaban la barra.
