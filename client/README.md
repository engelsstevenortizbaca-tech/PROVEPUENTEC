# Client — Frontend (React + Vite)

Aplicación web de PROVEPUENTEC construida con **React 18**, **Vite 5** y
**React Router 6**. Consume la API REST de `server/` sin duplicar reglas de
negocio: el frontend solo pinta, filtra y navega.

## Puesta en marcha

```bash
npm install            # desde la raíz del repositorio (workspaces)
npm run dev  -w client # http://localhost:5173
npm run build -w client
npm run preview -w client
```

El backend debe estar levantado en `http://localhost:3000` (`npm run dev -w server`).

### Variables de entorno

| Variable          | Por defecto             | Uso                                                |
| ----------------- | ----------------------- | -------------------------------------------------- |
| `VITE_API_PROXY`  | `http://localhost:3000` | Destino del proxy de desarrollo (`vite.config.js`) |
| `VITE_API_PREFIX` | `/api`                  | Prefijo de la API que usa el cliente HTTP          |

`vite.config.js` proxifica `/api` y `/uploads`. Así el navegador ve un único
origen y la cookie httpOnly del refresh token —restringida a `/api/auth`— viaja
sin necesidad de configurar CORS. `/uploads` es necesario porque las imágenes de
producto se guardan con ruta pública relativa y las sirve `express.static`.

## Estructura

```
src/
├── assets/       # Logo oficial
├── components/   # UI reutilizable (Navbar, Footer, ProductCard, Pagination…)
├── context/      # AuthContext y TaxonomyContext
├── hooks/        # useApi, useAuth, useTaxonomy, useCatalogFilters
├── pages/        # Vistas enrutadas
├── services/     # http.js + un servicio por módulo de la API
├── styles/       # tokens.css (diseño) y global.css (base)
└── utils/        # Formateo y espejo de roles
```

Cada componente y página lleva su propio `*.module.css` (CSS Modules). No hay
estilos globales fuera de `styles/`.

## Rutas

| Ruta            | Vista            | Estado                                     |
| --------------- | ---------------- | ------------------------------------------ |
| `/`             | `Landing`        | Portada con categorías y últimos productos |
| `/products`     | `Catalog`        | Búsqueda, filtros y paginación             |
| `/products/:id` | `ProductDetail`  | Ficha con galería                          |
| `/categories`   | `Categories`     | Taxonomía completa                         |
| `/login`        | `Login`          | Inicio de sesión                           |
| `/registro`     | `Register`       | Alta de cuenta                             |
| `*`             | `EnConstruccion` | Marcador para los módulos aún no expuestos |

## Capa de servicios

`services/http.js` es el único punto que habla con la API. Centraliza:

- El contrato del backend: colecciones `{ data, pagination }`, recurso
  individual `{ <recurso>: {} }` y errores `{ status, message, details }`.
- `ApiError`, con `fieldErrors` para pintar los errores de express-validator
  junto a cada input.
- El access token en memoria (persistido en `localStorage`) y la renovación
  automática ante un 401: un único refresh en vuelo y un solo reintento.

Encima viven `auth.service.js`, `catalog.service.js` (categorías,
subcategorías y marcas) y `product.service.js`. Los servicios no inventan
endpoints ni parámetros: replican los que exponen las rutas del backend.

## Estado

- `AuthContext` — sesión, rehidratación al arrancar y helpers de rol.
- `TaxonomyContext` — categorías y marcas cargadas una sola vez y compartidas
  por portada, catálogo y página de categorías.
- `useCatalogFilters` — el estado del catálogo vive en la URL (`useSearchParams`),
  no en `useState`: los filtros se comparten por enlace y el botón «atrás»
  funciona.
- `useApi` — `{ data, error, cargando, recargar }`, descartando las respuestas
  de peticiones ya obsoletas.

## Diseño

`styles/tokens.css` es el único lugar donde viven color, tipografía y
espaciado. La paleta está tomada del logo oficial. Cuando llegue el diseño
definitivo del cliente, retematizar es cambiar ese archivo, no las páginas.

## Calidad

Desde la raíz del repositorio:

```bash
npm run lint
npm run format:check
npm run build
```

ESLint aplica al cliente las reglas de React, React Hooks y `jsx-a11y`.
