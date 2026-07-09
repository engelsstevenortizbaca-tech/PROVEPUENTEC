-- =====================================================================
-- Migración 002 · Módulo: USUARIOS (cuentas, RBAC y direcciones)
-- =====================================================================
-- RBAC: roles + permisos + puentes usuario_rol / rol_permiso.
-- Soft delete en: usuarios, direcciones (NO en tablas puente).
-- Depende de: 001_ubicaciones (direcciones -> ciudades).
-- =====================================================================

-- Catálogo de roles del sistema (admin, vendedor, comprador, soporte...).
CREATE TABLE roles (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(60)     NOT NULL,
  descripcion VARCHAR(255)    NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Roles asignables a los usuarios (RBAC).';

-- Acciones atómicas autorizables (producto.crear, pedido.reembolsar...).
CREATE TABLE permisos (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(100)    NOT NULL,
  clave       VARCHAR(100)    NOT NULL COMMENT 'Identificador técnico único (ej. producto.crear)',
  descripcion VARCHAR(255)    NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permisos_clave (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Permisos atómicos (RBAC).';

-- Puente N:M roles <-> permisos. Sin soft delete (tabla puente).
CREATE TABLE rol_permiso (
  rol_id      BIGINT UNSIGNED NOT NULL,
  permiso_id  BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (rol_id, permiso_id),
  KEY idx_rol_permiso_permiso (permiso_id),
  CONSTRAINT fk_rol_permiso_rol FOREIGN KEY (rol_id)
    REFERENCES roles (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rol_permiso_permiso FOREIGN KEY (permiso_id)
    REFERENCES permisos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Asignación de permisos a roles.';

-- Cuentas de la plataforma (compradores y vendedores). Soft delete.
CREATE TABLE usuarios (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre              VARCHAR(80)     NOT NULL,
  apellido            VARCHAR(80)     NOT NULL,
  email               VARCHAR(180)    NOT NULL,
  password_hash       VARCHAR(255)    NOT NULL,
  telefono            VARCHAR(30)     NULL,
  avatar_url          VARCHAR(500)    NULL,
  estado              ENUM('activo','suspendido','eliminado') NOT NULL DEFAULT 'activo',
  email_verificado_at DATETIME        NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at          DATETIME        NULL COMMENT 'Soft delete',
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Usuarios de la plataforma.';

-- Puente N:M usuarios <-> roles. Sin soft delete (tabla puente).
CREATE TABLE usuario_rol (
  usuario_id  BIGINT UNSIGNED NOT NULL,
  rol_id      BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, rol_id),
  KEY idx_usuario_rol_rol (rol_id),
  CONSTRAINT fk_usuario_rol_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_usuario_rol_rol FOREIGN KEY (rol_id)
    REFERENCES roles (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Roles asignados a cada usuario.';

-- Direcciones de envío/facturación. Ubicación normalizada (ciudad_id). Soft delete.
CREATE TABLE direcciones (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id    BIGINT UNSIGNED NOT NULL,
  ciudad_id     BIGINT UNSIGNED NOT NULL,
  alias         VARCHAR(60)     NULL COMMENT 'Ej. Casa, Trabajo',
  calle         VARCHAR(180)    NOT NULL,
  numero        VARCHAR(30)     NULL,
  referencia    VARCHAR(255)    NULL,
  codigo_postal VARCHAR(20)     NULL,
  es_principal  TINYINT(1)      NOT NULL DEFAULT 0,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME        NULL COMMENT 'Soft delete',
  PRIMARY KEY (id),
  KEY idx_direcciones_usuario (usuario_id),
  KEY idx_direcciones_ciudad (ciudad_id),
  CONSTRAINT fk_direcciones_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_direcciones_ciudad FOREIGN KEY (ciudad_id)
    REFERENCES ciudades (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Direcciones de los usuarios.';
