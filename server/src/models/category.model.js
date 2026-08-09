'use strict';

// Proyecta una fila de la tabla `categorias` a su representación pública.
const toPublicCategory = (row) => ({
  id: row.id,
  nombre: row.nombre,
  slug: row.slug,
  descripcion: row.descripcion ?? null,
  activo: Boolean(row.activo),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

module.exports = { toPublicCategory };
