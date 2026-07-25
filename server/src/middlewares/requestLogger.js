'use strict';

const morgan = require('morgan');
const env = require('../config/env');
const logger = require('../utils/logger');

// Logging de peticiones HTTP. En producción usa el formato "combined";
// en desarrollo el más legible "dev". Ambos se canalizan al logger.
const format = env.isProduction ? 'combined' : 'dev';

module.exports = morgan(format, { stream: logger.stream });
