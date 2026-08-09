'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  parsePagination,
  parseOptionalBoolean,
  parseOptionalId,
  parseSearch,
  paginated,
} = require('../src/utils/query');

// --- parsePagination -------------------------------------------------------

test('aplica los valores por defecto sin parámetros', () => {
  assert.deepStrictEqual(parsePagination(), { page: 1, limit: 20, offset: 0 });
});

test('calcula el offset a partir de la página', () => {
  assert.deepStrictEqual(parsePagination({ page: '3', limit: '10' }), {
    page: 3,
    limit: 10,
    offset: 20,
  });
});

test('acota el límite al máximo permitido', () => {
  assert.strictEqual(parsePagination({ limit: '999' }).limit, 100);
});

test('acota el límite al mínimo de 1', () => {
  assert.strictEqual(parsePagination({ limit: '0' }).limit, 20); // 0 es falsy -> defecto
  assert.strictEqual(parsePagination({ limit: '-5' }).limit, 1);
});

test('una página inválida o negativa cae en la primera', () => {
  assert.strictEqual(parsePagination({ page: '0' }).page, 1);
  assert.strictEqual(parsePagination({ page: '-2' }).page, 1);
  assert.strictEqual(parsePagination({ page: 'abc' }).page, 1);
});

test('respeta los límites configurados', () => {
  const result = parsePagination({ limit: '75' }, { defaultLimit: 10, maxLimit: 50 });
  assert.strictEqual(result.limit, 50);
  assert.strictEqual(parsePagination({}, { defaultLimit: 10, maxLimit: 50 }).limit, 10);
});

// --- parseOptionalBoolean --------------------------------------------------

test('distingue "sin filtrar" de filtrar por false', () => {
  assert.strictEqual(parseOptionalBoolean(undefined), null);
  assert.strictEqual(parseOptionalBoolean(''), null);
  assert.strictEqual(parseOptionalBoolean(null), null);
  assert.strictEqual(parseOptionalBoolean('false'), false);
  assert.strictEqual(parseOptionalBoolean('0'), false);
});

test('acepta cadenas y booleanos verdaderos', () => {
  assert.strictEqual(parseOptionalBoolean('true'), true);
  assert.strictEqual(parseOptionalBoolean('1'), true);
  assert.strictEqual(parseOptionalBoolean(true), true);
});

// --- parseOptionalId -------------------------------------------------------

test('solo admite enteros positivos', () => {
  assert.strictEqual(parseOptionalId('7'), 7);
  assert.strictEqual(parseOptionalId(7), 7);
  assert.strictEqual(parseOptionalId('0'), null);
  assert.strictEqual(parseOptionalId('-3'), null);
  assert.strictEqual(parseOptionalId('abc'), null);
  assert.strictEqual(parseOptionalId(undefined), null);
});

// --- parseSearch -----------------------------------------------------------

test('recorta el texto de búsqueda y anula el vacío', () => {
  assert.strictEqual(parseSearch('  tv  '), 'tv');
  assert.strictEqual(parseSearch('   '), null);
  assert.strictEqual(parseSearch(undefined), null);
});

// --- paginated -------------------------------------------------------------

test('construye la respuesta de colección acordada', () => {
  const result = paginated([{ id: 1 }], { page: 2, limit: 20, total: 42 });
  assert.deepStrictEqual(result, {
    data: [{ id: 1 }],
    pagination: { page: 2, limit: 20, total: 42, totalPages: 3 },
  });
});

test('una colección vacía no tiene páginas', () => {
  const result = paginated([], { page: 1, limit: 20, total: 0 });
  assert.strictEqual(result.pagination.totalPages, 0);
});
