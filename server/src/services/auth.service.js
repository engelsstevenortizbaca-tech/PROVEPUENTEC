'use strict';

const env = require('../config/env');
const logger = require('../utils/logger');
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

// Crea y envía un token de verificación de correo (un solo uso).
async function issueEmailVerification(usuarioId, email) {
  await emailVerificationRepository.invalidateForUser(usuarioId);
  const rawToken = generateToken();
  await emailVerificationRepository.create({
    usuarioId,
    tokenHash: hashToken(rawToken),
    expiraAt: expiresInMinutes(env.auth.emailVerificationTtlMin),
  });
  await mailer.sendVerificationEmail(email, rawToken);
  return rawToken;
}

async function register(data, context = {}) {
  const email = data.email.toLowerCase().trim();

  if (await userRepository.existsByEmail(email)) {
    throw new ConflictError('Ya existe una cuenta con ese correo');
  }

  const passwordHash = await hashPassword(data.password);
  const usuarioId = await userRepository.create({
    nombre: data.nombre,
    apellido: data.apellido,
    email,
    passwordHash,
    telefono: data.telefono || null,
  });

  // Asigna el rol por defecto si el catálogo lo tiene.
  const role = await userRepository.getRoleByName(DEFAULT_ROLE);
  if (role) await userRepository.assignRole(usuarioId, role.id);

  await issueEmailVerification(usuarioId, email);

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

  await userRepository.updatePasswordHash(usuarioId, await hashPassword(newPassword));
  // Cierra todas las sesiones abiertas por seguridad.
  await refreshTokenRepository.revokeAllForUser(usuarioId);
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

  await passwordResetRepository.invalidateForUser(user.id);
  const rawToken = generateToken();
  await passwordResetRepository.create({
    usuarioId: user.id,
    tokenHash: hashToken(rawToken),
    expiraAt: expiresInMinutes(env.auth.passwordResetTtlMin),
  });
  await mailer.sendPasswordResetEmail(user.email, rawToken);
}

async function resetPassword(rawToken, newPassword) {
  const record = await passwordResetRepository.findValidByHash(hashToken(rawToken));
  if (!record) throw new BadRequestError('Token inválido o expirado');

  await passwordResetRepository.markUsed(record.id);
  await userRepository.updatePasswordHash(record.usuario_id, await hashPassword(newPassword));
  await refreshTokenRepository.revokeAllForUser(record.usuario_id);
}

async function verifyEmail(rawToken) {
  const record = await emailVerificationRepository.findValidByHash(hashToken(rawToken));
  if (!record) throw new BadRequestError('Token inválido o expirado');

  await emailVerificationRepository.markUsed(record.id);
  await userRepository.markEmailVerified(record.usuario_id);
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
