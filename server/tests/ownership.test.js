'use strict';

const test = require('node:test');
const assert = require('node:assert');

const ownership = require('../src/middlewares/ownership');
const { ForbiddenError, NotFoundError, UnauthorizedError } = require('../src/errors');

// Ejecuta el middleware y devuelve { req, error }: `error` es lo que recibió
// next(), o null si dejó pasar la petición.
const run = async (middleware, req) => {
  let error = null;
  let passed = false;
  await middleware(req, {}, (err) => {
    if (err) error = err;
    else passed = true;
  });
  return { req, error, passed };
};

const withUser = (id, over = {}) => ({ user: { id, email: 'a@b.c', roles: [] }, ...over });

test('exige autenticación previa: sin req.user devuelve 401', async () => {
  const middleware = ownership(async () => ({ usuario_id: 1 }));
  const { error, passed } = await run(middleware, {});

  assert.ok(error instanceof UnauthorizedError);
  assert.strictEqual(passed, false);
});

test('devuelve 404 cuando el recurso no existe', async () => {
  const middleware = ownership(async () => null, { notFoundMessage: 'Producto no encontrado' });
  const { error } = await run(middleware, withUser(7));

  assert.ok(error instanceof NotFoundError);
  assert.strictEqual(error.message, 'Producto no encontrado');
});

test('devuelve 403 ante un recurso ajeno', async () => {
  const middleware = ownership(async () => ({ vendedor_id: 99 }), { owners: ['vendedor_id'] });
  const { error } = await run(middleware, withUser(7));

  assert.ok(error instanceof ForbiddenError);
});

test('deja pasar al dueño y adjunta el recurso a la petición', async () => {
  const producto = { id: 3, vendedor_id: 7 };
  const middleware = ownership(async () => producto, { owners: ['vendedor_id'], as: 'product' });
  const { req, error, passed } = await run(middleware, withUser(7));

  assert.strictEqual(error, null);
  assert.strictEqual(passed, true);
  assert.strictEqual(req.product, producto);
});

test('participación: cualquiera de los campos indicados autoriza', async () => {
  const negociacion = { id: 1, comprador_id: 7, vendedor_id: 9 };
  const middleware = ownership(async () => negociacion, {
    owners: ['comprador_id', 'vendedor_id'],
    as: 'negotiation',
  });

  const comprador = await run(middleware, withUser(7));
  assert.strictEqual(comprador.passed, true);

  const vendedor = await run(middleware, withUser(9));
  assert.strictEqual(vendedor.passed, true);

  const tercero = await run(middleware, withUser(11));
  assert.ok(tercero.error instanceof ForbiddenError);
});

test('compara ids numéricos aunque lleguen como texto', async () => {
  const middleware = ownership(async () => ({ usuario_id: '7' }));
  const { passed } = await run(middleware, withUser('7'));

  assert.strictEqual(passed, true);
});

test('un campo nulo no autoriza a nadie', async () => {
  const middleware = ownership(async () => ({ usuario_id: null }), { owners: ['usuario_id'] });
  const { error } = await run(middleware, withUser(7));

  assert.ok(error instanceof ForbiddenError);
});

test('recibe el request para resolver el recurso desde los parámetros', async () => {
  let recibido = null;
  const middleware = ownership(async (req) => {
    recibido = req.params.id;
    return { usuario_id: 7 };
  });

  await run(middleware, withUser(7, { params: { id: '42' } }));
  assert.strictEqual(recibido, '42');
});

test('propaga el error del cargador al manejador global', async () => {
  const middleware = ownership(async () => {
    throw new Error('fallo del repositorio');
  });
  const { error } = await run(middleware, withUser(7));

  assert.match(error.message, /fallo del repositorio/);
});
