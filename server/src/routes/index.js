'use strict';

const { Router } = require('express');
const authRoutes = require('./auth.routes');

// Router raíz de la API (montado bajo API_PREFIX, p. ej. /api).
// Las rutas de dominio (productos, pedidos, ...) se registrarán en fases
// posteriores.
const router = Router();

router.use('/auth', authRoutes);

module.exports = router;
