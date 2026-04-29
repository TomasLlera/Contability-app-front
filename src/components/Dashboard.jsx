import { useState, useEffect } from 'react';
import { movimientosApi } from '../api';
import { Folder, Users, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import VencimientosPanel from './VencimientosPanel';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);

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

export default function Dashboard({ locales = [], rubros, rubroStats, onNavigate }) {
  const [vencimientos, setVencimientos] = useState([]);
  const [loadingVenc, setLoadingVenc] = useState(true);

  useEffect(() => {
    movimientosApi.getVencimientos(30).then(data => { setVencimientos(data); setLoadingVenc(false); });
  }, []);

  const totalSubrubros = Object.values(rubroStats).reduce((a, b) => a + b, 0);
  const vencidos = vencimientos.filter(v => v.dias_restantes <= 0);
  const proximos7d = vencimientos.filter(v => v.dias_restantes > 0 && v.dias_restantes <= 7);
  const montoVencido = vencidos.reduce((s, v) => s + v.monto, 0);
  const montoProximo7 = proximos7d.reduce((s, v) => s + v.monto, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Locales" value={locales.length}
          sub={`${rubros.length} rubro${rubros.length !== 1 ? 's' : ''} en total`}
          iconBg="bg-blue-50" iconText="text-blue-500" icon={<Folder size={20} />} />
        <StatCard label="Subrubros" value={totalSubrubros}
          sub={rubros.length > 0 ? `${(totalSubrubros / rubros.length).toFixed(1)} prom. por rubro` : '—'}
          iconBg="bg-violet-50" iconText="text-violet-500" icon={<Users size={20} />} />
        <StatCard label="Vencen en 7 días" value={proximos7d.length}
          sub={proximos7d.length > 0 ? fmt(montoProximo7) : 'Sin urgencias'}
          iconBg="bg-amber-50" iconText="text-amber-500" icon={<Clock size={20} />} />
        <StatCard
          label={vencidos.length > 0 ? 'Facturas vencidas' : 'Sin vencidas'}
          value={vencidos.length}
          sub={vencidos.length > 0 ? fmt(montoVencido) + ' pendiente' : 'Todo al día ✓'}
          iconBg={vencidos.length > 0 ? 'bg-red-50' : 'bg-green-50'}
          iconText={vencidos.length > 0 ? 'text-red-500' : 'text-green-500'}
          icon={vencidos.length > 0 ? <AlertCircle size={20} /> : <TrendingUp size={20} />} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Próximos vencimientos</h3>
        {loadingVenc ? (
          <div className="h-32 flex items-center justify-center text-slate-400 text-sm">Cargando...</div>
        ) : vencimientos.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-slate-400 gap-2">
            <TrendingUp size={32} className="text-green-400" />
            <p className="text-sm">Sin vencimientos en los próximos 30 días</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-64">
            <VencimientosPanel items={vencimientos} onNavigate={onNavigate} />
          </div>
        )}
      </div>

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
