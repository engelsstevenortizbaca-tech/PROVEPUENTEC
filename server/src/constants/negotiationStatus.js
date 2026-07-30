'use strict';

// Valores del ENUM `negociaciones.estado` (DATABASE_DESIGN §4.3).
const NEGOTIATION_STATUS = Object.freeze({
  ABIERTA: 'abierta',
  ACEPTADA: 'aceptada',
  RECHAZADA: 'rechazada',
  CANCELADA: 'cancelada',
  EXPIRADA: 'expirada',
});

const DEFAULT_NEGOTIATION_STATUS = NEGOTIATION_STATUS.ABIERTA;

// Estados sin salida: una negociación terminal no vuelve a abrirse.
const TERMINAL_NEGOTIATION_STATUSES = Object.freeze([
  NEGOTIATION_STATUS.ACEPTADA,
  NEGOTIATION_STATUS.RECHAZADA,
  NEGOTIATION_STATUS.CANCELADA,
  NEGOTIATION_STATUS.EXPIRADA,
]);

module.exports = {
  NEGOTIATION_STATUS,
  DEFAULT_NEGOTIATION_STATUS,
  TERMINAL_NEGOTIATION_STATUSES,
};
