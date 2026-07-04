# Contability App — Frontend

Interfaz web de la aplicación de contabilidad **CA-Gestión / Contability**. UI en
español para gestionar locales, rubros, subrubros y movimientos, con dashboard,
gráficas, caja, stock, IVA, configuración y auditoría.

- **Producción:** https://contability-app-front.vercel.app
- **Backend:** https://contability-app-back.onrender.com

## Stack

- **React 19 + Vite**
- **Tailwind CSS 4** (vía `@tailwindcss/vite`)
- **Axios** — cliente HTTP con inyección automática de JWT
- **Recharts** — gráficas del dashboard
- **lucide-react** — iconos · **react-hot-toast** — notificaciones
- **xlsx** — export de Excel en cliente

## Requisitos

- Node.js 20+
- El [backend](https://github.com/TomasLlera/Contability-app-back) corriendo (en
  local, por defecto en `http://localhost:3001`)

## Puesta en marcha

```bash
cd frontend
npm install
npm run dev        # Vite en http://localhost:5173
```

En desarrollo **no hace falta configurar la URL del backend**: el proxy de Vite
redirige `/api/*` → `http://localhost:3001` automáticamente.

## Scripts

```bash
npm run dev        # servidor de desarrollo (Vite)
npm run build      # build de producción
npm run preview    # previsualiza el build
npm run lint       # ESLint
```

## Variables de entorno (`.env`)

| Variable       | Descripción                                                              |
|----------------|--------------------------------------------------------------------------|
| `VITE_API_URL` | URL del backend. **Comentada en dev** (la resuelve el proxy de Vite). En producción apunta al backend de Render. |

## Estructura

```
frontend/src/
├── main.jsx            # Entry → App.jsx
├── App.jsx             # Estado global + routing por switch de vistas (~1000 líneas)
├── api.js              # Axios: inyección de JWT, refresh de token, logout por inactividad
├── views/              # Login, Dashboard, Graficas, RubroView, SubrubroView,
│                       #   CajaView, StockView, IvaView, SettingsView
└── components/         # Modales, forms, managers, calendario y paneles reutilizables
```

## Arquitectura

- **Routing:** no usa React Router. La vista activa se controla con el estado
  `activeView` en `App.jsx`, que además concentra la mayor parte del estado global
  y lo pasa hacia abajo por props (sin Redux ni Zustand).
- **API client (`api.js`):** instancia de Axios que inyecta el JWT en cada request,
  refresca el token si le quedan menos de 3 días (expira a los 7) y desloguea tras
  1 hora de inactividad.
- **Autenticación:** roles `admin` (acceso total) y `viewer` (solo lectura).
- **Persistencia local (`localStorage`):** `token`, `theme` (dark/light),
  `sidebarSide`, `sidebarCollapsed`.

## Deploy

Desplegado en **Vercel**. Cada push a `main` dispara el redeploy automático.
Recordá configurar `VITE_API_URL` apuntando al backend de Render en el entorno de
producción de Vercel.
