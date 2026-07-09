-- =====================================================================
-- Vistas (consultas de lectura frecuentes)
-- =====================================================================
-- Debe aplicarse DESPUÉS de crear todas las tablas.
-- =====================================================================

-- Productos publicados y visibles, con marca, categoría, precio "desde" y
-- stock agregado de sus variantes.
CREATE OR REPLACE VIEW vw_productos_activos AS
SELECT
  p.id,
  p.titulo,
  p.slug,
  MIN(pv.precio)  AS precio_desde,
  p.condicion,
  m.nombre        AS marca,
  sc.nombre       AS subcategoria,
  c.nombre        AS categoria,
  u.id            AS vendedor_id,
  CONCAT(u.nombre, ' ', u.apellido) AS vendedor,
  COALESCE(SUM(inv.stock), 0) AS stock
FROM productos p
JOIN usuarios          u   ON u.id = p.vendedor_id
JOIN subcategorias     sc  ON sc.id = p.subcategoria_id
JOIN categorias        c   ON c.id = sc.categoria_id
LEFT JOIN marcas       m   ON m.id = p.marca_id
JOIN producto_variantes pv ON pv.producto_id = p.id
LEFT JOIN inventario   inv ON inv.variante_id = pv.id
WHERE p.estado = 'activo'
  AND p.deleted_at IS NULL
GROUP BY p.id, p.titulo, p.slug, p.condicion, m.nombre, sc.nombre, c.nombre, u.id, vendedor;

-- Variantes con stock en o por debajo del umbral.
CREATE OR REPLACE VIEW vw_stock_bajo AS
SELECT
  p.id            AS producto_id,
  p.titulo,
  pv.id           AS variante_id,
  pv.sku,
  inv.stock,
  inv.umbral_bajo
FROM producto_variantes pv
JOIN inventario inv ON inv.variante_id = pv.id
JOIN productos  p   ON p.id = pv.producto_id
WHERE p.deleted_at IS NULL
  AND inv.stock <= inv.umbral_bajo;

-- Reputación por vendedor (promedio y número de calificaciones).
CREATE OR REPLACE VIEW vw_reputacion_vendedor AS
SELECT
  cal.vendedor_id,
  COUNT(*)                       AS total_calificaciones,
  ROUND(AVG(cal.puntuacion), 2)  AS promedio
FROM calificaciones cal
GROUP BY cal.vendedor_id;

-- Resumen de pedidos con estado legible, comprador y número de líneas.
CREATE OR REPLACE VIEW vw_pedidos_resumen AS
SELECT
  ped.id,
  ped.codigo,
  ped.comprador_id,
  CONCAT(u.nombre, ' ', u.apellido) AS comprador,
  ep.nombre        AS estado,
  ped.total,
  COUNT(dp.id)     AS lineas,
  ped.created_at
FROM pedidos ped
JOIN usuarios        u  ON u.id = ped.comprador_id
JOIN estados_pedido  ep ON ep.id = ped.estado_id
LEFT JOIN detalle_pedido dp ON dp.pedido_id = ped.id
GROUP BY ped.id, ped.codigo, ped.comprador_id, comprador, ep.nombre, ped.total, ped.created_at;
