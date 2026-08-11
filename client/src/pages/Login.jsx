import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../hooks/useAuth';
import styles from './auth.module.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const alCambiar = (evento) => {
    const { name, value } = evento.target;
    setForm((actual) => ({ ...actual, [name]: value }));
  };

  const alEnviar = async (evento) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setErrores({});

    try {
      await login(form);
      // Vuelve a donde el usuario quiso ir antes de que se le pidiera sesión.
      navigate(location.state?.desde || '/', { replace: true });
    } catch (err) {
      // 422 trae errores por campo; el resto (401, 429) es un mensaje único.
      setErrores(err.fieldErrors || {});
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={styles.pagina}>
      <div className={styles.tarjeta}>
        <div className={styles.cabecera}>
          <Logo size="auth" priority />
          <h1 className={styles.titulo}>Iniciar sesión</h1>
          <p className={styles.subtitulo}>Accede a tu cuenta para publicar y negociar.</p>
        </div>

        <form className={styles.formulario} onSubmit={alEnviar} noValidate>
          {error && (
            <p className={styles.alerta} role="alert">
              {error}
            </p>
          )}

          <div className={styles.campo}>
            <label className={styles.etiqueta} htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={alCambiar}
              className={`${styles.input} ${errores.email ? styles.inputError : ''}`}
              aria-invalid={Boolean(errores.email)}
            />
            {errores.email && <span className={styles.errorCampo}>{errores.email}</span>}
          </div>

          <div className={styles.campo}>
            <label className={styles.etiqueta} htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={alCambiar}
              className={`${styles.input} ${errores.password ? styles.inputError : ''}`}
              aria-invalid={Boolean(errores.password)}
            />
            {errores.password && <span className={styles.errorCampo}>{errores.password}</span>}
            <Link to="/recuperar" className={styles.enlaceOlvido}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" className={styles.boton} disabled={enviando}>
            {enviando ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className={styles.pie}>
          ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
}
