import { useState, useEffect } from 'react';
import { appConfigApi, getErrorMsg } from '../api';
import toast from 'react-hot-toast';
import { Mail, Bell, Send, CheckCircle, Clock } from 'lucide-react';

export default function SettingsView() {
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
    <div className="max-w-xl mx-auto space-y-6">

      {/* Alertas por email */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
            <Mail size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Alertas por email</h2>
            <p className="text-xs text-slate-400">Recibí un email cuando haya facturas por vencer</p>
          </div>
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
              <Clock size={12} className="inline mr-1" />
              Días de anticipación
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

        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
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
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          "Enviar prueba" manda un email ahora con los vencimientos actuales.
        </p>
      </div>

      {/* Sección placeholder para futuras configuraciones */}
      <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
        <p className="text-sm text-slate-400 dark:text-slate-500">Más opciones próximamente</p>
      </div>

    </div>
  );
}
