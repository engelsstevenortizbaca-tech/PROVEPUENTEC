'use strict';

const env = require('../config/env');
const logger = require('./logger');

// Transporte de correo (stub). Aún no hay proveedor de email configurado, así
// que los mensajes se registran en el logger. Al integrar un proveedor real
// (p. ej. nodemailer/SES) basta con reemplazar la implementación de `send`.
async function send({ to, subject, text }) {
  logger.info('Correo (stub) encolado', { to, subject });
  if (!env.isProduction) {
    logger.debug(`[EMAIL] Para: ${to} · Asunto: ${subject}\n${text}`);
  }
  return { queued: true };
}

// Correo de verificación de cuenta.
async function sendVerificationEmail(to, token) {
  const link = `${env.appUrl}${env.apiPrefix}/auth/email/verify?token=${token}`;
  return send({
    to,
    subject: 'Verifica tu correo electrónico',
    text: `Confirma tu cuenta abriendo este enlace: ${link}`,
  });
}

// Correo de recuperación de contraseña.
async function sendPasswordResetEmail(to, token) {
  const link = `${env.appUrl}${env.apiPrefix}/auth/password/reset?token=${token}`;
  return send({
    to,
    subject: 'Restablece tu contraseña',
    text: `Para restablecer tu contraseña abre este enlace: ${link}`,
  });
}

module.exports = { send, sendVerificationEmail, sendPasswordResetEmail };
