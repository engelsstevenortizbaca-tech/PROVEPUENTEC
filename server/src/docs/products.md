# API de Productos

Base: `${API_PREFIX}/products` (por defecto `/api/products`).

Gestiona las **publicaciones** del marketplace (tabla `productos`) y su
**galería de imágenes** (tabla `producto_imagenes`).

Un producto pertenece siempre a una **subcategoría** (obligatoria) y
opcionalmente a una **marca** (`productos.marca_id` admite `NULL`).

## Autorización

- **Lectura del catálogo** (`GET /`, `GET /:id`, `GET /slug/:slug`): pública.
- **`GET /me`**: requiere `Authorization: Bearer <accessToken>`.
- **Escritura**: requiere autenticación y se autoriza **por propiedad**, no por
  rol. Cualquier usuario autenticado puede publicar, pero solo el **dueño**
  (`productos.vendedor_id`) edita lo suyo (middleware `ownership`).
- **`DELETE /:id`**: el dueño **o** un usuario con rol `admin`.

En `GET /:id` y `GET /slug/:slug` la autenticación es **opcional**
(`authenticate.optional`): si llega un token válido y el solicitante es el
dueño, ve su producto en cualquier estado; en caso contrario solo son visibles
los productos `activo`.

Errores uniformes: `{ "status": "error", "message": "...", "details": [...] }`.
Validación → `422` con `details: [{ field, message }]`.

## Endpoints

| Método   | Ruta                   | Auth               | Descripción                                  |
| -------- | ---------------------- | ------------------ | -------------------------------------------- |
| `GET`    | `/`                    | —                  | Catálogo público (paginado, con filtros).    |
| `GET`    | `/me`                  | Bearer             | Publicaciones propias, borradores incluidos. |
| `GET`    | `/slug/:slug`          | Bearer (opcional)  | Obtiene un producto por su slug.             |
| `GET`    | `/:id`                 | Bearer (opcional)  | Obtiene un producto por su id.               |
| `POST`   | `/`                    | Bearer             | Publica un producto. Nace en `borrador`.     |
| `PATCH`  | `/:id`                 | Bearer dueño       | Actualiza campos del producto.               |
| `PATCH`  | `/:id/status`          | Bearer dueño       | Publica, pausa o vuelve a borrador.          |
| `DELETE` | `/:id`                 | Bearer dueño/admin | Borrado lógico. Responde 204.                |
| `POST`   | `/:id/images`          | Bearer dueño       | Sube imágenes (multipart). Responde 201.     |
| `PATCH`  | `/:id/images/:imageId` | Bearer dueño       | Reordena o marca la imagen principal.        |
| `DELETE` | `/:id/images/:imageId` | Bearer dueño       | Elimina una imagen. Responde 204.            |

## Estados

Valores del ENUM `productos.estado`:

| Estado      | Significado                                                    |
| ----------- | -------------------------------------------------------------- |
| `borrador`  | Estado inicial. No aparece en el catálogo público.             |
| `activo`    | Publicado y visible para todos.                                |
| `pausado`   | Retirado temporalmente por el dueño. No visible.               |
| `vendido`   | Lo escribe la aceptación de una oferta. **No** asignable aquí. |
| `eliminado` | Borrado lógico (`DELETE /:id`). **No** asignable aquí.         |

`PATCH /:id/status` solo admite `borrador`, `activo` y `pausado`. Un producto
que ya está en `vendido` o `eliminado` es **final**: cualquier intento de
cambiarle el estado responde `409`.

## Listado y filtros (`GET /` y `GET /me`)

Parámetros de consulta (todos opcionales):

| Parámetro        | Tipo    | Por defecto | Descripción                                           |
| ---------------- | ------- | ----------- | ----------------------------------------------------- |
| `page`           | entero  | `1`         | Página (>= 1).                                        |
| `limit`          | entero  | `20`        | Tamaño de página (1–100).                             |
| `q`              | texto   | —           | Búsqueda por coincidencia en título y descripción.    |
| `categoriaId`    | entero  | —           | Filtra por categoría de la subcategoría.              |
| `subcategoriaId` | entero  | —           | Filtra por subcategoría.                              |
| `marcaId`        | entero  | —           | Filtra por marca.                                     |
| `vendedorId`     | entero  | —           | Filtra por vendedor. Ignorado en `/me`.               |
| `condicion`      | enum    | —           | `nuevo` o `usado`.                                    |
| `precioMin`      | decimal | —           | Precio mínimo (>= 0).                                 |
| `precioMax`      | decimal | —           | Precio máximo (>= 0).                                 |
| `orden`          | enum    | `recientes` | `recientes`, `antiguos`, `precio_asc`, `precio_desc`. |

Un rango invertido (`precioMin > precioMax`) se rechaza con `422`: no devolvería
nada y casi siempre es un error del cliente.

`GET /` devuelve **solo** productos `activo`. `GET /me` devuelve las
publicaciones del usuario autenticado en cualquier estado **excepto**
`eliminado`.

Respuesta:

