import { useState, useEffect } from 'react';
import { categoriasApi } from '../api';

const OPERACIONES = [
  { value: 'descuento', label: 'Descuento', desc: 'Resta del saldo', color: 'text-red-600 bg-red-50' },
  { value: 'pago', label: 'Pago', desc: 'Pago realizado', color: 'text-orange-600 bg-orange-50' },
  { value: 'aumento', label: 'Aumento', desc: 'Suma al monto base permanentemente', color: 'text-green-600 bg-green-50' },
];

const EMPTY = { nombre: '', operacion: 'descuento', tipo_calculo: 'fijo', porcentaje_default: '' };

function CategoriaForm({ initial = EMPTY, onSave, onCancel, submitLabel = 'Agregar' }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
      <input
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Nombre (ej: Adelanto, Desc. anticipado...)"
        value={form.nombre}
        onChange={e => set('nombre', e.target.value)}
        onKeyDown={e => e.key === 'Enter' && form.nombre && onSave(form)}
        autoFocus
      />

      <div>
        <p className="text-xs font-medium text-slate-500 mb-1.5">Operación</p>
        <div className="grid grid-cols-3 gap-1.5">
          {OPERACIONES.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => set('operacion', o.value)}
              className={`p-2 rounded-lg border-2 text-left transition-all ${form.operacion === o.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <p className={`text-xs font-semibold ${o.color.split(' ')[0]}`}>{o.label}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-tight">{o.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {(form.operacion === 'descuento' || form.operacion === 'pago') && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Tipo de cálculo</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set('tipo_calculo', 'fijo')}
              className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${form.tipo_calculo === 'fijo' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
              💲 Monto fijo
            </button>
            <button
              type="button"
              onClick={() => set('tipo_calculo', 'porcentaje')}
              className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${form.tipo_calculo === 'porcentaje' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
              % Porcentaje
            </button>
          </div>

          {form.tipo_calculo === 'porcentaje' && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-500">Porcentaje por defecto:</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="w-24 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ej: 10"
                value={form.porcentaje_default}
                onChange={e => set('porcentaje_default', e.target.value)}
              />
              <span className="text-xs text-slate-500">% del monto base</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button onClick={onCancel} className="flex-1 bg-white border border-slate-300 text-slate-600 py-1.5 rounded-lg text-sm hover:bg-slate-50">
            Cancelar
          </button>
        )}
        <button
          onClick={() => form.nombre && onSave(form)}
          disabled={!form.nombre}
          className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

const opInfo = (op) => OPERACIONES.find(o => o.value === op);

export default function CategoriasManager({ rubro, onClose }) {
  const [categorias, setCategorias] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    categoriasApi.getByRubro(rubro.id).then(setCategorias);
  }, [rubro.id]);

  const handleAdd = async (form) => {
    const cat = await categoriasApi.create(rubro.id, form.nombre, form.operacion, form.tipo_calculo, form.porcentaje_default || null);
    setCategorias(prev => [...prev, cat]);
    setShowAdd(false);
  };

  const handleEdit = async (id, form) => {
    await categoriasApi.update(id, form.nombre, form.operacion, form.tipo_calculo, form.porcentaje_default || null);
    setCategorias(prev => prev.map(c => c.id === id ? { ...c, ...form } : c));
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    await categoriasApi.delete(id);
    setCategorias(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Categorías de movimiento para <strong>{rubro.nombre}</strong>. Se aplican a todos los elementos del rubro.
      </p>

      <div className="space-y-2 mb-4">
        {categorias.map(c => (
          <div key={c.id}>
            {editingId === c.id ? (
              <CategoriaForm
                initial={{ nombre: c.nombre, operacion: c.operacion, tipo_calculo: c.tipo_calculo || 'fijo', porcentaje_default: c.porcentaje_default ?? '' }}
                onSave={form => handleEdit(c.id, form)}
                onCancel={() => setEditingId(null)}
                submitLabel="Guardar"
              />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-700">{c.nombre}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${opInfo(c.operacion)?.color}`}>
                      {opInfo(c.operacion)?.label}
                    </span>
                    {c.tipo_calculo === 'porcentaje' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {c.porcentaje_default ? `${c.porcentaje_default}% del base` : '% del base'}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setEditingId(c.id)} className="text-xs text-slate-400 hover:text-blue-600 shrink-0">Editar</button>
                <button onClick={() => handleDelete(c.id)} className="text-xs text-slate-400 hover:text-red-500 shrink-0">Borrar</button>
              </div>
            )}
          </div>
        ))}
        {categorias.length === 0 && !showAdd && (
          <p className="text-sm text-slate-400 text-center py-4">No hay categorías definidas</p>
        )}
      </div>

      {showAdd ? (
        <CategoriaForm onSave={handleAdd} onCancel={() => setShowAdd(false)} submitLabel="Agregar" />
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full border-2 border-dashed border-slate-200 text-slate-500 py-2 rounded-lg text-sm hover:border-blue-300 hover:text-blue-600 transition-all"
        >
          + Nueva categoría
        </button>
      )}

      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-200">Listo</button>
      </div>
    </div>
  );
}
