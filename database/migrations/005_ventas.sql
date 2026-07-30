-- =====================================================================
-- Migración 005 · Módulo: VENTAS (carrito, pedidos, pagos)
-- =====================================================================
-- Estados de pedido y métodos de pago normalizados a tablas catálogo.
-- Sin soft delete. `detalle_pedido` es histórico (solo created_at).
-- Depende de: 002_usuarios, 003_productos, 004_administracion (cupones).
-- =====================================================================

-- Catálogo de estados de pedido (reemplaza ENUM).
CREATE TABLE estados_pedido (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  clave       VARCHAR(40)     NOT NULL COMMENT 'Identificador técnico (ej. pendiente)',
  nombre      VARCHAR(80)     NOT NULL,
  orden       INT             NOT NULL DEFAULT 0 COMMENT 'Orden en el flujo',
  es_final    TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Estado terminal (entregado/cancelado)',
  activo      TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_estados_pedido_clave (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Catálogo de estados de pedido.';

-- Catálogo de métodos de pago (reemplaza ENUM).
CREATE TABLE metodos_pago (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  clave       VARCHAR(40)     NOT NULL COMMENT 'Identificador técnico (ej. tarjeta)',
  nombre      VARCHAR(80)     NOT NULL,
  activo      TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_metodos_pago_clave (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Catálogo de métodos de pago.';

-- Cabecera del carrito (un carrito activo por usuario, regla de aplicación).
CREATE TABLE carritos (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  BIGINT UNSIGNED NOT NULL,
  estado      ENUM('activo','convertido','abandonado') NOT NULL DEFAULT 'activo',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_carritos_usuario (usuario_id),
  CONSTRAINT fk_carritos_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cabecera del carrito de compra.';

-- Líneas del carrito. Precio congelado al agregar. Siempre por variante.
CREATE TABLE carrito_items (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  carrito_id      BIGINT UNSIGNED NOT NULL,
  producto_id     BIGINT UNSIGNED NOT NULL,
  variante_id     BIGINT UNSIGNED NOT NULL,
  cantidad        INT             NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_carrito_item (carrito_id, variante_id),
  KEY idx_carrito_items_producto (producto_id),
  KEY idx_carrito_items_variante (variante_id),
  CONSTRAINT chk_carrito_cantidad CHECK (cantidad > 0),
  CONSTRAINT fk_carrito_items_carrito FOREIGN KEY (carrito_id)
    REFERENCES carritos (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_carrito_items_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_carrito_items_variante FOREIGN KEY (variante_id)
    REFERENCES producto_variantes (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Líneas del carrito.';

-- Cabecera de pedido confirmado.
CREATE TABLE pedidos (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo       VARCHAR(30)     NOT NULL COMMENT 'Código legible único (ej. ORD-000123)',
  comprador_id BIGINT UNSIGNED NOT NULL,
  direccion_id BIGINT UNSIGNED NOT NULL,
  estado_id    BIGINT UNSIGNED NOT NULL,
  cupon_id     BIGINT UNSIGNED NULL,
  subtotal     DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  descuento    DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  envio        DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  total        DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pedidos_codigo (codigo),
  KEY idx_pedidos_comprador (comprador_id),
  KEY idx_pedidos_direccion (direccion_id),
  KEY idx_pedidos_estado (estado_id),
  KEY idx_pedidos_cupon (cupon_id),
  CONSTRAINT fk_pedidos_comprador FOREIGN KEY (comprador_id)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pedidos_direccion FOREIGN KEY (direccion_id)
    REFERENCES direcciones (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pedidos_estado FOREIGN KEY (estado_id)
    REFERENCES estados_pedido (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pedidos_cupon FOREIGN KEY (cupon_id)
    REFERENCES cupones (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Pedidos confirmados (cabecera).';

-- Líneas del pedido con precio histórico (histórico: solo created_at).
CREATE TABLE detalle_pedido (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id       BIGINT UNSIGNED NOT NULL,
  producto_id     BIGINT UNSIGNED NOT NULL,
  variante_id     BIGINT UNSIGNED NOT NULL,
  vendedor_id     BIGINT UNSIGNED NOT NULL COMMENT 'Desnormalizado para reportes por vendedor',
  cantidad        INT             NOT NULL,
  precio_unitario DECIMAL(12,2)   NOT NULL,
  subtotal        DECIMAL(12,2)   NOT NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_detalle_pedido_pedido (pedido_id),
  KEY idx_detalle_pedido_producto (producto_id),
  KEY idx_detalle_pedido_variante (variante_id),
  KEY idx_detalle_pedido_vendedor (vendedor_id),
  CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
  CONSTRAINT fk_detalle_pedido_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_detalle_pedido_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_detalle_pedido_variante FOREIGN KEY (variante_id)
    REFERENCES producto_variantes (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_detalle_pedido_vendedor FOREIGN KEY (vendedor_id)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Detalle (líneas) de cada pedido.';

-- Intentos/confirmaciones de pago de un pedido.
CREATE TABLE pagos (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id          BIGINT UNSIGNED NOT NULL,
  metodo_pago_id     BIGINT UNSIGNED NOT NULL,
  estado             ENUM('iniciado','aprobado','rechazado','reembolsado') NOT NULL DEFAULT 'iniciado',
  monto              DECIMAL(12,2)   NOT NULL,
  referencia_externa VARCHAR(120)    NULL COMMENT 'ID de la pasarela de pago',
  created_at         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pagos_pedido (pedido_id),
  KEY idx_pagos_metodo (metodo_pago_id),
  CONSTRAINT chk_pagos_monto CHECK (monto >= 0),
  CONSTRAINT fk_pagos_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pagos_metodo FOREIGN KEY (metodo_pago_id)
    REFERENCES metodos_pago (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Pagos por pedido.';
