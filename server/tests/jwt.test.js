'use strict';

const test = require('node:test');
const assert = require('node:assert');
const jwtUtil = require('../src/utils/jwt');

test('access token: firma y verificación round-trip', () => {
  const token = jwtUtil.signAccessToken({ sub: '1', roles: ['comprador'], type: 'access' });
  const payload = jwtUtil.verifyAccessToken(token);
  assert.strictEqual(payload.sub, '1');
  assert.strictEqual(payload.type, 'access');
  assert.deepStrictEqual(payload.roles, ['comprador']);
});

test('refresh token: incluye jti y expiración posterior a la emisión', () => {
  const token = jwtUtil.signRefreshToken({ sub: '1', jti: 'abc', type: 'refresh' });
  const payload = jwtUtil.verifyRefreshToken(token);
  assert.strictEqual(payload.jti, 'abc');
  assert.ok(payload.exp > payload.iat);
});

test('un access token no valida como refresh (secretos distintos)', () => {
  const token = jwtUtil.signAccessToken({ sub: '1', type: 'access' });
  assert.throws(() => jwtUtil.verifyRefreshToken(token));
});
