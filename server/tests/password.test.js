'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { hashPassword, verifyPassword } = require('../src/utils/password');

test('hashPassword genera un hash distinto del texto plano', async () => {
  const hash = await hashPassword('secreta123');
  assert.notStrictEqual(hash, 'secreta123');
  assert.ok(hash.length > 20);
});

test('verifyPassword acepta la correcta y rechaza la incorrecta', async () => {
  const hash = await hashPassword('secreta123');
  assert.strictEqual(await verifyPassword('secreta123', hash), true);
  assert.strictEqual(await verifyPassword('incorrecta', hash), false);
});
