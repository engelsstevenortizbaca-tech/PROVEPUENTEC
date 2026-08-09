'use strict';

const httpStatus = require('../constants/httpStatus');
const env = require('../config/env');
const authService = require('../services/auth.service');

const getContext = (req) => ({
  userAgent: req.headers['user-agent'] || null,
  ip: req.ip || null,
});

// El refresh token se entrega en una cookie httpOnly, restringida a las rutas
// de auth. También se acepta en el body para clientes no-navegador.
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'strict',
  path: `${env.apiPrefix}/auth`,
});

// La cookie caduca con el propio token. Sin `expires` sería una cookie de
// sesión: se perdería al cerrar el navegador aunque el refresh token siguiera
// siendo válido, obligando a iniciar sesión de nuevo.
const setRefreshCookie = (res, { refreshToken, refreshTokenExpiresAt }) =>
  res.cookie(env.auth.refreshCookieName, refreshToken, {
    ...refreshCookieOptions(),
    ...(refreshTokenExpiresAt && { expires: new Date(refreshTokenExpiresAt) }),
  });

const clearRefreshCookie = (res) =>
  res.clearCookie(env.auth.refreshCookieName, refreshCookieOptions());

const readRefreshToken = (req) =>
  (req.body && req.body.refreshToken) ||
  (req.cookies && req.cookies[env.auth.refreshCookieName]) ||
  null;

const register = async (req, res) => {
  const { user, tokens } = await authService.register(req.body, getContext(req));
  setRefreshCookie(res, tokens);
  res.status(httpStatus.CREATED).json({ user, ...tokens });
};

const login = async (req, res) => {
  const { user, tokens } = await authService.login(req.body, getContext(req));
  setRefreshCookie(res, tokens);
  res.status(httpStatus.OK).json({ user, ...tokens });
};

const refresh = async (req, res) => {
  const { user, tokens } = await authService.refresh(readRefreshToken(req), getContext(req));
  setRefreshCookie(res, tokens);
  res.status(httpStatus.OK).json({ user, ...tokens });
};

const logout = async (req, res) => {
  await authService.logout(readRefreshToken(req));
  clearRefreshCookie(res);
  res.status(httpStatus.OK).json({ message: 'Sesión cerrada correctamente' });
};

const changePassword = async (req, res) => {
  await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
  clearRefreshCookie(res);
  res.status(httpStatus.OK).json({
    message: 'Contraseña actualizada. Inicia sesión nuevamente.',
  });
};

const forgotPassword = async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res.status(httpStatus.OK).json({
    message: 'Si el correo está registrado, se enviaron instrucciones de recuperación.',
  });
};

const resetPassword = async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  res.status(httpStatus.OK).json({ message: 'Contraseña restablecida correctamente' });
};

const verifyEmail = async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(httpStatus.OK).json({ message: 'Correo verificado correctamente' });
};

const resendVerification = async (req, res) => {
  await authService.resendVerification(req.body.email);
  res.status(httpStatus.OK).json({
    message: 'Si procede, se reenvió el correo de verificación.',
  });
};

const me = async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  res.status(httpStatus.OK).json({ user });
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  me,
};
