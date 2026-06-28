// Registro central de iconos para locales, rubros y subrubros.
// Reemplaza los emoji "viejos" por iconos lucide, manteniendo compatibilidad
// con los valores ya guardados en la base (que estaban como emoji).
import {
  Folder, FolderOpen, Users, Factory, Store, Truck, Briefcase, Construction,
  Package, Coins, Receipt, BarChart3, Landmark, Zap, Wrench, Hammer, Home,
  Globe, Mailbox, Car, Target, FileText, Key, Lightbulb, Leaf, Lock, Star,
  Plane, Palette, Battery,
} from 'lucide-react';

// key -> componente lucide. La key es lo que se guarda en `icon`.
export const ICONS = {
  folder: Folder, 'folder-open': FolderOpen, users: Users, factory: Factory,
  store: Store, truck: Truck, briefcase: Briefcase, construction: Construction,
  package: Package, coins: Coins, receipt: Receipt, chart: BarChart3,
  bank: Landmark, zap: Zap, wrench: Wrench, tools: Hammer, home: Home,
  globe: Globe, mail: Mailbox, car: Car, target: Target, note: FileText,
  key: Key, idea: Lightbulb, leaf: Leaf, lock: Lock, star: Star,
  plane: Plane, palette: Palette, battery: Battery,
};

// Orden de aparición en los selectores.
export const ICON_LIST = Object.keys(ICONS);

// Compatibilidad: datos viejos guardados como emoji -> key nueva.
const EMOJI_TO_KEY = {
  '📁': 'folder', '📂': 'folder-open', '👥': 'users', '🏭': 'factory', '🏪': 'store',
  '🚚': 'truck', '💼': 'briefcase', '🏗️': 'construction', '📦': 'package', '💰': 'coins',
  '🧾': 'receipt', '📊': 'chart', '🏦': 'bank', '⚡': 'zap', '🔧': 'wrench', '🛠️': 'tools',
  '🏠': 'home', '🌐': 'globe', '📮': 'mail', '🚗': 'car', '🎯': 'target', '📝': 'note',
  '🔑': 'key', '💡': 'idea', '🌿': 'leaf', '🔒': 'lock', '⭐': 'star', '✈️': 'plane',
  '🎨': 'palette', '🔋': 'battery',
};

// Normaliza cualquier valor (key nueva o emoji viejo) a una key válida, o null.
export function resolveIconKey(value) {
  if (!value) return null;
  if (ICONS[value]) return value;
  if (EMOJI_TO_KEY[value]) return EMOJI_TO_KEY[value];
  return null;
}

// Renderiza el icono de una entidad. `value` puede ser key nueva o emoji viejo.
export function EntityIcon({ value, fallback = 'folder', size = 16, className = '' }) {
  const key = resolveIconKey(value) || fallback;
  const Cmp = ICONS[key] || Folder;
  return <Cmp size={size} className={className} />;
}
