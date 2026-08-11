import { Link, useLocation } from 'react-router-dom';

// Marcador temporal para las secciones aún no implementadas (catálogo,
// categorías, detalle de producto y perfil). Existe para que la navegación del
// navbar no lleve a un callejón sin salida mientras se construyen.
export default function EnConstruccion() {
  const { pathname } = useLocation();

  return (
    <main
      id="contenido"
      style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: 'var(--space-16) var(--space-4)',
        textAlign: 'center',
      }}
    >
      <h1>Sección en construcción</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        <code>{pathname}</code> todavía no está disponible.
      </p>
      <Link to="/">Volver al inicio</Link>
    </main>
  );
}
