import { useState, useEffect } from 'react';
import { appConfigApi, getErrorMsg } from '../api';
import toast from 'react-hot-toast';
import { Mail, Bell, Send, CheckCircle, Clock, Globe, DollarSign, Building2, Users, ChevronRight } from 'lucide-react';

const SECCIONES = [
  { key: 'alertas',  label: 'Alertas',   icon: Bell,      ready: true },
  { key: 'idioma',   label: 'Idioma',    icon: Globe,     ready: false },
  { key: 'moneda',   label: 'Moneda',    icon: DollarSign, ready: false },
  { key: 'negocio',  label: 'Negocio',   icon: Building2, ready: false },
  { key: 'usuarios', label: 'Usuarios',  icon: Users,     ready: false },
];

function Proximamente({ label }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <p className="text-2xl mb-3">🚧</p>
      <p className="font-semibold text-slate-600 dark:text-slate-300">{label}</p>
      <p className="text-sm text-slate-400 mt-1">Próximamente</p>
    </div>
  );
}

function AlertasSection() {
  const [config, setConfig] = useState(null);
  const [email, setEmail] = useState('');
  const [activas, setActivas] = useState(false);
  const [dias, setDias] = useState(7);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    appConfigApi.get().then(cfg => {
      setConfig(cfg);
      setEmail(cfg.email_alertas || '');
      setActivas(cfg.alertas_activas || false);
      setDias(cfg.dias_anticipacion || 7);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await appConfigApi.update({ email_alertas: email.trim(), alertas_activas: activas, dias_anticipacion: Number(dias) });
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!email.trim()) { toast.error('Ingresá un email primero'); return; }
    setTesting(true);
    try {
      await appConfigApi.update({ email_alertas: email.trim(), alertas_activas: activas, dias_anticipacion: Number(dias) });
      const res = await appConfigApi.testEmail();
      toast.success(res.message);
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setTesting(false);
    }
  };

  if (!config) return <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Cargando...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-0.5">Alertas por email</h2>
        <p className="text-xs text-slate-400">Recibí un email cuando haya facturas por vencer</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Email de destino</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="ejemplo@mail.com"
            className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            <Clock size={12} className="inline mr-1" />Días de anticipación
          </label>
          <select
            value={dias}
            onChange={e => setDias(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[3, 5, 7, 10, 14, 30].map(d => (
              <option key={d} value={d}>{d} días antes del vencimiento</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setActivas(v => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${activas ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${activas ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <div className="flex items-center gap-1.5">
            <Bell size={13} className={activas ? 'text-blue-600' : 'text-slate-400'} />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {activas ? 'Alertas activadas' : 'Alertas desactivadas'}
            </span>
          </div>
        </label>
      </div>

      <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <CheckCircle size={14} />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          onClick={handleTestEmail}
          disabled={testing || !email.trim()}
          className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <Send size={14} />
          {testing ? 'Enviando...' : 'Enviar prueba'}
        </button>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">"Enviar prueba" manda un email ahora con los vencimientos actuales.</p>
    </div>
  );
}

export default function SettingsView() {
  const [seccion, setSeccion] = useState('alertas');
  const activa = SECCIONES.find(s => s.key === seccion);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex gap-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">

        {/* Barra lateral de secciones */}
        <nav className="w-44 shrink-0 border-r border-slate-100 dark:border-slate-700 py-2">
          {SECCIONES.map(s => {
            const Icon = s.icon;
            const isActive = seccion === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSeccion(s.key)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium border-r-2 border-blue-600 dark:border-blue-400 -mr-px'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="flex-1">{s.label}</span>
                {!s.ready && (
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 px-1 rounded">
                    pronto
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Contenido */}
        <div className="flex-1 p-6">
          {activa?.ready
            ? <AlertasSection />
            : <Proximamente label={activa?.label} />
          }
        </div>

      </div>
    </div>
  );
}
