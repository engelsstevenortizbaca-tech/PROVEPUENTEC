'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');
const env = require('../config/env');
const { extensionFor } = require('../utils/uploads');
const { ValidationError } = require('../errors');

// Política de subida (decisión E): almacenamiento local en `server/uploads`,
// 5 MB por archivo y jpg/png/webp. Todo configurable por entorno.

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    fs.mkdir(env.upload.dir, { recursive: true }, (error) => cb(error, env.upload.dir));
  },
  // Nombre aleatorio: evita colisiones y no expone el nombre original.
  filename(_req, file, cb) {
    cb(null, `${randomUUID()}${extensionFor(file.mimetype, file.originalname)}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!env.upload.allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new ValidationError(`Formato de archivo no admitido: ${file.mimetype}`, {
        allowed: env.upload.allowedMimeTypes,
      })
    );
  }
  return cb(null, true);
};

const multerInstance = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.upload.maxSizeBytes, files: env.upload.maxFiles },
});

// Traduce los errores de multer a errores de la aplicación (422), para que el
// manejador global responda con el mismo formato que el resto de validaciones.
function translateError(error) {
  if (!(error instanceof multer.MulterError)) return error;

  const messages = {
    LIMIT_FILE_SIZE: `El archivo supera el tamaño máximo de ${Math.round(
      env.upload.maxSizeBytes / (1024 * 1024)
    )} MB`,
    LIMIT_FILE_COUNT: `No se admiten más de ${env.upload.maxFiles} archivos`,
    LIMIT_UNEXPECTED_FILE: `Campo de archivo inesperado: ${error.field}`,
  };

  return new ValidationError(messages[error.code] || 'Archivo inválido', { code: error.code });
}

const wrap = (handler) => (req, res, next) =>
  handler(req, res, (error) => (error ? next(translateError(error)) : next()));

module.exports = {
  // Un solo archivo: req.file
  single: (field) => wrap(multerInstance.single(field)),
  // Varios archivos del mismo campo: req.files
  array: (field, maxCount = env.upload.maxFiles) => wrap(multerInstance.array(field, maxCount)),
  // Expuestos para las pruebas de la política.
  fileFilter,
  translateError,
  destination: path.resolve(env.upload.dir),
};
