'use strict';

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, ownership, upload, validate } = require('../middlewares');
const { ROLES } = require('../constants/roles');
const productRepository = require('../repositories/product.repository');
const controller = require('../controllers/product.controller');
const v = require('../validators/product.validators');

const router = Router();

// La escritura se autoriza por propiedad, no por rol (decisión 4): cualquier
// usuario publica, pero solo el dueño edita lo suyo.
const loadProduct = (req) => productRepository.findById(req.params.id);

const owner = ownership(loadProduct, {
  owners: ['vendedor_id'],
  as: 'product',
  notFoundMessage: 'Producto no encontrado',
});

// El administrador también puede retirar una publicación.
const ownerOrAdmin = ownership(loadProduct, {
  owners: ['vendedor_id'],
  allowRoles: [ROLES.ADMIN],
  as: 'product',
  notFoundMessage: 'Producto no encontrado',
});

// --- Lectura ---------------------------------------------------------------
// `/me` va antes que `/:id` para que no lo capture la ruta paramétrica.
router.get('/', v.listValidator, validate, asyncHandler(controller.list));
router.get('/me', authenticate, v.listValidator, validate, asyncHandler(controller.listMine));

// Autenticación opcional: el dueño ve sus borradores; el resto recibe 404.
router.get(
  '/slug/:slug',
  authenticate.optional,
  v.slugParamValidator,
  validate,
  asyncHandler(controller.getBySlug)
);
router.get(
  '/:id',
  authenticate.optional,
  v.idParamValidator,
  validate,
  asyncHandler(controller.getById)
);

// --- Gestión del producto ---------------------------------------------------
router.post('/', authenticate, v.createValidator, validate, asyncHandler(controller.create));

router.patch(
  '/:id',
  authenticate,
  v.idParamValidator,
  validate,
  owner,
  v.updateValidator,
  validate,
  asyncHandler(controller.update)
);

router.patch(
  '/:id/status',
  authenticate,
  v.idParamValidator,
  validate,
  owner,
  v.statusValidator,
  validate,
  asyncHandler(controller.changeStatus)
);

router.delete(
  '/:id',
  authenticate,
  v.idParamValidator,
  validate,
  ownerOrAdmin,
  asyncHandler(controller.remove)
);

// --- Galería de imágenes ----------------------------------------------------
// `upload.array` va después de la comprobación de propiedad: así un tercero no
// llega siquiera a escribir archivos en disco.
router.post(
  '/:id/images',
  authenticate,
  v.idParamValidator,
  validate,
  owner,
  upload.array('imagenes'),
  asyncHandler(controller.addImages)
);

router.patch(
  '/:id/images/:imageId',
  authenticate,
  v.imageParamsValidator,
  validate,
  owner,
  v.updateImageValidator,
  validate,
  asyncHandler(controller.updateImage)
);

router.delete(
  '/:id/images/:imageId',
  authenticate,
  v.imageParamsValidator,
  validate,
  owner,
  asyncHandler(controller.removeImage)
);

module.exports = router;
