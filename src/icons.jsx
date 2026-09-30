import { Folder } from 'lucide-react';
import { ICONS, resolveIconKey } from './iconos';

// Renderiza el icono de una entidad. `value` puede ser key nueva o emoji viejo.
// El registro de iconos (ICONS, ICON_LIST, resolveIconKey) está en iconos.js.
export function EntityIcon({ value, fallback = 'folder', size = 16, className = '' }) {
  const key = resolveIconKey(value) || fallback;
  const Cmp = ICONS[key] || Folder;
  return <Cmp size={size} className={className} />;
}
