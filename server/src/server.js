'use strict';

const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { pool, verifyConnection } = require('./database/pool');

async function start() {
  // Configuración de producción: si es inválida se aborta el arranque. Es
  // preferible a servir peticiones con secretos de desarrollo.
  env.assertProductionConfig();

  // Verifica la conexión a MySQL, pero no bloquea el arranque si la BD
  // todavía no está disponible (útil en desarrollo).
  try {
    await verifyConnection();
  } catch (error) {
    logger.warn('No se pudo verificar la conexión a MySQL al iniciar', {
      error: error.message,
    });
  }

  const server = app.listen(env.port, () => {
    logger.info(`Servidor escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    logger.info(`Señal ${signal} recibida, cerrando servidor...`);
    server.close(() => {
      pool
        .end()
        .catch(() => {})
        .finally(() => {
          logger.info('Servidor cerrado correctamente');
          process.exit(0);
        });
    });
  };

  ['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));
}

// Un fallo al arrancar (p. ej. configuración de producción inválida) debe
// terminar el proceso con código de error, no dejarlo a medias.
start().catch((error) => {
  logger.error(`No se pudo iniciar el servidor: ${error.message}`);
  process.exit(1);
});
