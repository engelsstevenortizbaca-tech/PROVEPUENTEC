'use strict';

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize, validate } = require('../middlewares');
const { ROLES } = require('../constants/roles');
const controller = require('../controllers/category.controller');
const v = require('../validators/category.validators');

const router = Router();

// Solo los administradores gestionan el catálogo de categorías.
const onlyAdmin = [authenticate, authorize(ROLES.ADMIN)];

// --- Lectura pública ---
router.get('/', v.listValidator, validate, asyncHandler(controller.list));
router.get('/slug/:slug', v.slugParamValidator, validate, asyncHandler(controller.getBySlug));
router.get('/:id', v.idParamValidator, validate, asyncHandler(controller.getById));

// --- Gestión (solo admin) ---
router.post('/', ...onlyAdmin, v.createValidator, validate, asyncHandler(controller.create));
router.patch(
  '/:id',
  ...onlyAdmin,
  v.idParamValidator,
  v.updateValidator,
  validate,
  asyncHandler(controller.update)
);
router.delete('/:id', ...onlyAdmin, v.idParamValidator, validate, asyncHandler(controller.remove));
router.post(
  '/:id/restore',
  ...onlyAdmin,
  v.idParamValidator,
  validate,
  asyncHandler(controller.restore)
);

module.exports = router;
