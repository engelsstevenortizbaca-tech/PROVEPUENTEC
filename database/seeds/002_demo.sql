-- =====================================================================
-- Seeds · Datos de demostración (opcional; ejercita relaciones/triggers)
-- =====================================================================
-- Requiere 001_catalogos aplicado. Los hashes son de ejemplo (no reales).

-- Usuarios (1 vendedor, 1 comprador)
INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono) VALUES
  ('Ana',  'Vendedora', 'ana@example.com',  '$2y$10$demohashdemohashdemohashdemo', '999111222'),
  ('Beto', 'Comprador', 'beto@example.com', '$2y$10$demohashdemohashdemohashdemo', '999333444');

-- Roles: Ana vendedor(2), Beto comprador(3)
INSERT INTO usuario_rol (usuario_id, rol_id) VALUES (1, 2), (2, 3);

-- Dirección del comprador (ciudad 1 = Lima)
INSERT INTO direcciones (usuario_id, ciudad_id, alias, calle, numero, es_principal)
VALUES (2, 1, 'Casa', 'Av. Siempre Viva', '742', 1);

-- Marca y atributos
INSERT INTO marcas (nombre, slug) VALUES ('GenericBrand', 'genericbrand');
INSERT INTO atributos (nombre, tipo) VALUES ('Color', 'color'), ('Almacenamiento', 'texto');
INSERT INTO atributo_valores (atributo_id, valor) VALUES
  (1, 'Negro'), (1, 'Azul'), (2, '128GB'), (2, '256GB');

-- Producto del vendedor (subcategoria 1 = Celulares, marca 1)
INSERT INTO productos (vendedor_id, subcategoria_id, marca_id, titulo, slug, descripcion, precio, condicion, estado, sku)
VALUES (1, 1, 1, 'Smartphone X', 'smartphone-x', 'Teléfono de demostración', 1299.90, 'nuevo', 'activo', 'SPX-001');

-- Variantes + sus atributos (todo producto tiene >=1 variante)
INSERT INTO producto_variantes (producto_id, sku, precio) VALUES
  (1, 'SPX-001-NEG-128', 1299.90),
  (1, 'SPX-001-AZU-256', 1499.90);
INSERT INTO producto_atributos (variante_id, atributo_valor_id) VALUES
  (1, 1), (1, 3),   -- Negro / 128GB
  (2, 2), (2, 4);   -- Azul / 256GB

-- Inventario por variante
INSERT INTO inventario (variante_id, stock, umbral_bajo) VALUES
  (1, 20, 5),
  (2, 15, 5);

-- Imagen principal
INSERT INTO producto_imagenes (producto_id, url, es_principal) VALUES
  (1, 'https://cdn.example.com/spx.jpg', 1);

-- Favorito del comprador
INSERT INTO favoritos (usuario_id, producto_id) VALUES (2, 1);

-- Carrito del comprador con una línea
INSERT INTO carritos (usuario_id) VALUES (2);
INSERT INTO carrito_items (carrito_id, producto_id, variante_id, cantidad, precio_unitario)
VALUES (1, 1, 1, 1, 1299.90);

-- Pedido (estado 1 = pendiente) + detalle (dispara descuento de stock)
INSERT INTO pedidos (codigo, comprador_id, direccion_id, estado_id, subtotal, envio, total)
VALUES ('ORD-000001', 2, 1, 1, 1299.90, 10.00, 1309.90);
INSERT INTO detalle_pedido (pedido_id, producto_id, variante_id, vendedor_id, cantidad, precio_unitario, subtotal)
VALUES (1, 1, 1, 1, 1, 1299.90, 1299.90);

-- Pago aprobado vía procedimiento (mueve el pedido a 'pagado')
CALL sp_registrar_pago(1, 'tarjeta', 1309.90, 'aprobado', 'REF-DEMO-123');

-- Conversación comprador-vendedor sobre el producto + mensaje
INSERT INTO conversaciones (producto_id) VALUES (1);
INSERT INTO conversacion_participantes (conversacion_id, usuario_id, rol_en_conversacion) VALUES
  (1, 2, 'comprador'), (1, 1, 'vendedor');
INSERT INTO mensajes (conversacion_id, emisor_id, contenido) VALUES
  (1, 2, '¿Sigue disponible?');

-- Calificación de compra verificada
INSERT INTO calificaciones (pedido_id, autor_id, vendedor_id, producto_id, puntuacion, comentario)
VALUES (1, 2, 1, 1, 5, 'Excelente producto y envío rápido');

-- Comentario en la ficha + respuesta
INSERT INTO comentarios (producto_id, usuario_id, contenido) VALUES (1, 2, '¿Tiene garantía?');
INSERT INTO comentarios (producto_id, usuario_id, parent_id, contenido) VALUES (1, 1, 1, 'Sí, 12 meses.');
