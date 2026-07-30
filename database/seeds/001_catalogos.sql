-- =====================================================================
-- Seeds · Catálogos base (datos mínimos para operar)
-- =====================================================================

-- Roles
INSERT INTO roles (nombre, descripcion) VALUES
  ('admin',     'Administrador de la plataforma'),
  ('vendedor',  'Publica y vende productos'),
  ('comprador', 'Compra productos'),
  ('soporte',   'Atención al cliente');

-- Permisos (muestra representativa)
INSERT INTO permisos (nombre, clave, descripcion) VALUES
  ('Crear producto',    'producto.crear',    'Publicar un producto'),
  ('Editar producto',   'producto.editar',   'Modificar un producto'),
  ('Eliminar producto', 'producto.eliminar', 'Eliminar un producto'),
  ('Gestionar pedidos', 'pedido.gestionar',  'Ver y actualizar pedidos'),
  ('Reembolsar pedido', 'pedido.reembolsar', 'Emitir reembolsos'),
  ('Moderar contenido', 'contenido.moderar', 'Resolver reportes'),
  ('Administrar usuarios','usuario.administrar','Suspender/activar usuarios');

-- Todos los permisos al rol admin (id 1)
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT 1, id FROM permisos;

-- Permisos de producto al rol vendedor (id 2)
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT 2, id FROM permisos WHERE clave IN ('producto.crear','producto.editar','producto.eliminar','pedido.gestionar');

-- Estados de pedido
INSERT INTO estados_pedido (clave, nombre, orden, es_final) VALUES
  ('pendiente',   'Pendiente',   1, 0),
  ('pagado',      'Pagado',      2, 0),
  ('enviado',     'Enviado',     3, 0),
  ('entregado',   'Entregado',   4, 1),
  ('cancelado',   'Cancelado',   5, 1),
  ('reembolsado', 'Reembolsado', 6, 1);

-- Métodos de pago
INSERT INTO metodos_pago (clave, nombre) VALUES
  ('tarjeta',        'Tarjeta de crédito/débito'),
  ('paypal',         'PayPal'),
  ('transferencia',  'Transferencia bancaria'),
  ('contra_entrega', 'Contra entrega');

-- Tipos de notificación
INSERT INTO tipos_notificacion (clave, nombre, plantilla, icono) VALUES
  ('nuevo_mensaje',   'Nuevo mensaje',        'Tienes un nuevo mensaje de {emisor}', 'chat'),
  ('cambio_pedido',   'Cambio de pedido',     'Tu pedido {codigo} ahora está {estado}', 'package'),
  ('nueva_calificacion','Nueva calificación', 'Recibiste una calificación de {puntuacion} estrellas', 'star'),
  ('promocion',       'Promoción',            '{titulo}', 'tag');

-- Ubicación de ejemplo (Perú)
INSERT INTO paises (nombre, iso2, iso3) VALUES ('Perú', 'PE', 'PER');
INSERT INTO departamentos (pais_id, nombre) VALUES (1, 'Lima'), (1, 'Arequipa');
INSERT INTO ciudades (departamento_id, nombre) VALUES
  (1, 'Lima'), (1, 'Miraflores'), (2, 'Arequipa');

-- Categorías y subcategorías de ejemplo
INSERT INTO categorias (nombre, slug, descripcion) VALUES
  ('Electrónica', 'electronica', 'Dispositivos y accesorios'),
  ('Hogar',       'hogar',       'Artículos para el hogar');
INSERT INTO subcategorias (categoria_id, nombre, slug) VALUES
  (1, 'Celulares',   'celulares'),
  (1, 'Laptops',     'laptops'),
  (2, 'Muebles',     'muebles');

-- Configuraciones globales
INSERT INTO configuraciones (clave, valor, tipo, descripcion) VALUES
  ('moneda_default',   'PEN', 'string', 'Código de moneda por defecto'),
  ('comision_venta',   '10',  'int',    'Comisión de venta en %'),
  ('mantenimiento',    'false','bool',  'Modo mantenimiento');
