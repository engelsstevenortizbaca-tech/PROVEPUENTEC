'use strict';

const { ForbiddenError, NotFoundError, UnauthorizedError } = require('../errors');

// Autorización por propiedad o participación sobre un recurso concreto.
// Complementa a `authorize`, que decide por rol: aquí el criterio es ser dueño
// del recurso (producto) o participante en él (negociación, pedido, envío,
// conversación). Debe ir después de authenticate.
//
//   ownership((req) => productRepository.findById(req.params.id), {
//     owners: ['vendedor_id'],
//     as: 'product',
//   })
//
// - `load(req)` obtiene el recurso; devolver null produce 404.
// - `owners` son los campos del recurso que contienen ids autorizados.
// - `allowRoles` deja pasar a quien tenga alguno de esos roles aunque no sea
//   dueño (p. ej. el administrador que retira una publicación). Vacío por
//   defecto: sin él, el criterio sigue siendo exclusivamente la propiedad.
// - El recurso cargado queda en `req[as]` para que el controlador no repita
//   la consulta.
module.exports =
  (
    load,
    {
      owners = ['usuario_id'],
      allowRoles = [],
      as = 'resource',
      notFoundMessage = 'Recurso no encontrado',
    } = {}
  ) =>
  async (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError('No autenticado'));

    try {
      const resource = await load(req);
      if (!resource) return next(new NotFoundError(notFoundMessage));

      const allowedIds = owners
        .map((field) => resource[field])
        .filter((id) => id !== null && id !== undefined)
        .map(Number);

      const roles = Array.isArray(req.user.roles) ? req.user.roles : [];
      const byRole = allowRoles.length > 0 && roles.some((role) => allowRoles.includes(role));

      if (!byRole && !allowedIds.includes(Number(req.user.id))) {
        return next(new ForbiddenError('No tienes acceso a este recurso'));
      }

      req[as] = resource;
      return next();
    } catch (error) {
      return next(error);
    }
  };
