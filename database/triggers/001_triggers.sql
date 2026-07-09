-- =====================================================================
-- Triggers
-- =====================================================================
-- Debe aplicarse DESPUÉS de crear todas las tablas.
-- =====================================================================

DELIMITER $$

-- Al cambiar el precio de una variante, registrar en precio_historial.
DROP TRIGGER IF EXISTS trg_variantes_precio_historial $$
CREATE TRIGGER trg_variantes_precio_historial
AFTER UPDATE ON producto_variantes
FOR EACH ROW
BEGIN
  IF NEW.precio <> OLD.precio THEN
    INSERT INTO precio_historial (producto_id, variante_id, precio_anterior, precio_nuevo, motivo)
    VALUES (NEW.producto_id, NEW.id, OLD.precio, NEW.precio, 'Actualización de precio');
  END IF;
END $$

-- Al insertar una línea de pedido, descontar stock del inventario de la variante.
DROP TRIGGER IF EXISTS trg_detalle_pedido_descuenta_stock $$
CREATE TRIGGER trg_detalle_pedido_descuenta_stock
AFTER INSERT ON detalle_pedido
FOR EACH ROW
BEGIN
  UPDATE inventario
  SET stock = GREATEST(stock - NEW.cantidad, 0)
  WHERE variante_id = NEW.variante_id;
END $$

-- Al insertar un mensaje, actualizar la marca de último mensaje de la conversación.
DROP TRIGGER IF EXISTS trg_mensajes_actualiza_conversacion $$
CREATE TRIGGER trg_mensajes_actualiza_conversacion
AFTER INSERT ON mensajes
FOR EACH ROW
BEGIN
  UPDATE conversaciones
  SET ultimo_mensaje_at = NEW.created_at
  WHERE id = NEW.conversacion_id;
END $$

-- Al crear un pedido con cupón, incrementar el contador de usos del cupón.
DROP TRIGGER IF EXISTS trg_pedidos_incrementa_uso_cupon $$
CREATE TRIGGER trg_pedidos_incrementa_uso_cupon
AFTER INSERT ON pedidos
FOR EACH ROW
BEGIN
  IF NEW.cupon_id IS NOT NULL THEN
    UPDATE cupones
    SET usos_actuales = usos_actuales + 1
    WHERE id = NEW.cupon_id;
  END IF;
END $$

DELIMITER ;
