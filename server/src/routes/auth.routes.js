'use strict';

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, validate } = require('../middlewares');
const { authLimiter } = require('../middlewares/rateLimiters');
const controller = require('../controllers/auth.controller');
const v = require('../validators/auth.validators');

const router = Router();

// --- Registro e inicio de sesión ---
// `authLimiter` protege los endpoints que verifican credenciales o envían
// correo: son los que un atacante puede usar para fuerza bruta o spam.
router.post(
  '/register',
  authLimiter,
  v.registerValidator,
  validate,
  asyncHandler(controller.register)
);
router.post('/login', authLimiter, v.loginValidator, validate, asyncHandler(controller.login));

// --- Gestión de sesión (tokens) ---
router.post('/refresh', v.refreshValidator, validate, asyncHandler(controller.refresh));
router.post('/logout', asyncHandler(controller.logout));

// --- Perfil del usuario autenticado ---
router.get('/me', authenticate, asyncHandler(controller.me));

// --- Contraseña ---
router.patch(
  '/password',
  authenticate,
  authLimiter,
  v.changePasswordValidator,
  validate,
  asyncHandler(controller.changePassword)
);
router.post(
  '/password/forgot',
  authLimiter,
  v.forgotPasswordValidator,
  validate,
  asyncHandler(controller.forgotPassword)
);
router.post(
  '/password/reset',
  authLimiter,
  v.resetPasswordValidator,
  validate,
  asyncHandler(controller.resetPassword)
);

// --- Verificación de correo ---
router.get('/email/verify', v.verifyEmailValidator, validate, asyncHandler(controller.verifyEmail));
router.post(
  '/email/resend',
  authLimiter,
  v.resendVerificationValidator,
  validate,
  asyncHandler(controller.resendVerification)
);

module.exports = router;
