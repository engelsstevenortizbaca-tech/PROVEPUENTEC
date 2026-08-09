'use strict';

const { body, param, query } = require('express-validator');

const idParamValidator = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo'),
];

const slugParamValidator = [
  param('slug')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('El slug es obligatorio')
    .isLength({ max: 140 })
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Slug inválido (usa minúsculas, números y guiones)'),
];

const listValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero positivo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit debe estar entre 1 y 100'),
  query('activo').optional().isBoolean().withMessage('activo debe ser booleano'),
  query('q').optional().isString().trim().isLength({ max: 120 }),
];

// Regla de slug opcional compartida por crear/actualizar.
const optionalSlugRule = body('slug')
  .optional({ values: 'falsy' })
  .isString()
  .trim()
  .isLength({ max: 140 })
  .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .withMessage('Slug inválido (usa minúsculas, números y guiones)');

const createValidator = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ max: 120 })
    .withMessage('El nombre no puede superar 120 caracteres'),
  optionalSlugRule,
  body('descripcion').optional({ values: 'falsy' }).isString().trim().isLength({ max: 255 }),
  // .toBoolean() convierte la cadena a booleano real: sin ella, un cuerpo
  // urlencoded con activo=false llegaría como "false", que es truthy.
  body('activo').optional().isBoolean().withMessage('activo debe ser booleano').toBoolean(),
];

const updateValidator = [
  body('nombre')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre no puede estar vacío')
    .isLength({ max: 120 }),
  optionalSlugRule,
  body('descripcion').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  // .toBoolean() convierte la cadena a booleano real: sin ella, un cuerpo
  // urlencoded con activo=false llegaría como "false", que es truthy.
  body('activo').optional().isBoolean().withMessage('activo debe ser booleano').toBoolean(),
  // Al menos un campo debe venir en el cuerpo.
  body().custom((value) => {
    const keys = ['nombre', 'slug', 'descripcion', 'activo'];
    if (!keys.some((k) => value[k] !== undefined)) {
      throw new Error('Debes enviar al menos un campo para actualizar');
    }
    return true;
  }),
];

module.exports = {
  idParamValidator,
  slugParamValidator,
  listValidator,
  createValidator,
  updateValidator,
};
