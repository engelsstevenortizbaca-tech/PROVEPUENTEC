// Endpoints reales de `server/src/routes/auth.routes.js`.
// No se añade ninguna ruta que el backend no exponga.
import { http, setAccessToken } from './http';

// register/login/refresh devuelven { user, tokenType, accessToken, refreshToken,
// accessTokenExpiresIn }. El accessToken se guarda aquí para que el resto de la
// aplicación no tenga que hacerlo.
function storeSession(payload) {
  setAccessToken(payload?.accessToken || null);
  return payload?.user || null;
}

export const authService = {
  register: async (data) => storeSession(await http.post('/auth/register', data)),

  login: async (credentials) => storeSession(await http.post('/auth/login', credentials)),

  // El backend invalida el refresh token y limpia la cookie.
  logout: async () => {
    try {
      await http.post('/auth/logout', {});
    } finally {
      setAccessToken(null);
    }
  },

  // Perfil del usuario autenticado. Responde { user }.
  me: async () => (await http.get('/auth/me', { auth: true }))?.user || null,

  changePassword: (data) => http.patch('/auth/password', data, { auth: true }),

  forgotPassword: (email) => http.post('/auth/password/forgot', { email }),

  resetPassword: (data) => http.post('/auth/password/reset', data),

  resendVerification: (email) => http.post('/auth/email/resend', { email }),
};
