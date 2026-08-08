'use strict';

const { executor } = require('../database/transaction');

// Acceso a datos de tokens de verificación de correo (un solo uso).
// Usa `executor()` para poder participar en la transacción del registro
// (ver `user.repository.js`).
const emailVerificationRepository = {
  async create({ usuarioId, tokenHash, expiraAt }) {
    await executor().execute(
      `INSERT INTO email_verification_tokens (usuario_id, token_hash, expira_at)
       VALUES (:usuarioId, :tokenHash, :expiraAt)`,
      { usuarioId, tokenHash, expiraAt }
    );
  },

  async findValidByHash(tokenHash) {
    const [rows] = await executor().execute(
      `SELECT id, usuario_id, expira_at, usado_at
         FROM email_verification_tokens
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
      'UPDATE email_verification_tokens SET usado_at = CURRENT_TIMESTAMP WHERE id = :id',
      { id }
    );
  },

  async invalidateForUser(usuarioId) {
    await executor().execute(
      `UPDATE email_verification_tokens
          SET usado_at = CURRENT_TIMESTAMP
        WHERE usuario_id = :usuarioId AND usado_at IS NULL`,
      { usuarioId }
    );
  },
};

module.exports = emailVerificationRepository;
