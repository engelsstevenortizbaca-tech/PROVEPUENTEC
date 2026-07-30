'use strict';

// Claves del catálogo `tipos_notificacion` (ARCHITECTURE §5.7). Los seis
// primeros requieren seeds nuevos (DATABASE_DESIGN §14.3); `nuevo_mensaje` y
// `nueva_calificacion` ya están sembrados.
const NOTIFICATION_TYPE = Object.freeze({
  NUEVA_OFERTA: 'nueva_oferta',
  NUEVA_CONTRAOFERTA: 'nueva_contraoferta',
  OFERTA_ACEPTADA: 'oferta_aceptada',
  OFERTA_RECHAZADA: 'oferta_rechazada',
  PEDIDO_CREADO: 'pedido_creado',
  ENVIO_ACTUALIZADO: 'envio_actualizado',
  NUEVO_MENSAJE: 'nuevo_mensaje',
  NUEVA_CALIFICACION: 'nueva_calificacion',
});

// Los ocho eventos que el sistema notifica. Un tipo fuera de esta lista debe
// fallar de forma explícita, nunca en silencio.
const NOTIFICATION_TYPES = Object.freeze(Object.values(NOTIFICATION_TYPE));

module.exports = { NOTIFICATION_TYPE, NOTIFICATION_TYPES };
