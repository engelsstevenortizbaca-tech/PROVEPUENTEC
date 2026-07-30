'use strict';

const test = require('node:test');
const assert = require('node:assert');

const poolModule = require('../src/database/pool');

// El alta de un usuario debe ser atómica: usuario, rol y token de verificación
// se escriben todo o nada. Estos tests sustituyen `pool.getConnection` por una
// conexión falsa, así que no se toca MySQL: comprueban que las escrituras de
// los repositorios viajan por la conexión de la transacción (vía `executor()`)
// y que un fallo intermedio provoca ROLLBACK.

// Conexión falsa que registra las sentencias y el ciclo de la transacción.
const fakeConnection = ({ failOnSqlContaining = null } = {}) => {
  const lifecycle = [];
  const statements = [];

  return {
    lifecycle,
    statements,
    beginTransaction: async () => lifecycle.push('begin'),
    commit: async () => lifecycle.push('commit'),
    rollback: async () => lifecycle.push('rollback'),
    release: () => lifecycle.push('release'),
    async execute(sql) {
      statements.push(sql);
      if (failOnSqlContaining && sql.includes(failOnSqlContaining)) {
        throw new Error(`fallo simulado en: ${failOnSqlContaining}`);
      }
      // INSERT -> insertId; SELECT -> sin filas (el rol no existe en catálogo).
      return /INSERT/i.test(sql) ? [{ insertId: 7 }, []] : [[], []];
    },
  };
};

let originalGetConnection;
let originalPoolExecute;

test.beforeEach(() => {
  originalGetConnection = poolModule.pool.getConnection;
  originalPoolExecute = poolModule.pool.execute;
  // Cualquier consulta que escape de la transacción y vaya al pool es un fallo.
  poolModule.pool.execute = async (sql) => {
    throw new Error(`consulta fuera de la transacción: ${String(sql).slice(0, 60)}`);
  };
});

test.afterEach(() => {
  poolModule.pool.getConnection = originalGetConnection;
  poolModule.pool.execute = originalPoolExecute;
});

// Se requiere después de preparar el pool para evitar orden de carga sorpresa.
const { withTransaction } = require('../src/database/transaction');
const userRepository = require('../src/repositories/user.repository');
const emailVerificationRepository = require('../src/repositories/emailVerification.repository');

test('las escrituras de los repositorios usan la conexión de la transacción', async () => {
  const connection = fakeConnection();
  poolModule.pool.getConnection = async () => connection;

  const id = await withTransaction(async () => {
    const usuarioId = await userRepository.create({
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@example.com',
      passwordHash: 'hash',
    });
    await userRepository.assignRole(usuarioId, 1);
    await emailVerificationRepository.create({
      usuarioId,
      tokenHash: 'a'.repeat(64),
      expiraAt: new Date(0),
    });
    return usuarioId;
  });

  assert.strictEqual(id, 7);
  assert.deepStrictEqual(connection.lifecycle, ['begin', 'commit', 'release']);
  assert.strictEqual(connection.statements.length, 3);
  assert.match(connection.statements[0], /INSERT INTO usuarios/);
  assert.match(connection.statements[1], /INSERT IGNORE INTO usuario_rol/);
  assert.match(connection.statements[2], /INSERT INTO email_verification_tokens/);
});

test('un fallo al asignar el rol revierte el alta del usuario', async () => {
  const connection = fakeConnection({ failOnSqlContaining: 'usuario_rol' });
  poolModule.pool.getConnection = async () => connection;

  await assert.rejects(
    withTransaction(async () => {
      const usuarioId = await userRepository.create({
        nombre: 'Ana',
        apellido: 'Pérez',
        email: 'ana@example.com',
        passwordHash: 'hash',
      });
      await userRepository.assignRole(usuarioId, 1);
    }),
    /fallo simulado/
  );

  assert.deepStrictEqual(connection.lifecycle, ['begin', 'rollback', 'release']);
  assert.ok(!connection.lifecycle.includes('commit'));
});

test('fuera de una transacción los repositorios usan el pool', async () => {
  // `pool.execute` está sustituido por una función que lanza: si la consulta no
  // fuera al pool, no habría error y el test fallaría.
  await assert.rejects(
    userRepository.findById(1),
    /consulta fuera de la transacción/,
    'sin transacción activa, executor() debe resolver al pool'
  );
});
