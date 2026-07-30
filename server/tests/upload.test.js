'use strict';

const test = require('node:test');
const assert = require('node:assert');
const multer = require('multer');

const env = require('../src/config/env');
const upload = require('../src/middlewares/upload');
const { ValidationError } = require('../src/errors');
const { extensionFor, publicUrl, filenameFromUrl } = require('../src/utils/uploads');

// Estos tests cubren la política de subida (decisión E), no la escritura en
// disco: no se crea ningún archivo.

const filter = (mimetype) =>
  new Promise((resolve) => {
    upload.fileFilter({}, { mimetype, originalname: 'foto.jpg' }, (error, accepted) =>
      resolve({ error: error || null, accepted: accepted === true })
    );
  });

// --- formatos admitidos ----------------------------------------------------

test('admite los formatos de la política', async () => {
  for (const mimetype of env.upload.allowedMimeTypes) {
    const { error, accepted } = await filter(mimetype);
    assert.strictEqual(error, null);
    assert.strictEqual(accepted, true);
  }
});

test('rechaza un formato fuera de la política con 422', async () => {
  const { error, accepted } = await filter('application/pdf');

  assert.ok(error instanceof ValidationError);
  assert.strictEqual(error.statusCode, 422);
  assert.strictEqual(accepted, false);
});

// --- límites ---------------------------------------------------------------

test('el tamaño máximo por defecto es de 5 MB', () => {
  assert.strictEqual(env.upload.maxSizeBytes, 5 * 1024 * 1024);
});

test('traduce el exceso de tamaño de multer a un error de validación', () => {
  const traducido = upload.translateError(new multer.MulterError('LIMIT_FILE_SIZE', 'imagen'));

  assert.ok(traducido instanceof ValidationError);
  assert.match(traducido.message, /5 MB/);
});

test('traduce el exceso de archivos y el campo inesperado', () => {
  const exceso = upload.translateError(new multer.MulterError('LIMIT_FILE_COUNT', 'imagenes'));
  const inesperado = upload.translateError(
    new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'adjunto')
  );

  assert.ok(exceso instanceof ValidationError);
  assert.match(exceso.message, new RegExp(String(env.upload.maxFiles)));
  assert.ok(inesperado instanceof ValidationError);
  assert.match(inesperado.message, /adjunto/);
});

test('no altera los errores ajenos a multer', () => {
  const original = new Error('otro fallo');
  assert.strictEqual(upload.translateError(original), original);
});

// --- nombres y URLs --------------------------------------------------------

test('la extensión se deriva del tipo MIME, no del nombre enviado', () => {
  assert.strictEqual(extensionFor('image/png', 'foto.exe'), '.png');
  assert.strictEqual(extensionFor('image/jpeg', 'foto.exe'), '.jpg');
  assert.strictEqual(extensionFor('image/webp', 'foto.exe'), '.webp');
});

test('la URL pública y el nombre de archivo son reversibles', () => {
  const url = publicUrl('abc.webp');

  assert.strictEqual(url, `${env.upload.publicPath}/abc.webp`);
  assert.strictEqual(filenameFromUrl(url), 'abc.webp');
});
