import { useCallback, useEffect, useRef, useState } from 'react';

// Ejecuta una llamada a la API y expone { data, error, cargando, recargar }.
//
// `peticion` debe ser estable (useCallback en el componente): es la dependencia
// que dispara la recarga cuando cambian los filtros. Las respuestas de una
// petición ya obsoleta se descartan para que un filtro rápido no pise al
// siguiente.
export function useApi(peticion, { inmediato = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(inmediato);
  const peticionActual = useRef(0);

  const ejecutar = useCallback(async () => {
    const id = ++peticionActual.current;
    setCargando(true);
    setError(null);

    try {
      const resultado = await peticion();
      if (id === peticionActual.current) setData(resultado);
      return resultado;
    } catch (err) {
      if (id === peticionActual.current) {
        setError(err);
        setData(null);
      }
      return null;
    } finally {
      if (id === peticionActual.current) setCargando(false);
    }
  }, [peticion]);

  useEffect(() => {
    if (inmediato) ejecutar();
  }, [ejecutar, inmediato]);

  return { data, error, cargando, recargar: ejecutar };
}
