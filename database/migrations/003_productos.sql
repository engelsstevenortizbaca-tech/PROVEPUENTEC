-- =====================================================================
-- Migración 003 · Módulo: PRODUCTOS (catálogo, variantes, atributos)
-- =====================================================================
-- Soft delete en: categorias, productos (NO en subcategorias, variantes,
-- imágenes, atributos ni tablas históricas/puente).
-- Depende de: 002_usuarios (productos.vendedor_id -> usuarios).
-- =====================================================================

-- Marcas/fabricantes.
CREATE TABLE marcas (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(120)    NOT NULL,
  slug        VARCHAR(140)    NOT NULL,
  logo_url    VARCHAR(500)    NULL,
  activo      TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_marcas_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Marcas de productos.';

-- Categorías de primer nivel. Soft delete.
CREATE TABLE categorias (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(120)    NOT NULL,
  slug        VARCHAR(140)    NOT NULL,
  descripcion VARCHAR(255)    NULL,
  activo      TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME        NULL COMMENT 'Soft delete',
  PRIMARY KEY (id),
  UNIQUE KEY uq_categorias_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Categorías de primer nivel.';

-- Subcategorías (segundo nivel).
CREATE TABLE subcategorias (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  categoria_id  BIGINT UNSIGNED NOT NULL,
  nombre        VARCHAR(120)    NOT NULL,
  slug          VARCHAR(140)    NOT NULL,
  activo        TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subcategorias_slug (slug),
  KEY idx_subcategorias_categoria (categoria_id),
  CONSTRAINT fk_subcategorias_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Subcategorías por categoría.';

-- Publicaciones que un vendedor pone a la venta. Soft delete.
CREATE TABLE productos (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  vendedor_id     BIGINT UNSIGNED NOT NULL,
  subcategoria_id BIGINT UNSIGNED NOT NULL,
  marca_id        BIGINT UNSIGNED NULL,
  titulo          VARCHAR(180)    NOT NULL,
  slug            VARCHAR(200)    NOT NULL,
  descripcion     TEXT            NULL,
  precio          DECIMAL(12,2)   NOT NULL DEFAULT 0.00 COMMENT 'Precio de referencia; el de venta vive en producto_variantes',
  condicion       ENUM('nuevo','usado') NOT NULL DEFAULT 'nuevo',
  estado          ENUM('borrador','activo','pausado','vendido','eliminado') NOT NULL DEFAULT 'borrador',
  sku             VARCHAR(60)     NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME        NULL COMMENT 'Soft delete',
  PRIMARY KEY (id),
  UNIQUE KEY uq_productos_slug (slug),
  UNIQUE KEY uq_productos_sku (sku),
  KEY idx_productos_vendedor (vendedor_id),
  KEY idx_productos_subcategoria (subcategoria_id),
  KEY idx_productos_marca (marca_id),
  CONSTRAINT chk_productos_precio CHECK (precio >= 0),
  CONSTRAINT fk_productos_vendedor FOREIGN KEY (vendedor_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_productos_subcategoria FOREIGN KEY (subcategoria_id)
    REFERENCES subcategorias (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_productos_marca FOREIGN KEY (marca_id)
    REFERENCES marcas (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Productos publicados.';

-- Variantes vendibles de un producto (color/talla/etc.). El precio autoritativo
-- vive aquí; el stock vive en `inventario` (1:1 con la variante).
-- Regla de negocio: TODO producto tiene al menos una variante (incl. una por
-- defecto para productos simples), por lo que variante_id nunca es NULL en las
-- tablas transaccionales (carrito_items, detalle_pedido, inventario).
CREATE TABLE producto_variantes (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  producto_id  BIGINT UNSIGNED NOT NULL,
  sku          VARCHAR(60)     NULL,
  precio       DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  activo       TINYINT(1)      NOT NULL DEFAULT 1,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_variantes_sku (sku),
  KEY idx_variantes_producto (producto_id),
  CONSTRAINT chk_variantes_precio CHECK (precio >= 0),
  CONSTRAINT fk_variantes_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Variantes vendibles del producto (precio autoritativo).';

-- Definición de atributos (Color, Talla, Material...).
CREATE TABLE atributos (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(80)     NOT NULL,
  tipo        ENUM('texto','numero','color','booleano') NOT NULL DEFAULT 'texto',
  activo      TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_atributos_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Atributos configurables de producto.';

-- Valores posibles por atributo (Rojo, Azul; S, M, L...).
CREATE TABLE atributo_valores (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  atributo_id  BIGINT UNSIGNED NOT NULL,
  valor        VARCHAR(120)    NOT NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_atributo_valor (atributo_id, valor),
  CONSTRAINT fk_atributo_valores_atributo FOREIGN KEY (atributo_id)
    REFERENCES atributos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Valores de cada atributo.';

-- Puente N:M variante <-> valor de atributo. Sin soft delete (tabla puente).
CREATE TABLE producto_atributos (
  variante_id       BIGINT UNSIGNED NOT NULL,
  atributo_valor_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (variante_id, atributo_valor_id),
  KEY idx_prod_attr_valor (atributo_valor_id),
  CONSTRAINT fk_prod_attr_variante FOREIGN KEY (variante_id)
    REFERENCES producto_variantes (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_prod_attr_valor FOREIGN KEY (atributo_valor_id)
    REFERENCES atributo_valores (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Valores de atributo que definen cada variante.';

-- Galería de imágenes (de producto y/o variante).
CREATE TABLE producto_imagenes (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  producto_id  BIGINT UNSIGNED NOT NULL,
  variante_id  BIGINT UNSIGNED NULL,
  url          VARCHAR(500)    NOT NULL,
  orden        INT             NOT NULL DEFAULT 0,
  es_principal TINYINT(1)      NOT NULL DEFAULT 0,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_imagenes_producto (producto_id),
  KEY idx_imagenes_variante (variante_id),
  CONSTRAINT fk_imagenes_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_imagenes_variante FOREIGN KEY (variante_id)
    REFERENCES producto_variantes (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Imágenes de producto/variante.';

-- Inventario por variante (1:1). Fuente de verdad del stock. Umbral de stock bajo.
CREATE TABLE inventario (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  variante_id     BIGINT UNSIGNED NOT NULL,
  stock           INT             NOT NULL DEFAULT 0,
  stock_reservado INT             NOT NULL DEFAULT 0,
  umbral_bajo     INT             NOT NULL DEFAULT 0,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventario_variante (variante_id),
  CONSTRAINT chk_inventario_stock CHECK (stock >= 0 AND stock_reservado >= 0),
  CONSTRAINT fk_inventario_variante FOREIGN KEY (variante_id)
    REFERENCES producto_variantes (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Inventario por variante (fuente de verdad del stock).';

-- Historial de cambios de precio (tabla histórica: solo created_at).
CREATE TABLE precio_historial (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  producto_id     BIGINT UNSIGNED NOT NULL,
  variante_id     BIGINT UNSIGNED NOT NULL,
  usuario_id      BIGINT UNSIGNED NULL COMMENT 'Quién realizó el cambio',
  precio_anterior DECIMAL(12,2)   NULL,
  precio_nuevo    DECIMAL(12,2)   NOT NULL,
  motivo          VARCHAR(255)    NULL,
  vigente_desde   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_precio_hist_producto (producto_id),
  KEY idx_precio_hist_variante (variante_id),
  CONSTRAINT fk_precio_hist_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_precio_hist_variante FOREIGN KEY (variante_id)
    REFERENCES producto_variantes (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_precio_hist_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Trazabilidad de cambios de precio.';

-- Productos marcados como favoritos por un usuario.
CREATE TABLE favoritos (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id   BIGINT UNSIGNED NOT NULL,
  producto_id  BIGINT UNSIGNED NOT NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_favoritos_usuario_producto (usuario_id, producto_id),
  KEY idx_favoritos_producto (producto_id),
  CONSTRAINT fk_favoritos_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_favoritos_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Favoritos por usuario.';
