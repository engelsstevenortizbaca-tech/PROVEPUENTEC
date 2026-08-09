'use strict';

const test = require('node:test');
const assert = require('node:assert');

const poolModule = require('../src/database/pool');
const { withTransaction, currentConnection, executor } = require('../src/database/transaction');

// El helper usa el pool (un singleton) como única dependencia. Estos tests lo
// aíslan sustituyendo `getConnection`, de modo que no se toca MySQL.

// Conexión falsa que registra la secuencia de llamadas recibidas.
const fakeConnection = ({ failOn = null } = {}) => {
  const calls = [];
  const step = (name) => async () => {
    calls.push(name);
    if (failOn === name) throw new Error(`fallo en ${name}`);
  };
  return {
    calls,
    beginTransaction: step('begin'),
    commit: step('commit'),
    rollback: step('rollback'),
    release: () => calls.push('release'),
    execute: async () => [[], []],
  };
};

let originalGetConnection;

test.beforeEach(() => {
  originalGetConnection = poolModule.pool.getConnection;
});

test.afterEach(() => {
  poolModule.pool.getConnection = originalGetConnection;
});

const useConnection = (connection) => {
  poolModule.pool.getConnection = async () => connection;
  return connection;
};

// --- camino feliz ----------------------------------------------------------

test('confirma la transacción y devuelve el resultado del callback', async () => {
  const connection = useConnection(fakeConnection());

  const result = await withTransaction(async (conn) => {
    assert.strictEqual(conn, connection);
    return 'ok';
  });

  assert.strictEqual(result, 'ok');
  assert.deepStrictEqual(connection.calls, ['begin', 'commit', 'release']);
});

// --- reversión -------------------------------------------------------------

test('revierte y propaga el error original cuando el callback falla', async () => {
  const connection = useConnection(fakeConnection());

  await assert.rejects(
    withTransaction(async () => {
      throw new Error('fallo de negocio');
    }),
    /fallo de negocio/
  );

  assert.deepStrictEqual(connection.calls, ['begin', 'rollback', 'release']);
});

test('propaga el error original aunque el ROLLBACK también falle', async () => {
  const connection = useConnection(fakeConnection({ failOn: 'rollback' }));

  await assert.rejects(
    withTransaction(async () => {
      throw new Error('fallo de negocio');
    }),
    /fallo de negocio/
  );

  assert.deepStrictEqual(connection.calls, ['begin', 'rollback', 'release']);
});

// --- liberación de la conexión ---------------------------------------------

test('libera la conexión también cuando falla el COMMIT', async () => {
  const connection = useConnection(fakeConnection({ failOn: 'commit' }));

  await assert.rejects(
    withTransaction(async () => 'ok'),
    /fallo en commit/
  );
  assert.deepStrictEqual(connection.calls, ['begin', 'commit', 'release']);
});

test('libera la conexión en todos los casos: el pool nunca se agota', async () => {
  let entregadas = 0;
  let liberadas = 0;

  poolModule.pool.getConnection = async () => {
    entregadas += 1;
    const connection = fakeConnection();
    const { release } = connection;
    connection.release = () => {
      liberadas += 1;
      release();
    };
    return connection;
  };

  for (let i = 0; i < 20; i += 1) {
    if (i % 2 === 0) {
      await withTransaction(async () => 'ok');
    } else {
      await assert.rejects(
        withTransaction(async () => {
          throw new Error('fallo');
        })
      );
    }
  }

  assert.strictEqual(entregadas, 20);
  assert.strictEqual(liberadas, 20);
});

// --- sin anidamiento -------------------------------------------------------

test('una transacción activa no abre otra: reutiliza su conexión', async () => {
  const connection = useConnection(fakeConnection());
  let entregadas = 0;
  poolModule.pool.getConnection = async () => {
    entregadas += 1;
    return connection;
  };

  const result = await withTransaction(async (outer) =>
    withTransaction(async (inner) => {
      assert.strictEqual(inner, outer);
      return 'anidada';
    })
  );

  assert.strictEqual(result, 'anidada');
  assert.strictEqual(entregadas, 1);
  assert.deepStrictEqual(connection.calls, ['begin', 'commit', 'release']);
});

test('un fallo en la transacción interna revierte la externa una sola vez', async () => {
  const connection = useConnection(fakeConnection());

  await assert.rejects(
    withTransaction(async () =>
      withTransaction(async () => {
        throw new Error('fallo interno');
      })
    ),
    /fallo interno/
  );

  assert.deepStrictEqual(connection.calls, ['begin', 'rollback', 'release']);
});

// --- contexto y executor ---------------------------------------------------

test('currentConnection expone la conexión activa y null fuera de la transacción', async () => {
  const connection = useConnection(fakeConnection());

  assert.strictEqual(currentConnection(), null);
  await withTransaction(async () => {
    assert.strictEqual(currentConnection(), connection);
  });
  assert.strictEqual(currentConnection(), null);
});

test('executor prefiere la conexión explícita, luego la activa y luego el pool', async () => {
  const connection = useConnection(fakeConnection());
  const explicita = { execute: async () => [[], []] };

  assert.strictEqual(executor(), poolModule.pool);
  assert.strictEqual(executor(explicita), explicita);

  await withTransaction(async () => {
    assert.strictEqual(executor(), connection);
    assert.strictEqual(executor(explicita), explicita);
  });
});

// --- contrato --------------------------------------------------------------

test('rechaza un argumento que no sea una función, sin pedir conexión', async () => {
  let entregadas = 0;
  poolModule.pool.getConnection = async () => {
    entregadas += 1;
    return fakeConnection();
  };

  await assert.rejects(() => withTransaction('no soy una función'), TypeError);
  assert.strictEqual(entregadas, 0);
});
