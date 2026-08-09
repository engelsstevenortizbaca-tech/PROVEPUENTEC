'use strict';

const { NotFoundError } = require('../errors');

// Captura cualquier ruta no registrada y delega en el manejador de errores.
module.exports = (req, _res, next) => {
  next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};
