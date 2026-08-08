'use strict';

const { validationResult } = require('express-validator');
const { ValidationError } = require('../errors');

// Recolecta los errores de express-validator y responde 422 de forma uniforme.
module.exports = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((err) => ({
    field: err.path,
    message: err.msg,
  }));
  return next(new ValidationError('Datos de entrada inválidos', details));
};
