import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import styles from './Footer.module.css';

const ANIO = new Date().getFullYear();

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.contenido}>
        <div className={styles.marca}>
          <Logo size="footer" />
          {/* El lema ya forma parte del logo; aquí no se repite. */}
          <p className={styles.descripcion}>
            Marketplace para publicar, negociar y hacer seguimiento de tus pedidos.
          </p>
        </div>

        <nav className={styles.columna} aria-label="Enlaces del pie">
          <h2 className={styles.titulo}>Explorar</h2>
          <Link to="/products" className={styles.enlace}>
            Productos
          </Link>
          <Link to="/categories" className={styles.enlace}>
            Categorías
          </Link>
        </nav>

        <div className={styles.columna}>
          <h2 className={styles.titulo}>Cuenta</h2>
          <Link to="/login" className={styles.enlace}>
            Iniciar sesión
          </Link>
          <Link to="/registro" className={styles.enlace}>
            Crear cuenta
          </Link>
        </div>
      </div>

      <div className={styles.legal}>
        <p>© {ANIO} PROVEPUENTEC. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
