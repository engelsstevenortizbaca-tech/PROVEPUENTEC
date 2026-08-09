# API de Marcas

Base: `${API_PREFIX}/brands` (por defecto `/api/brands`).

Gestiona el catálogo de **marcas / fabricantes** (tabla `marcas`). La marca es
un dato **opcional** del producto: `productos.marca_id` admite `NULL`.

Las marcas **no usan soft delete**: se eliminan de forma definitiva y por eso
no existe endpoint `restore`.

## Autorización

- **Lectura** (`GET`): pública, sin autenticación.
- **Gestión** (`POST`, `PATCH`, `DELETE`): requiere `Authorization: Bearer
<accessToken>` y rol **`admin`** (middleware `authorize(ROLES.ADMIN)`).

Errores uniformes: `{ "status": "error", "message": "...", "details": [...] }`.
Validación → `422` con `details: [{ field, message }]`.

## Endpoints

| Método   | Ruta          | Auth         | Descripción                           |
| -------- | ------------- | ------------ | ------------------------------------- |
| `GET`    | `/`           | —            | Lista marcas (paginada, con filtros). |
| `GET`    | `/slug/:slug` | —            | Obtiene una marca por su slug.        |
| `GET`    | `/:id`        | —            | Obtiene una marca por su id.          |
| `POST`   | `/`           | Bearer admin | Crea una marca.                       |
| `PATCH`  | `/:id`        | Bearer admin | Actualiza campos de una marca.        |
| `DELETE` | `/:id`        | Bearer admin | Elimina una marca. Responde 204.      |

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
      "nombre": "Samsung",
      "slug": "samsung",
      "logoUrl": "https://cdn.example.com/samsung.png",
      "activo": true,
      "createdAt": "2026-07-25T10:00:00.000Z",
      "updatedAt": "2026-07-25T10:00:00.000Z",
    },
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 },
}
```

## Cuerpos de petición

```jsonc
// POST /   (Bearer admin)
// El slug es opcional: si se omite se genera a partir del nombre.
{
  "nombre": "Samsung",
  "logoUrl": "https://cdn.example.com/samsung.png",
  "activo": true,
}

// PATCH /:id   (Bearer admin) — todos los campos son opcionales (al menos uno).
// Enviar `logoUrl: null` deja la marca sin logo.
{ "nombre": "Samsung Electronics", "logoUrl": null }
```

## Notas

- El **nombre** es **único**. Es una regla de negocio validada en el servicio:
  la tabla solo declara `UNIQUE` en `slug`. La comparación es insensible a
  mayúsculas y acentos por la collation `utf8mb4_unicode_ci`. Colisión → `409`.
- El **slug** se normaliza (minúsculas, sin acentos, con guiones) y es **único**
  en base de datos. Colisión → `409`.
- Al **actualizar el nombre** sin enviar `slug`, el slug se recalcula solo si el
  nuevo valor cambia respecto al actual; lo mismo aplica a la comprobación de
  unicidad del nombre.
- **`logoUrl`** debe ser una URL `http(s)` absoluta de hasta 500 caracteres. En
  `PATCH` se admite `null` (o cadena vacía) para dejar la marca sin logo.
- El **borrado es definitivo y no se bloquea** aunque existan productos de esa
  marca: la FK `productos.marca_id` es `ON DELETE SET NULL`, así que los
  productos siguen existiendo y se quedan sin marca. Es una diferencia
  deliberada frente a [subcategorías](./subcategories.md), cuya FK es
  `ON DELETE RESTRICT`.
- La respuesta de un recurso individual va envuelta en `{ "brand": { ... } }`.
