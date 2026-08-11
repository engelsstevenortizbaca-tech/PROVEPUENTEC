import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { ProductCard } from '../components/ProductCard';
import { SearchBar } from '../components/SearchBar';
import { CardSkeleton, StateMessage } from '../components/StateMessage';
import { useApi } from '../hooks/useApi';
import { useTaxonomy } from '../hooks/useTaxonomy';
import { productService } from '../services/product.service';
import styles from './Landing.module.css';

const CATEGORIAS_DESTACADAS = 8;

export default function Landing() {
  const navigate = useNavigate();
  // Las categorías vienen del contexto compartido: no se vuelve a pedir.
  const { categorias, cargando: cargandoTaxonomia } = useTaxonomy();

  const pedirRecientes = useCallback(
    () => productService.list({ limit: 8, orden: 'recientes' }),
    [],
  );
  const { data, error, cargando } = useApi(pedirRecientes);
  const productos = data?.data || [];

  const buscar = (termino) =>
    navigate(termino ? `/products?q=${encodeURIComponent(termino)}` : '/products');

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroContenido}>
          <Logo size="hero" priority />
          <h1 className={styles.heroTitulo}>Conectando negocios, creando oportunidades</h1>
          <p className={styles.heroTexto}>
            Publica tus productos, negocia el precio y el envío, y haz seguimiento de tus pedidos.
          </p>
          <div className={styles.heroBuscador}>
            <SearchBar id="busqueda-portada" onBuscar={buscar} />
          </div>
        </div>
      </section>

      <main id="contenido" className={styles.contenedor}>
        <section className={styles.seccion} aria-labelledby="titulo-categorias">
          <div className={styles.seccionCabecera}>
            <h2 id="titulo-categorias">Categorías</h2>
            <Link to="/categories" className={styles.verTodo}>
              Ver todas
            </Link>
          </div>

          {cargandoTaxonomia && <p className={styles.estado}>Cargando categorías…</p>}

          {!cargandoTaxonomia && categorias.length === 0 && (
            <p className={styles.estado}>Todavía no hay categorías registradas.</p>
          )}

          {categorias.length > 0 && (
            <ul className={styles.categorias}>
              {categorias.slice(0, CATEGORIAS_DESTACADAS).map((categoria) => (
                <li key={categoria.id}>
                  <Link to={`/products?categoriaId=${categoria.id}`} className={styles.categoria}>
                    {categoria.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.seccion} aria-labelledby="titulo-recientes">
          <div className={styles.seccionCabecera}>
            <h2 id="titulo-recientes">Últimas publicaciones</h2>
            <Link to="/products" className={styles.verTodo}>
              Ver catálogo
            </Link>
          </div>

          {cargando && <CardSkeleton cantidad={4} />}

          {!cargando && error && (
            <StateMessage
              tipo="error"
              titulo="No se pudieron cargar los productos"
              descripcion={error.message}
            />
          )}

          {!cargando && !error && productos.length === 0 && (
            <StateMessage
              titulo="Todavía no hay productos publicados"
              descripcion="Cuando alguien publique, aparecerá aquí."
            />
          )}

          {!cargando && !error && productos.length > 0 && (
            <div className={styles.rejilla}>
              {productos.map((producto) => (
                <ProductCard key={producto.id} producto={producto} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
