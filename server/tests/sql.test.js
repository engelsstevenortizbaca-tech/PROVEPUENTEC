'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { limitOffset, buildSet } = require('../src/database/sql');

// --- limitOffset -----------------------------------------------------------
// LIMIT/OFFSET se interpolan en la consulta, así que el saneado a entero es la
// barrera contra inyección: estos casos lo fijan.

test('genera la cláusula con los valores por defecto', () => {
  assert.strictEqual(limitOffset(), 'LIMIT 20 OFFSET 0');
});

test('trunca los decimales', () => {
  assert.strictEqual(limitOffset({ limit: 10.9, offset: 5.7 }), 'LIMIT 10 OFFSET 5');
});

test('convierte los negativos en 0', () => {
  assert.strictEqual(limitOffset({ limit: -5, offset: -10 }), 'LIMIT 0 OFFSET 0');
});

test('neutraliza un valor no numérico', () => {
  assert.strictEqual(limitOffset({ limit: 'abc', offset: 'x' }), 'LIMIT 0 OFFSET 0');
});

test('no deja pasar SQL en los parámetros', () => {
  // Number('10; DROP ...') es NaN, así que el valor colapsa a 0: la sentencia
  // inyectada nunca llega a la consulta.
  const clause = limitOffset({ limit: '10; DROP TABLE marcas', offset: '1 OR 1=1' });
  assert.strictEqual(clause, 'LIMIT 0 OFFSET 0');
  assert.ok(!clause.includes('DROP'));
  assert.ok(!clause.includes('OR'));
});

// --- buildSet --------------------------------------------------------------

test('solo incluye los campos presentes', () => {
  const set = buildSet({
    allowed: ['nombre', 'slug', 'activo'],
    fields: { nombre: 'Samsung' },
  });
  assert.strictEqual(set.sql, 'nombre = :nombre');
  assert.deepStrictEqual(set.params, { nombre: 'Samsung' });
});

test('respeta el orden de la lista blanca', () => {
  const set = buildSet({
    allowed: ['nombre', 'slug', 'activo'],
    fields: { activo: true, nombre: 'LG' },
  });
  assert.strictEqual(set.sql, 'nombre = :nombre, activo = :activo');
});

test('convierte las columnas booleanas a 1/0', () => {
  const activa = buildSet({
    allowed: ['activo'],
    fields: { activo: true },
    booleanColumns: ['activo'],
  });
  const inactiva = buildSet({
    allowed: ['activo'],
    fields: { activo: false },
    booleanColumns: ['activo'],
  });
  assert.strictEqual(activa.params.activo, 1);
  assert.strictEqual(inactiva.params.activo, 0);
});

test('conserva el valor null (para vaciar una columna)', () => {
  const set = buildSet({ allowed: ['logo_url'], fields: { logo_url: null } });
  assert.strictEqual(set.params.logo_url, null);
});

test('ignora los campos ajenos a la lista blanca', () => {
  const set = buildSet({
    allowed: ['nombre'],
    fields: { nombre: 'LG', id: 99, 'x = 1; --': 'inyección' },
  });
  assert.strictEqual(set.sql, 'nombre = :nombre');
  assert.deepStrictEqual(Object.keys(set.params), ['nombre']);
});

test('devuelve null si no hay nada que actualizar', () => {
  assert.strictEqual(buildSet({ allowed: ['nombre'], fields: {} }), null);
  assert.strictEqual(buildSet({ allowed: ['nombre'], fields: { otro: 1 } }), null);
  assert.strictEqual(buildSet({}), null);
});
