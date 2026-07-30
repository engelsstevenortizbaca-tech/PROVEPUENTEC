'use strict';

// Valores del ENUM `ofertas.estado` (DATABASE_DESIGN §4.4). Una oferta es
// inmutable salvo este campo, y solo hacia un valor terminal.
const OFFER_STATUS = Object.freeze({
  PENDIENTE: 'pendiente',
  ACEPTADA: 'aceptada',
  RECHAZADA: 'rechazada',
  SUPERADA: 'superada',
  EXPIRADA: 'expirada',
});

const DEFAULT_OFFER_STATUS = OFFER_STATUS.PENDIENTE;

// Estados sin salida: una oferta terminal no transiciona a otro estado (409).
const TERMINAL_OFFER_STATUSES = Object.freeze([
  OFFER_STATUS.ACEPTADA,
  OFFER_STATUS.RECHAZADA,
  OFFER_STATUS.SUPERADA,
  OFFER_STATUS.EXPIRADA,
]);

// Valores del ENUM `ofertas.tipo`: la primera oferta abre la negociación, las
// siguientes son contraofertas.
const OFFER_TYPE = Object.freeze({
  OFERTA: 'oferta',
  CONTRAOFERTA: 'contraoferta',
});

module.exports = {
  OFFER_STATUS,
  DEFAULT_OFFER_STATUS,
  TERMINAL_OFFER_STATUSES,
  OFFER_TYPE,
};
