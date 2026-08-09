'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const env = require('../config/env');
const logger = require('./logger');

// Extensión canónica por tipo MIME. No se confía en el nombre original del
// archivo: el cliente puede enviar cualquier cosa.
const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const extensionFor = (mimetype, originalname = '') =>
  EXTENSION_BY_MIME[mimetype] || path.extname(originalname).toLowerCase() || '';

// URL pública de un archivo ya almacenado. Es lo que se guarda en la BD.
const publicUrl = (filename) => `${env.upload.publicPath}/${filename}`;

// Nombre de archivo a partir de una URL pública guardada en la BD.
const filenameFromUrl = (url) => path.basename(String(url || ''));

// Borrado en cascada: al eliminar la fila que referencia el archivo hay que
// eliminar también el archivo. Un archivo ausente no es un error.
async function removeUpload(url) {
  const filename = filenameFromUrl(url);
  if (!filename) return false;

  try {
    await fs.unlink(path.join(env.upload.dir, filename));
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn('No se pudo eliminar el archivo subido', { filename, message: error.message });
    }
    return false;
  }
}

// Elimina varios archivos sin interrumpirse ante un fallo individual.
const removeUploads = (urls = []) => Promise.all(urls.map((url) => removeUpload(url)));

module.exports = { extensionFor, publicUrl, filenameFromUrl, removeUpload, removeUploads };
