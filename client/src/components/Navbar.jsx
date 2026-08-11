import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Logo } from './Logo';
import { useAuth } from '../hooks/useAuth';
import styles from './Navbar.module.css';

const ENLACES = [
  { to: '/products', label: 'Productos' },
  { to: '/categories', label: 'Categorías' },
];

export function Navbar() {
  const { autenticado, user, logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Navegación principal">
        {/* El logo es el enlace a la portada, patrón habitual de marketplace. */}
        <Link
          to="/"
          className={styles.marca}
          onClick={cerrarMenu}
          aria-label="PROVEPUENTEC — inicio"
        >
          <Logo size="navbar" priority />
        </Link>

        <button
          type="button"
          className={styles.botonMenu}
          aria-expanded={menuAbierto}
          aria-controls="menu-principal"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          <span className={styles.iconoMenu} aria-hidden="true" />
          {menuAbierto ? 'Cerrar' : 'Menú'}
        </button>

        <div
          id="menu-principal"
          className={`${styles.menu} ${menuAbierto ? styles.menuAbierto : ''}`}
        >
          <ul className={styles.enlaces}>
            {ENLACES.map((enlace) => (
              <li key={enlace.to}>
                <NavLink
                  to={enlace.to}
                  onClick={cerrarMenu}
                  className={({ isActive }) =>
                    `${styles.enlace} ${isActive ? styles.enlaceActivo : ''}`
                  }
                >
                  {enlace.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className={styles.acciones}>
            {autenticado ? (
              <>
                <NavLink to="/perfil" onClick={cerrarMenu} className={styles.enlace}>
                  {user?.nombre || 'Mi perfil'}
                </NavLink>
                <button
                  type="button"
                  className={styles.botonSecundario}
                  onClick={() => {
                    cerrarMenu();
                    logout();
                  }}
                >
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={cerrarMenu} className={styles.botonSecundario}>
                  Iniciar sesión
                </Link>
                <Link to="/registro" onClick={cerrarMenu} className={styles.botonPrimario}>
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
