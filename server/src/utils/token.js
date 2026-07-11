'use strict';

const crypto = require('crypto');

// Genera un token aleatorio en hex (para enviar por correo o como refresh id).
const generateToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

// Hash determinista (SHA-256) para almacenar tokens sin guardarlos en claro.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Fecha de expiración a partir de "ahora" + minutos.
const expiresInMinutes = (minutes) => new Date(Date.now() + minutes * 60 * 1000);

module.exports = { generateToken, hashToken, expiresInMinutes };
