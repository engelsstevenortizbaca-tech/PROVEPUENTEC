'use strict';

const env = require('../config/env');
const logger = require('../utils/logger');
const { withTransaction } = require('../database/transaction');
const { DEFAULT_ROLE } = require('../constants/roles');
const { hashPassword, verifyPassword } = require('../utils/password');
const { generateToken, hashToken, expiresInMinutes } = require('../utils/token');
const mailer = require('../utils/mailer');
const { toPublicUser } = require('../models/user.model');

const userRepository = require('../repositories/user.repository');
const refreshTokenRepository = require('../repositories/refreshToken.repository');
const passwordResetRepository = require('../repositories/passwordReset.repository');
const emailVerificationRepository = require('../repositories/emailVerification.repository');
const tokenService = require('./token.service');

const { ConflictError, UnauthorizedError, ForbiddenError, BadRequestError } = require('../errors');

const ACTIVE = 'activo';

// Emite un token de verificación de correo (un solo uso) invalidando los
// anteriores. Solo escribe en la BD: el envío del correo va aparte para poder
// mantenerlo fuera de una transacción.
async function createEmailVerificationToken(usuarioId) {
  await emailVerificationRepository.invalidateForUser(usuarioId);
  const rawToken = generateToken();
  await emailVerificationRepository.create({
    usuarioId,
    tokenHash: hashToken(rawToken),
    expiraAt: expiresInMinutes(env.auth.emailVerificationTtlMin),
  });
  return rawToken;
}

// Crea y envía un token de verificación de correo (un solo uso).
async function issueEmailVerification(usuarioId, email) {
  const rawToken = await createEmailVerificationToken(usuarioId);
  await mailer.sendVerificationEmail(email, rawToken);
  return rawToken;
}

async function register(data, context = {}) {
  const email = data.email.toLowerCase().trim();

  if (await userRepository.existsByEmail(email)) {
    throw new ConflictError('Ya existe una cuenta con ese correo');
  }

  // El hash se calcula antes de abrir la transacción: bcrypt tarda cientos de
  // milisegundos y no debe retener una conexión del pool.
  const passwordHash = await hashPassword(data.password);

  // Alta atómica: el usuario, su rol y el token de verificación se escriben
  // todo o nada. Sin transacción, un fallo tras `create` dejaría una cuenta sin
  // rol —inservible y no recuperable por API, porque reintentar el registro
  // devolvería 409 para siempre.
  const { usuarioId, verificationToken } = await withTransaction(async () => {
    const id = await userRepository.create({
      nombre: data.nombre,
      apellido: data.apellido,
      email,
      passwordHash,
      telefono: data.telefono || null,
    });

    // Asigna el rol por defecto. Que falte en el catálogo es un error de
    // configuración (seed de `roles` sin aplicar), no un caso normal: la cuenta
    // queda sin rol y se le deniega todo. No se interrumpe el alta para no
    // romper entornos ya existentes, pero debe quedar constancia en el log.
    const role = await userRepository.getRoleByName(DEFAULT_ROLE);
    if (role) {
      await userRepository.assignRole(id, role.id);
    } else {
      logger.warn('El rol por defecto no existe en el catálogo: la cuenta queda sin rol', {
        rol: DEFAULT_ROLE,
        usuarioId: id,
      });
    }

    return { usuarioId: id, verificationToken: await createEmailVerificationToken(id) };
  });

  // El correo se envía ya confirmada la transacción: es una operación de red y
  // mantenerla dentro alargaría la transacción y sus bloqueos.
  await mailer.sendVerificationEmail(email, verificationToken);

  const user = await userRepository.findById(usuarioId);
  const roles = await userRepository.getRolesByUserId(usuarioId);
  const tokens = await tokenService.issueTokens(user, roles, context);

  return { user: toPublicUser(user, roles), tokens };
}

async function login({ email, password }, context = {}) {
  const normalized = email.toLowerCase().trim();
  const user = await userRepository.findByEmail(normalized);

  // Mensaje genérico para no revelar si el correo existe.
  if (!user) throw new UnauthorizedError('Credenciales inválidas');

  const passwordOk = await verifyPassword(password, user.password_hash);
  if (!passwordOk) throw new UnauthorizedError('Credenciales inválidas');

  if (user.deleted_at || user.estado !== ACTIVE) {
    throw new ForbiddenError('La cuenta no está activa');
  }

  if (env.auth.requireVerifiedEmail && !user.email_verificado_at) {
    throw new ForbiddenError('Debes verificar tu correo antes de iniciar sesión');
  }

  const roles = await userRepository.getRolesByUserId(user.id);
  const tokens = await tokenService.issueTokens(user, roles, context);

  return { user: toPublicUser(user, roles), tokens };
}

