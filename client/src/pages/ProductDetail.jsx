import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProductGallery } from '../components/ProductGallery';
import { StateMessage } from '../components/StateMessage';
import { useApi } from '../hooks/useApi';
import { ETIQUETA_ESTADO, productService } from '../services/product.service';
import { formatearFecha, formatearPrecio } from '../utils/format';
import styles from './ProductDetail.module.css';

export default function ProductDetail() {
  const { id } = useParams();

  const pedirProducto = useCallback(() => productService.getById(id), [id]);
  const { data: producto, error, cargando } = useApi(pedirProducto);

  if (cargando) {
    return (
      <main id="contenido" className={styles.pagina}>
        <StateMessage tipo="cargando" titulo="Cargando producto…" />
      </main>
    );
  }

  // El backend responde 404 tanto si el producto no existe como si no es
  // visible para quien pregunta (borrador ajeno). Se trata igual a propósito:
  // revelar la diferencia expondría publicaciones privadas.
  if (error?.status === 404) {
    return (
      <main id="contenido" className={styles.pagina}>
        <StateMessage
          titulo="Producto no encontrado"
          descripcion="Puede que se haya retirado o que el enlace no sea correcto."
        >
          <Link to="/products" className={styles.volver}>
            Volver al catálogo
          </Link>
        </StateMessage>
      </main>
    );
  }

  if (error || !producto) {
    return (
      <main id="contenido" className={styles.pagina}>
        <StateMessage
          tipo="error"
          titulo="No se pudo cargar el producto"
          descripcion={error?.message}
        />
      </main>
    );
  }

  const disponible = producto.estado === 'activo';

  return (
    <main id="contenido" className={styles.pagina}>
      <nav className={styles.migas} aria-label="Ruta de navegación">
        <Link to="/products">Catálogo</Link>
        {producto.categoria && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`/products?categoriaId=${producto.categoria.id}`}>
              {producto.categoria.nombre}
            </Link>
          </>
        )}
        {producto.subcategoria && (
          <>
            <span aria-hidden="true">/</span>
            <Link
              to={`/products?categoriaId=${producto.categoria?.id ?? ''}&subcategoriaId=${producto.subcategoria.id}`}
            >
              {producto.subcategoria.nombre}
            </Link>
          </>
        )}
      </nav>

      <div className={styles.disposicion}>
        <ProductGallery imagenes={producto.imagenes || []} titulo={producto.titulo} />

        <div className={styles.informacion}>
          {producto.marca && (
            <Link to={`/products?marcaId=${producto.marca.id}`} className={styles.marca}>
              {producto.marca.nombre}
            </Link>
          )}

          <h1 className={styles.titulo}>{producto.titulo}</h1>

          <div className={styles.distintivos}>
            <span className={styles.condicion}>
              {producto.condicion === 'nuevo' ? 'Nuevo' : 'Usado'}
            </span>
            <span className={disponible ? styles.disponible : styles.noDisponible}>
              {ETIQUETA_ESTADO[producto.estado] || producto.estado}
            </span>
          </div>

          <p className={styles.precio}>{formatearPrecio(producto.precio)}</p>
          <p className={styles.aviso}>El precio es negociable con quien vende.</p>

          {producto.descripcion ? (
            <section className={styles.bloque} aria-labelledby="titulo-descripcion">
              <h2 id="titulo-descripcion" className={styles.subtitulo}>
                Descripción
              </h2>
              <p className={styles.descripcion}>{producto.descripcion}</p>
            </section>
          ) : (
            <p className={styles.sinDescripcion}>Esta publicación no incluye descripción.</p>
          )}

          <section className={styles.bloque} aria-labelledby="titulo-detalles">
            <h2 id="titulo-detalles" className={styles.subtitulo}>
              Detalles
            </h2>
            <dl className={styles.tabla}>
              {producto.categoria && (
                <>
                  <dt>Categoría</dt>
                  <dd>{producto.categoria.nombre}</dd>
                </>
              )}
              {producto.subcategoria && (
                <>
                  <dt>Subcategoría</dt>
                  <dd>{producto.subcategoria.nombre}</dd>
                </>
              )}
              <dt>Marca</dt>
              <dd>{producto.marca?.nombre || 'Sin marca'}</dd>
              <dt>Condición</dt>
              <dd>{producto.condicion === 'nuevo' ? 'Nuevo' : 'Usado'}</dd>
              <dt>Disponibilidad</dt>
              <dd>{ETIQUETA_ESTADO[producto.estado] || producto.estado}</dd>
              {/* La API expone `vendedorId`, pero ningún dato del vendedor
                  (nombre, avatar o valoración). Se muestra solo el
                  identificador en lugar de inventar un perfil. */}
              <dt>Vendedor</dt>
              <dd>#{producto.vendedorId}</dd>
              {producto.createdAt && (
                <>
                  <dt>Publicado</dt>
                  <dd>{formatearFecha(producto.createdAt)}</dd>
                </>
              )}
            </dl>
          </section>
        </div>
      </div>
    </main>
  );
}
