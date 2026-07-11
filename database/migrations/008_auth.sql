-- =====================================================================
-- Migración 008 · Módulo: AUTENTICACIÓN (tokens de sesión y de un solo uso)
-- =====================================================================
-- ADITIVA: no modifica tablas existentes. Añade almacenamiento para
-- refresh tokens y tokens de un solo uso (verificación de correo y
-- restablecimiento de contraseña). Todos los tokens se guardan HASHEADOS.
-- Depende de: 002_usuarios (todas referencian usuarios.id).
-- Motor: InnoDB · Charset: utf8mb4 · Collation: utf8mb4_unicode_ci
-- =====================================================================

-- Refresh tokens emitidos a un usuario (rotación + revocación / logout).
CREATE TABLE refresh_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  BIGINT UNSIGNED NOT NULL,
  jti         CHAR(36)        NOT NULL COMMENT 'Identificador único del token (claim jti)',
  token_hash  CHAR(64)        NOT NULL COMMENT 'SHA-256 del refresh token (nunca en claro)',
  user_agent  VARCHAR(255)    NULL,
  ip          VARCHAR(45)     NULL COMMENT 'IPv4/IPv6',
  expira_at   DATETIME        NOT NULL,
  revocado_at DATETIME        NULL COMMENT 'Marca de revocación (logout/rotación)',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_jti (jti),
  KEY idx_refresh_tokens_usuario (usuario_id),
  KEY idx_refresh_tokens_expira (expira_at),
  CONSTRAINT fk_refresh_tokens_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Refresh tokens activos por usuario.';

-- Tokens de restablecimiento de contraseña (un solo uso).
CREATE TABLE password_reset_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64)        NOT NULL COMMENT 'SHA-256 del token enviado por correo',
  expira_at   DATETIME        NOT NULL,
  usado_at    DATETIME        NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_token_hash (token_hash),
  KEY idx_password_reset_usuario (usuario_id),
  CONSTRAINT fk_password_reset_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tokens de recuperación de contraseña (un solo uso).';

-- Tokens de verificación de correo electrónico (un solo uso).
CREATE TABLE email_verification_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64)        NOT NULL COMMENT 'SHA-256 del token enviado por correo',
  expira_at   DATETIME        NOT NULL,
  usado_at    DATETIME        NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_verification_token_hash (token_hash),
  KEY idx_email_verification_usuario (usuario_id),
  CONSTRAINT fk_email_verification_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tokens de verificación de correo (un solo uso).';
