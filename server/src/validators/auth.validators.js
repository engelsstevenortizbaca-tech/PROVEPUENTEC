'use strict';

const { body, query } = require('express-validator');

// Regla reutilizable de contraseña: mínimo 8 caracteres, con al menos una
// letra y un número.
const passwordRule = (field = 'password') =>
  body(field)
    .isString()
    .isLength({ min: 8, max: 100 })
    .withMessage('La contraseña debe tener entre 8 y 100 caracteres')
    .matches(/[A-Za-z]/)
    .withMessage('La contraseña debe incluir al menos una letra')
    .matches(/\d/)
    .withMessage('La contraseña debe incluir al menos un número');

const emailRule = body('email')
  .isEmail()
  .withMessage('Correo electrónico inválido')
  .normalizeEmail();

const registerValidator = [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 80 }),
  body('apellido')
    .trim()
    .notEmpty()
    .withMessage('El apellido es obligatorio')
    .isLength({ max: 80 }),
  emailRule,
  passwordRule(),
  body('telefono').optional({ values: 'falsy' }).isLength({ max: 30 }),
];

const loginValidator = [
  body('email').isEmail().withMessage('Correo electrónico inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es obligatoria'),
];

const refreshValidator = [body('refreshToken').optional().isString()];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('La contraseña actual es obligatoria'),
  passwordRule('newPassword'),
];

const forgotPasswordValidator = [emailRule];

const resetPasswordValidator = [
  body('token').notEmpty().withMessage('El token es obligatorio'),
  passwordRule('newPassword'),
];

const verifyEmailValidator = [query('token').notEmpty().withMessage('El token es obligatorio')];

const resendVerificationValidator = [emailRule];

module.exports = {
  registerValidator,
  loginValidator,
  refreshValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyEmailValidator,
  resendVerificationValidator,
};
