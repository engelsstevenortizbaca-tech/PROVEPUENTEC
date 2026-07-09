'use strict';

const { Router } = require('express');

// Router raíz de la API (montado bajo API_PREFIX, p. ej. /api).
// Las rutas de dominio (usuarios, productos, pedidos, ...) se registrarán
// aquí en fases posteriores.
const router = Router();

module.exports = router;
