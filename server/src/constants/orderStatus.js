'use strict';

// Claves del catálogo heredado `estados_pedido` que este flujo utiliza. El
// catálogo contiene más filas (`pagado`, `reembolsado`) que no se usan y que
// no se eliminan (DATABASE_DESIGN §3.2). El estado operativo real del pedido
// vive en `envios.estado_envio_id`.
const ORDER_STATUS = Object.freeze({
  PENDIENTE: 'pendiente',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado',
});

// Estado con el que nace el pedido derivado de una oferta aceptada.
const DEFAULT_ORDER_STATUS = ORDER_STATUS.PENDIENTE;

// Prefijo de `pedidos.codigo`: `ORD-` más el id a seis dígitos.
const ORDER_CODE_PREFIX = 'ORD-';

module.exports = { ORDER_STATUS, DEFAULT_ORDER_STATUS, ORDER_CODE_PREFIX };
