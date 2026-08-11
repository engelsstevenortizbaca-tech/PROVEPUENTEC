import { useEffect, useState } from 'react';
import styles from './ProductGallery.module.css';

// Galería del detalle. Las imágenes llegan ya ordenadas (principal primero) y
// se muestran tal cual: no se recorta ni se transforma ningún archivo.
export function ProductGallery({ imagenes = [], titulo }) {
  const [activa, setActiva] = useState(0);

  // Al cambiar de producto la selección vuelve a la portada.
  useEffect(() => {
    setActiva(0);
  }, [imagenes]);

  if (imagenes.length === 0) {
    return (
      <div className={styles.galeria}>
        <div className={`${styles.principal} ${styles.vacia}`}>
          <span className={styles.textoVacio}>Este producto todavía no tiene imágenes</span>
        </div>
      </div>
    );
  }

  const actual = imagenes[activa] || imagenes[0];

  return (
    <div className={styles.galeria}>
      <div className={styles.principal}>
        <img src={actual.url} alt={titulo} className={styles.imagen} />
      </div>

      {/* Las miniaturas solo aportan algo cuando hay más de una imagen. */}
      {imagenes.length > 1 && (
        <ul className={styles.miniaturas}>
          {imagenes.map((imagen, indice) => (
            <li key={imagen.id}>
              <button
                type="button"
                className={`${styles.miniatura} ${indice === activa ? styles.activa : ''}`}
                onClick={() => setActiva(indice)}
                aria-label={`Ver imagen ${indice + 1} de ${imagenes.length}`}
                aria-current={indice === activa}
              >
                <img src={imagen.url} alt="" loading="lazy" decoding="async" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
