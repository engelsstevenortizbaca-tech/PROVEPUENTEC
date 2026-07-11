'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Firma un access token (corta duración) con los datos públicos del usuario.
const signAccessToken = (payload) =>
  jwt.sign(payload, env.auth.accessSecret, {
    expiresIn: env.auth.accessExpiresIn,
  });

// Firma un refresh token (larga duración). jti permite identificarlo/revocarlo.
const signRefreshToken = (payload) =>
  jwt.sign(payload, env.auth.refreshSecret, {
    expiresIn: env.auth.refreshExpiresIn,
  });

const verifyAccessToken = (token) => jwt.verify(token, env.auth.accessSecret);

const verifyRefreshToken = (token) => jwt.verify(token, env.auth.refreshSecret);

// Decodifica sin verificar la firma (útil para leer `exp` de un token propio).
const decodeToken = (token) => jwt.decode(token);

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};
