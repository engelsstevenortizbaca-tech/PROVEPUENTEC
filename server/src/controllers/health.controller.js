'use strict';

const httpStatus = require('../constants/httpStatus');

// GET /health → sondeo de disponibilidad del servicio.
const getHealth = (_req, res) => {
  res.status(httpStatus.OK).json({ status: 'ok' });
};

module.exports = { getHealth };
