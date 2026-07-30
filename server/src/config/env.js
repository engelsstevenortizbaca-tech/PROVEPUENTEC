'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Carga las variables desde server/.env (si existe). quiet evita el
// mensaje informativo que dotenv imprime por defecto.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toList = (value, fallback = []) =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : fallback;

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: toInt(process.env.PORT, 3000),
  apiPrefix: process.env.API_PREFIX || '/api',
  appUrl: process.env.APP_URL || 'http://localhost:3000',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: toInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'marketplace',
    connectionLimit: toInt(process.env.DB_CONNECTION_LIMIT, 10),
  },

  cors: {
    origins: toList(process.env.CORS_ORIGINS, ['*']),
  },

  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toInt(process.env.RATE_LIMIT_MAX, 100),
  },

  auth: {
    bcryptRounds: toInt(process.env.BCRYPT_ROUNDS, 12),
    // Secretos de firma de JWT. En producción DEBEN definirse por entorno.
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    // Vida (en minutos) de los tokens de un solo uso enviados por correo.
    passwordResetTtlMin: toInt(process.env.PASSWORD_RESET_TTL_MIN, 60),
    emailVerificationTtlMin: toInt(process.env.EMAIL_VERIFICATION_TTL_MIN, 1440),
    // Si es true, el login exige el correo verificado.
    requireVerifiedEmail: toBool(process.env.AUTH_REQUIRE_VERIFIED_EMAIL, false),
    refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'refresh_token',
  },

  // Política de subida de archivos (decisión E del plan de implementación).
  upload: {
    dir: process.env.UPLOAD_DIR
      ? path.resolve(process.env.UPLOAD_DIR)
      : path.resolve(__dirname, '../../uploads'),
    // Ruta pública desde la que se sirven los archivos subidos.
    publicPath: process.env.UPLOAD_PUBLIC_PATH || '/uploads',
    maxSizeBytes: toInt(process.env.UPLOAD_MAX_SIZE_MB, 5) * 1024 * 1024,
    maxFiles: toInt(process.env.UPLOAD_MAX_FILES, 8),
    allowedMimeTypes: toList(process.env.UPLOAD_ALLOWED_MIME_TYPES, [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]),
  },

  logLevel: (process.env.LOG_LEVEL || 'info').toLowerCase(),
};

module.exports = env;
