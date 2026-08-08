'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');
const { pool } = require('./pool');
const logger = require('../utils/logger');

// Conexión de la transacción en curso, propagada por el contexto asíncrono.
// Permite que una operación anidada se una a la transacción del llamador en
// lugar de abrir una segunda: MySQL no soporta transacciones anidadas.
const storage = new AsyncLocalStorage();

// Conexión de la transacción activa, o null fuera de una transacción.
const currentConnection = () => storage.getStore() || null;

// Conexión que debe usar un repositorio: la explícita, la de la transacción
// activa o, en su defecto, el pool. Uso: `create(data, conn)` →
// `executor(conn).execute(...)`.
const executor = (conn) => conn || currentConnection() || pool;

// Revierte sin enmascarar el error original: si el ROLLBACK falla, se registra
// y se sigue propagando la excepción que provocó la reversión.
async function rollbackQuietly(connection) {
  try {
    await connection.rollback();
  } catch (error) {
    logger.error('Fallo al revertir la transacción', { message: error.message });
  }
}

// Ejecuta `work` dentro de una transacción: confirma si termina sin error,
// revierte y propaga el error original si falla, y libera siempre la conexión.
// Si ya hay una transacción activa, reutiliza su conexión sin abrir otra.
async function withTransaction(work) {
  if (typeof work !== 'function') {
    throw new TypeError('withTransaction espera una función');
  }

  const active = currentConnection();
  if (active) return work(active);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let result;
    try {
      result = await storage.run(connection, () => work(connection));
    } catch (error) {
      await rollbackQuietly(connection);
      throw error;
    }

    await connection.commit();
    return result;
  } finally {
    connection.release();
  }
}

module.exports = { withTransaction, currentConnection, executor };
