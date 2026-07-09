-- =====================================================================
-- Migración 004 · Módulo: ADMINISTRACIÓN (config, marketing, auditoría)
-- =====================================================================
-- Se aplica antes de Ventas porque `pedidos.cupon_id` -> `cupones`.
-- Sin soft delete. `logs` y `auditoria` son históricas (solo created_at).
-- Depende de: 002_usuarios (auditoria.usuario_id -> usuarios).
-- =====================================================================

-- Cupones de descuento aplicables a un pedido.
CREATE TABLE cupones (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo        VARCHAR(40)     NOT NULL,
  tipo          ENUM('porcentaje','monto_fijo') NOT NULL,
  valor         DECIMAL(12,2)   NOT NULL,
  usos_maximos  INT             NULL COMMENT 'NULL = ilimitado',
  usos_actuales INT             NOT NULL DEFAULT 0,
  minimo_compra DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  inicia_at     DATETIME        NULL,
  expira_at     DATETIME        NULL,
  activo        TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cupones_codigo (codigo),
  CONSTRAINT chk_cupones_valor CHECK (valor >= 0),
  CONSTRAINT chk_cupones_usos CHECK (usos_actuales >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cupones de descuento.';

-- Parámetros globales de la plataforma (clave/valor).
CREATE TABLE configuraciones (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  clave       VARCHAR(120)    NOT NULL,
  valor       TEXT            NULL,
  tipo        ENUM('string','int','bool','json') NOT NULL DEFAULT 'string',
  descripcion VARCHAR(255)    NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_configuraciones_clave (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Configuración global (clave/valor).';

-- Banners promocionales del home/campañas.
CREATE TABLE banners (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo      VARCHAR(150)    NOT NULL,
  imagen_url  VARCHAR(500)    NOT NULL,
  enlace      VARCHAR(500)    NULL,
  posicion    VARCHAR(60)     NULL COMMENT 'Ubicación en la UI (home_top, sidebar...)',
  activo      TINYINT(1)      NOT NULL DEFAULT 1,
  inicia_at   DATETIME        NULL,
  termina_at  DATETIME        NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_banners_posicion (posicion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Banners promocionales.';

-- Log técnico de la aplicación (histórico: solo created_at).
CREATE TABLE logs (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nivel      ENUM('debug','info','warning','error','critical') NOT NULL DEFAULT 'info',
  canal      VARCHAR(60)     NULL,
  mensaje    TEXT            NOT NULL,
  contexto   JSON            NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_logs_nivel (nivel),
  KEY idx_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Eventos técnicos de la aplicación.';

-- Rastro de auditoría de cambios (histórico: solo created_at).
CREATE TABLE auditoria (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id     BIGINT UNSIGNED NULL COMMENT 'NULL = proceso del sistema',
  accion         ENUM('crear','actualizar','eliminar') NOT NULL,
  tabla          VARCHAR(64)     NOT NULL,
  registro_id    BIGINT UNSIGNED NULL,
  datos_antes    JSON            NULL,
  datos_despues  JSON            NULL,
  ip             VARCHAR(45)     NULL COMMENT 'IPv4/IPv6',
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auditoria_usuario (usuario_id),
  KEY idx_auditoria_tabla_registro (tabla, registro_id),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Auditoría de cambios sobre registros sensibles.';
