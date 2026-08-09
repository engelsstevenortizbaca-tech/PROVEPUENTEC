'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { slugify } = require('../src/utils/slug');

test('slugify normaliza acentos y espacios a guiones', () => {
  assert.strictEqual(slugify('Electrónica y Cómputo'), 'electronica-y-computo');
  assert.strictEqual(slugify('ÁÉÍÓÚñ'), 'aeioun');
});

test('slugify recorta guiones sobrantes y caracteres especiales', () => {
  assert.strictEqual(slugify('  Ropa & Accesorios!! '), 'ropa-accesorios');
  assert.strictEqual(slugify('Hogar/Jardín 2024'), 'hogar-jardin-2024');
});

test('slugify devuelve cadena vacía para entradas sin alfanuméricos', () => {
  assert.strictEqual(slugify('!!!'), '');
  assert.strictEqual(slugify('   '), '');
  assert.strictEqual(slugify(null), '');
  assert.strictEqual(slugify(undefined), '');
});

test('slugify limita la longitud a 140 caracteres sin dejar guion final', () => {
  const largo = slugify('a'.repeat(200));
  assert.ok(largo.length <= 140);
  assert.ok(!largo.endsWith('-'));
});
