import { useEffect, useState } from 'react';
import styles from './SearchBar.module.css';

// Buscador controlado localmente y confirmado al enviar. No se busca en cada
// pulsación: cada búsqueda es una petición al backend y una entrada en el
// historial del navegador.
//
// El backend busca en título y descripción (`q`). Aquí no se filtra nada.
export function SearchBar({ valorInicial = '', onBuscar, id = 'busqueda-catalogo' }) {
  const [termino, setTermino] = useState(valorInicial);

  // Si el término cambia desde fuera (navegación atrás, chip de filtro
  // eliminado), el input debe reflejarlo.
  useEffect(() => {
    setTermino(valorInicial);
  }, [valorInicial]);

  const enviar = (evento) => {
    evento.preventDefault();
    onBuscar(termino.trim());
  };

  const limpiar = () => {
    setTermino('');
    onBuscar('');
  };

  return (
    <form className={styles.formulario} onSubmit={enviar} role="search">
      <label className={styles.etiqueta} htmlFor={id}>
        Buscar productos
      </label>

      <div className={styles.campo}>
        <input
          id={id}
          type="search"
          name="q"
          value={termino}
          onChange={(evento) => setTermino(evento.target.value)}
          placeholder="Buscar por título o descripción…"
          className={styles.input}
          maxLength={180}
        />
        {termino && (
          <button type="button" className={styles.limpiar} onClick={limpiar}>
            Limpiar búsqueda
          </button>
        )}
      </div>

      <button type="submit" className={styles.boton}>
        Buscar
      </button>
    </form>
  );
}
