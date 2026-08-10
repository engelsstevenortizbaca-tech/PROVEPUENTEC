'use strict';

const jwtUtil = require('../utils/jwt');
const { UnauthorizedError } = require('../errors');

// Extrae el usuario del access token, o null si el header no aporta uno válido.
// Lanza si el token existe pero no sirve, para que quien exija autenticación
// pueda distinguir «no hay token» de «el token es inválido».
const readUser = (req) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) return null;

  const payload = jwtUtil.verifyAccessToken(token);
  if (payload.type !== 'access') {
    throw new UnauthorizedError('Token de acceso inválido');
  }

  return {
    id: Number(payload.sub),
    email: payload.email,
    roles: Array.isArray(payload.roles) ? payload.roles : [],
  };
};

// Verifica el access token (header `Authorization: Bearer <token>`) y expone
// el usuario autenticado en req.user.
const authenticate = (req, _res, next) => {
  let user;
  try {
    user = readUser(req);
  } catch (error) {
    return next(
      error instanceof UnauthorizedError
        ? error
        : new UnauthorizedError('Token de acceso inválido o expirado')
    );
  }

  if (!user) return next(new UnauthorizedError('Token de acceso requerido'));

  req.user = user;
  return next();
};

// Variante permisiva: identifica al usuario si trae un token válido y continúa
// sin él en caso contrario. La usan los endpoints públicos cuya respuesta
// depende de quién pregunta (p. ej. el dueño ve sus productos en borrador).
// Un token presente pero inválido sigue siendo 401: es un error del cliente,
// no una petición anónima.
authenticate.optional = (req, _res, next) => {
  try {
    req.user = readUser(req);
    return next();
  } catch (error) {
    return next(
      error instanceof UnauthorizedError
        ? error
        : new UnauthorizedError('Token de acceso inválido o expirado')
    );
  }
};

module.exports = authenticate;
