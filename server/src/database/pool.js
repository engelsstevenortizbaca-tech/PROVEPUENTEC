'use strict';

const mysql = require('mysql2/promise');
const env = require('../config/env');
const logger = require('../utils/logger');

// Pool de conexiones a MySQL. Se crea de forma perezosa: no abre conexiones
// hasta que se ejecuta la primera consulta.
const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
  namedPlaceholders: true,
  charset: 'utf8mb4_unicode_ci',
});

// Comprueba que la base de datos responde (usado al arrancar el servidor).
async function verifyConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    logger.info('Conexión a MySQL verificada', {
      host: env.db.host,
      database: env.db.database,
    });
  } finally {
    connection.release();
  }
}

module.exports = { pool, verifyConnection };
