'use strict';

const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

test('GET /health responde 200 con { status: "ok" }', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.strictEqual(response.status, 200);
    const body = await response.json();
    assert.deepStrictEqual(body, { status: 'ok' });
  } finally {
    server.close();
  }
});

test('ruta desconocida responde 404 con status "error"', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/no-existe`);
    assert.strictEqual(response.status, 404);
    const body = await response.json();
    assert.strictEqual(body.status, 'error');
  } finally {
    server.close();
  }
});
