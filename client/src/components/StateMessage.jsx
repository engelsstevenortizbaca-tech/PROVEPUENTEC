import styles from './StateMessage.module.css';

// Mensaje único para los estados no felices del catálogo: cargando, error,
// vacío y sin resultados. Centralizarlo evita que cada página invente su
// propio texto y su propio maquetado.
export function StateMessage({ tipo = 'info', titulo, descripcion, children }) {
  return (
    <div
      className={`${styles.bloque} ${styles[tipo] || ''}`}
      role={tipo === 'error' ? 'alert' : 'status'}
      aria-live={tipo === 'cargando' ? 'polite' : undefined}
    >
      {tipo === 'cargando' && <span className={styles.spinner} aria-hidden="true" />}
      <p className={styles.titulo}>{titulo}</p>
      {descripcion && <p className={styles.descripcion}>{descripcion}</p>}
      {children}
    </div>
  );
}

// Rejilla de tarjetas fantasma mientras llega la respuesta. Mantiene la altura
// de la página estable y evita el salto cuando entran los productos.
export function CardSkeleton({ cantidad = 8 }) {
  return (
    <div className={styles.skeletonRejilla} aria-hidden="true">
      {Array.from({ length: cantidad }, (_, indice) => (
        <div key={indice} className={styles.skeletonTarjeta}>
          <div className={styles.skeletonImagen} />
          <div className={styles.skeletonLinea} />
          <div className={`${styles.skeletonLinea} ${styles.skeletonCorta}`} />
        </div>
      ))}
    </div>
  );
}
