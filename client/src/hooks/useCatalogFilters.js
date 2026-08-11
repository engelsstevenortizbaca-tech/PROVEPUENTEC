import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ORDEN_POR_DEFECTO, esOrdenValido } from '../services/product.service';

// Claves que viven en la URL. Son exactamente las que acepta GET /products,
// más `page`. La URL es la única fuente de verdad del estado del catálogo: así
// un filtro se puede compartir por enlace y el botón «atrás» funciona.
export const CLAVES_FILTRO = [
  'q',
  'categoriaId',
  'subcategoriaId',
  'marcaId',
  'condicion',
  'precioMin',
  'precioMax',
  'orden',
];

const PRODUCTOS_POR_PAGINA = 12;

export function useCatalogFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filtros = useMemo(() => {
    const leidos = {};
    for (const clave of CLAVES_FILTRO) {
      const valor = searchParams.get(clave);
      if (valor) leidos[clave] = valor;
    }

    // Un `orden` manipulado a mano en la URL se descarta: el backend lo
    // ignoraría igualmente, pero así el desplegable no queda en un estado
    // que no se corresponde con lo que se está viendo.
    if (leidos.orden && !esOrdenValido(leidos.orden)) delete leidos.orden;

    const page = Number(searchParams.get('page')) || 1;
    return { ...leidos, page: page > 0 ? page : 1 };
  }, [searchParams]);

  // Parámetros que se envían al backend, ya con la paginación resuelta.
  const consulta = useMemo(
    () => ({
      ...filtros,
      orden: filtros.orden || ORDEN_POR_DEFECTO,
      limit: PRODUCTOS_POR_PAGINA,
    }),
    [filtros],
  );

  // Al cambiar cualquier filtro se vuelve a la página 1: mantener la página
  // actual sobre un conjunto de resultados distinto suele dejar la vista vacía.
  const aplicar = useCallback(
    (cambios) => {
      setSearchParams(
        (actuales) => {
          const siguientes = new URLSearchParams(actuales);
          for (const [clave, valor] of Object.entries(cambios)) {
            if (valor === undefined || valor === null || valor === '') siguientes.delete(clave);
            else siguientes.set(clave, String(valor));
          }
          if (!('page' in cambios)) siguientes.delete('page');
          return siguientes;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const irAPagina = useCallback((page) => aplicar({ page }), [aplicar]);

  const limpiar = useCallback(() => setSearchParams(new URLSearchParams()), [setSearchParams]);

  // Cuántos filtros hay activos, sin contar el orden ni la paginación: sirve
  // para decidir si se ofrece «Limpiar filtros».
  const activos = CLAVES_FILTRO.filter(
    (clave) => clave !== 'orden' && filtros[clave] !== undefined,
  ).length;

  return { filtros, consulta, aplicar, irAPagina, limpiar, activos, PRODUCTOS_POR_PAGINA };
}
