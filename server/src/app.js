'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const { requestLogger, notFound, errorHandler } = require('./middlewares');
const { globalLimiter } = require('./middlewares/rateLimiters');
const healthRoutes = require('./routes/health.routes');
const apiRoutes = require('./routes');

const app = express();

// Solo se confía en las cabeceras del proxy si TRUST_PROXY lo indica. Activarlo
// sin un proxy inverso delante permitiría falsear la IP con `X-Forwarded-For` y
// eludir el rate limiting.
app.set('trust proxy', env.trustProxy);

// --- Seguridad y utilidades base ---
app.use(helmet());
app.use(
  cors({
    origin: env.cors.origins.includes('*') ? true : env.cors.origins,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);

// --- Archivos subidos (servidos como estáticos) ---
// Se montan ANTES del rate limiting: una sola página de catálogo pide muchas
// imágenes y agotaría el cupo de la API para un usuario legítimo.
app.use(env.upload.publicPath, express.static(env.upload.dir, { index: false, fallthrough: true }));

// --- Sondeo de salud (fuera del rate limiting: lo consulta el orquestador) ---
app.use('/health', healthRoutes);

// --- Rate limiting y rutas de la API ---
app.use(env.apiPrefix, globalLimiter, apiRoutes);

// --- 404 y manejo global de errores (siempre al final) ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;
