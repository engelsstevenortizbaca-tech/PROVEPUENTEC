-- =====================================================================
-- Migración 001 · Módulo: UBICACIONES (normalización geográfica)
-- =====================================================================
-- Se crea primero porque `direcciones` (módulo Usuarios) referencia
-- `ciudades`. Jerarquía: paises -> departamentos -> ciudades.
-- Motor: InnoDB · Charset: utf8mb4 · Collation: utf8mb4_unicode_ci
-- =====================================================================

-- Países disponibles en la plataforma.
CREATE TABLE paises (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(100)    NOT NULL,
  iso2        CHAR(2)         NOT NULL COMMENT 'Código ISO 3166-1 alfa-2 (ej. PE, CO)',
  iso3        CHAR(3)         NULL     COMMENT 'Código ISO 3166-1 alfa-3 (ej. PER, COL)',
  activo      TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_paises_iso2 (iso2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Catálogo de países.';

-- División administrativa de primer nivel (departamento/estado/provincia).
CREATE TABLE departamentos (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pais_id     BIGINT UNSIGNED NOT NULL,
  nombre      VARCHAR(120)    NOT NULL,
  activo      TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_departamentos_pais_nombre (pais_id, nombre),
  CONSTRAINT fk_departamentos_pais FOREIGN KEY (pais_id)
    REFERENCES paises (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Departamentos/estados por país.';

-- Ciudades/municipios.
CREATE TABLE ciudades (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  departamento_id  BIGINT UNSIGNED NOT NULL,
  nombre           VARCHAR(120)    NOT NULL,
  activo           TINYINT(1)      NOT NULL DEFAULT 1,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ciudades_depto_nombre (departamento_id, nombre),
  CONSTRAINT fk_ciudades_departamento FOREIGN KEY (departamento_id)
    REFERENCES departamentos (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Ciudades/municipios por departamento.';
