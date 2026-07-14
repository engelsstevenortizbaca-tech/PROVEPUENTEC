-- =====================================================================
-- Funciones y procedimientos almacenados
-- =====================================================================
-- Debe aplicarse DESPUÉS de crear todas las tablas.
-- Se usa DELIMITER para permitir ';' dentro del cuerpo de las rutinas.
-- =====================================================================

DELIMITER $$

-- Función: total calculado de un pedido a partir de su detalle.
DROP FUNCTION IF EXISTS fn_total_pedido $$
CREATE FUNCTION fn_total_pedido(p_pedido_id BIGINT UNSIGNED)
  RETURNS DECIMAL(12,2)
  DETERMINISTIC
  READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(12,2);
  SELECT COALESCE(SUM(subtotal), 0) INTO v_total
  FROM detalle_pedido
  WHERE pedido_id = p_pedido_id;
  RETURN v_total;
END $$

-- Procedimiento: recalcula subtotal/total del pedido desde su detalle.
DROP PROCEDURE IF EXISTS sp_recalcular_totales_pedido $$
CREATE PROCEDURE sp_recalcular_totales_pedido(IN p_pedido_id BIGINT UNSIGNED)
BEGIN
  DECLARE v_subtotal DECIMAL(12,2);
  SET v_subtotal = fn_total_pedido(p_pedido_id);
  UPDATE pedidos
  SET subtotal = v_subtotal,
      total    = v_subtotal - descuento + envio
  WHERE id = p_pedido_id;
END $$

-- Procedimiento: cambia el estado de un pedido usando la clave del catálogo.
DROP PROCEDURE IF EXISTS sp_cambiar_estado_pedido $$
CREATE PROCEDURE sp_cambiar_estado_pedido(
  IN p_pedido_id    BIGINT UNSIGNED,
  IN p_estado_clave VARCHAR(40)
)
BEGIN
  DECLARE v_estado_id BIGINT UNSIGNED;

  SELECT id INTO v_estado_id
  FROM estados_pedido
  WHERE clave = p_estado_clave AND activo = 1;

  IF v_estado_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Estado de pedido inexistente o inactivo';
  END IF;

  UPDATE pedidos SET estado_id = v_estado_id WHERE id = p_pedido_id;
END $$

-- Procedimiento: registra un pago; si es aprobado, mueve el pedido a 'pagado'.
DROP PROCEDURE IF EXISTS sp_registrar_pago $$
CREATE PROCEDURE sp_registrar_pago(
  IN p_pedido_id     BIGINT UNSIGNED,
  IN p_metodo_clave  VARCHAR(40),
  IN p_monto         DECIMAL(12,2),
  IN p_estado        VARCHAR(20),
  IN p_referencia    VARCHAR(120)
)
BEGIN
  DECLARE v_metodo_id BIGINT UNSIGNED;

  SELECT id INTO v_metodo_id
  FROM metodos_pago
  WHERE clave = p_metodo_clave AND activo = 1;

  IF v_metodo_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Método de pago inexistente o inactivo';
  END IF;

  INSERT INTO pagos (pedido_id, metodo_pago_id, estado, monto, referencia_externa)
  VALUES (p_pedido_id, v_metodo_id, p_estado, p_monto, p_referencia);

  IF p_estado = 'aprobado' THEN
    CALL sp_cambiar_estado_pedido(p_pedido_id, 'pagado');
  END IF;
END $$

DELIMITER ;
