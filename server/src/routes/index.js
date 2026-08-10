'use strict';

const { Router } = require('express');
const authRoutes = require('./auth.routes');
const categoryRoutes = require('./category.routes');
const subcategoryRoutes = require('./subcategory.routes');
const brandRoutes = require('./brand.routes');
const productRoutes = require('./product.routes');

// Router raíz de la API (montado bajo API_PREFIX, p. ej. /api).
// Las rutas de dominio restantes (pedidos, envíos, ...) se registrarán en
// fases posteriores.
const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/subcategories', subcategoryRoutes);
router.use('/brands', brandRoutes);
router.use('/products', productRoutes);

module.exports = router;
