import { Link } from 'react-router-dom';
import { ETIQUETA_ESTADO } from '../services/product.service';
import { formatearPrecio } from '../utils/format';
import styles from './ProductCard.module.css';

// La galería llega ordenada por `es_principal DESC`, así que la portada es la
// primera imagen. Un producto sin imágenes muestra un marcador neutro.
const portadaDe = (producto) => producto.imagenes?.[0] || null;

export function ProductCard({ producto }) {
  const portada = portadaDe(producto);
  // El catálogo público solo devuelve productos activos: el distintivo de
  // estado únicamente aporta información cuando NO lo está (publicación propia).
  const mostrarEstado = producto.estado && producto.estado !== 'activo';

  return (
    <article className={styles.tarjeta}>
      <Link to={`/products/${producto.id}`} className={styles.enlace}>
        <div className={styles.imagen}>
          {portada ? (
            <img src={portada.url} alt={producto.titulo} loading="lazy" decoding="async" />
          ) : (
            <span className={styles.sinImagen}>Sin imagen</span>
          )}
          {mostrarEstado && (
            <span className={styles.estado}>
              {ETIQUETA_ESTADO[producto.estado] || producto.estado}
            </span>
          )}
        </div>

        <div className={styles.cuerpo}>
          {/* La marca es opcional: `marca_id` admite NULL. */}
          {producto.marca && <p className={styles.marca}>{producto.marca.nombre}</p>}

          <h3 className={styles.titulo}>{producto.titulo}</h3>

          {(producto.categoria || producto.subcategoria) && (
            <p className={styles.taxonomia}>
              {producto.categoria?.nombre}
              {producto.categoria && producto.subcategoria && ' · '}
              {producto.subcategoria?.nombre}
            </p>
          )}

          <p className={styles.precio}>{formatearPrecio(producto.precio)}</p>

          <p className={styles.meta}>
            <span className={styles.condicion}>
              {producto.condicion === 'nuevo' ? 'Nuevo' : 'Usado'}
            </span>
          </p>
        </div>
      </Link>
    </article>
  );
}
