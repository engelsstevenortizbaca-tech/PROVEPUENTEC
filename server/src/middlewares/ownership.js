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
// - El recurso cargado queda en `req[as]` para que el controlador no repita
//   la consulta.
module.exports =
  (
    load,
    { owners = ['usuario_id'], as = 'resource', notFoundMessage = 'Recurso no encontrado' } = {}
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

      if (!allowedIds.includes(Number(req.user.id))) {
        return next(new ForbiddenError('No tienes acceso a este recurso'));
      }

      req[as] = resource;
      return next();
    } catch (error) {
      return next(error);
    }
  };
