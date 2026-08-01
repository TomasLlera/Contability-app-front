import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Home, Wallet, Building2, Receipt, ClipboardList, X } from 'lucide-react';

/**
 * Navegación inferior para el shell mobile (<768px, ver MOBILE.md).
 *
 * Se monta con un portal a `document.body`, no en el árbol de la vista activa.
 * `position: fixed` se resuelve contra el viewport SALVO que algún ancestro
 * tenga `transform`, `filter`, `backdrop-filter`, `perspective`, `contain` o
 * `will-change`: cualquiera de esos crea un containing block y la barra pasa a
 * comportarse como `absolute`, quedando clavada en medio del contenido. Con el
 * portal la barra no tiene más ancestro que `<body>`, así que ninguna vista
 * puede romperla desde adentro — el arreglo vale para Inicio, Caja y todo lo
 * que venga. El alto que reserva el contenido sale de `--bottomnav-h`
 * (index.css), que es la única fuente de ese número.
 *
 * Los cinco accesos de uso diario al alcance del pulgar. El sidebar sigue
 * existiendo (drawer) para lo que no entra acá: locales, rubros, stock,
 * gráficas y configuración.
 *
 * IVA y Registro tienen submenús: en vez de mandarlos a una vista y obligar a
 * volver, abren una hoja con sus dos destinos. Un tap para elegir, siempre
 * abajo, nunca en el borde superior de la pantalla.
 */

const SUBMENUS = {
  iva: {
    label: 'IVA',
    items: [
      { view: 'iva-compras', label: 'Compras', hint: 'Comprobantes recibidos y crédito fiscal' },
      { view: 'iva-ventas',  label: 'Ventas',  hint: 'Comprobantes emitidos y débito fiscal' },
    ],
  },
  registro: {
    label: 'Registro',
    items: [
      { view: 'registro-ventas',   label: 'Venta Sistema', hint: 'Registro diario de ventas' },
      { view: 'registro-tarjetas', label: 'Tarjetas',      hint: 'QR, débito, crédito y prepagas' },
    ],
  },
};

const ITEMS = [
  { key: 'inicio',    label: 'Inicio',    icon: Home,          view: 'inicio' },
  { key: 'caja',      label: 'Caja',      icon: Wallet,        view: 'caja' },
  { key: 'locales',   label: 'Rubros',    icon: Building2,     drawer: true },
  { key: 'iva',       label: 'IVA',       icon: Receipt,       submenu: 'iva' },
  { key: 'registro',  label: 'Registro',  icon: ClipboardList, submenu: 'registro' },
];

export default function BottomNav({ activeView, onNavigate, onOpenDrawer }) {
  const [submenu, setSubmenu] = useState(null);

  // Un rubro abierto (activeView es el objeto rubro) marca "Rubros" como activo.
  const esRubro = typeof activeView === 'object' && activeView !== null;
  const activo = (it) => {
    if (it.drawer) return esRubro;
    if (it.submenu) return SUBMENUS[it.submenu].items.some(s => s.view === activeView);
    return activeView === it.view;
  };

  const abierto = submenu ? SUBMENUS[submenu] : null;

  return createPortal(
    <>
      {abierto && (
        <div
          className="md:hidden fixed inset-0 z-50 flex items-end bg-slate-950/50 backdrop-blur-[2px] animate-[fadeIn_120ms_ease-out]"
          onClick={() => setSubmenu(null)}
        >
          <div
            role="menu"
            aria-label={abierto.label}
            onClick={e => e.stopPropagation()}
            className="w-full bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700
                       pb-[max(0.5rem,env(safe-area-inset-bottom))]
                       animate-[sheetIn_220ms_cubic-bezier(0.16,1,0.3,1)]"
          >
            <div className="flex items-center justify-between px-5 pt-3 pb-1">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{abierto.label}</p>
              <button
                onClick={() => setSubmenu(null)}
                aria-label="Cerrar"
                className="w-11 h-11 -mr-3 flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100 dark:active:bg-slate-700/60"
              ><X size={18} /></button>
            </div>
            <div className="px-2 pb-2">
              {abierto.items.map(s => (
                <button
                  key={s.view}
                  onClick={() => { setSubmenu(null); onNavigate(s.view); }}
                  className={`w-full flex flex-col justify-center px-3 min-h-14 rounded-xl text-left
                              active:bg-slate-100 dark:active:bg-slate-700/60
                              ${activeView === s.view ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <span className={`text-sm font-medium ${activeView === s.view ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                    {s.label}
                  </span>
                  <span className="text-xs text-slate-400 truncate">{s.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Navegación principal"
        className="md:hidden fixed bottom-0 inset-x-0 z-40
                   bg-white/95 dark:bg-slate-800/95 backdrop-blur
                   border-t border-slate-200 dark:border-slate-700
                   pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex h-(--bottomnav-h)">
          {ITEMS.map(it => {
            const Icon = it.icon;
            const on = activo(it);
            return (
              <button
                key={it.key}
                onClick={() => {
                  if (it.drawer) return onOpenDrawer();
                  if (it.submenu) return setSubmenu(it.submenu);
                  onNavigate(it.view);
                }}
                aria-current={on ? 'page' : undefined}
                className={`flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 transition-colors
                            active:bg-slate-100 dark:active:bg-slate-700/50
                            ${on ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}
              >
                <Icon size={20} strokeWidth={on ? 2.4 : 2} />
                <span className={`text-[11px] leading-none ${on ? 'font-semibold' : 'font-medium'}`}>{it.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sheetIn { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>,
    document.body
  );
}
