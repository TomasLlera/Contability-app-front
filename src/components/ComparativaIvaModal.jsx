import { useState } from 'react';
import Modal from './Modal';
import ComparativaIvaPanel from './ComparativaIvaPanel';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const labelMes = (mes) => {
  if (!mes) return '';
  const [y, m] = mes.split('-');
  return `${MESES[Number(m) - 1] || m} ${y}`;
};
const shiftMes = (mes, d) => {
  const [y, m] = mes.split('-').map(Number);
  const dt = new Date(y, m - 1 + d, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Cruce del IVA de Tarjetas contra Venta Sistema, en ventana.
 *
 * Se abre desde Registro → Tarjetas, Registro → Venta Sistema e IVA → Ventas: los
 * tres muestran el mismo cruce del mismo mes, leído del mismo endpoint.
 *
 * El mes arranca en el que venía mirando la vista que lo abrió y después se navega
 * acá adentro, sin arrastrar a la vista de atrás a otro mes.
 */
export default function ComparativaIvaModal({ mes: mesInicial, reloadKey = 0, onClose }) {
  const [mes, setMes] = useState(mesInicial);

  return (
    <Modal title="Comparativa IVA — Tarjetas vs Venta Sistema" onClose={onClose} size="3xl">
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-hidden text-xs">
            <button onClick={() => setMes(m => shiftMes(m, -1))} title="Mes anterior"
              className="h-full px-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft size={14} /></button>
            <span className="h-full flex items-center px-3 border-x border-slate-300 dark:border-slate-600 font-medium text-slate-700 dark:text-slate-200">{labelMes(mes)}</span>
            <button onClick={() => setMes(m => shiftMes(m, 1))} title="Mes siguiente"
              className="h-full px-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight size={14} /></button>
          </div>
        </div>

        <ComparativaIvaPanel mes={mes} reloadKey={reloadKey} bare />
      </div>
    </Modal>
  );
}