```jsonc
{
  "data": [
    {
      "id": 12,
      "vendedorId": 3,
      "subcategoriaId": 7,
      "marcaId": 2,
      "titulo": "Laptop Lenovo ThinkPad T480",
      "slug": "laptop-lenovo-thinkpad-t480",
      "descripcion": "8 GB RAM, 256 GB SSD.",
      "precio": 1250.0,
      "condicion": "usado",
      "estado": "activo",
      "createdAt": "2026-08-01T14:00:00.000Z",
      "updatedAt": "2026-08-01T14:00:00.000Z",
      "subcategoria": { "id": 7, "nombre": "Laptops", "slug": "laptops" },
      "categoria": { "id": 2, "nombre": "Tecnología", "slug": "tecnologia" },
      "marca": { "id": 2, "nombre": "Lenovo", "slug": "lenovo" },
      "imagenes": [
        {
          "id": 40,
          "productoId": 12,
          "url": "/uploads/9f1c….webp",
          "orden": 0,
          "esPrincipal": true,
          "createdAt": "2026-08-01T14:05:00.000Z",
          "updatedAt": "2026-08-01T14:05:00.000Z",
        },
      ],
    },
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 },
}
```

`marca` solo se incluye cuando el producto tiene marca asignada.

## Cuerpos de petición

```jsonc
// POST /   (Bearer)
// `subcategoriaId` y `titulo` son obligatorios. El slug es opcional: si se
// omite se genera a partir del título. El precio por defecto es 0, para poder
// publicar un borrador y fijarlo después.
{
  "subcategoriaId": 7,
  "marcaId": 2,
  "titulo": "Laptop Lenovo ThinkPad T480",
  "descripcion": "8 GB RAM, 256 GB SSD.",
  "precio": 1250.0,
  "condicion": "usado",
}

// PATCH /:id   (Bearer dueño) — todos los campos son opcionales (al menos uno).
// Enviar `marcaId: null` desasocia la marca. El estado NO se cambia aquí.
{ "precio": 1150.0, "marcaId": null }

// PATCH /:id/status   (Bearer dueño)
{ "estado": "activo" }

// PATCH /:id/images/:imageId   (Bearer dueño) — al menos uno de los dos.
{ "orden": 2, "esPrincipal": true }
```

## Galería de imágenes

`POST /:id/images` es **`multipart/form-data`** con el campo repetido
**`imagenes`**. Política de subida (middleware `upload`, configurable por
entorno):

- Almacenamiento **local** en `server/uploads`, servido por `express.static`.
- **5 MB** por archivo y un máximo de archivos por petición.
- Formatos admitidos: **jpg, png, webp**. La extensión se deriva del **tipo
  MIME**, no del nombre enviado.
- El nombre de archivo se genera aleatorio (UUID): evita colisiones y no expone
  el nombre original.

Los errores de multer se traducen a `422` con el mismo formato que el resto de
validaciones. Subir sin adjuntar ningún archivo → `422`.

Ambas respuestas de escritura de imágenes devuelven la **galería completa
actualizada** en `{ "imagenes": [ ... ] }`.

## Notas

- El **slug** se normaliza (minúsculas, sin acentos, con guiones) y es **único**
  en base de datos. Colisión → `409`. Al actualizar el **título** sin enviar
  `slug`, el slug se recalcula solo si el nuevo valor cambia respecto al actual.
- El **precio** se limita a `DECIMAL(12,2)` (10 enteros, 2 decimales). MySQL lo
  devuelve como cadena; el modelo lo convierte a número para que el JSON no
  mezcle tipos.
- Cada producto se crea con una **variante por defecto** en la misma
  transacción. Es un detalle interno del modelo de datos —existe para que las
  FK heredadas de `detalle_pedido` e `inventario` sigan siendo válidas cuando se
  negocie— y la API **nunca** la expone: el precio viaja plano. Cambiar el
  precio del producto sincroniza el de la variante en una sola transacción.
- **Un producto no visible responde `404`, no `403`**, para no revelar a un
  tercero que la publicación existe.
- El **borrado es lógico**: la fila y sus imágenes permanecen y el estado pasa a
  `eliminado`. Las negociaciones y los pedidos que la referencian deben seguir
  siendo legibles. No existe endpoint `restore`.
- Las **imágenes sí se borran definitivamente** (`producto_imagenes` no tiene
  soft delete). El archivo en disco se elimina **después** de que la fila
  desaparezca, para no dejar una referencia rota si falla el borrado en BD; un
  archivo ya ausente no es un error.
- **Solo una imagen principal por producto**: la regla la impone el servicio, no
  la base de datos. Marcar una nueva principal desmarca la anterior en la misma
  transacción. La primera imagen de un producto sin galería queda como principal
  automáticamente.
- En `POST /:id/images` el middleware de subida se ejecuta **después** de la
  comprobación de propiedad: así un tercero no llega siquiera a escribir
  archivos en disco.
- La respuesta de un recurso individual va envuelta en `{ "product": { ... } }`.
