'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { generateToken, hashToken, expiresInMinutes } = require('../src/utils/token');

test('generateToken produce hex de la longitud esperada y aleatorio', () => {
  assert.strictEqual(generateToken(16).length, 32); // 16 bytes -> 32 hex chars
  assert.notStrictEqual(generateToken(), generateToken());
});

test('hashToken es determinista y devuelve sha256 hex (64 chars)', () => {
  const h1 = hashToken('abc');
  const h2 = hashToken('abc');
  assert.strictEqual(h1, h2);
  assert.strictEqual(h1.length, 64);
  assert.notStrictEqual(hashToken('abc'), hashToken('abd'));
});

test('expiresInMinutes devuelve una fecha en el futuro', () => {
  assert.ok(expiresInMinutes(10).getTime() > Date.now());
});
