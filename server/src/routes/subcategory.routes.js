'use strict';

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize, validate } = require('../middlewares');
const { ROLES } = require('../constants/roles');
const controller = require('../controllers/subcategory.controller');
const v = require('../validators/subcategory.validators');

const router = Router();

// Solo los administradores gestionan la taxonomía del catálogo.
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

module.exports = router;
