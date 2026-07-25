'use strict';

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, validate } = require('../middlewares');
const controller = require('../controllers/auth.controller');
const v = require('../validators/auth.validators');

const router = Router();

// --- Registro e inicio de sesión ---
router.post('/register', v.registerValidator, validate, asyncHandler(controller.register));
router.post('/login', v.loginValidator, validate, asyncHandler(controller.login));

// --- Gestión de sesión (tokens) ---
router.post('/refresh', v.refreshValidator, validate, asyncHandler(controller.refresh));
router.post('/logout', asyncHandler(controller.logout));

// --- Perfil del usuario autenticado ---
router.get('/me', authenticate, asyncHandler(controller.me));

// --- Contraseña ---
router.patch(
  '/password',
  authenticate,
  v.changePasswordValidator,
  validate,
  asyncHandler(controller.changePassword)
);
router.post(
  '/password/forgot',
  v.forgotPasswordValidator,
  validate,
  asyncHandler(controller.forgotPassword)
);
router.post(
  '/password/reset',
  v.resetPasswordValidator,
  validate,
  asyncHandler(controller.resetPassword)
);

// --- Verificación de correo ---
router.get('/email/verify', v.verifyEmailValidator, validate, asyncHandler(controller.verifyEmail));
router.post(
  '/email/resend',
  v.resendVerificationValidator,
  validate,
  asyncHandler(controller.resendVerification)
);

module.exports = router;
