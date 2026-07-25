# API de Categorías

Base: `${API_PREFIX}/categories` (por defecto `/api/categories`).

Gestiona el catálogo de **categorías de primer nivel** (tabla `categorias`).
Las categorías usan **soft delete**: al eliminarlas se marca `deleted_at` y dejan
de aparecer en las lecturas; pueden restaurarse. El segundo nivel de la
taxonomía vive en [subcategorías](./subcategories.md).

## Autorización

- **Lectura** (`GET`): pública, sin autenticación.
- **Gestión** (`POST`, `PATCH`, `DELETE`, `restore`): requiere `Authorization:
Bearer <accessToken>` y rol **`admin`** (middleware `authorize(ROLES.ADMIN)`).

Errores uniformes: `{ "status": "error", "message": "...", "details": [...] }`.
Validación → `422` con `details: [{ field, message }]`.

## Endpoints

| Método   | Ruta           | Auth         | Descripción                                        |
| -------- | -------------- | ------------ | -------------------------------------------------- |
| `GET`    | `/`            | —            | Lista categorías (paginada, con filtros).          |
| `GET`    | `/slug/:slug`  | —            | Obtiene una categoría por su slug.                 |
| `GET`    | `/:id`         | —            | Obtiene una categoría por su id.                   |
| `POST`   | `/`            | Bearer admin | Crea una categoría.                                |
| `PATCH`  | `/:id`         | Bearer admin | Actualiza campos de una categoría.                 |
| `DELETE` | `/:id`         | Bearer admin | Elimina (soft delete) una categoría. Responde 204. |
| `POST`   | `/:id/restore` | Bearer admin | Restaura una categoría eliminada.                  |

## Listado y filtros (`GET /`)

Parámetros de consulta (todos opcionales):

| Parámetro | Tipo    | Por defecto | Descripción                            |
| --------- | ------- | ----------- | -------------------------------------- |
| `page`    | entero  | `1`         | Página (>= 1).                         |
| `limit`   | entero  | `20`        | Tamaño de página (1–100).              |
| `activo`  | boolean | —           | Filtra por estado (`true`/`false`).    |
| `q`       | texto   | —           | Búsqueda por coincidencia en `nombre`. |

Respuesta:

```jsonc
{
  "data": [
    {
      "id": 1,
      "nombre": "Electrónica",
      "slug": "electronica",
      "descripcion": "Dispositivos y accesorios",
      "activo": true,
      "createdAt": "2026-07-14T10:00:00.000Z",
      "updatedAt": "2026-07-14T10:00:00.000Z",
    },
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 },
}
```

## Cuerpos de petición

```jsonc
// POST /   (Bearer admin)
// El slug es opcional: si se omite se genera a partir del nombre.
{ "nombre": "Electrónica", "descripcion": "Dispositivos", "activo": true }

// PATCH /:id   (Bearer admin) — todos los campos son opcionales (al menos uno).
{ "nombre": "Electrónica y cómputo", "activo": false }
```

## Notas

- El **slug** se normaliza (minúsculas, sin acentos, con guiones) y es **único**.
  Si se envía uno en conflicto con otra categoría (incluidas las eliminadas), la
  API responde `409 Conflict`.
- Al **actualizar el nombre** sin enviar `slug`, el slug se recalcula solo si el
  nuevo valor cambia respecto al actual.
- La respuesta de un recurso individual va envuelta en `{ "category": { ... } }`.
