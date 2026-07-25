'use strict';

// Proyecta una fila de la tabla `marcas` a su representación pública.
const toPublicBrand = (row) => ({
  id: row.id,
  nombre: row.nombre,
  slug: row.slug,
  logoUrl: row.logo_url ?? null,
  activo: Boolean(row.activo),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

module.exports = { toPublicBrand };
