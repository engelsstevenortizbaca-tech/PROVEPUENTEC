'use strict';

const { body, param, query } = require('express-validator');
const { ASSIGNABLE_PRODUCT_STATUSES } = require('../constants/productStatus');
const { PRODUCT_CONDITIONS } = require('../constants/productCondition');
const productRepository = require('../repositories/product.repository');

const ORDENES = Object.keys(productRepository.ORDER_BY);

const idParamValidator = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo'),
];

const imageParamsValidator = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo'),
  param('imageId').isInt({ min: 1 }).withMessage('El imageId debe ser un entero positivo'),
];

const slugParamValidator = [
  param('slug')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('El slug es obligatorio')
    .isLength({ max: 200 })
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Slug inválido (usa minúsculas, números y guiones)'),
];

const listValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero positivo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit debe estar entre 1 y 100'),
  query('q').optional().isString().trim().isLength({ max: 180 }),
  query('categoriaId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('categoriaId debe ser un entero positivo'),
  query('subcategoriaId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('subcategoriaId debe ser un entero positivo'),
  query('marcaId').optional().isInt({ min: 1 }).withMessage('marcaId debe ser un entero positivo'),
  query('vendedorId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('vendedorId debe ser un entero positivo'),
  query('condicion')
    .optional()
    .isIn(PRODUCT_CONDITIONS)
    .withMessage(`condicion debe ser uno de: ${PRODUCT_CONDITIONS.join(', ')}`),
  query('precioMin')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('precioMin debe ser un número mayor o igual que 0'),
  query('precioMax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('precioMax debe ser un número mayor o igual que 0'),
  query('orden')
    .optional()
    .isIn(ORDENES)
    .withMessage(`orden debe ser uno de: ${ORDENES.join(', ')}`),
  // Un rango invertido no devuelve nada y casi siempre es un error del cliente.
  query().custom((_value, { req }) => {
    const { precioMin, precioMax } = req.query;
    if (precioMin !== undefined && precioMax !== undefined && Number(precioMin) > Number(precioMax))
      throw new Error('precioMin no puede ser mayor que precioMax');
    return true;
  }),
];

// Reglas compartidas por crear y actualizar. El precio se limita a 10 enteros y
// 2 decimales para encajar en DECIMAL(12,2).
const optionalSlugRule = body('slug')
  .optional({ values: 'falsy' })
  .isString()
  .trim()
  .isLength({ max: 200 })
  .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .withMessage('Slug inválido (usa minúsculas, números y guiones)');

const precioRule = (chain) =>
  chain
    .isFloat({ min: 0, max: 9999999999.99 })
    .withMessage('precio debe ser un número mayor o igual que 0')
    .toFloat();

const createValidator = [
  body('subcategoriaId')
    .isInt({ min: 1 })
    .withMessage('subcategoriaId es obligatorio y debe ser un entero positivo')
    .toInt(),
  body('marcaId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('marcaId debe ser un entero positivo')
    .toInt(),
  body('titulo')
    .trim()
    .notEmpty()
    .withMessage('El título es obligatorio')
    .isLength({ max: 180 })
    .withMessage('El título no puede superar 180 caracteres'),
  optionalSlugRule,
  body('descripcion').optional({ nullable: true }).isString().trim(),
  precioRule(body('precio').optional()),
  body('condicion')
    .optional()
    .isIn(PRODUCT_CONDITIONS)
    .withMessage(`condicion debe ser uno de: ${PRODUCT_CONDITIONS.join(', ')}`),
];

const UPDATABLE_FIELDS = [
  'subcategoriaId',
  'marcaId',
  'titulo',
  'slug',
  'descripcion',
  'precio',
  'condicion',
];

const updateValidator = [
  body('subcategoriaId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('subcategoriaId debe ser un entero positivo')
    .toInt(),
  // null desasocia la marca, por eso se admite explícitamente.
  body('marcaId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('marcaId debe ser un entero positivo')
    .toInt(),
  body('titulo')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El título no puede estar vacío')
    .isLength({ max: 180 }),
  optionalSlugRule,
  body('descripcion').optional({ nullable: true }).isString().trim(),
  precioRule(body('precio').optional()),
  body('condicion')
    .optional()
    .isIn(PRODUCT_CONDITIONS)
    .withMessage(`condicion debe ser uno de: ${PRODUCT_CONDITIONS.join(', ')}`),
  body().custom((value) => {
    if (!UPDATABLE_FIELDS.some((field) => value[field] !== undefined)) {
      throw new Error('Debes enviar al menos un campo para actualizar');
    }
    return true;
  }),
];

const statusValidator = [
  body('estado')
    .isIn(ASSIGNABLE_PRODUCT_STATUSES)
    .withMessage(`estado debe ser uno de: ${ASSIGNABLE_PRODUCT_STATUSES.join(', ')}`),
];

const updateImageValidator = [
  body('orden').optional().isInt({ min: 0 }).withMessage('orden debe ser un entero >= 0').toInt(),
  body('esPrincipal')
    .optional()
    .isBoolean()
    .withMessage('esPrincipal debe ser booleano')
    .toBoolean(),
  body().custom((value) => {
    if (value.orden === undefined && value.esPrincipal === undefined) {
      throw new Error('Debes enviar orden o esPrincipal');
    }
    return true;
  }),
];

module.exports = {
  idParamValidator,
  imageParamsValidator,
  slugParamValidator,
  listValidator,
  createValidator,
  updateValidator,
  statusValidator,
  updateImageValidator,
};
