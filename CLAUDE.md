# CLAUDE.md

# PROVEPUENTEC

## Documentos de referencia

Antes de implementar, consultar en este orden:

1. `docs/BUSINESS_RULES.md` — reglas de negocio, fuente de verdad funcional
2. `docs/ARCHITECTURE.md` — decisiones, flujo, módulos, endpoints
3. `docs/DATABASE_DESIGN.md` — modelo de datos, referencia oficial de migraciones
4. `docs/IMPLEMENTATION_PLAN.md` — orden, criterios de aceptación, pruebas
5. `docs/ROADMAP.md` — estado de avance

Ante una contradicción entre documentos, prevalece `BUSINESS_RULES.md` para lo
funcional y `DATABASE_DESIGN.md` para el modelo de datos.

---

## Propósito

Este es un proyecto activo de desarrollo. No es un proyecto nuevo.

El objetivo es evolucionar el código existente sin perder funcionalidades ya implementadas.

Siempre reutilizar el código existente antes de crear uno nuevo.

---

# Objetivo del sistema

PROVEPUENTEC es un Marketplace donde compradores y vendedores pueden:

- Publicar productos.
- Buscar productos.
- Negociar el precio.
- Negociar el método y costo del envío.
- Generar pedidos.
- Dar seguimiento al envío.
- Calificar la experiencia de compra.

El frontend tomará como referencia el diseño proporcionado por el cliente, pero el backend será desarrollado específicamente para este proyecto.

---

# Tecnologías

Backend

- Node.js
- Express
- MySQL
- JWT
- bcrypt
- Jest
- Express Validator

Frontend

- React

---

# Arquitectura

La arquitectura del proyecto es obligatoria.

Repository

↓

Service

↓

Controller

↓

Routes

Los Controllers únicamente reciben la petición HTTP y devuelven la respuesta.

Toda la lógica de negocio pertenece al Service.

Toda consulta a la base de datos pertenece al Repository.

Toda validación pertenece a Validators.

No romper esta arquitectura.

---

# Organización esperada de un módulo

Cada módulo nuevo debe seguir la estructura existente.

Ejemplo:

product.model.js

product.repository.js

product.service.js

product.controller.js

product.validators.js

product.routes.js

product.service.test.js  (en server/tests/)

src/docs/products.md  (documentación del módulo)

---

# Filosofía

Antes de crear código nuevo:

1. Analizar el proyecto.
2. Buscar reutilización.
3. Evitar duplicación.
4. Mantener consistencia.
5. Mantener bajo acoplamiento.

---

# Base de datos

No modificar el esquema sin autorización.

No crear migraciones sin autorización.

No eliminar tablas.

No eliminar columnas.

No modificar claves foráneas sin autorización.

Si una funcionalidad requiere cambios en la base de datos:

Presentar primero el análisis.

Esperar aprobación.

---

# API

Mantener REST.

Usar siempre:

GET

POST

PATCH

DELETE

Las respuestas deben ser consistentes.

Colecciones

{
    "data": [],
    "pagination": {}
}

Recurso individual

{
    "resource": {}
}

Errores

400 · Solicitud inválida

401 · No autenticado

403 · Sin permisos

404 · No encontrado

409 · Conflicto con el estado actual

422 · Datos de entrada inválidos (errores de Validators)

500 · Error interno

---

# Convenciones

Código limpio.

Funciones pequeñas.

Responsabilidad única.

No duplicar lógica.

No crear utilidades innecesarias.

Seguir el estilo del proyecto existente.

---

# Git

No ejecutar automáticamente:

git push

git pull

git merge

git rebase

git reset

git cherry-pick

git tag

git stash

sin autorización explícita.

Se pueden preparar commits cuando el usuario lo solicite.

Usar Conventional Commits.

---

# Calidad

Antes de considerar terminada una tarea ejecutar:

npm run lint

npm run format:check

npm test

Verificar que la aplicación inicie correctamente.

No ignorar errores.

No desactivar pruebas para que pasen.

---

# Documentación

Cuando un módulo cambie:

Actualizar su documentación.

Actualizar README si corresponde.

Actualizar ROADMAP cuando se complete un módulo.

---

# Seguridad

Nunca eliminar validaciones.

Nunca eliminar autenticación.

Nunca desactivar autorización.

Mantener validaciones de entrada.

---

# Forma de responder

Las respuestas deben ser:

- Breves.
- Técnicas.
- Claras.

Evitar repetir información ya conocida.

No volver a explicar la arquitectura si no fue solicitada.

---

# Forma de trabajar

Antes de implementar:

Analizar.

Si existe una decisión importante de arquitectura:

Presentar un plan corto.

Esperar aprobación.

Si la tarea es pequeña:

Implementarla directamente.

---

# Permisos

No pedir confirmación para:

- Crear archivos.
- Editar archivos.
- Refactorizar código.
- Ejecutar lint.
- Ejecutar tests.
- Ejecutar format.
- Actualizar documentación.

Pedir confirmación únicamente para:

- Cambios en la base de datos.
- Cambios destructivos.
- Push.
- Merge.
- Rebase.
- Reescribir historial Git.
- Eliminar grandes cantidades de código.

---

# Prioridad

1. Mantener estabilidad.
2. Mantener compatibilidad.
3. Reutilizar código.
4. Escribir pruebas.
5. Mantener documentación.

---

# Estado del proyecto

Módulos completos

- Auth
- Categories
- Subcategories
- Brands

Módulos incompletos

- Users — solo repository y model, consumidos por Auth
- Roles — solo la constante `constants/roles.js`; sin capa HTTP

El orden definitivo de implementación está en `docs/IMPLEMENTATION_PLAN.md`.
Resumen:

1. Helper transaccional (prerrequisito)
2. Products
3. Notifications
4. Addresses y Locations
5. Negotiations (ofertas y contraofertas)
6. Messages (chat de la negociación)
7. Orders
8. Shipments (incluye Tracking)
9. Reviews
10. Users, Roles, Favorites, Reports, Admin

---

# Reglas importantes

Este proyecto continuará evolucionando.

Nunca asumir que debe reiniciarse.

Siempre continuar desde el estado actual.

No eliminar trabajo existente.

No reemplazar funcionalidades que ya funcionan.

Toda nueva funcionalidad debe integrarse con la arquitectura existente.

Si existe una mejor solución técnica, explicarla antes de implementarla.
