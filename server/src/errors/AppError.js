'use strict';

const httpStatus = require('../constants/httpStatus');

/**
 * Error base de la aplicación. Los errores "operacionales" (esperables:
 * validación, no encontrado, etc.) heredan de esta clase y llevan un
 * statusCode HTTP, de modo que el manejador global sabe cómo responderlos.
 */
class AppError extends Error {
  constructor(message, statusCode = httpStatus.INTERNAL_SERVER_ERROR, details = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    if (details !== undefined) this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
