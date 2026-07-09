'use strict';

const fs = require('fs');
const path = require('path');

// Logger minimalista sin dependencias externas: escribe a consola y a
// logs/app.log. Respeta el nivel configurado en LOG_LEVEL.
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? LEVELS.info;

const logsDir = path.resolve(__dirname, '../../logs');
try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch {
  // Si no se puede crear el directorio, se seguirá escribiendo a consola.
}
const logFile = path.join(logsDir, 'app.log');

function write(level, message, meta) {
  if (LEVELS[level] > threshold) return;

  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  const line = `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;

  const target = level === 'error' ? process.stderr : process.stdout;
  target.write(`${line}\n`);

  try {
    fs.appendFileSync(logFile, `${line}\n`);
  } catch {
    // La escritura a disco no debe interrumpir la aplicación.
  }
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
