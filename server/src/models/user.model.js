'use strict';

// Proyecta una fila de la tabla `usuarios` a su representación pública,
// omitiendo datos sensibles (p. ej. password_hash).
const toPublicUser = (row, roles = []) => ({
  id: row.id,
  nombre: row.nombre,
  apellido: row.apellido,
  email: row.email,
  telefono: row.telefono ?? null,
  avatarUrl: row.avatar_url ?? null,
  estado: row.estado,
  emailVerificado: Boolean(row.email_verificado_at),
  roles,
  createdAt: row.created_at,
});

module.exports = { toPublicUser };
