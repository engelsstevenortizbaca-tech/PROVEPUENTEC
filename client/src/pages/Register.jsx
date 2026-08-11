import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../hooks/useAuth';
import styles from './auth.module.css';

// Campos que acepta POST /auth/register. `telefono` es el único opcional.
const INICIAL = { nombre: '', apellido: '', email: '', telefono: '', password: '' };

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(INICIAL);
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
      // El teléfono vacío no se envía: es opcional y el validador lo rechazaría
      // como cadena vacía.
      const { telefono, ...resto } = form;
      await register(telefono.trim() ? form : resto);
      navigate('/', { replace: true });
    } catch (err) {
      setErrores(err.fieldErrors || {});
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const campo = (name, label, tipo = 'text', autoComplete, requerido = true) => (
    <div className={styles.campo}>
      <label className={styles.etiqueta} htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={tipo}
        autoComplete={autoComplete}
        required={requerido}
        value={form[name]}
        onChange={alCambiar}
        className={`${styles.input} ${errores[name] ? styles.inputError : ''}`}
        aria-invalid={Boolean(errores[name])}
      />
      {errores[name] && <span className={styles.errorCampo}>{errores[name]}</span>}
    </div>
  );

  return (
    <div className={styles.pagina}>
      <div className={styles.tarjeta}>
        <div className={styles.cabecera}>
          <Logo size="auth" priority />
          <h1 className={styles.titulo}>Crear cuenta</h1>
          <p className={styles.subtitulo}>Únete para publicar productos y negociar precios.</p>
        </div>

        <form className={styles.formulario} onSubmit={alEnviar} noValidate>
          {error && (
            <p className={styles.alerta} role="alert">
              {error}
            </p>
          )}

          <div className={styles.fila}>
            {campo('nombre', 'Nombre', 'text', 'given-name')}
            {campo('apellido', 'Apellido', 'text', 'family-name')}
          </div>

          {campo('email', 'Correo electrónico', 'email', 'email')}
          {campo('telefono', 'Teléfono (opcional)', 'tel', 'tel', false)}
          {campo('password', 'Contraseña', 'password', 'new-password')}
          <p className={styles.subtitulo}>
            Mínimo 8 caracteres, con al menos una letra y un número.
          </p>

          <button type="submit" className={styles.boton} disabled={enviando}>
            {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className={styles.pie}>
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
