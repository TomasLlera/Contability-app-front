import { useState, useEffect } from 'react';
import { movimientosApi } from '../api';
import { Folder, Users, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import VencimientosPanel from './VencimientosPanel';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);

const RUBRO_ICONS = ['📁', '👥', '🏭', '🏪', '🚚', '💼', '🏗️', '📦'];

function getRubroIcon(rubro) {
  if (rubro.icon) return rubro.icon;
  const n = rubro.nombre.toLowerCase();
  if (n.includes('emple') || n.includes('person') || n.includes('staff')) return '👥';
  if (n.includes('provee') || n.includes('vendor')) return '🚚';
  if (n.includes('client') || n.includes('venta')) return '🏪';
  if (n.includes('empresa') || n.includes('socio')) return '🏭';
  if (n.includes('gasto') || n.includes('servicio')) return '💼';
  return RUBRO_ICONS[rubro.nombre.charCodeAt(0) % RUBRO_ICONS.length];
}

function StatCard({ label, value, sub, iconBg, iconText, icon }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center ${iconText} mb-4`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm font-semibold text-slate-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1 truncate">{sub}</p>}
    </div>
  );
}

export default function Dashboard({ locales = [], rubros, rubroStats, onNavigate, onSelectRubro }) {
  const [vencimientos, setVencimientos] = useState([]);
  const [loadingVenc, setLoadingVenc] = useState(true);

  useEffect(() => {
    movimientosApi.getVencimientos(30).then(data => {
      setVencimientos(data);
      setLoadingVenc(false);
    });
  }, []);

  const totalSubrubros = Object.values(rubroStats).reduce((a, b) => a + b, 0);
  const totalRubros = rubros.length;
  const vencidos = vencimientos.filter(v => v.dias_restantes <= 0);
  const proximos7d = vencimientos.filter(v => v.dias_restantes > 0 && v.dias_restantes <= 7);
  const montoVencido = vencidos.reduce((s, v) => s + v.monto, 0);
  const montoProximo7 = proximos7d.reduce((s, v) => s + v.monto, 0);
  const maxSubs = Math.max(...Object.values(rubroStats), 1);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Locales"
          value={locales.length}
          sub={`${totalRubros} rubro${totalRubros !== 1 ? 's' : ''} en total`}
          iconBg="bg-blue-50"
          iconText="text-blue-500"
          icon={<Folder size={20} />}
        />
        <StatCard
          label="Subrubros"
          value={totalSubrubros}
          sub={totalRubros > 0 ? `${(totalSubrubros / totalRubros).toFixed(1)} prom. por rubro` : '—'}
          iconBg="bg-violet-50"
          iconText="text-violet-500"
          icon={<Users size={20} />}
        />
        <StatCard
          label="Vencen en 7 días"
          value={proximos7d.length}
          sub={proximos7d.length > 0 ? fmt(montoProximo7) : 'Sin urgencias'}
          iconBg="bg-amber-50"
          iconText="text-amber-500"
          icon={<Clock size={20} />}
        />
        <StatCard
          label={vencidos.length > 0 ? 'Facturas vencidas' : 'Sin vencidas'}
          value={vencidos.length}
          sub={vencidos.length > 0 ? fmt(montoVencido) + ' pendiente' : 'Todo al día ✓'}
          iconBg={vencidos.length > 0 ? 'bg-red-50' : 'bg-green-50'}
          iconText={vencidos.length > 0 ? 'text-red-500' : 'text-green-500'}
          icon={vencidos.length > 0 ? <AlertCircle size={20} /> : <TrendingUp size={20} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-5">Subrubros por rubro</h3>
          {rubros.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
              Sin rubros todavía
            </div>
          ) : (
            <div className="space-y-4">
              {rubros.map(r => {
                const count = rubroStats[r.id] ?? 0;
                const pct = (count / maxSubs) * 100;
                return (
                  <button
                    key={r.id}
                    onClick={() => onSelectRubro(r)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">{getRubroIcon(r)}</span>
                        <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600 transition-colors truncate">
                          {r.nombre}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 ml-2 shrink-0">{count}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-blue-500 to-indigo-400"
                        style={{ width: `${count > 0 ? Math.max(pct, 5) : 0}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Vencimientos panel */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5">
          {loadingVenc ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Cargando...</div>
          ) : vencimientos.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
              <TrendingUp size={36} className="text-green-400" />
              <p className="text-sm">Sin vencimientos en los próximos 30 días</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-80">
              <VencimientosPanel items={vencimientos} onNavigate={onNavigate} />
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {rubros.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <p className="text-5xl mb-4">📂</p>
          <p className="font-semibold text-slate-600">No hay rubros todavía</p>
          <p className="text-sm text-slate-400 mt-1">Creá tu primer rubro desde el menú lateral para empezar</p>
        </div>
      )}
    </div>
  );
}
