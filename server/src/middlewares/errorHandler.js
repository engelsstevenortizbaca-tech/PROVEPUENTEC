'use strict';

const env = require('../config/env');
const logger = require('../utils/logger');
const httpStatus = require('../constants/httpStatus');
const { AppError, ConflictError } = require('../errors');

// Errores de MySQL que corresponden a un conflicto con el estado actual y no a
// un fallo del servidor. Se dan en las carreras que la comprobación previa del
// service no puede evitar (dos peticiones simultáneas con el mismo slug): la
// restricción UNIQUE de la BD las detecta, y la respuesta correcta es 409.
const CONFLICT_DB_CODES = new Set(['ER_DUP_ENTRY', 'ER_ROW_IS_REFERENCED_2']);

const translate = (err) => {
  if (err instanceof AppError) return err;
  if (CONFLICT_DB_CODES.has(err.code)) {
    return new ConflictError('La operación entra en conflicto con un registro existente');
  }
  return err;
};

// Manejador global de errores. Express lo identifica por tener 4 parámetros
// (el cuarto, _next, es obligatorio aunque no se use).
module.exports = (error, req, res, _next) => {
  const err = translate(error);
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : httpStatus.INTERNAL_SERVER_ERROR;

  if (statusCode >= httpStatus.INTERNAL_SERVER_ERROR) {
    logger.error(err.message, { stack: err.stack });
  } else if (err !== error) {
    // Error traducido: se responde el código de negocio, pero en el log queda
    // la causa real (código y mensaje de MySQL) para poder diagnosticarla.
    logger.warn(err.message, { cause: error.code || error.message });
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
