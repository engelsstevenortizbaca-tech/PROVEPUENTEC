'use strict';

const env = require('../config/env');
const logger = require('../utils/logger');
const httpStatus = require('../constants/httpStatus');
const { AppError } = require('../errors');

// Manejador global de errores. Express lo identifica por tener 4 parámetros
// (el cuarto, _next, es obligatorio aunque no se use).
module.exports = (err, req, res, _next) => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : httpStatus.INTERNAL_SERVER_ERROR;

  if (statusCode >= httpStatus.INTERNAL_SERVER_ERROR) {
    logger.error(err.message, { stack: err.stack });
  } else {
    logger.warn(err.message);
  }

  const body = {
    status: 'error',
    message: isAppError || !env.isProduction ? err.message : 'Error interno del servidor',
  };

  if (isAppError && err.details !== undefined) body.details = err.details;
  if (!env.isProduction) body.stack = err.stack;

  res.status(statusCode).json(body);
};
