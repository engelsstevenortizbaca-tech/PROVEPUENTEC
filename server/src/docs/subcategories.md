# API de Subcategorías

Base: `${API_PREFIX}/subcategories` (por defecto `/api/subcategories`).

Gestiona el **segundo nivel de la taxonomía** (tabla `subcategorias`). Cada
subcategoría pertenece a una categoría de primer nivel. Ver
[categorías](./categories.md).

A diferencia de las categorías, las subcategorías **no usan soft delete**: se
eliminan de forma definitiva y por eso no existe endpoint `restore`.

## Autorización

- **Lectura** (`GET`): pública, sin autenticación.
- **Gestión** (`POST`, `PATCH`, `DELETE`): requiere `Authorization: Bearer
<accessToken>` y rol **`admin`** (middleware `authorize(ROLES.ADMIN)`).

Errores uniformes: `{ "status": "error", "message": "...", "details": [...] }`.
Validación → `422` con `details: [{ field, message }]`.

## Endpoints

| Método   | Ruta          | Auth         | Descripción                                  |
| -------- | ------------- | ------------ | -------------------------------------------- |
| `GET`    | `/`           | —            | Lista subcategorías (paginada, con filtros). |
| `GET`    | `/slug/:slug` | —            | Obtiene una subcategoría por su slug.        |
| `GET`    | `/:id`        | —            | Obtiene una subcategoría por su id.          |
| `POST`   | `/`           | Bearer admin | Crea una subcategoría.                       |
| `PATCH`  | `/:id`        | Bearer admin | Actualiza campos de una subcategoría.        |
| `DELETE` | `/:id`        | Bearer admin | Elimina una subcategoría. Responde 204.      |

## Listado y filtros (`GET /`)

Parámetros de consulta (todos opcionales):

| Parámetro     | Tipo    | Por defecto | Descripción                            |
| ------------- | ------- | ----------- | -------------------------------------- |
| `page`        | entero  | `1`         | Página (>= 1).                         |
| `limit`       | entero  | `20`        | Tamaño de página (1–100).              |
| `activo`      | boolean | —           | Filtra por estado (`true`/`false`).    |
| `categoriaId` | entero  | —           | Filtra por categoría padre.            |
| `q`           | texto   | —           | Búsqueda por coincidencia en `nombre`. |

Para obtener las subcategorías de una categoría concreta:
`GET /api/subcategories?categoriaId=1`.

Respuesta:

```jsonc
{
  "data": [
    {
      "id": 3,
      "categoriaId": 1,
      "nombre": "Laptops",
      "slug": "laptops",
      "activo": true,
      "createdAt": "2026-07-25T10:00:00.000Z",
      "updatedAt": "2026-07-25T10:00:00.000Z",
      "categoria": { "id": 1, "nombre": "Electrónica", "slug": "electronica" },
    },
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 },
}
```

## Cuerpos de petición

```jsonc
// POST /   (Bearer admin)
// El slug es opcional: si se omite se genera a partir del nombre.
{ "categoriaId": 1, "nombre": "Laptops", "activo": true }

// PATCH /:id   (Bearer admin) — todos los campos son opcionales (al menos uno).
// Enviar `categoriaId` mueve la subcategoría a otra categoría.
{ "nombre": "Portátiles", "categoriaId": 2 }
```

## Notas

- El **slug** se normaliza (minúsculas, sin acentos, con guiones) y es **único
  a nivel global**, no solo dentro de su categoría. Si colisiona, la API
  responde `409 Conflict`.
- Al **actualizar el nombre** sin enviar `slug`, el slug se recalcula solo si el
  nuevo valor cambia respecto al actual.
- Crear una subcategoría (o moverla con `categoriaId`) exige que la categoría
  destino exista y no esté eliminada; si no, `404 Not Found`.
- Las subcategorías de una **categoría eliminada** (soft delete) dejan de
  aparecer en las lecturas y no pueden gestionarse hasta restaurar la categoría.
- El borrado se **bloquea con `409 Conflict`** si la subcategoría tiene
  productos asociados (la FK `productos.subcategoria_id` es `ON DELETE
RESTRICT`). Se cuentan también los productos con soft delete.
- La respuesta de un recurso individual va envuelta en `{ "subcategory": { ... } }`.
