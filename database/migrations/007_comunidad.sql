-- =====================================================================
-- Migración 007 · Módulo: COMUNIDAD (calificaciones, comentarios, reportes)
-- =====================================================================
-- `reportes` es polimórfico (entidad_tipo + entidad_id), sin FK a la
-- entidad reportada. `comentarios` admite respuestas anidadas.
-- Sin soft delete.
-- Depende de: 002_usuarios, 003_productos, 005_ventas (calificaciones->pedidos).
-- =====================================================================

-- Reseñas con puntuación (1-5) tras una compra (compra verificada).
CREATE TABLE calificaciones (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id   BIGINT UNSIGNED NOT NULL,
  autor_id    BIGINT UNSIGNED NOT NULL COMMENT 'Comprador que califica',
  vendedor_id BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  puntuacion  TINYINT UNSIGNED NOT NULL,
  comentario  TEXT            NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_calificacion_pedido_producto (pedido_id, producto_id, autor_id),
  KEY idx_calificaciones_vendedor (vendedor_id),
  KEY idx_calificaciones_producto (producto_id),
  KEY idx_calificaciones_autor (autor_id),
  CONSTRAINT chk_calificaciones_puntuacion CHECK (puntuacion BETWEEN 1 AND 5),
  CONSTRAINT fk_calificaciones_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_calificaciones_autor FOREIGN KEY (autor_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_calificaciones_vendedor FOREIGN KEY (vendedor_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_calificaciones_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Calificaciones de compra verificada.';

-- Preguntas/comentarios públicos en la ficha de producto (con respuestas).
-- parent_id ON DELETE SET NULL: al borrar un comentario, sus respuestas
-- pasan a nivel raíz (evita el caveat de cascada auto-referenciada de MySQL).
CREATE TABLE comentarios (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  producto_id BIGINT UNSIGNED NOT NULL,
  usuario_id  BIGINT UNSIGNED NOT NULL,
  parent_id   BIGINT UNSIGNED NULL,
  contenido   TEXT            NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comentarios_producto (producto_id),
  KEY idx_comentarios_usuario (usuario_id),
  KEY idx_comentarios_parent (parent_id),
  CONSTRAINT fk_comentarios_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_comentarios_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_comentarios_parent FOREIGN KEY (parent_id)
    REFERENCES comentarios (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Comentarios en la ficha de producto.';

-- Denuncias de contenido (POLIMÓRFICO: entidad_tipo + entidad_id).
CREATE TABLE reportes (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reportante_id BIGINT UNSIGNED NOT NULL,
  revisado_por BIGINT UNSIGNED NULL,
  entidad_tipo ENUM('producto','usuario','comentario','mensaje') NOT NULL,
  entidad_id   BIGINT UNSIGNED NOT NULL,
  motivo       TEXT            NOT NULL,
  estado       ENUM('abierto','en_revision','resuelto','descartado') NOT NULL DEFAULT 'abierto',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reportes_reportante (reportante_id),
  KEY idx_reportes_revisor (revisado_por),
  KEY idx_reportes_entidad (entidad_tipo, entidad_id),
  KEY idx_reportes_estado (estado),
  CONSTRAINT fk_reportes_reportante FOREIGN KEY (reportante_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reportes_revisor FOREIGN KEY (revisado_por)
    REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Reportes/denuncias de contenido (polimórfico).';
