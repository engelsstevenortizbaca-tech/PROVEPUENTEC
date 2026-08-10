'use strict';

// Proyecta una fila de `producto_imagenes` a su representación pública.
// `url` ya se guarda como ruta pública servida por express.static, así que no
// se transforma aquí.
const toPublicProductImage = (row) => ({
  id: row.id,
  productoId: row.producto_id,
  url: row.url,
  orden: row.orden,
  esPrincipal: Boolean(row.es_principal),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

module.exports = { toPublicProductImage };
