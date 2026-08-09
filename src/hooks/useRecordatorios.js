import { useState, useEffect, useCallback } from 'react';
import { recordatoriosApi } from '../api';

// Cada cuánto le preguntamos al backend si hay algo para mostrar. El intervalo de cada
// recordatorio lo resuelve el servidor —es el único que conoce la programación, la
// frecuencia y lo que este usuario ya hizo hoy—; acá solo hay un latido fijo.
const POLL_MS = 60 * 1000;

// Se dispara una única vez por carga de la app: la primera consulta va con
// motivo=login, que fuerza la aparición de todo lo no completado ("siempre se muestra
// una vez al iniciar sesión"). Navegar entre secciones NO cuenta como iniciar sesión,
// así que no reabre lo que el usuario ya cerró. Cerrar sesión o recargar la página
// resetea el módulo y vuelve a saludar.
let yaSaludo = false;

/**
 * Recordatorios del día para el usuario logueado.
 *
 * Todo el tracking (qué se mostró, qué se completó) vive en la base: acá no se guarda
 * nada en localStorage, así que entrar desde otra máquina o volver a loguearse el
 * mismo día respeta lo ya completado.
 *
 * Devuelve:
 *   pendientes  — los que corresponde mostrar ahora (pila del popup)
 *   totalHoy    — cuántos siguen vivos hoy, para el badge del botón
 *   abrirTodos  — trae a mano todos los del día, sin esperar al próximo aviso
 *   completar / postergar / descartar
 */
export default function useRecordatorios(activo = true) {
  const [pendientes, setPendientes] = useState([]);
  const [totalHoy, setTotalHoy] = useState(0);

  // Suma a la pila sin duplicar: un tick puede traer uno nuevo mientras otro sigue
  // en pantalla.
  const apilar = useCallback((nuevos) => {
    setPendientes(prev => {
      const vistos = new Set(prev.map(r => r.id));
      const suma = nuevos.filter(r => !vistos.has(r.id));
      return suma.length ? [...prev, ...suma] : prev;
    });
  }, []);

  useEffect(() => {
    if (!activo) return;
    let vivo = true;

    const latido = async (motivo) => {
      try {
        const [push, hoy] = await Promise.all([
          recordatoriosApi.getPendientes(motivo),
          recordatoriosApi.getHoy(),
        ]);
        if (!vivo) return;
        setTotalHoy(Array.isArray(hoy) ? hoy.length : 0);
        if (Array.isArray(push) && push.length) apilar(push);
      } catch { /* sin recordatorios: la app funciona igual */ }
    };

    latido(yaSaludo ? 'intervalo' : 'login');
    yaSaludo = true;

    const timer = setInterval(() => latido('intervalo'), POLL_MS);
    return () => { vivo = false; clearInterval(timer); };
  }, [activo, apilar]);

  // Sacarlo de la pila es local e inmediato; la acción se registra en el backend
  // detrás. Si esa llamada falla, el recordatorio vuelve en el próximo latido.
  const quitar = useCallback((id) => setPendientes(prev => prev.filter(r => r.id !== id)), []);

  const completar = useCallback((id) => {
    quitar(id);
    setTotalHoy(n => Math.max(0, n - 1));
    recordatoriosApi.completar(id).catch(() => {});
  }, [quitar]);

  const postergar = useCallback((id) => {
    quitar(id);
    recordatoriosApi.postergar(id).catch(() => {});
  }, [quitar]);

  // Checklist: se pinta al instante y se confirma contra la BD, que es la fuente de
  // verdad (la respuesta trae la lista completa, así dos pestañas convergen). Si la
  // llamada falla, se revierte el tilde en vez de mentirle al usuario.
  const toggleItem = useCallback((id, subrubroId, hecho) => {
    const aplicar = (lista) => setPendientes(prev =>
      prev.map(r => (r.id === id ? { ...r, items_hechos: lista } : r)));

    setPendientes(prev => prev.map(r => {
      if (r.id !== id) return r;
      const actual = r.items_hechos || [];
      return { ...r, items_hechos: hecho ? [...new Set([...actual, subrubroId])] : actual.filter(x => x !== subrubroId) };
    }));

    recordatoriosApi.toggleItem(id, subrubroId, hecho)
      .then(res => aplicar(res.items_hechos || []))
      .catch(() => setPendientes(prev => prev.map(r => {
        if (r.id !== id) return r;
        const actual = r.items_hechos || [];
        return { ...r, items_hechos: hecho ? actual.filter(x => x !== subrubroId) : [...new Set([...actual, subrubroId])] };
      })));
  }, []);

  // Botón de la campana: muestra todo lo del día que siga sin completar, sin esperar
  // al próximo aviso. Es read-only en el backend, así que abrirlo cuantas veces haga
  // falta no altera la programación.
  const abrirTodos = useCallback(async () => {
    try {
      const data = await recordatoriosApi.getHoy();
      if (!Array.isArray(data)) return;
      setTotalHoy(data.length);
      apilar(data);
    } catch { /* el botón simplemente no abre nada */ }
  }, [apilar]);

  return { pendientes, totalHoy, abrirTodos, completar, postergar, toggleItem, descartar: quitar };
}
