# Changelog — Kontia frontend

## 1.1.0 — 2026-09-30

Versión que sale de la auditoría del 29/09/2026. Requiere el backend 1.1.0.

### Caja del Día
- No se puede confirmar un pago mirando un día futuro (aviso y botón
  deshabilitado); en un día pasado se pide confirmar la fecha.
- **Próximos vencimientos:** botón arriba de los totales que abre una ventana
  con lo que vence en los próximos días, agrupado por fecha y con filtro
  Todos / Efectivo / Transferencia. Lo confirmado ahí queda registrado hoy.
- **Pago parcial** y **Editar boleta** (importe, percepción IVA e IIBB) desde
  cada pendiente vinculado a una factura.
- En el formulario de edición el monto de un ítem vinculado queda bloqueado,
  con la indicación de qué usar.
- Las flechas del teclado solo cambian de día con el foco en la barra de fecha;
  editar un ítem conserva su fecha.
- Íconos de acción más grandes (confirmar 18 px, el resto 20 px).
- Carga en una sola request y sin auto-sync en cada vuelta de foco.

### Configuración
- Auditoría → pestaña **Inconsistencias**, con acceso al historial de cada caso.
- Cambiar la propia contraseña vuelve al login con aviso.

### General
- "Hoy" en hora argentina en toda la app (antes, después de las 21 era el día
  siguiente).
- Se quita código muerto (componentes, assets y funciones sin uso) y un pedido
  de vencimientos cada 5 minutos que no se mostraba.
- `npm run lint` sin errores.

## 0.0.0

Versión anterior a la auditoría (sin numerar).
