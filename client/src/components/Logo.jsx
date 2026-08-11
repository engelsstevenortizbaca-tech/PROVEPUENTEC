import logoProvepuentec from '../assets/logo-provepuentec.jpeg';
import styles from './Logo.module.css';

// Único punto de la aplicación que importa el archivo del logo. El resto de
// componentes usa <Logo />, de modo que existe una sola copia física del asset
// y Vite lo emite una vez con hash de contenido.
//
// La imagen mide 1280 x 704 (20:11). Se declaran `width` y `height`
// intrínsecos para que el navegador reserve el hueco antes de descargarla —sin
// salto de maquetación— y el CSS solo fija la ALTURA: la anchura se deriva,
// así que la proporción no puede romperse.
const TAMANOS = {
  navbar: styles.navbar,
  auth: styles.auth,
  hero: styles.hero,
  footer: styles.footer,
};

export function Logo({ size = 'navbar', className = '', priority = false }) {
  return (
    <img
      src={logoProvepuentec}
      alt="PROVEPUENTEC"
      width={1280}
      height={704}
      // El logo del navbar es visible de inmediato; el resto puede diferirse.
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={`${styles.logo} ${TAMANOS[size] || TAMANOS.navbar} ${className}`.trim()}
    />
  );
}
