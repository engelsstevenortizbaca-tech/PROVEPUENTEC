'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// `config/env` lee process.env al cargarse, así que cada caso necesita un
// proceso nuevo. El script devuelve el mensaje de error o 'ok'.
const CONFIG_PATH = path.resolve(__dirname, '../src/config/env.js');
const SCRIPT = `
  try {
    require(${JSON.stringify(CONFIG_PATH)}).assertProductionConfig();
    process.stdout.write('ok');
  } catch (error) {
    process.stdout.write(error.message);
  }
`;

const run = (overrides) =>
  execFileSync(process.execPath, ['-e', SCRIPT], {
    // Un entorno limpio: sin esto heredaría el .env del desarrollador.
    env: { PATH: process.env.PATH, ...overrides },
    encoding: 'utf8',
  });

const VALID = {
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  CORS_ORIGINS: 'https://ucc-market.example.com',
};

test('fuera de producción no valida nada', () => {
  assert.strictEqual(run({ NODE_ENV: 'development' }), 'ok');
});

test('acepta una configuración de producción completa', () => {
  assert.strictEqual(run(VALID), 'ok');
});

test('rechaza los secretos de desarrollo en producción', () => {
  const output = run({ ...VALID, JWT_ACCESS_SECRET: 'dev-access-secret-change-me' });
  assert.match(output, /JWT_ACCESS_SECRET conserva el valor de desarrollo/);
});

test('rechaza secretos demasiado cortos', () => {
  const output = run({ ...VALID, JWT_REFRESH_SECRET: 'corto' });
  assert.match(output, /JWT_REFRESH_SECRET debe tener al menos 32 caracteres/);
});

test('rechaza usar el mismo secreto para access y refresh', () => {
  const secret = 'c'.repeat(32);
  const output = run({ ...VALID, JWT_ACCESS_SECRET: secret, JWT_REFRESH_SECRET: secret });
  assert.match(output, /deben ser distintos/);
});

test('rechaza CORS comodín en producción', () => {
  const output = run({ ...VALID, CORS_ORIGINS: '*' });
  assert.match(output, /CORS_ORIGINS no puede ser/);
});

test('acumula todos los problemas en un solo mensaje', () => {
  // Las claves se definen vacías (no ausentes) a propósito: dotenv no sobrescribe
  // una clave ya presente, así que el caso no depende de que exista un .env.
  const output = run({
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: '',
    JWT_REFRESH_SECRET: '',
    CORS_ORIGINS: '',
  });
  assert.match(output, /JWT_ACCESS_SECRET/);
  assert.match(output, /JWT_REFRESH_SECRET/);
  assert.match(output, /CORS_ORIGINS/);
});
