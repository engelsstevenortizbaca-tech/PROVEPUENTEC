// Espejo de `server/src/constants/roles.js`. Se duplica el valor, no la lógica:
// el frontend solo lo usa para decidir qué enlaces muestra, nunca para
// autorizar. La autorización real la impone el backend.
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  VENDEDOR: 'vendedor',
  COMPRADOR: 'comprador',
  SOPORTE: 'soporte',
});
