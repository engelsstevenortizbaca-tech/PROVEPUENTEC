import styles from './Pagination.module.css';

// Ventana de páginas alrededor de la actual, para no dibujar 40 botones.
function ventana(page, totalPages, radio = 2) {
  const desde = Math.max(1, Math.min(page - radio, totalPages - radio * 2));
  const hasta = Math.min(totalPages, Math.max(page + radio, radio * 2 + 1));
  const paginas = [];
  for (let i = desde; i <= hasta; i += 1) paginas.push(i);
  return paginas;
}

// `pagination` llega tal cual del backend: { page, limit, total, totalPages }.
export function Pagination({ pagination, onCambiar }) {
  if (!pagination) return null;

  const { page, totalPages, total } = pagination;
  if (!totalPages || totalPages <= 1) return null;

  const paginas = ventana(page, totalPages);

  return (
    <nav className={styles.paginacion} aria-label="Paginación del catálogo">
      <button
        type="button"
        className={styles.boton}
        onClick={() => onCambiar(page - 1)}
        disabled={page <= 1}
      >
        Anterior
      </button>

      <ul className={styles.paginas}>
        {paginas[0] > 1 && (
          <li>
            <span className={styles.elipsis}>…</span>
          </li>
        )}

        {paginas.map((numero) => (
          <li key={numero}>
            <button
              type="button"
              className={`${styles.boton} ${numero === page ? styles.activa : ''}`}
              aria-current={numero === page ? 'page' : undefined}
              onClick={() => onCambiar(numero)}
            >
              {numero}
            </button>
          </li>
        ))}

        {paginas[paginas.length - 1] < totalPages && (
          <li>
            <span className={styles.elipsis}>…</span>
          </li>
        )}
      </ul>

      <button
        type="button"
        className={styles.boton}
        onClick={() => onCambiar(page + 1)}
        disabled={page >= totalPages}
      >
        Siguiente
      </button>

      <p className={styles.resumen}>
        Página {page} de {totalPages} · {total} producto{total === 1 ? '' : 's'}
      </p>
    </nav>
  );
}
