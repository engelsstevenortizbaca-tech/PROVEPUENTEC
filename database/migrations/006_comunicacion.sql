-- =====================================================================
-- Migración 006 · Módulo: COMUNICACIÓN (chat y notificaciones)
-- =====================================================================
-- Participantes de conversación por tabla puente (permite 1:1 y grupos).
-- Tipos de notificación normalizados a catálogo.
-- Sin soft delete. `mensajes`/`notificaciones` históricas (solo created_at).
-- Depende de: 002_usuarios, 003_productos.
-- =====================================================================

-- Hilo de chat, normalmente sobre un producto.
CREATE TABLE conversaciones (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  producto_id       BIGINT UNSIGNED NULL,
  ultimo_mensaje_at DATETIME        NULL,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_conversaciones_producto (producto_id),
  CONSTRAINT fk_conversaciones_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Conversaciones de chat.';

-- Puente N:M conversaciones <-> usuarios con estado de lectura. Sin soft delete.
CREATE TABLE conversacion_participantes (
  conversacion_id     BIGINT UNSIGNED NOT NULL,
  usuario_id          BIGINT UNSIGNED NOT NULL,
  rol_en_conversacion ENUM('comprador','vendedor','soporte') NOT NULL,
  ultimo_leido_at     DATETIME        NULL,
  silenciado          TINYINT(1)      NOT NULL DEFAULT 0,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (conversacion_id, usuario_id),
  KEY idx_conv_part_usuario (usuario_id),
  CONSTRAINT fk_conv_part_conversacion FOREIGN KEY (conversacion_id)
    REFERENCES conversaciones (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_conv_part_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Participantes de cada conversación.';

-- Mensajes de una conversación (histórico: solo created_at).
CREATE TABLE mensajes (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversacion_id BIGINT UNSIGNED NOT NULL,
  emisor_id       BIGINT UNSIGNED NOT NULL,
  contenido       TEXT            NOT NULL,
  leido_at        DATETIME        NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mensajes_conversacion (conversacion_id),
  KEY idx_mensajes_emisor (emisor_id),
  CONSTRAINT fk_mensajes_conversacion FOREIGN KEY (conversacion_id)
    REFERENCES conversaciones (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_mensajes_emisor FOREIGN KEY (emisor_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Mensajes de chat.';

-- Catálogo de tipos de notificación con su plantilla.
CREATE TABLE tipos_notificacion (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  clave       VARCHAR(60)     NOT NULL COMMENT 'Identificador técnico (ej. nuevo_mensaje)',
  nombre      VARCHAR(120)    NOT NULL,
  plantilla   TEXT            NULL COMMENT 'Plantilla de texto con placeholders',
  icono       VARCHAR(60)     NULL,
  activo      TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tipos_notificacion_clave (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Catálogo de tipos de notificación.';

-- Notificaciones al usuario (histórico: solo created_at).
CREATE TABLE notificaciones (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id            BIGINT UNSIGNED NOT NULL,
  tipo_notificacion_id  BIGINT UNSIGNED NOT NULL,
  titulo                VARCHAR(150)    NOT NULL,
  contenido             TEXT            NULL,
  data                  JSON            NULL COMMENT 'Payload contextual (ids, enlaces)',
  leido_at              DATETIME        NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notificaciones_usuario (usuario_id),
  KEY idx_notificaciones_tipo (tipo_notificacion_id),
  CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notificaciones_tipo FOREIGN KEY (tipo_notificacion_id)
    REFERENCES tipos_notificacion (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Notificaciones por usuario.';
