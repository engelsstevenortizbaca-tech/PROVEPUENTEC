'use strict';

const AppError = require('./AppError');
const httpStatus = require('../constants/httpStatus');

class BadRequestError extends AppError {
  constructor(message = 'Solicitud inválida', details) {
    super(message, httpStatus.BAD_REQUEST, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado', details) {
    super(message, httpStatus.UNAUTHORIZED, details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado', details) {
    super(message, httpStatus.FORBIDDEN, details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado', details) {
    super(message, httpStatus.NOT_FOUND, details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflicto con el estado actual del recurso', details) {
    super(message, httpStatus.CONFLICT, details);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Datos de entrada inválidos', details) {
    super(message, httpStatus.UNPROCESSABLE_ENTITY, details);
  }
}

module.exports = {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
};
