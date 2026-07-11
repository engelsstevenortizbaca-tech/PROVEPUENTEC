'use strict';

const jwtUtil = require('../utils/jwt');
const { UnauthorizedError } = require('../errors');

// Verifica el access token (header `Authorization: Bearer <token>`) y expone
// el usuario autenticado en req.user.
module.exports = (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new UnauthorizedError('Token de acceso requerido'));
  }

  try {
    const payload = jwtUtil.verifyAccessToken(token);
    if (payload.type !== 'access') {
      return next(new UnauthorizedError('Token de acceso inválido'));
    }
    req.user = {
      id: Number(payload.sub),
      email: payload.email,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    };
    return next();
  } catch {
    return next(new UnauthorizedError('Token de acceso inválido o expirado'));
  }
};
