# Server — Backend (Node.js + Express + MySQL)

API REST de UCC Market construida con **Node.js**, **Express** y **MySQL**,
siguiendo una **arquitectura por capas**.

> Estado: **Fase 6 — productos**. Disponible el sistema completo de auth
> (registro, login, JWT access/refresh, logout, cambio y recuperación de
> contraseña, verificación de correo, RBAC; ver
> [`src/docs/auth.md`](./src/docs/auth.md)), el **catálogo base**: CRUD de
> **categorías** con soft delete
> (ver [`src/docs/categories.md`](./src/docs/categories.md)), de
> **subcategorías** (ver
> [`src/docs/subcategories.md`](./src/docs/subcategories.md)) y de **marcas**
> (ver [`src/docs/brands.md`](./src/docs/brands.md)), todos con RBAC; y las
> **publicaciones** con su galería de imágenes, autorizadas por propiedad
> (ver [`src/docs/products.md`](./src/docs/products.md)).
> Aún no hay más recursos de negocio (negociaciones, pedidos).

## Estructura

```
server/
├── src/
│   ├── config/        # Configuración y carga de variables de entorno
│   ├── database/      # Pool de conexiones MySQL
│   ├── controllers/   # Manejo de peticiones/respuestas HTTP
│   ├── services/      # Lógica de negocio
│   ├── repositories/  # Acceso a datos (consultas a la BD)
│   ├── routes/        # Definición de endpoints
│   ├── middlewares/   # Middlewares (logging, errores, 404, ...)
│   ├── validators/    # Reglas de validación de entrada
│   ├── models/        # Modelos / entidades
│   ├── utils/         # Utilidades (logger, helpers)
│   ├── constants/     # Constantes (códigos HTTP, ...)
│   ├── errors/        # Errores personalizados (AppError y derivados)
│   ├── docs/          # Documentación de la API
│   ├── app.js         # Configuración de la app Express
│   └── server.js      # Punto de entrada (arranque del servidor)
├── tests/             # Pruebas
├── uploads/           # Archivos subidos (runtime)
├── logs/              # Logs de la aplicación (runtime)
├── package.json
├── .env.example
└── README.md
```

## Requisitos

- Node.js >= 18
- MySQL 8

## Puesta en marcha

```bash
cd server
cp .env.example .env      # ajusta las credenciales de MySQL
npm install
npm run dev               # desarrollo (nodemon)
# o
npm start                 # producción
```

## Scripts

| Script                 | Descripción                                  |
| ---------------------- | -------------------------------------------- |
| `npm start`            | Inicia el servidor.                          |
| `npm run dev`          | Inicia con recarga automática (nodemon).     |
| `npm run lint`         | Analiza el código con ESLint.                |
| `npm run lint:fix`     | Corrige problemas de lint automáticamente.   |
| `npm run format`       | Formatea el código con Prettier.             |
| `npm run format:check` | Verifica el formato sin modificar archivos.  |
| `npm test`             | Ejecuta las pruebas (runner nativo de Node). |

## Variables de entorno

Todas están documentadas en [`.env.example`](./.env.example), que es la
referencia. Por grupos:

| Grupo              | Variables                                                                                                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Servidor           | `NODE_ENV`, `PORT`, `API_PREFIX`, `APP_URL`, `TRUST_PROXY`                                                                                                                                                                  |
| MySQL              | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_CONNECTION_LIMIT`                                                                                                                                            |
| CORS               | `CORS_ORIGINS`                                                                                                                                                                                                              |
| Rate limiting      | `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `RATE_LIMIT_AUTH_WINDOW_MS`, `RATE_LIMIT_AUTH_MAX`                                                                                                                                |
| Subida de archivos | `UPLOAD_DIR`, `UPLOAD_PUBLIC_PATH`, `UPLOAD_MAX_SIZE_MB`, `UPLOAD_MAX_FILES`, `UPLOAD_ALLOWED_MIME_TYPES`                                                                                                                   |
| Autenticación      | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `BCRYPT_ROUNDS`, `PASSWORD_RESET_TTL_MIN`, `EMAIL_VERIFICATION_TTL_MIN`, `AUTH_REQUIRE_VERIFIED_EMAIL`, `REFRESH_COOKIE_NAME` |
| Logging            | `LOG_LEVEL`                                                                                                                                                                                                                 |

### Requisitos en producción

Con `NODE_ENV=production` el servidor **aborta el arranque** si:

- `JWT_ACCESS_SECRET` o `JWT_REFRESH_SECRET` conservan el valor de desarrollo,
  miden menos de 32 caracteres o son iguales entre sí.
- `CORS_ORIGINS` es `*` (la API acepta credenciales: el comodín la expondría a
  cualquier sitio).

Para generar un secreto:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`TRUST_PROXY` solo debe ser mayor que 0 si hay un proxy inverso delante. Con un
valor distinto de 0 y sin proxy, un cliente puede falsear su IP mediante
`X-Forwarded-For` y eludir el rate limiting.

## Endpoints

| Método | Ruta      | Descripción             | Respuesta            |
| ------ | --------- | ----------------------- | -------------------- |
| `GET`  | `/health` | Sondeo de salud (probe) | `{ "status": "ok" }` |

Autenticación bajo `${API_PREFIX}/auth` (registro, login, refresh, logout,
`me`, cambio/recuperación de contraseña y verificación de correo). Detalle
completo en [`src/docs/auth.md`](./src/docs/auth.md).

Categorías bajo `${API_PREFIX}/categories` (listado público con filtros y
paginación; alta, edición, borrado lógico y restauración solo para `admin`).
Detalle completo en [`src/docs/categories.md`](./src/docs/categories.md).

Subcategorías bajo `${API_PREFIX}/subcategories` (segundo nivel de la
taxonomía; listado público filtrable por `categoriaId`, gestión solo para
`admin`, borrado definitivo bloqueado si hay productos asociados). Detalle
completo en [`src/docs/subcategories.md`](./src/docs/subcategories.md).

Marcas bajo `${API_PREFIX}/brands` (catálogo de fabricantes; listado público
con filtros y paginación, gestión solo para `admin`, nombre y slug únicos).
Detalle completo en [`src/docs/brands.md`](./src/docs/brands.md).

Productos bajo `${API_PREFIX}/products` (publicaciones y su galería de
imágenes; catálogo público con filtros, búsqueda y ordenación, escritura
autorizada **por propiedad** en lugar de por rol, borrado lógico). Detalle
completo en [`src/docs/products.md`](./src/docs/products.md).
