'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const httpStatus = require('../constants/httpStatus');

// Respuesta uniforme con el mismo formato que el manejador global de errores.
const handler = (_req, res) => {
  res.status(httpStatus.TOO_MANY_REQUESTS).json({
    status: 'error',
    message: 'Demasiadas peticiones. Inténtalo de nuevo más tarde.',
  });
};

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  handler,
};

// Límite general de la API.
const globalLimiter = rateLimit({
  ...base,
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.max,
});

// Límite estricto para los endpoints que verifican credenciales o envían
// correo. El cupo global (compartido con todo el tráfico de lectura) es
// demasiado holgado para frenar un ataque de fuerza bruta sobre contraseñas.
const authLimiter = rateLimit({
  ...base,
  windowMs: env.rateLimit.authWindowMs,
  limit: env.rateLimit.authMax,
  // Cuenta solo los intentos fallidos: no penaliza al usuario que acierta.
  skipSuccessfulRequests: true,
});

module.exports = { globalLimiter, authLimiter };
