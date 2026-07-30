-- =====================================================================
-- Índices de rendimiento (secundarios / compuestos / FULLTEXT)
-- =====================================================================
-- Nota: las FK ya generan su índice automáticamente en InnoDB y las
-- restricciones UNIQUE crean su propio índice. Aquí solo se añaden
-- índices adicionales para filtros y ordenamientos frecuentes.
-- Debe aplicarse DESPUÉS de crear todas las tablas.
-- =====================================================================

-- Usuarios: filtrar activos no borrados.
CREATE INDEX idx_usuarios_estado_deleted ON usuarios (estado, deleted_at);

-- Direcciones: dirección principal por usuario.
CREATE INDEX idx_direcciones_usuario_principal ON direcciones (usuario_id, es_principal);

-- Productos: listados por estado, precio y búsqueda de texto.
CREATE INDEX idx_productos_estado_deleted ON productos (estado, deleted_at);
CREATE INDEX idx_productos_precio          ON productos (precio);
CREATE INDEX idx_productos_created         ON productos (created_at);
CREATE FULLTEXT INDEX ftx_productos_texto  ON productos (titulo, descripcion);

-- Historial de precios: consulta por producto en el tiempo.
CREATE INDEX idx_precio_hist_producto_fecha ON precio_historial (producto_id, created_at);

-- Carritos: carrito activo por usuario.
CREATE INDEX idx_carritos_usuario_estado ON carritos (usuario_id, estado);

-- Pedidos: historial del comprador y bandeja por estado.
CREATE INDEX idx_pedidos_comprador_fecha ON pedidos (comprador_id, created_at);
CREATE INDEX idx_pedidos_estado_fecha    ON pedidos (estado_id, created_at);

-- Detalle de pedido: reportes de ventas por vendedor en el tiempo.
CREATE INDEX idx_detalle_vendedor_fecha ON detalle_pedido (vendedor_id, created_at);

-- Pagos: seguimiento por estado.
CREATE INDEX idx_pagos_estado ON pagos (estado);

-- Mensajes: cargar hilo cronológico.
CREATE INDEX idx_mensajes_conv_fecha ON mensajes (conversacion_id, created_at);

-- Notificaciones: no leídas por usuario.
CREATE INDEX idx_notificaciones_usuario_leido ON notificaciones (usuario_id, leido_at);

-- Calificaciones: promedio/filtro por producto y puntuación.
CREATE INDEX idx_calificaciones_producto_punt ON calificaciones (producto_id, puntuacion);
