'use strict';

// Valores del ENUM `productos.estado` (DATABASE_DESIGN §3.2).
const PRODUCT_STATUS = Object.freeze({
  BORRADOR: 'borrador',
  ACTIVO: 'activo',
  PAUSADO: 'pausado',
  VENDIDO: 'vendido',
  ELIMINADO: 'eliminado',
});

// Todo producto nace en borrador y solo es público al pasar a activo.
const DEFAULT_PRODUCT_STATUS = PRODUCT_STATUS.BORRADOR;

// Estados visibles en el catálogo público.
const PUBLIC_PRODUCT_STATUSES = Object.freeze([PRODUCT_STATUS.ACTIVO]);

// Estados que el dueño puede fijar; `vendido` lo escribe la aceptación de una
// oferta y `eliminado` corresponde al borrado lógico.
const ASSIGNABLE_PRODUCT_STATUSES = Object.freeze([
  PRODUCT_STATUS.BORRADOR,
  PRODUCT_STATUS.ACTIVO,
  PRODUCT_STATUS.PAUSADO,
]);

module.exports = {
  PRODUCT_STATUS,
  DEFAULT_PRODUCT_STATUS,
  PUBLIC_PRODUCT_STATUSES,
  ASSIGNABLE_PRODUCT_STATUSES,
};
