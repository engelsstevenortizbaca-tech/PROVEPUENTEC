import { useEffect, useState } from 'react';
import { useTaxonomy } from '../hooks/useTaxonomy';
import { CONDICIONES } from '../services/product.service';
import styles from './CatalogFilters.module.css';

// Panel de filtros del catálogo. No hace peticiones de productos: solo informa
// del cambio con `onAplicar` y la página se encarga de recargar.
export function CatalogFilters({ filtros, onAplicar, onLimpiar, activos }) {
  const { categorias, marcas, cargando, subcategoriasDe, cargarSubcategorias } = useTaxonomy();
  const [abierto, setAbierto] = useState(false);

  const categoriaId = filtros.categoriaId || '';
  const subcategorias = subcategoriasDe(categoriaId);

  // Las subcategorías del segundo nivel se piden solo cuando hay una categoría
  // elegida. El contexto cachea el resultado.
  useEffect(() => {
    if (categoriaId) cargarSubcategorias(categoriaId);
  }, [categoriaId, cargarSubcategorias]);

  // Cambiar de categoría invalida la subcategoría anterior: pertenecía a otra
  // rama del árbol y devolvería resultados vacíos.
  const cambiarCategoria = (valor) => onAplicar({ categoriaId: valor, subcategoriaId: '' });

  // El rango de precios se confirma al enviar: aplicarlo en cada pulsación
  // dispararía una petición por dígito.
  const [precio, setPrecio] = useState({
    precioMin: filtros.precioMin || '',
    precioMax: filtros.precioMax || '',
  });

  useEffect(() => {
    setPrecio({ precioMin: filtros.precioMin || '', precioMax: filtros.precioMax || '' });
  }, [filtros.precioMin, filtros.precioMax]);

  const rangoInvertido =
    precio.precioMin !== '' &&
    precio.precioMax !== '' &&
    Number(precio.precioMin) > Number(precio.precioMax);

  const aplicarPrecio = (evento) => {
    evento.preventDefault();
    // El backend responde 422 ante un rango invertido; se avisa antes de pedirlo.
    if (rangoInvertido) return;
    onAplicar(precio);
  };

  return (
    <aside className={styles.panel} aria-label="Filtros del catálogo">
      <button
        type="button"
        className={styles.alternar}
        aria-expanded={abierto}
        aria-controls="filtros-catalogo"
        onClick={() => setAbierto((estado) => !estado)}
      >
        Filtros {activos > 0 && <span className={styles.contador}>{activos}</span>}
      </button>

      <div id="filtros-catalogo" className={`${styles.cuerpo} ${abierto ? styles.abierto : ''}`}>
        <div className={styles.cabecera}>
          <h2 className={styles.titulo}>Filtros</h2>
          {activos > 0 && (
            <button type="button" className={styles.limpiar} onClick={onLimpiar}>
              Limpiar
            </button>
          )}
        </div>

        {cargando && <p className={styles.cargando}>Cargando filtros…</p>}

        <div className={styles.grupo}>
          <label className={styles.etiqueta} htmlFor="filtro-categoria">
            Categoría
          </label>
          <select
            id="filtro-categoria"
            className={styles.select}
            value={categoriaId}
            onChange={(evento) => cambiarCategoria(evento.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* El segundo nivel solo tiene sentido con una categoría elegida. */}
        {categoriaId && (
          <div className={styles.grupo}>
            <label className={styles.etiqueta} htmlFor="filtro-subcategoria">
              Subcategoría
            </label>
            <select
              id="filtro-subcategoria"
              className={styles.select}
              value={filtros.subcategoriaId || ''}
              onChange={(evento) => onAplicar({ subcategoriaId: evento.target.value })}
              disabled={subcategorias.length === 0}
            >
              <option value="">
                {subcategorias.length === 0 ? 'Sin subcategorías' : 'Todas las subcategorías'}
              </option>
              {subcategorias.map((subcategoria) => (
                <option key={subcategoria.id} value={subcategoria.id}>
                  {subcategoria.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.grupo}>
          <label className={styles.etiqueta} htmlFor="filtro-marca">
            Marca
          </label>
          <select
            id="filtro-marca"
            className={styles.select}
            value={filtros.marcaId || ''}
            onChange={(evento) => onAplicar({ marcaId: evento.target.value })}
          >
            <option value="">Todas las marcas</option>
            {marcas.map((marca) => (
              <option key={marca.id} value={marca.id}>
                {marca.nombre}
              </option>
            ))}
          </select>
        </div>

        <fieldset className={styles.grupo}>
          <legend className={styles.etiqueta}>Condición</legend>
          <div className={styles.opciones}>
            <label className={styles.opcion}>
              <input
                type="radio"
                name="condicion"
                value=""
                checked={!filtros.condicion}
                onChange={() => onAplicar({ condicion: '' })}
              />
              Cualquiera
            </label>
            {CONDICIONES.map((condicion) => (
              <label key={condicion.value} className={styles.opcion}>
                <input
                  type="radio"
                  name="condicion"
                  value={condicion.value}
                  checked={filtros.condicion === condicion.value}
                  onChange={() => onAplicar({ condicion: condicion.value })}
                />
                {condicion.label}
              </label>
            ))}
          </div>
        </fieldset>

        <form className={styles.grupo} onSubmit={aplicarPrecio}>
          <span className={styles.etiqueta}>Precio</span>
          <div className={styles.rango}>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="Mín."
              aria-label="Precio mínimo"
              className={styles.input}
              value={precio.precioMin}
              onChange={(evento) => setPrecio((p) => ({ ...p, precioMin: evento.target.value }))}
            />
            <span aria-hidden="true">–</span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="Máx."
              aria-label="Precio máximo"
              className={styles.input}
              value={precio.precioMax}
              onChange={(evento) => setPrecio((p) => ({ ...p, precioMax: evento.target.value }))}
            />
          </div>
          {rangoInvertido && (
            <p className={styles.error}>El precio mínimo no puede superar al máximo.</p>
          )}
          <button type="submit" className={styles.aplicar} disabled={rangoInvertido}>
            Aplicar precio
          </button>
        </form>
      </div>
    </aside>
  );
}
