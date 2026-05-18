import { useState } from 'react';
import { authApi } from '../api';
import { Wallet, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.login(usuario, password);
      onLogin();
    } catch {
      setError('Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden
                    bg-linear-to-br from-slate-50 via-white to-blue-50
                    dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* decorative background */}
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div aria-hidden className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full
                                  bg-blue-400/20 dark:bg-blue-500/10 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-40 -right-32 w-[520px] h-[520px] rounded-full
                                  bg-indigo-400/20 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm animate-[fadeIn_400ms_ease-out]">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600
                          flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
            <Wallet size={28} className="text-white" strokeWidth={2.25} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Contability</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ingresá para continuar</p>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl
                        border border-slate-200/80 dark:border-slate-800
                        rounded-2xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/40">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="usuario" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Usuario
              </label>
              <input
                id="usuario"
                type="text"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/60
                           border border-slate-200 dark:border-slate-700
                           text-slate-900 dark:text-white placeholder:text-slate-400
                           rounded-lg px-3.5 py-2.5 text-sm
                           outline-none transition
                           focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                autoFocus
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/60
                             border border-slate-200 dark:border-slate-700
                             text-slate-900 dark:text-white placeholder:text-slate-400
                             rounded-lg pl-3.5 pr-10 py-2.5 text-sm
                             outline-none transition
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md
                             text-slate-400 hover:text-slate-600 dark:hover:text-slate-200
                             hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg
                              bg-red-50 dark:bg-red-950/40
                              border border-red-200 dark:border-red-900/60
                              text-red-700 dark:text-red-400 text-sm
                              animate-[fadeIn_200ms_ease-out]">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !usuario || !password}
              className="press w-full inline-flex items-center justify-center gap-2
                         bg-linear-to-b from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700
                         disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed
                         dark:disabled:from-slate-700 dark:disabled:to-slate-700
                         text-white font-semibold text-sm rounded-lg py-2.5
                         shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30
                         disabled:shadow-none"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-6">
          © {new Date().getFullYear()} Contability
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
