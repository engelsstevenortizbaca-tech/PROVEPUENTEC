'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { redactUrl } = require('../src/middlewares/requestLogger');

// El token de verificación de correo viaja en la URL y es de un solo uso: no
// debe quedar en claro en logs/app.log.

test('redacta el token de la cadena de consulta', () => {
  const result = redactUrl('/api/auth/email/verify?token=abc123def456');
  assert.strictEqual(result, '/api/auth/email/verify?token=REDACTED');
  assert.ok(!result.includes('abc123def456'));
});

test('redacta el refresh token y conserva el resto de parámetros', () => {
  const result = redactUrl('/api/auth/refresh?refreshToken=secreto&page=2');
  assert.ok(!result.includes('secreto'));
  assert.ok(result.includes('page=2'));
});

test('no altera una URL sin parámetros sensibles', () => {
  const url = '/api/categories?page=2&limit=20';
  assert.strictEqual(redactUrl(url), url);
});

test('no altera una URL sin cadena de consulta', () => {
  assert.strictEqual(redactUrl('/api/brands'), '/api/brands');
});

test('tolera una URL ausente', () => {
  assert.strictEqual(redactUrl(undefined), undefined);
});
