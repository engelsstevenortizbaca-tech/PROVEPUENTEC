import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { brandService, categoryService, subcategoryService } from '../services/catalog.service';

export const TaxonomyContext = createContext(null);

// Categorías y marcas se piden UNA vez y se comparten. Sin esto, el buscador,
// el panel de filtros y la portada dispararían la misma consulta cada uno.
//
// Las subcategorías dependen de la categoría elegida, así que se piden bajo
// demanda y se cachean por `categoriaId` para no repetir la llamada al volver
// a seleccionarla.
export function TaxonomyProvider({ children }) {
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [subcategorias, setSubcategorias] = useState({});
  const enCurso = useRef(new Set());

  useEffect(() => {
    let vigente = true;

    // `limit: 100` es el máximo que admite el backend; la taxonomía de este
    // marketplace cabe de sobra en una página.
    Promise.all([
      categoryService.list({ activo: true, limit: 100 }),
      brandService.list({ activo: true, limit: 100 }),
    ])
      .then(([resCategorias, resMarcas]) => {
        if (!vigente) return;
        setCategorias(resCategorias?.data || []);
        setMarcas(resMarcas?.data || []);
      })
      .catch((err) => {
        if (vigente) setError(err);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const cargarSubcategorias = useCallback(
    async (categoriaId) => {
      if (!categoriaId) return [];

      const clave = String(categoriaId);
      if (subcategorias[clave]) return subcategorias[clave];
      if (enCurso.current.has(clave)) return [];

      enCurso.current.add(clave);
      try {
        const respuesta = await subcategoryService.list({
          categoriaId,
          activo: true,
          limit: 100,
        });
        const lista = respuesta?.data || [];
        setSubcategorias((actual) => ({ ...actual, [clave]: lista }));
        return lista;
      } catch {
        // Un fallo al cargar el segundo nivel no debe romper el catálogo:
        // simplemente no se ofrecen subcategorías.
        return [];
      } finally {
        enCurso.current.delete(clave);
      }
    },
    [subcategorias],
  );

  const value = useMemo(
    () => ({
      categorias,
      marcas,
      cargando,
      error,
      subcategoriasDe: (categoriaId) => subcategorias[String(categoriaId)] || [],
      cargarSubcategorias,
    }),
    [categorias, marcas, cargando, error, subcategorias, cargarSubcategorias],
  );

  return <TaxonomyContext.Provider value={value}>{children}</TaxonomyContext.Provider>;
}
