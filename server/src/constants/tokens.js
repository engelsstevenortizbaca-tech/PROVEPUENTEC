'use strict';

// Tipos de token de un solo uso (para las tablas de la BD).
const TOKEN_TYPES = Object.freeze({
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
});

module.exports = { TOKEN_TYPES };
