'use strict';

const { executor } = require('../database/transaction');

// Acceso a datos de tokens de restablecimiento de contraseña (un solo uso).
const passwordResetRepository = {
  async create({ usuarioId, tokenHash, expiraAt }) {
    await executor().execute(
      `INSERT INTO password_reset_tokens (usuario_id, token_hash, expira_at)
       VALUES (:usuarioId, :tokenHash, :expiraAt)`,
      { usuarioId, tokenHash, expiraAt }
    );
  },

  async findValidByHash(tokenHash) {
    const [rows] = await executor().execute(
      `SELECT id, usuario_id, expira_at, usado_at
         FROM password_reset_tokens
        WHERE token_hash = :tokenHash
          AND usado_at IS NULL
          AND expira_at > CURRENT_TIMESTAMP
        LIMIT 1`,
      { tokenHash }
    );
    return rows[0] || null;
  },

  async markUsed(id) {
    await executor().execute(
      'UPDATE password_reset_tokens SET usado_at = CURRENT_TIMESTAMP WHERE id = :id',
      { id }
    );
  },

  // Invalida tokens previos aún vigentes del usuario (uno activo a la vez).
  async invalidateForUser(usuarioId) {
    await executor().execute(
      `UPDATE password_reset_tokens
          SET usado_at = CURRENT_TIMESTAMP
        WHERE usuario_id = :usuarioId AND usado_at IS NULL`,
      { usuarioId }
    );
  },
};

module.exports = passwordResetRepository;
