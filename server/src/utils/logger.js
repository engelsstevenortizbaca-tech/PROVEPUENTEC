'use strict';

const fs = require('fs');
const path = require('path');
const env = require('../config/env');

// Logger minimalista sin dependencias externas: escribe a consola y a
// logs/app.log. Respeta el nivel configurado en LOG_LEVEL.
// El nivel se toma de `config/env`, no de process.env: así se aplica el valor
// del archivo .env con independencia del orden en que se carguen los módulos.
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = LEVELS[env.logLevel] ?? LEVELS.info;

const logsDir = path.resolve(__dirname, '../../logs');

// Stream de escritura en modo append, creado de forma perezosa. Su E/S es
// asíncrona: `appendFileSync` en cada línea bloquearía el event loop en la ruta
// de toda petición HTTP, porque morgan las registra todas.
let fileStream;

function target() {
  if (fileStream !== undefined) return fileStream;

  try {
    fs.mkdirSync(logsDir, { recursive: true });
    fileStream = fs.createWriteStream(path.join(logsDir, 'app.log'), { flags: 'a' });
    // Un fallo de escritura no debe interrumpir la aplicación: se deja de
    // escribir a disco y se sigue registrando por consola.
    fileStream.on('error', () => {
      fileStream = null;
    });
  } catch {
    fileStream = null;
  }
  return fileStream;
}

function write(level, message, meta) {
  if (LEVELS[level] > threshold) return;

  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  const line = `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;

  const consoleStream = level === 'error' ? process.stderr : process.stdout;
  consoleStream.write(`${line}\n`);

  target()?.write(`${line}\n`);
}

const logger = {
  error: (message, meta) => write('error', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  info: (message, meta) => write('info', message, meta),
  debug: (message, meta) => write('debug', message, meta),
  // Stream consumido por morgan (quita el salto de línea que agrega).
  stream: {
    write: (message) => write('info', message.trim()),
  },
};

module.exports = logger;
