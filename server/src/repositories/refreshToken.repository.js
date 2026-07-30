'use strict';

const { executor } = require('../database/transaction');

// Acceso a datos de refresh tokens (sesiones).
const refreshTokenRepository = {
  async create({ usuarioId, jti, tokenHash, userAgent = null, ip = null, expiraAt }) {
    const [result] = await executor().execute(
      `INSERT INTO refresh_tokens (usuario_id, jti, token_hash, user_agent, ip, expira_at)
       VALUES (:usuarioId, :jti, :tokenHash, :userAgent, :ip, :expiraAt)`,
      { usuarioId, jti, tokenHash, userAgent, ip, expiraAt }
    );
    return result.insertId;
  },

  // Devuelve el token activo (no revocado ni expirado) que coincide con jti + hash.
  async findActiveByJti(jti) {
    const [rows] = await executor().execute(
      `SELECT id, usuario_id, jti, token_hash, expira_at, revocado_at
         FROM refresh_tokens
        WHERE jti = :jti
          AND revocado_at IS NULL
          AND expira_at > CURRENT_TIMESTAMP
        LIMIT 1`,
      { jti }
    );
    return rows[0] || null;
  },

  async revokeByJti(jti) {
    const [result] = await executor().execute(
      `UPDATE refresh_tokens
          SET revocado_at = CURRENT_TIMESTAMP
        WHERE jti = :jti AND revocado_at IS NULL`,
      { jti }
    );
    return result.affectedRows > 0;
  },

  async revokeAllForUser(usuarioId) {
    await executor().execute(
      `UPDATE refresh_tokens
          SET revocado_at = CURRENT_TIMESTAMP
        WHERE usuario_id = :usuarioId AND revocado_at IS NULL`,
      { usuarioId }
    );
  },
};

module.exports = refreshTokenRepository;
