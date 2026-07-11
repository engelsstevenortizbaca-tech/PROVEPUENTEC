'use strict';

const { ForbiddenError, UnauthorizedError } = require('../errors');

// RBAC: exige que el usuario tenga al menos uno de los roles indicados.
// Uso: authorize(ROLES.ADMIN, ROLES.SOPORTE). Debe ir después de authenticate.
module.exports =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError('No autenticado'));
    if (allowedRoles.length === 0) return next();

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return next(new ForbiddenError('No tienes permisos para realizar esta acción'));
    }
    return next();
  };
