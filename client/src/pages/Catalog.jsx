import { useCallback } from 'react';
import { CatalogFilters } from '../components/CatalogFilters';
import { Pagination } from '../components/Pagination';
import { ProductCard } from '../components/ProductCard';
import { SearchBar } from '../components/SearchBar';
import { CardSkeleton, StateMessage } from '../components/StateMessage';
import { useApi } from '../hooks/useApi';
import { useCatalogFilters } from '../hooks/useCatalogFilters';
import { ORDENES, productService } from '../services/product.service';
import styles from './Catalog.module.css';

export default function Catalog() {
  const { filtros, consulta, aplicar, irAPagina, limpiar, activos } = useCatalogFilters();

  // La consulta se serializa para usarla como dependencia estable: cualquier
  // cambio de filtro, orden o página vuelve a pedir al backend, y dos objetos
  // con el mismo contenido no disparan una petición de más. No hay filtrado en
  // el cliente: los filtros los resuelve la API.
  const clave = JSON.stringify(consulta);
  const pedirProductos = useCallback(() => productService.list(JSON.parse(clave)), [clave]);

  const { data, error, cargando } = useApi(pedirProductos);

  const productos = data?.data || [];
  const pagination = data?.pagination || null;
  const hayFiltros = activos > 0;

  return (
    <main id="contenido" className={styles.pagina}>
      <header className={styles.cabecera}>
        <h1 className={styles.titulo}>Catálogo</h1>
        <p className={styles.subtitulo}>
          Explora las publicaciones disponibles y negocia directamente con quien vende.
        </p>
        <SearchBar valorInicial={filtros.q || ''} onBuscar={(q) => aplicar({ q })} />
      </header>

      <div className={styles.disposicion}>
        <CatalogFilters
          filtros={filtros}
          onAplicar={aplicar}
          onLimpiar={limpiar}
          activos={activos}
        />

        <section className={styles.resultados} aria-label="Resultados del catálogo">
          <div className={styles.barra}>
            <p className={styles.recuento} aria-live="polite">
              {cargando
                ? 'Buscando…'
                : `${pagination?.total ?? 0} producto${pagination?.total === 1 ? '' : 's'}`}
              {filtros.q && !cargando && (
                <>
                  {' '}
                  para <strong>«{filtros.q}»</strong>
                </>
              )}
            </p>

            <div className={styles.orden}>
              <label htmlFor="orden-catalogo">Ordenar por</label>
              <select
                id="orden-catalogo"
                className={styles.selectOrden}
                value={consulta.orden}
                onChange={(evento) => aplicar({ orden: evento.target.value })}
              >
                {ORDENES.map((orden) => (
                  <option key={orden.value} value={orden.value}>
                    {orden.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {cargando && <CardSkeleton cantidad={8} />}

          {!cargando && error && (
            <StateMessage
              tipo="error"
              titulo="No se pudo cargar el catálogo"
              descripcion={error.message}
            />
          )}

          {/* Catálogo vacío y «sin resultados» son situaciones distintas: la
              primera es que aún no hay nada publicado; la segunda, que los
              filtros no casan con nada. */}
          {!cargando && !error && productos.length === 0 && !hayFiltros && !filtros.q && (
            <StateMessage
              titulo="Todavía no hay productos publicados"
              descripcion="Cuando alguien publique una primera publicación, aparecerá aquí."
            />
          )}

          {!cargando && !error && productos.length === 0 && (hayFiltros || filtros.q) && (
            <StateMessage
              titulo="Ningún producto coincide con tu búsqueda"
              descripcion="Prueba con otros términos o quita alguno de los filtros aplicados."
            >
              <button type="button" className={styles.limpiarTodo} onClick={limpiar}>
                Limpiar filtros
              </button>
            </StateMessage>
          )}

          {!cargando && !error && productos.length > 0 && (
            <>
              <div className={styles.rejilla}>
                {productos.map((producto) => (
                  <ProductCard key={producto.id} producto={producto} />
                ))}
              </div>
              <Pagination pagination={pagination} onCambiar={irAPagina} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
