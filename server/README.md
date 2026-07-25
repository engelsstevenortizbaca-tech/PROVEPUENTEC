# Server — Backend (Node.js + Express + MySQL)

API REST de UCC Market construida con **Node.js**, **Express** y **MySQL**,
siguiendo una **arquitectura por capas**.

> Estado: **Fase 5 — marcas**. Disponible el sistema completo de auth
> (registro, login, JWT access/refresh, logout, cambio y recuperación de
> contraseña, verificación de correo, RBAC; ver
> [`src/docs/auth.md`](./src/docs/auth.md)) y el **catálogo base**: CRUD de
> **categorías** con soft delete
> (ver [`src/docs/categories.md`](./src/docs/categories.md)), de
> **subcategorías** (ver
> [`src/docs/subcategories.md`](./src/docs/subcategories.md)) y de **marcas**
> (ver [`src/docs/brands.md`](./src/docs/brands.md)), todos con RBAC.
> Aún no hay más recursos de negocio (productos, pedidos).

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

Ver [`.env.example`](./.env.example). Incluye configuración del servidor,
conexión a MySQL, CORS, rate limiting y nivel de logging.

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
