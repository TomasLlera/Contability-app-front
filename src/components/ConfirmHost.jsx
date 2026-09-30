import { useEffect, useState } from 'react';
import ConfirmModal from './ConfirmModal';
import { suscribirConfirm } from '../utils/confirmar';

/**
 * Punto de montaje único de `confirmar()` (utils/confirmar.js). Se monta una sola
 * vez en App y muestra la confirmación que haya pedido cualquier pantalla.
 */
export default function ConfirmHost() {
  const [pedido, setPedido] = useState(null);

  useEffect(() => suscribirConfirm(setPedido), []);

  if (!pedido) return null;
  const { opciones, resolver } = pedido;
  const cerrar = (valor) => { setPedido(null); resolver(valor); };

  return (
    <ConfirmModal
      {...opciones}
      onConfirm={() => cerrar(true)}
      onCancel={() => cerrar(false)}
    />
  );
}
