'use strict';

// Roles del sistema (deben coincidir con el catálogo `roles` de la BD).
const ROLES = Object.freeze({
  ADMIN: 'admin',
  VENDEDOR: 'vendedor',
  COMPRADOR: 'comprador',
  SOPORTE: 'soporte',
});

// Rol asignado por defecto al registrarse.
const DEFAULT_ROLE = ROLES.COMPRADOR;

module.exports = { ROLES, DEFAULT_ROLE };
