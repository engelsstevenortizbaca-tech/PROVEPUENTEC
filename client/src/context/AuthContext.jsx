import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth.service';
import { getAccessToken } from '../services/http';
import { ROLES } from '../utils/roles';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // `cargando` cubre solo la hidratación inicial: evita que una ruta privada
  // redirija a /login antes de saber si hay sesión.
  const [cargando, setCargando] = useState(Boolean(getAccessToken()));

  // Al arrancar, si hay un access token guardado se rehidrata el usuario. Si
  // está caducado, la capa HTTP intenta renovarlo con la cookie httpOnly antes
  // de darlo por perdido.
  useEffect(() => {
    if (!getAccessToken()) return undefined;

    let vigente = true;
    authService
      .me()
      .then((perfil) => {
        if (vigente) setUser(perfil);
      })
      .catch(() => {
        if (vigente) setUser(null);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const perfil = await authService.login(credentials);
    setUser(perfil);
    return perfil;
  }, []);

  const register = useCallback(async (data) => {
    const perfil = await authService.register(data);
    setUser(perfil);
    return perfil;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  // Refresca el perfil tras cambiarlo (p. ej. al verificar el correo).
  const recargarPerfil = useCallback(async () => {
    const perfil = await authService.me();
    setUser(perfil);
    return perfil;
  }, []);

  const value = useMemo(
    () => ({
      user,
      cargando,
      autenticado: user !== null,
      esAdmin: Boolean(user?.roles?.includes(ROLES.ADMIN)),
      login,
      register,
      logout,
      recargarPerfil,
    }),
    [user, cargando, login, register, logout, recargarPerfil],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
