import { useState, useEffect } from 'react';
import { camposApi } from '../api';

const TIPOS = [
  {
    value: 'suma',
    label: 'Suma al total',
    desc: 'Monto que se suma al saldo',
    color: 'text-green-700 bg-green-50 border-green-200',
    icon: '+'
  },
  {
    value: 'resta',
    label: 'Resta del total',
    desc: 'Monto que se descuenta del saldo',
    color: 'text-red-700 bg-red-50 border-red-200',
    icon: '−'
  },
  {
    value: 'texto',
    label: 'Descriptivo',
    desc: 'Texto que no afecta al total (ej: N° factura)',
    color: 'text-slate-600 bg-slate-50 border-slate-200',
    icon: 'T'
  },
];

const BASE_COLS = [
  { nombre: 'Fecha', desc: 'Fecha del registro', icon: '📅' },
  { nombre: 'Monto', desc: 'Importe de la boleta (suma al total)', icon: '+' },
  { nombre: 'Pago', desc: 'Pago realizado (resta del total)', icon: '−' },
  { nombre: 'Total', desc: 'Saldo acumulado calculado automáticamente', icon: '=' },
];

export default function CamposManager({ rubro, onClose }) {
  const [campos, setCampos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('texto');
  const [editingId, setEditingId] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editTipo, setEditTipo] = useState('texto');

  useEffect(() => {
    camposApi.getByRubro(rubro.id).then(setCampos);
  }, [rubro.id]);

  const handleAdd = async () => {
    const n = nombre.trim();
    if (!n) return;
    const campo = await camposApi.create(rubro.id, n, tipo, campos.length);
    setCampos(prev => [...prev, campo]);
    setNombre('');
    setTipo('texto');
  };

  const handleDelete = async (id) => {
    await camposApi.delete(id);
    setCampos(prev => prev.filter(c => c.id !== id));
  };

  const handleSaveEdit = async (campo) => {
    await camposApi.update(campo.id, editNombre.trim(), editTipo, campo.orden);
    setCampos(prev => prev.map(c => c.id === campo.id ? { ...c, nombre: editNombre.trim(), tipo: editTipo } : c));
    setEditingId(null);
  };

  const tipoInfo = (t) => TIPOS.find(x => x.value === t);

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Definí las columnas que aparecerán en la tabla de <strong>{rubro.nombre}</strong>. Las columnas base no se pueden modificar.
      </p>

      {/* Columnas base (siempre presentes) */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Columnas base (fijas)</p>
        <div className="grid grid-cols-2 gap-2">
          {BASE_COLS.map(c => (
            <div key={c.nombre} className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-lg border border-slate-200">
              <span className="w-6 h-6 flex items-center justify-center rounded bg-slate-300 text-slate-600 text-xs font-bold shrink-0">{c.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700">{c.nombre}</p>
                <p className="text-xs text-slate-400 leading-tight">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Columnas custom */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Columnas adicionales ({campos.length})
        </p>

        <div className="space-y-2 mb-3">
          {campos.map(c => {
            const info = tipoInfo(c.tipo);
            return (
              <div key={c.id}>
                {editingId === c.id ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                    <input
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editNombre}
                      onChange={e => setEditNombre(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveEdit(c)}
                      autoFocus
                    />
                    <div className="grid grid-cols-3 gap-1.5">
                      {TIPOS.map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setEditTipo(t.value)}
                          className={`p-2 rounded-lg border-2 text-left transition-all ${editTipo === t.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        >
                          <p className="text-xs font-semibold text-slate-700">{t.label}</p>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(c)} className="flex-1 bg-blue-600 text-white rounded-lg py-1.5 text-sm hover:bg-blue-700">Guardar</button>
                      <button onClick={() => setEditingId(null)} className="flex-1 bg-white border border-slate-300 text-slate-600 rounded-lg py-1.5 text-sm hover:bg-slate-50">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300">
                    <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold shrink-0 border ${info?.color}`}>
                      {info?.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700">{c.nombre}</p>
                      <p className="text-xs text-slate-400">{info?.label}</p>
                    </div>
                    <button onClick={() => { setEditingId(c.id); setEditNombre(c.nombre); setEditTipo(c.tipo); }} className="text-xs text-slate-400 hover:text-blue-600 transition-colors shrink-0">Editar</button>
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-slate-400 hover:text-red-500 transition-colors shrink-0">Borrar</button>
                  </div>
                )}
              </div>
            );
          })}
          {campos.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              Sin columnas adicionales. Agregá las que necesites.
            </p>
          )}
        </div>

        {/* Formulario para agregar */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500">Agregar columna</p>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre (ej: N° Factura, Retención, Nota...)"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <div className="grid grid-cols-3 gap-2">
            {TIPOS.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipo(t.value)}
                className={`p-2.5 rounded-lg border-2 text-left transition-all ${tipo === t.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-xs font-bold px-1 rounded ${t.color}`}>{t.icon}</span>
                  <p className="text-xs font-semibold text-slate-700">{t.label}</p>
                </div>
                <p className="text-xs text-slate-400 leading-tight">{t.desc}</p>
              </button>
            ))}
          </div>
          <button
            onClick={handleAdd}
            disabled={!nombre.trim()}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40 font-medium"
          >
            + Agregar columna
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-200">
        <button onClick={onClose} className="bg-slate-100 text-slate-700 px-5 py-2 rounded-lg text-sm hover:bg-slate-200 font-medium">
          Listo
        </button>
      </div>
    </div>
  );
}
