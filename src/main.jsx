import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Con mouse, la rueda sobre un <input type=number> enfocado cambia el valor en
// silencio (un monto de $ 150.000 pasa a $ 149.999 al scrollear la página). Se
// saca el foco antes de que el navegador aplique el cambio.
document.addEventListener('wheel', (e) => {
  const el = document.activeElement;
  if (el && el.type === 'number' && el === e.target) el.blur();
}, { passive: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
