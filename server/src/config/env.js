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

// Secretos de desarrollo: sirven para arrancar sin configurar nada, pero están
// publicados en `.env.example` y en el historial de Git. `assertProductionConfig`
// impide que lleguen a producción.
const DEV_ACCESS_SECRET = 'dev-access-secret-change-me';
const DEV_REFRESH_SECRET = 'dev-refresh-secret-change-me';
const MIN_SECRET_LENGTH = 32;

const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: toInt(process.env.PORT, 3000),
  apiPrefix: process.env.API_PREFIX || '/api',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  // Solo debe activarse si hay un proxy inverso de confianza delante. Con esto
  // activado sin proxy, cualquier cliente puede falsear su IP mediante
  // `X-Forwarded-For` y saltarse el rate limiting.
  trustProxy: toInt(process.env.TRUST_PROXY, 0),

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
    // Límite específico de los endpoints de autenticación (más estricto).
    authWindowMs: toInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * 60 * 1000),
    authMax: toInt(process.env.RATE_LIMIT_AUTH_MAX, 10),
  },

  auth: {
    bcryptRounds: toInt(process.env.BCRYPT_ROUNDS, 12),
    // Secretos de firma de JWT. En producción DEBEN definirse por entorno:
    // `assertProductionConfig` aborta el arranque si no es así.
    accessSecret: process.env.JWT_ACCESS_SECRET || DEV_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET || DEV_REFRESH_SECRET,
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

// Comprobaciones que solo tienen sentido en producción. Se ejecutan al arrancar
// (server.js): es preferible no arrancar a arrancar con una configuración
// insegura de forma silenciosa.
function assertProductionConfig() {
  if (!env.isProduction) return;

  const problems = [];
  const { accessSecret, refreshSecret } = env.auth;

  if (accessSecret === DEV_ACCESS_SECRET) {
    problems.push('JWT_ACCESS_SECRET conserva el valor de desarrollo');
  }
  if (refreshSecret === DEV_REFRESH_SECRET) {
    problems.push('JWT_REFRESH_SECRET conserva el valor de desarrollo');
  }
  if (accessSecret.length < MIN_SECRET_LENGTH) {
    problems.push(`JWT_ACCESS_SECRET debe tener al menos ${MIN_SECRET_LENGTH} caracteres`);
  }
  if (refreshSecret.length < MIN_SECRET_LENGTH) {
    problems.push(`JWT_REFRESH_SECRET debe tener al menos ${MIN_SECRET_LENGTH} caracteres`);
  }
  // Un mismo secreto para ambos permitiría usar un refresh token como access token.
  if (accessSecret === refreshSecret) {
    problems.push('JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben ser distintos');
  }
  // `credentials: true` con origen comodín expone la API a cualquier sitio.
  if (env.cors.origins.includes('*')) {
    problems.push('CORS_ORIGINS no puede ser "*": indica los orígenes permitidos');
  }

  if (problems.length > 0) {
    throw new Error(
      `Configuración de producción inválida:\n${problems.map((p) => `  - ${p}`).join('\n')}`
    );
  }
}

env.assertProductionConfig = assertProductionConfig;

module.exports = env;
