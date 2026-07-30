'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const { requestLogger, notFound, errorHandler } = require('./middlewares');
const healthRoutes = require('./routes/health.routes');
const apiRoutes = require('./routes');

const app = express();

// Confía en el proxy (necesario para rate-limit / IP real detrás de un proxy).
app.set('trust proxy', 1);

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

// --- Rate limiting global ---
app.use(
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    limit: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// --- Archivos subidos (servidos como estáticos) ---
app.use(env.upload.publicPath, express.static(env.upload.dir, { index: false, fallthrough: true }));

// --- Rutas ---
app.use('/health', healthRoutes);
app.use(env.apiPrefix, apiRoutes);

// --- 404 y manejo global de errores (siempre al final) ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;
