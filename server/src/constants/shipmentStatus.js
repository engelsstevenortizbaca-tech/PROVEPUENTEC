'use strict';

// Claves del catálogo `estados_envio` (DATABASE_DESIGN §14.2). La tabla guarda
// además `orden` y `es_final`; aquí solo viven las claves y la topología del
// flujo, que la máquina de estados de `shipment.service.js` consulta.
const SHIPMENT_STATUS = Object.freeze({
  PENDIENTE: 'pendiente',
  PREPARANDO: 'preparando',
  ENVIADO: 'enviado',
  EN_TRANSITO: 'en_transito',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado',
});

// Estado con el que nace todo envío al aceptarse una oferta.
const DEFAULT_SHIPMENT_STATUS = SHIPMENT_STATUS.PENDIENTE;

// Estados finales: no admiten ninguna transición de salida.
const FINAL_SHIPMENT_STATUSES = Object.freeze([
  SHIPMENT_STATUS.ENTREGADO,
  SHIPMENT_STATUS.CANCELADO,
]);

// Estados en los que el envío aún no ha salido: solo aquí se puede cancelar
// el pedido (DATABASE_DESIGN §12 paso 6b).
const PRE_DISPATCH_SHIPMENT_STATUSES = Object.freeze([
  SHIPMENT_STATUS.PENDIENTE,
  SHIPMENT_STATUS.PREPARANDO,
]);

// Transiciones admitidas. Avance lineal de un solo paso, más `cancelado`
// alcanzable desde cualquier estado no final. Retrocesos y saltos: 409.
const SHIPMENT_TRANSITIONS = Object.freeze({
  [SHIPMENT_STATUS.PENDIENTE]: Object.freeze([
    SHIPMENT_STATUS.PREPARANDO,
    SHIPMENT_STATUS.CANCELADO,
  ]),
  [SHIPMENT_STATUS.PREPARANDO]: Object.freeze([SHIPMENT_STATUS.ENVIADO, SHIPMENT_STATUS.CANCELADO]),
  [SHIPMENT_STATUS.ENVIADO]: Object.freeze([
    SHIPMENT_STATUS.EN_TRANSITO,
    SHIPMENT_STATUS.CANCELADO,
  ]),
  [SHIPMENT_STATUS.EN_TRANSITO]: Object.freeze([
    SHIPMENT_STATUS.ENTREGADO,
    SHIPMENT_STATUS.CANCELADO,
  ]),
  [SHIPMENT_STATUS.ENTREGADO]: Object.freeze([]),
  [SHIPMENT_STATUS.CANCELADO]: Object.freeze([]),
});

module.exports = {
  SHIPMENT_STATUS,
  DEFAULT_SHIPMENT_STATUS,
  FINAL_SHIPMENT_STATUSES,
  PRE_DISPATCH_SHIPMENT_STATUSES,
  SHIPMENT_TRANSITIONS,
};
