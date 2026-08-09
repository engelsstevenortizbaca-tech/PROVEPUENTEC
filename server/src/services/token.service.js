'use strict';

const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const jwtUtil = require('../utils/jwt');
const { hashToken } = require('../utils/token');
const refreshTokenRepository = require('../repositories/refreshToken.repository');
const { UnauthorizedError } = require('../errors');

// Emite un par access/refresh y persiste el refresh (hasheado) para poder
// revocarlo/rotarlo. `roles` viaja en el access token para RBAC sin consultar
// la BD en cada petición.
async function issueTokens(user, roles, context = {}) {
  const jti = uuidv4();

  const accessToken = jwtUtil.signAccessToken({
    sub: String(user.id),
    email: user.email,
    roles,
    type: 'access',
  });

  const refreshToken = jwtUtil.signRefreshToken({
    sub: String(user.id),
    jti,
    type: 'refresh',
  });

  const decoded = jwtUtil.decodeToken(refreshToken);
  const expiraAt = new Date(decoded.exp * 1000);

  await refreshTokenRepository.create({
    usuarioId: user.id,
    jti,
    tokenHash: hashToken(refreshToken),
    userAgent: context.userAgent || null,
    ip: context.ip || null,
    expiraAt,
  });

  return {
    tokenType: 'Bearer',
    accessToken,
    refreshToken,
    accessTokenExpiresIn: env.auth.accessExpiresIn,
    // Expiración real del refresh token. El controlador la usa para fijar la
    // caducidad de la cookie httpOnly.
    refreshTokenExpiresAt: expiraAt,
  };
}

// Verifica un refresh token entrante y lo consume (rotación): comprueba la
// firma, que exista un registro activo con ese jti y que el hash coincida, y
// lo revoca. Devuelve el payload verificado.
async function consumeRefreshToken(rawToken, { revoke = true } = {}) {
  if (!rawToken) throw new UnauthorizedError('Refresh token ausente');

  let payload;
  try {
    payload = jwtUtil.verifyRefreshToken(rawToken);
  } catch {
    throw new UnauthorizedError('Refresh token inválido o expirado');
  }

  if (payload.type !== 'refresh' || !payload.jti) {
    throw new UnauthorizedError('Refresh token inválido');
  }

  const record = await refreshTokenRepository.findActiveByJti(payload.jti);
  if (!record || record.token_hash !== hashToken(rawToken)) {
    throw new UnauthorizedError('Refresh token inválido o revocado');
  }

  if (revoke) await refreshTokenRepository.revokeByJti(payload.jti);
  return payload;
}

// Revoca un refresh token (logout). No lanza si el token es inválido: el
// objetivo (que la sesión no siga activa) ya se cumple.
async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;
  let payload;
  try {
    payload = jwtUtil.verifyRefreshToken(rawToken);
  } catch {
    return;
  }
  if (payload?.jti) await refreshTokenRepository.revokeByJti(payload.jti);
}

module.exports = { issueTokens, consumeRefreshToken, revokeRefreshToken };
