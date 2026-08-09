'use strict';

// Proyecta una fila de la tabla `subcategorias` a su representación pública.
// Cuando la consulta resuelve la categoría padre por JOIN (columnas
// `categoria_nombre` / `categoria_slug`), se anida en `categoria`.
const toPublicSubcategory = (row) => ({
  id: row.id,
  categoriaId: row.categoria_id,
  nombre: row.nombre,
  slug: row.slug,
  activo: Boolean(row.activo),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...(row.categoria_nombre !== undefined && {
    categoria: {
      id: row.categoria_id,
      nombre: row.categoria_nombre,
      slug: row.categoria_slug,
    },
  }),
});

module.exports = { toPublicSubcategory };
