# ROADMAP

## Proyecto

PROVEPUENTEC

Marketplace con negociación de precio y envío, pedidos derivados de ofertas
aceptadas y seguimiento de envíos.

El orden detallado, con criterios de aceptación por módulo, está en
`docs/IMPLEMENTATION_PLAN.md`.

---

## Terminado

Fase -1 · Auditoría técnica — informe en `docs/AUDIT_PHASE_-1.md`

Auth

Categories

Subcategories

Brands

Fase 0 · Base técnica — **parcial**: P2 helper transaccional, P3 `ownership`,
P4 `upload` y P5 constantes de estado. Documentación en
`server/src/docs/base-tecnica.md`

Al cierre de la auditoría (2026-07-28): `lint` limpio, `format:check` conforme,
66/66 pruebas en verde, servidor arrancando y `GET /health` → 200.

Al cierre de P2–P5 (2026-07-29): `lint` limpio, `format:check` conforme, 93/93
pruebas en verde, servidor arrancando y `GET /health` → 200.

Auditoría técnica completa (2026-07-30) — informe en `docs/AUDIT_2026-07-30.md`.
Correcciones aplicadas:

- Seguridad: guarda de configuración de producción (secretos JWT y CORS),
  redacción de tokens en los logs, `trust proxy` configurable, limitador
  específico para los endpoints de autenticación
- Corrección: `activo` se convierte a booleano en Validators, flujos de auth
  transaccionales (los siete repositorios pasan a `executor()`), `ER_DUP_ENTRY`
  traducido a 409, caducidad de la cookie de refresh, aviso si falta el rol
  por defecto
- Rendimiento: el logger deja de bloquear el event loop con `appendFileSync`
- Calidad: paginación, filtros y fragmentos de SQL extraídos a
  `utils/query.js` y `database/sql.js`, eliminando la duplicación entre los tres
  módulos de catálogo
- Documentación: README raíz, `server/README.md`, `database/README.md` y
  `base-tecnica.md` actualizados

Al cierre de la auditoría (2026-07-30): `lint` limpio, `format:check` conforme,
131/131 pruebas en verde, servidor arrancando y `GET /health` → 200.

**Pendiente de autorización:** índice UNIQUE en `marcas.nombre` (BD-1 del
informe). El service ya trata la unicidad del nombre como regla de negocio, pero
la BD no la impone, así que dos peticiones simultáneas pueden duplicarlo.

---

## Incompleto

Users — solo repository y model, consumidos por Auth. Faltan service,
controller, routes, validators y tests.

Roles — solo la constante `constants/roles.js`. Sin capa HTTP.

---

## Prerrequisitos técnicos

Rama de integración partiendo de `origin/develop`, que **ya contiene** el esquema
completo (001–007) y el tooling de calidad. Falta añadirle el código de los
cuatro módulos y `008_auth.sql`

Recuperar el tooling en la rama de trabajo: hoy `feature/categories` no tiene
`package.json` de raíz, hooks de husky, commitlint, lint-staged ni CI, así que
**los commits no pasan ninguna puerta automática**

`schema.sql` debe referenciar `008_auth.sql`

Entorno de base de datos: no hay MySQL instalado ni `server/.env`. Bloquea la
verificación transaccional real y todo el bloque A7 de la auditoría

~~Helper transaccional (`database/transaction.js`)~~ — hecho

~~Middleware `ownership`~~ — hecho

~~Middleware `upload`~~ — hecho, con la política por defecto de la decisión E

~~Constantes de estados~~ — hecho

Migraciones `009`, `010`, `011` y seeds — requieren autorización

---

## Pendiente

Products

Notifications

Addresses

Locations

Negotiations — negociaciones, ofertas y contraofertas

Messages — chat de la negociación

Orders

Shipments — incluye Tracking

Reviews

Favorites

Reports

Admin Dashboard

---

## Fuera del alcance actual

Pagos y pasarelas de pago

Carrito de compras

Cupones y descuentos

Inventario y stock

Variantes de producto expuestas por API

Permisos granulares

Mensajería en tiempo real

---

## Objetivo

Marketplace moderno con negociación de precios, negociación de envíos y
seguimiento de pedidos.
