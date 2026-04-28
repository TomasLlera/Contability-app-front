import { useState, useEffect } from 'react';

export default function RegistroForm({ campos, registro, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(registro?.fecha || today);
  const [valores, setValores] = useState(() => {
    const init = {};
    if (registro?.valores) {
      for (const v of registro.valores) init[v.campo_id] = v.valor;
    }
    return init;
  });

  const handleChange = (campoId, val) => setValores(prev => ({ ...prev, [campoId]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(fecha, valores);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Fecha</label>
        <input
          type="date"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
          required
        />
      </div>

      {campos.map(c => (
        <div key={c.id}>
          <label className="block text-xs font-medium text-slate-600 mb-1">{c.nombre}</label>
          <input
            type={c.tipo === 'number' ? 'number' : c.tipo === 'date' ? 'date' : 'text'}
            step={c.tipo === 'number' ? 'any' : undefined}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={valores[c.id] ?? ''}
            onChange={e => handleChange(c.id, e.target.value)}
            placeholder={`Ingresá ${c.nombre.toLowerCase()}`}
          />
        </div>
      ))}

      {campos.length === 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
          Este rubro no tiene campos definidos. Configurá los campos primero.
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-200">
          Cancelar
        </button>
        <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">
          Guardar
        </button>
      </div>
    </form>
  );
}
