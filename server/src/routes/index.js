'use strict';

const { Router } = require('express');
const authRoutes = require('./auth.routes');
const categoryRoutes = require('./category.routes');

// Router raíz de la API (montado bajo API_PREFIX, p. ej. /api).
// Las rutas de dominio restantes (productos, pedidos, ...) se registrarán en
// fases posteriores.
const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);

module.exports = router;
