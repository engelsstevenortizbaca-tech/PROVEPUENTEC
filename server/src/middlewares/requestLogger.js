'use strict';

const morgan = require('morgan');
const env = require('../config/env');
const logger = require('../utils/logger');

// Parámetros de consulta que nunca deben quedar escritos en el log. El token de
// verificación de correo viaja en la URL (`GET /auth/email/verify?token=...`) y
// es de un solo uso: registrarlo en claro equivale a guardar el secreto en
// disco, justo lo que la BD evita al almacenar solo su hash SHA-256.
const REDACTED_QUERY_PARAMS = ['token', 'refreshToken', 'access_token'];

const redactUrl = (url) => {
  const [path, queryString] = String(url ?? '').split('?');
  if (!queryString) return url;

  const params = new URLSearchParams(queryString);
  let redacted = false;
  for (const name of REDACTED_QUERY_PARAMS) {
    if (params.has(name)) {
      // Sin corchetes: URLSearchParams los codificaría como %5B/%5D.
      params.set(name, 'REDACTED');
      redacted = true;
    }
  }
  return redacted ? `${path}?${params.toString()}` : url;
};

// Sustituye el token `:url` de morgan por su versión saneada. Afecta a los
// formatos "dev" y "combined", que ambos lo usan.
morgan.token('url', (req) => redactUrl(req.originalUrl || req.url));

// Logging de peticiones HTTP. En producción usa el formato "combined";
// en desarrollo el más legible "dev". Ambos se canalizan al logger.
const format = env.isProduction ? 'combined' : 'dev';

module.exports = morgan(format, { stream: logger.stream });
// Expuesto para las pruebas de la política de redacción.
module.exports.redactUrl = redactUrl;
