import { useState, useEffect } from 'react';
import { movimientosApi } from '../api';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

function diasInfo(dias) {
  if (dias < 0) return { label: `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`, cls: 'bg-red-500', textCls: 'text-red-700 bg-red-50 border-red-200' };
  if (dias === 0) return { label: 'Vence hoy', cls: 'bg-red-500', textCls: 'text-red-700 bg-red-50 border-red-200' };
  if (dias <= 7) return { label: `Vence en ${dias} día${dias !== 1 ? 's' : ''}`, cls: 'bg-amber-400', textCls: 'text-amber-700 bg-amber-50 border-amber-200' };
  return { label: `Vence en ${dias} días`, cls: 'bg-blue-400', textCls: 'text-blue-700 bg-blue-50 border-blue-200' };
}

export default function VencimientosPanel({ onNavigate, items: itemsProp }) {
  const [fetched, setFetched] = useState(null);

  useEffect(() => {
    if (itemsProp !== undefined) return;
    movimientosApi.getVencimientos(30).then(setFetched);
  }, []);

  const items = itemsProp !== undefined ? itemsProp : (fetched ?? []);
  const loading = itemsProp === undefined && fetched === null;

  if (loading) return null;
  if (items.length === 0) return null;

  const vencidas = items.filter(i => i.dias_restantes < 0);
  const hoy = items.filter(i => i.dias_restantes === 0);
  const proximas = items.filter(i => i.dias_restantes > 0);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⚠️</span>
        <h2 className="text-base font-semibold text-slate-700">Vencimientos próximos</h2>
        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
          {items.length} factura{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {[...vencidas, ...hoy, ...proximas].map(item => {
          const info = diasInfo(item.dias_restantes);
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-xl border ${info.textCls} cursor-pointer hover:opacity-80 transition-opacity`}
              onClick={() => onNavigate && onNavigate(item.rubro, item.subrubro)}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${info.cls}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{item.subrubro?.nombre}</span>
                  <span className="text-xs opacity-60">{item.rubro?.nombre}</span>
                  {item.campos_extra?.nro_factura && (
                    <span className="font-mono text-xs bg-white/60 px-1.5 py-0.5 rounded border border-current/20">
                      {item.campos_extra.nro_factura}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs opacity-75">{info.label}</span>
                  {item.campos_extra?.descripcion && <span className="text-xs opacity-60">· {item.campos_extra.descripcion}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm">{fmt(item.monto)}</p>
                <p className="text-xs opacity-60">{item.fecha_vencimiento}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
