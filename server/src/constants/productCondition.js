'use strict';

// Valores del ENUM `productos.condicion` (DATABASE_DESIGN §3.2).
const PRODUCT_CONDITION = Object.freeze({
  NUEVO: 'nuevo',
  USADO: 'usado',
});

const PRODUCT_CONDITIONS = Object.freeze(Object.values(PRODUCT_CONDITION));

// La columna declara DEFAULT 'nuevo'; el service lo aplica de forma explícita
// para que la respuesta de creación no dependa de leer la fila recién escrita.
const DEFAULT_PRODUCT_CONDITION = PRODUCT_CONDITION.NUEVO;

module.exports = { PRODUCT_CONDITION, PRODUCT_CONDITIONS, DEFAULT_PRODUCT_CONDITION };
