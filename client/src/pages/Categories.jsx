import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StateMessage } from '../components/StateMessage';
import { useTaxonomy } from '../hooks/useTaxonomy';
import styles from './Categories.module.css';

// Árbol de navegación por taxonomía. Cada categoría despliega sus
// subcategorías reales (GET /subcategories?categoriaId=…) y cada enlace lleva
// al catálogo ya filtrado.
export default function Categories() {
  const { categorias, marcas, cargando, error, subcategoriasDe, cargarSubcategorias } =
    useTaxonomy();
  const [desplegada, setDesplegada] = useState(null);

  useEffect(() => {
    if (desplegada) cargarSubcategorias(desplegada);
  }, [desplegada, cargarSubcategorias]);

  return (
    <main id="contenido" className={styles.pagina}>
      <header className={styles.cabecera}>
        <h1 className={styles.titulo}>Categorías</h1>
        <p className={styles.subtitulo}>
          Navega la taxonomía completa o filtra el catálogo por marca.
        </p>
      </header>

      {cargando && <StateMessage tipo="cargando" titulo="Cargando categorías…" />}

      {!cargando && error && (
        <StateMessage
          tipo="error"
          titulo="No se pudo cargar la taxonomía"
          descripcion={error.message}
        />
      )}

      {!cargando && !error && categorias.length === 0 && (
        <StateMessage
          titulo="Todavía no hay categorías"
          descripcion="Cuando se registren categorías, aparecerán aquí."
        />
      )}

      {!cargando && !error && categorias.length > 0 && (
        <ul className={styles.rejilla}>
          {categorias.map((categoria) => {
            const subcategorias = subcategoriasDe(categoria.id);
            const abierta = desplegada === categoria.id;

            return (
              <li key={categoria.id} className={styles.tarjeta}>
                <div className={styles.tarjetaCabecera}>
                  <Link to={`/products?categoriaId=${categoria.id}`} className={styles.nombre}>
                    {categoria.nombre}
                  </Link>
                  <button
                    type="button"
                    className={styles.desplegar}
                    aria-expanded={abierta}
                    onClick={() => setDesplegada(abierta ? null : categoria.id)}
                  >
                    {abierta ? 'Ocultar' : 'Ver subcategorías'}
                  </button>
                </div>

                {categoria.descripcion && (
                  <p className={styles.descripcion}>{categoria.descripcion}</p>
                )}

                {abierta && (
                  <ul className={styles.subcategorias}>
                    {subcategorias.length === 0 && (
                      <li className={styles.sinSubcategorias}>Sin subcategorías registradas.</li>
                    )}
                    {subcategorias.map((subcategoria) => (
                      <li key={subcategoria.id}>
                        <Link
                          to={`/products?categoriaId=${categoria.id}&subcategoriaId=${subcategoria.id}`}
                          className={styles.subcategoria}
                        >
                          {subcategoria.nombre}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!cargando && marcas.length > 0 && (
        <section className={styles.seccionMarcas} aria-labelledby="titulo-marcas">
          <h2 id="titulo-marcas" className={styles.tituloSeccion}>
            Marcas
          </h2>
          <ul className={styles.marcas}>
            {marcas.map((marca) => (
              <li key={marca.id}>
                <Link to={`/products?marcaId=${marca.id}`} className={styles.marca}>
                  {marca.logoUrl && <img src={marca.logoUrl} alt="" className={styles.logoMarca} />}
                  {marca.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
