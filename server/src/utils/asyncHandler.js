'use strict';

// Envuelve un handler asíncrono para propagar cualquier rechazo al
// middleware global de errores (next), evitando try/catch repetitivos.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