async function refresh(rawToken, context = {}) {
  const payload = await tokenService.consumeRefreshToken(rawToken);
  const user = await userRepository.findById(Number(payload.sub));

  if (!user || user.deleted_at || user.estado !== ACTIVE) {
    throw new UnauthorizedError('La sesión ya no es válida');
  }

  const roles = await userRepository.getRolesByUserId(user.id);
  const tokens = await tokenService.issueTokens(user, roles, context);

  return { user: toPublicUser(user, roles), tokens };
}

async function logout(rawToken) {
  await tokenService.revokeRefreshToken(rawToken);
}

async function logoutAll(usuarioId) {
  await refreshTokenRepository.revokeAllForUser(usuarioId);
}

async function changePassword(usuarioId, currentPassword, newPassword) {
  const user = await userRepository.findById(usuarioId);
  if (!user) throw new UnauthorizedError('Sesión inválida');

  const ok = await verifyPassword(currentPassword, user.password_hash);
  if (!ok) throw new UnauthorizedError('La contraseña actual es incorrecta');

  const passwordHash = await hashPassword(newPassword);

  // Atómico: si la revocación fallara por separado, la contraseña quedaría
  // cambiada pero las sesiones anteriores seguirían siendo válidas.
  await withTransaction(async () => {
    await userRepository.updatePasswordHash(usuarioId, passwordHash);
    // Cierra todas las sesiones abiertas por seguridad.
    await refreshTokenRepository.revokeAllForUser(usuarioId);
  });
}

async function forgotPassword(email) {
  const normalized = email.toLowerCase().trim();
  const user = await userRepository.findByEmail(normalized);

  // Respuesta idéntica exista o no la cuenta (no filtrar información).
  if (!user || user.deleted_at || user.estado !== ACTIVE) {
    logger.info('Solicitud de recuperación para correo inexistente/inactivo', {
      email: normalized,
    });
    return;
  }

  const rawToken = generateToken();

  // Invalidar los tokens previos y emitir el nuevo deben ocurrir juntos: si solo
  // se invalidara, el usuario se quedaría sin token válido y sin correo.
  await withTransaction(async () => {
    await passwordResetRepository.invalidateForUser(user.id);
    await passwordResetRepository.create({
      usuarioId: user.id,
      tokenHash: hashToken(rawToken),
      expiraAt: expiresInMinutes(env.auth.passwordResetTtlMin),
    });
  });

  // Fuera de la transacción: es una operación de red.
  await mailer.sendPasswordResetEmail(user.email, rawToken);
}

async function resetPassword(rawToken, newPassword) {
  const record = await passwordResetRepository.findValidByHash(hashToken(rawToken));
  if (!record) throw new BadRequestError('Token inválido o expirado');

  const passwordHash = await hashPassword(newPassword);

  // Atómico: consumir el token sin llegar a cambiar la contraseña obligaría a
  // solicitar la recuperación de nuevo.
  await withTransaction(async () => {
    await passwordResetRepository.markUsed(record.id);
    await userRepository.updatePasswordHash(record.usuario_id, passwordHash);
    await refreshTokenRepository.revokeAllForUser(record.usuario_id);
  });
}

async function verifyEmail(rawToken) {
  const record = await emailVerificationRepository.findValidByHash(hashToken(rawToken));
  if (!record) throw new BadRequestError('Token inválido o expirado');

  // Atómico: consumir el token sin marcar el correo como verificado dejaría la
  // cuenta sin verificar y sin token con el que reintentarlo.
  await withTransaction(async () => {
    await emailVerificationRepository.markUsed(record.id);
    await userRepository.markEmailVerified(record.usuario_id);
  });
}

async function resendVerification(email) {
  const normalized = email.toLowerCase().trim();
  const user = await userRepository.findByEmail(normalized);

  // Respuesta genérica; solo se reenvía si procede.
  if (!user || user.email_verificado_at || user.deleted_at || user.estado !== ACTIVE) {
    return;
  }
  await issueEmailVerification(user.id, user.email);
}

async function getProfile(usuarioId) {
  const user = await userRepository.findById(usuarioId);
  if (!user) throw new UnauthorizedError('Sesión inválida');
  const roles = await userRepository.getRolesByUserId(usuarioId);
  return toPublicUser(user, roles);
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  getProfile,
};
