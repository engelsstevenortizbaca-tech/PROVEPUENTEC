# PLAN DE IMPLEMENTACIÓN · PROVEPUENTEC

Orden definitivo de construcción, criterios de aceptación por módulo, estrategia
de pruebas, riesgos por fase y checklist de finalización.

Documentos que este plan presupone leídos:
`docs/BUSINESS_RULES.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE_DESIGN.md`.

Estado: **fase -1 completada; fase 0 en curso.** P2, P3, P4 y P5 están
implementados y documentados en `server/src/docs/base-tecnica.md`. P1 y P6 siguen
pendientes: requieren autorización explícita (integración de ramas y
migraciones). El informe de auditoría está en `docs/AUDIT_PHASE_-1.md`; sus
hallazgos ya están incorporados a este plan.

---

## Índice

**Marco**

- [1. Resumen de fases](#1-resumen-de-fases)
- [2. Prerrequisitos técnicos](#2-prerrequisitos-técnicos)
- [3. Grafo de dependencias](#3-grafo-de-dependencias)

**Fases**

- [Fase -1 — Auditoría técnica](#fase--1--auditoría-técnica)
- [Fase 0 — Base técnica](#fase-0--base-técnica)
- [Fase 1 — Catálogo](#fase-1--catálogo)
- [Fase 2 — Soporte](#fase-2--soporte)
- [Fase 3 — Negociación](#fase-3--negociación)
- [Fase 4 — Transacción comercial](#fase-4--transacción-comercial)
- [Fase 5 — Cierre del ciclo](#fase-5--cierre-del-ciclo)
- [Fase 6 — Complementarios](#fase-6--complementarios)

**Transversal**

- [11. Estrategia de pruebas](#11-estrategia-de-pruebas)
- [12. Riesgos por fase](#12-riesgos-por-fase)
- [13. Checklist de finalización](#13-checklist-de-finalización)
- [14. Decisiones pendientes](#14-decisiones-pendientes)

---

## 1. Resumen de fases

| Fase | Nombre                 | Módulos                                          | Bloquea a       |
| ---- | ---------------------- | ------------------------------------------------ | --------------- |
| -1   | Auditoría técnica      | verificación del terreno; no se escribe código    | todo            |
| 0    | Base técnica           | rama de integración, transacciones, middlewares, constantes | todo    |
| 1    | Catálogo               | Products                                          | 3, 4            |
| 2    | Soporte                | Notifications, Addresses, Locations               | 3, 4            |
| 3    | Negociación            | Negotiations, Messages                            | 4               |
| 4    | Transacción comercial  | Orders, Shipments                                 | 5               |
| 5    | Cierre del ciclo       | Reviews                                           | —               |
| 6    | Complementarios        | Users, Roles, Favorites, Reports, Admin           | —               |

La fase 6 no depende de ninguna otra: puede intercalarse en cualquier momento
posterior a la fase 0. Se sitúa al final por prioridad, no por dependencia.

La fase -1 no produce código ni cambios: **solo verifica y reporta**. Su salida
es un informe que confirma o corrige los supuestos de este plan. Si algo no
coincide con lo documentado, se corrige la documentación antes de continuar.

---

## 2. Prerrequisitos técnicos

Deben existir **antes** de escribir el primer módulo de dominio.

### P1 · Rama de integración

> **Corregido por la auditoría (hallazgo H-1).** El supuesto original —`develop`
> vacío y esquema exclusivo de `feature/database`— es falso.

`origin/develop` (`8769a5e`) ya contiene, vía dos PR fusionados:

- el **esquema completo**: migraciones 001–007, `schema.sql`, índices, vistas,
  procedimientos, triggers y seeds (PR #2, desde `feature/database`);
- el **tooling de calidad**: `package.json` de raíz con workspaces, ESLint,
  Prettier, commitlint, husky + lint-staged y CI de GitHub Actions (PR #1, desde
  `feature/tooling`).

Lo que falta allí es el código de los cuatro módulos y `008_auth.sql`, que viven
en `feature/categories`.

Punto de partida correcto: **`origin/develop`**, no `feature/database`. Tareas:

1. Actualizar las copias locales de `develop` y `feature/auth`, ambas atrasadas
   (H-4). Requiere `git pull` autorizado.
2. Integrar el código de `feature/categories` sobre ese punto, resolviendo los
   conflictos de configuración inventariados en el informe §2.
3. Recuperar el tooling en la rama resultante: en `feature/categories` no existen
   `package.json` de raíz, hooks de husky, commitlint, lint-staged ni CI, y
   `core.hooksPath` apunta a un directorio sin hooks propios — **hoy los commits
   no pasan ninguna puerta automática** (H-2).
4. Añadir `SOURCE migrations/008_auth.sql;` a `schema.sql`: el orquestador no lo
   referencia y una base creada desde él no soporta Auth (H-3).
5. Fijar un único nombre de proyecto y de base de datos: los documentos dicen
   `provepuentec`, el paquete `@ucc-market/server` y la base `marketplace` (H-5).

Sin merge a `develop` (decisión 7). Requiere autorización explícita conforme a
`CLAUDE.md`.

### P2 · Helper transaccional — `server/src/database/transaction.js`

Prerrequisito oficial (decisión 8). **Entregado.**

Contrato esperado:

```
withTransaction(async (conn) => { ... })
```

- obtiene conexión del pool, abre transacción, confirma o revierte, y libera
  siempre la conexión
- propaga el error original tras el `ROLLBACK`
- **no anida**: una transacción activa no abre otra

Los repositorios que participen aceptan conexión opcional:
`create(data, conn = pool)`.

> **Precisión de la auditoría (informe §5).** Los siete repositorios existentes
> llaman a `pool.execute(...)` directamente y ninguno acepta conexión: habrá que
> añadirles el parámetro cuando participen en una transacción. Es viable sin
> fricción porque la conexión del pool expone la misma interfaz `execute`. Usan
> *named placeholders* (`:param`), así que el helper debe preservar esa
> configuración al obtener la conexión.

Se añadió además `executor(conn)`, que resuelve la conexión a usar por un
repositorio: la explícita, la de la transacción activa o el pool. La conexión
activa viaja por `AsyncLocalStorage`, de modo que una llamada anidada se une a
la transacción del llamador en lugar de abrir otra.

### P3 · Middleware `ownership`

Verifica propiedad (producto) o participación (negociación, pedido, envío,
conversación). Necesario porque la decisión 4 elimina el rol como criterio de
autorización sobre recursos propios. **Entregado**:
`ownership(load, { owners, as, notFoundMessage })`.

### P4 · Middleware `upload`

`multer` ya está en `package.json` sin usar. Requiere decidir: destino,
límite de tamaño, formatos admitidos, nomenclatura y borrado en cascada.

**Entregado bajo la propuesta por defecto de la decisión E**, configurable por
entorno: local en `server/uploads`, 5 MB, jpg/png/webp, nombres `randomUUID()`
con extensión derivada del tipo MIME y `removeUpload(url)` para el borrado en
cascada. Se usa `crypto.randomUUID()` en lugar del paquete `uuid`, que en su
versión 14 es solo ESM. Si la decisión E se resuelve de otro modo, basta cambiar
la configuración.

### P5 · Constantes de estado

`productStatus`, `offerStatus`, `negotiationStatus`, `shipmentStatus`,
`notificationTypes`. Ningún literal de estado disperso por los servicios.

**Entregado**, más `orderStatus` (claves usadas de `estados_pedido` y el prefijo
`ORD-`) y la tabla de transiciones `SHIPMENT_TRANSITIONS`, que la máquina de
estados de `shipment.service.js` aplicará.

### P6 · Migraciones y seeds

Según `DATABASE_DESIGN.md` §13.4. **No se generan sin autorización explícita.**

| Archivo                        | Contenido                                                |
| ------------------------------ | -------------------------------------------------------- |
| `009_negociacion.sql`          | `metodos_envio`, `estados_envio`, `negociaciones`, `ofertas` |
| `010_envios.sql`               | `envios`, `envio_historial`, `ALTER pedidos`              |
| `011_chat_negociacion.sql`     | `ALTER conversaciones`                                    |
| `seeds/003_envios.sql`         | Catálogos de métodos y estados de envío                   |
| `seeds/004_notificaciones.sql` | Seis tipos de notificación nuevos                         |

---

## 3. Grafo de dependencias

```
FASE -1 auditoría técnica   (verifica; no modifica nada)
 │
P1 rama de integración
 └── P2 transacciones ── P3 ownership ── P4 upload ── P5 constantes
      │
      ├── P6 migraciones + seeds
      │
      └── FASE 1 ── Products
             │
             ├── FASE 2 ── Notifications
             │             Addresses ── Locations
             │
             └── FASE 3 ── Negotiations ──┬── Messages
                                          │
                                          └── FASE 4 ── Orders ── Shipments
                                                                     │
                                                          FASE 5 ── Reviews

FASE 6 ── Users · Roles · Favorites · Reports · Admin   (independientes)
```

Ruta crítica: **Auditoría → P1 → P2 → Products → Notifications → Negotiations →
Orders → Shipments → Reviews.**

| Módulo        | Depende de                                          |
| ------------- | ---------------------------------------------------- |
| Products      | P1–P5                                                |
| Notifications | P1, P2, seeds de tipos                               |
| Addresses     | P1, Locations                                        |
| Locations     | P1                                                   |
| Negotiations  | Products, Notifications, Addresses, P2, `009`        |
| Messages      | Negotiations, `011`                                  |
| Orders        | Negotiations, `010`                                  |
| Shipments     | Orders, `010`, catálogos de envío                    |
| Reviews       | Shipments (estado `entregado`)                       |
| Favorites     | Products                                             |
| Users / Roles | P1                                                   |
| Reports       | P1                                                   |
| Admin         | todos los anteriores                                 |

---

## Fase -1 — Auditoría técnica

Verificación del terreno antes de tocarlo. **No se escribe código, no se
modifica la base de datos, no se crean ramas.** Solo se comprueba y se reporta.

Su razón de ser: todo este plan descansa sobre supuestos derivados de leer el
repositorio en un momento concreto. Antes de construir sobre ellos hay que
confirmarlos. Un supuesto falso descubierto en la fase 3 cuesta mucho más que
media hora de verificación ahora.

**Entregable:** un informe de auditoría con el resultado de los siete bloques.
Si algún resultado contradice la documentación, se corrige la documentación
antes de pasar a la fase 0.

**Ejecutada el 2026-07-28 sobre `feature/categories` (`ab1631d`). Informe:
`docs/AUDIT_PHASE_-1.md`.** Cinco bloques verificados; A6 y A7 limitados por la
ausencia de MySQL en el entorno (B-1).

| Bloque | Veredicto |
| ------ | --------- |
| A1 · Estado del proyecto | ✅ Confirmado sin excepciones |
| A2 · Ramas | ⚠️ Dos supuestos falsos: H-1 y H-2 |
| A3 · Migraciones | ✅ Confirmado · H-3 |
| A4 · Dependencias | ⚠️ Tooling de raíz ausente en esta rama (H-2) |
| A5 · Estructura | ✅ Arquitectura respetada |
| A6 · Triggers | ⚠️ Los cuatro inocuos por análisis del DDL; prueba en ejecución **aplazada a la fase 0** |
| A7 · Base de datos | ⛔ No verificable: sin MySQL y sin `server/.env` |

Puertas de calidad al cierre de la auditoría: `lint` limpio, `format:check`
conforme, **66/66 pruebas** en verde, servidor arrancando y `/health` → 200.

### A1 · Estado del proyecto — ✅

- [x] Confirmar los módulos completos: Auth, Categories, Subcategories, Brands
- [x] Confirmar que Users solo tiene `user.repository.js` y `user.model.js`
- [x] Confirmar que Roles no tiene capa HTTP
- [x] Confirmar que Products no está iniciado
- [x] Verificar que cada módulo completo tiene sus siete archivos y su documentación
      — Categories, Subcategories y Brands lo cumplen; Auth no tiene model ni
      repository propios porque reutiliza los de Users y tokens (correcto).
      Falta `auth.service.test.js` (H-6)
- [x] Contrastar el resultado con `docs/ROADMAP.md` y `CLAUDE.md`

### A2 · Ramas — ⚠️

- [x] Inventariar ramas locales y remotas, y su relación con `main`
- [x] ~~Confirmar que `develop` sigue vacío~~ → **falso.** `origin/develop`
      contiene tooling y esquema completo (H-1); la copia local va 17 commits
      por detrás (H-4)
- [x] ~~Confirmar que el esquema completo solo vive en `feature/database`~~ →
      **falso.** También está en `origin/develop` (H-1)
- [x] Confirmar que el código de los módulos vive en `feature/categories`
- [x] Identificar commits divergentes o trabajo sin integrar en otras ramas
- [x] Detectar conflictos previsibles — inventariados en el informe §2; todos de
      configuración y documentación, ninguno de código de dominio

### A3 · Migraciones existentes — ✅

- [x] Listar las migraciones de `feature/database`: 001 a 007
- [x] Confirmar que `008_auth.sql` solo existe en `feature/categories`
- [x] Verificar que no hay huecos ni números repetidos en la numeración
- [x] Confirmar que el orden de aplicación respeta las dependencias de claves foráneas
- [x] Revisar `database/schema.sql` como orquestador — **no incluye `008_auth.sql`** (H-3)
- [x] Inventariar índices, vistas, procedimientos, funciones y seeds existentes
- [x] Confirmar que `009`, `010` y `011` no existen todavía

### A4 · Dependencias — ⚠️

- [x] Verificar el árbol de dependencias de `server/` — `npm ls --depth=0` sin conflictos
- [x] Confirmar la versión de Node contra `engines: >=18` — v22.15.0
- [x] Verificar que `multer` está instalado y sin uso — `multer@2.2.0`, sin importaciones
- [x] Verificar que `uuid` está instalado y valorar su papel — innecesario para
      `pedidos.codigo`; candidato a nombrar archivos subidos en P4
- [ ] Revisar vulnerabilidades reportadas — **pendiente**: `npm audit` requiere red
- [x] Confirmar que no falta ninguna dependencia para los módulos planificados
- [x] ~~Confirmar que no hay `package.json` en la raíz y que husky opera correctamente~~
      → no hay `package.json` de raíz, y **husky no opera**: `core.hooksPath` es
      `.husky/_` pero no hay hooks propios (H-2). `node_modules/` de raíz quedó
      huérfano (H-7)

### A5 · Estructura del proyecto — ✅

- [x] Verificar que la estructura de `server/src` coincide con la documentada
- [x] Confirmar el patrón de siete archivos en los módulos existentes
- [x] Confirmar que la documentación por módulo vive en `server/src/docs/`
- [x] Verificar que los controladores no contienen lógica de negocio
- [x] Verificar que los servicios no ejecutan SQL directo — cero coincidencias
- [x] Verificar que los repositorios son objetos singleton con métodos sustituibles
      — y que **ninguno acepta conexión** todavía (ver P2)
- [x] Confirmar que `client/` sigue siendo un esqueleto vacío
- [x] Confirmar que `server/uploads/` existe y está vacío — solo `.gitkeep`

### A6 · Triggers heredados — ⚠️ veredicto estático

Bloque crítico. Con la decisión 10 un trigger que falla revierte la operación
completa en lugar de fallar de forma aislada.

- [x] Inventariar los cuatro triggers de `database/triggers/001_triggers.sql`
- [x] `trg_detalle_pedido_descuenta_stock` — **inocuo**: sin fila en `inventario`
      afecta 0 filas; `GREATEST` protege el `CHECK`
- [x] `trg_pedidos_incrementa_uso_cupon` — **inocuo**: cuerpo íntegro bajo
      `IF cupon_id IS NOT NULL`, y la aceptación no usa cupones
- [x] `trg_variantes_precio_historial` — **inocuo**: todas las columnas que no
      aporta son `NULL`ables o tienen `DEFAULT`. Escribe una fila de auditoría en
      cada sincronización de precio de Products
- [x] `trg_mensajes_actualiza_conversacion` — **correcto**: ya mantiene
      `ultimo_mensaje_at`; Messages **no** debe volver a escribirlo
- [ ] Probar un `INSERT` en `pedidos` y en `detalle_pedido` **dentro de una
      transacción** — **imposible en este entorno (B-1). Se traslada a la fase 0**
- [x] Documentar el resultado — informe §6, con veredicto por trigger y la
      reserva de lo que solo se ve en ejecución

### A7 · Estado de la base de datos — ⛔ no verificable (B-1)

Sin MySQL en la máquina (3306 cerrado, sin servicio, sin cliente) y sin
`server/.env`. Ningún punto pudo comprobarse.

- [ ] Confirmar si existe una base de datos aplicada y en qué entorno
- [ ] Si existe, listar sus tablas y contrastarlas con el esquema documentado
- [ ] Verificar si hay datos reales o solo seeds de demostración
- [ ] **Comprobar si `pedidos` tiene filas** — indeterminado. Si no hay base
      aplicada no hay datos y `ALTER pedidos` iría en un paso; **reconfirmar
      contra el entorno real** antes de aplicar `010`. La secuencia de
      `DATABASE_DESIGN.md` §5.1 sigue vigente como plan B
- [ ] Verificar motor, juego de caracteres y colación efectivos
- [ ] Confirmar que `server/.env` está configurado y que la conexión responde —
      **`server/.env` no existe**; solo `.env.example`
- [ ] Verificar que los seeds de catálogo están aplicados

### Criterios de aceptación de la fase -1

- [x] Los siete bloques verificados y documentados — cinco completos, A6 parcial
      y A7 bloqueado, ambos por B-1 y con la causa registrada
- [x] Toda discrepancia con la documentación, corregida en la documentación —
      H-1 en §2 P1, H-2 y H-3 en P1, precisión de repositorios en P2,
      `ROADMAP.md` actualizado
- [x] Resultado de A6 registrado por escrito, con veredicto por trigger
- [x] Resultado de A7 registrado: indeterminado, con la condición de reconfirmación
- [x] Las decisiones pendientes que la auditoría permita cerrar — informe §10:
      E queda sin obstáculos; F y G salen reforzadas; A–D sin datos nuevos
- [x] Confirmación explícita de que se puede pasar a la fase 0 — **sí**, con las
      seis condiciones del informe §9

---

## Fase 0 — Base técnica

**Entregables:** P1 a P6. Requiere la fase -1 completada.

**Estado (2026-07-29): P2 a P5 entregados.** Documentación:
`server/src/docs/base-tecnica.md`. Puertas de calidad al cierre de este bloque:
`lint` limpio, `format:check` conforme, **93/93 pruebas** en verde, servidor
arrancando y `/health` → 200.

Lo que queda depende de autorización o de entorno: **P1** (integración de ramas,
exige `git pull` y merge), **P6** (migraciones y seeds) y todo lo que necesite
una base de datos viva (B-1).

### Criterios de aceptación

- [ ] La rama de integración contiene las migraciones 001–008 y el código de los cuatro módulos existentes — **P1, pendiente de autorización**
- [ ] `schema.sql` referencia `008_auth.sql` (H-3) — el archivo vive en la rama de integración
- [ ] El tooling de calidad opera de nuevo: hooks de husky activos, lint-staged, commitlint y CI (H-2) — **P1**
- [ ] Existe `server/.env` y MySQL responde: sin esto, los cuatro criterios siguientes no son verificables (B-1)
- [ ] La prueba en ejecución de los triggers heredados, aplazada desde A6, ejecutada dentro de una transacción — **bloqueada por B-1**
- [x] `npm run lint`, `npm run format:check` y `npm test` pasan sin errores — 93/93
- [x] El servidor arranca y `/health` responde — 200 `{"status":"ok"}`
- [x] `withTransaction` confirma al terminar sin error y revierte ante una excepción
- [x] `withTransaction` libera la conexión en ambos casos — verificado sobre un pool sustituido (20 ciclos, 20 liberaciones). **La verificación con el pool real al límite sigue pendiente por B-1**
- [x] `ownership` devuelve 403 ante un recurso ajeno y deja pasar al dueño
- [x] `upload` rechaza tamaño y formato fuera de política
- [x] Ninguna constante de estado aparece como literal en un servicio — constantes creadas antes del primer servicio que las use
- [ ] El veredicto de A6 sobre los triggers heredados está cerrado y, si alguno interfiere, resuelto antes de continuar — **bloqueado por B-1**

---

## Fase 1 — Catálogo

### Módulo Products

**Archivos:** `product.model.js`, `product.repository.js`, `product.service.js`,
`product.controller.js`, `product.validators.js`, `product.routes.js`,
`productImage.*`, `tests/product.service.test.js`, `src/docs/products.md`.

**Tablas:** `productos`, `producto_variantes`, `producto_imagenes`.

### Criterios de aceptación

- [ ] Cualquier usuario autenticado publica sin rol `vendedor` (decisión 4)
- [ ] Al crear un producto se genera **exactamente una** variante por defecto (decisión 2)
- [ ] Al cambiar el precio del producto, la variante por defecto se sincroniza
- [ ] La API **no expone** el concepto de variante en ninguna respuesta
- [ ] Un producto nace en `borrador` y solo es visible en el catálogo público al pasar a `activo`
- [ ] `subcategoria_id` es obligatoria; `marca_id` es opcional
- [ ] El slug se genera desde el título y es único, reutilizando `utils/slug`
- [ ] Solo el dueño edita, cambia estado o elimina; un tercero recibe 403
- [ ] El borrado es lógico (`deleted_at`), nunca físico
- [ ] Filtros operativos: `q`, categoría, subcategoría, marca, condición, rango de precio, vendedor
- [ ] Paginación con el formato `{ data, pagination }`
- [ ] Imágenes: alta, borrado, reordenación y marca de principal; solo una principal por producto
- [ ] `GET /products/me` incluye borradores; el catálogo público nunca los muestra

---

## Fase 2 — Soporte

### Módulo Notifications

**Tablas:** `notificaciones`, `tipos_notificacion`.

Se construye **antes** de Negotiations porque participa en su transacción.

#### Criterios de aceptación

- [ ] `emit(tipo, usuarioId, data, conn)` acepta una conexión y participa en la transacción del llamador
- [ ] `emit` **solo escribe la fila** en `notificaciones`: no envía correo, push ni llama a ningún servicio externo
- [ ] `notification.dispatcher` existe como servicio independiente y se invoca **después del `COMMIT`**
- [ ] Un fallo del despachador **no** revierte la operación ya confirmada; se registra en el log
- [ ] Ninguna llamada de red ocurre dentro de un bloque transaccional, verificado por revisión de código
- [ ] Los ocho tipos de `ARCHITECTURE.md` §5.7 están sembrados y son resolubles
- [ ] Un tipo inexistente falla de forma explícita, no en silencio
- [ ] El usuario solo lee sus propias notificaciones
- [ ] `unread-count` no pagina y responde en una sola consulta
- [ ] Marcar como leída es idempotente
- [ ] La dependencia es unidireccional: Notifications no importa ningún módulo de dominio

### Módulos Locations y Addresses

**Tablas:** `paises`, `departamentos`, `ciudades`, `direcciones`.

#### Criterios de aceptación

- [ ] Locations es de solo lectura, sin escrituras expuestas
- [ ] El usuario solo gestiona sus propias direcciones
- [ ] Una sola dirección principal por usuario; marcar una nueva desmarca la anterior
- [ ] El borrado es lógico: una dirección referenciada por un envío nunca desaparece
- [ ] `ciudad_id` se valida contra el catálogo

---

## Fase 3 — Negociación

Fase de mayor riesgo del proyecto. Concentra las reglas de negocio y la
operación crítica.

### Módulo Negotiations

**Tablas:** `negociaciones`, `ofertas`, `metodos_envio` y, en la aceptación,
`pedidos`, `detalle_pedido`, `envios`, `envio_historial`, `productos`,
`notificaciones`.

#### Criterios de aceptación — apertura

- [ ] Un usuario **no** puede ofertar sobre su propio producto → 409
- [ ] No se acepta oferta sobre producto que no esté `activo` → 409
- [ ] No se acepta oferta sobre producto `vendido` → 409
- [ ] Segunda negociación abierta del mismo comprador sobre el mismo producto → 409
- [ ] La apertura crea negociación, primera oferta, conversación y ambos participantes en una sola transacción
- [ ] Cada oferta registra monto, método de envío y costo de envío (decisión 1)

#### Criterios de aceptación — turnos

- [ ] Quien emitió la última oferta no puede emitir otra → 409
- [ ] Una contraoferta marca `superada` la oferta pendiente anterior
- [ ] `ultimo_turno_usuario_id` se actualiza en cada turno
- [ ] El comprador también puede aceptar, rechazar y contraofertar
- [ ] Un tercero ajeno a la negociación recibe 403 en cualquier operación

#### Criterios de aceptación — inmutabilidad

- [ ] El repositorio de ofertas **no expone** `update` de contenido ni `remove`
- [ ] Solo cambia el campo `estado`
- [ ] Una oferta en estado terminal no transiciona a otro → 409
- [ ] Tras aceptar, el historial completo sigue siendo legible

#### Criterios de aceptación — aceptación (la operación crítica)

- [ ] Todo ocurre en **una sola transacción** (decisión 10)
- [ ] `SELECT ... FOR UPDATE` sobre el producto antes de cualquier escritura
- [ ] Con dos aceptaciones concurrentes sobre el mismo producto, **exactamente una** prospera; la otra recibe 409
- [ ] Se crean pedido, línea de detalle, envío en `pendiente` y su primera fila de historial
- [ ] `pedidos.codigo` se genera como `ORD-` más el id a seis dígitos
- [ ] El producto queda `vendido`
- [ ] Las demás ofertas quedan `superadas` y las otras negociaciones abiertas, cerradas
- [ ] Monto, método y costo se **copian** al pedido y al envío
- [ ] Si el método exige dirección y no se aporta una válida → 400, sin efectos
- [ ] Las notificaciones se **registran** dentro de la transacción; el despacho externo ocurre tras el `COMMIT`
- [ ] Ante un fallo simulado en el último paso, **ninguna** tabla queda modificada
- [ ] La conversación sigue activa y vinculada tras la aceptación

#### Criterios de aceptación — idempotencia

Aceptar dos veces la misma oferta es un escenario ordinario, no un caso límite:
doble clic, reintento del cliente ante un timeout, reenvío del formulario.

- [ ] Aceptar dos veces la misma oferta **no** crea un segundo pedido
- [ ] **No** crea un segundo envío ni una segunda fila de historial inicial
- [ ] **No** duplica notificaciones
- [ ] La segunda llamada devuelve 409, con la oferta ya en estado `aceptada`
- [ ] Dos llamadas **simultáneas** sobre la misma oferta: una prospera, la otra 409
- [ ] La defensa es de base de datos, no solo de aplicación: `uq_pedidos_negociacion` y `uq_envios_pedido` impiden el duplicado aunque la comprobación previa falle
- [ ] La verificación del estado de la oferta ocurre **dentro** del bloqueo, no antes de abrir la transacción
- [ ] Tras la segunda llamada rechazada, el estado del sistema es idéntico al posterior a la primera

> Este criterio se solapa con el de concurrencia, pero no es el mismo. La
> concurrencia protege de **dos compradores distintos** sobre el mismo producto;
> la idempotencia, del **mismo actor repitiendo la misma acción**. La primera se
> resuelve bloqueando el producto; la segunda, comprobando el estado de la
> oferta dentro del bloqueo y apoyándose en las restricciones `UNIQUE`.

### Módulo Messages

**Tablas:** `conversaciones`, `conversacion_participantes`, `mensajes`.

#### Criterios de aceptación

- [ ] Solo los participantes leen y escriben; un tercero recibe 403
- [ ] El chat funciona en **todos** los estados, incluida la negociación `aceptada` (decisión 9)
- [ ] Los mensajes no se editan ni se eliminan
- [ ] Lectura paginada y en orden cronológico
- [ ] `ultimo_mensaje_at` se mantiene actualizado
- [ ] Marcar como leído actualiza `ultimo_leido_at` del participante
- [ ] Cada mensaje notifica a la contraparte
- [ ] Messages **no** participa en la transacción de aceptación

---

## Fase 4 — Transacción comercial

### Módulo Orders

**Tablas:** `pedidos`, `detalle_pedido`.

#### Criterios de aceptación

- [ ] **No existe** `POST /orders`: el pedido solo nace de una oferta aceptada
- [ ] `vendedor_id` y `comprador_id` siempre presentes
- [ ] Un pedido por negociación, garantizado por `uq_pedidos_negociacion`
- [ ] Solo comprador y vendedor acceden a su pedido; un tercero recibe 403
- [ ] El listado filtra por rol (`comprador` o `vendedor`)
- [ ] `total = subtotal + envio`, coincidente con la oferta aceptada
- [ ] La cancelación solo procede si el envío no ha salido; después → 409
- [ ] La cancelación es transaccional y aplica el comportamiento por defecto de `DATABASE_DESIGN.md` §12 paso 6b

### Módulo Shipments

**Tablas:** `envios`, `envio_historial`, `estados_envio`, `metodos_envio`.

#### Criterios de aceptación

- [ ] Solo el vendedor cambia el estado; el comprador solo lee
- [ ] Transiciones válidas: `pendiente → preparando → enviado → en_transito → entregado`
- [ ] `cancelado` alcanzable desde cualquier estado no final
- [ ] Retroceso rechazado → 409
- [ ] Salto de estado rechazado → 409
- [ ] Transición desde un estado final rechazada → 409
- [ ] Cada transición escribe historial y notifica al comprador, en una transacción
- [ ] La fila más reciente del historial **siempre** coincide con `envios.estado_envio_id`
- [ ] Al pasar a `entregado` se sella `entregado_at` y el pedido pasa a `entregado`
- [ ] El seguimiento es legible por ambas partes
- [ ] La máquina de estados vive en el servicio, no en el controlador ni en SQL

---

## Fase 5 — Cierre del ciclo

### Módulo Reviews

**Tablas:** `calificaciones`.

#### Criterios de aceptación

- [ ] Calificar con envío distinto de `entregado` → 409
- [ ] Solo el comprador del pedido califica; el vendedor recibe 403
- [ ] Una sola calificación por pedido; la segunda → 409
- [ ] Puntuación validada en el rango 1–5
- [ ] La reputación del vendedor es consultable desde su perfil público
- [ ] La calificación notifica al vendedor

---

## Fase 6 — Complementarios

### Users y Roles

- [ ] Users completa service, controller, routes, validators y tests
- [ ] Perfil público de vendedor con reputación, sin datos sensibles
- [ ] Solo el administrador lista usuarios, cambia su estado y asigna roles
- [ ] `toPublicUser` nunca expone `password_hash`
- [ ] Roles es de solo lectura más asignación por administrador
- [ ] `permisos` y `rol_permiso` siguen sin consultarse (decisión 6)

### Favorites

- [ ] Sin duplicados, garantizado por `uq_favoritos_usuario_producto`
- [ ] Añadir es idempotente
- [ ] Solo se listan los favoritos propios
- [ ] Un producto eliminado desaparece del listado

### Reports y Admin

- [ ] Cualquier usuario autenticado denuncia
- [ ] Solo administrador y soporte listan y resuelven
- [ ] Las métricas del panel no exponen datos personales

---

## 11. Estrategia de pruebas

### 11.1 Situación actual

`npm test` ejecuta `node --test`. Las pruebas existentes aíslan el servicio
sustituyendo los métodos del repositorio singleton, sin tocar MySQL. No hay
`supertest` ni base de datos de pruebas.

El patrón funciona y **debe conservarse**: cada repositorio nuevo se declara
como objeto singleton con métodos sustituibles.

### 11.2 Niveles

| Nivel                | Alcance                                        | Herramienta                    | Obligatorio    |
| -------------------- | ---------------------------------------------- | ------------------------------ | -------------- |
| Unitario de servicio | Reglas de negocio con repositorio sustituido   | `node --test`                  | Sí, por módulo |
| Máquina de estados   | Transiciones válidas e inválidas               | `node --test`                  | Sí, fases 3–4  |
| Integración          | Transacciones, rollback, concurrencia, FK y triggers reales | `provepuentec_test` (decisión G) | Recomendado, decisión pendiente |
| HTTP                 | Rutas, códigos de estado, forma de respuesta   | `supertest`                    | Recomendado    |

### 11.3 Cobertura mínima por módulo

Cada `*.service.test.js` debe cubrir:

1. Camino feliz de cada operación pública
2. Cada regla de negocio que produzca 403, 404 o 409
3. Cada validación que produzca 400 o 422
4. Los límites: paginación, valores nulos, campos opcionales
5. La forma de la respuesta: `{ data, pagination }` y `{ recurso }`

### 11.4 Pruebas específicas de las fases críticas

**Negotiations** — casos que no pueden faltar:

| Caso                                         | Resultado esperado                |
| -------------------------------------------- | --------------------------------- |
| Ofertar sobre producto propio                 | 409                               |
| Ofertar sobre producto vendido                | 409                               |
| Segunda negociación del mismo comprador       | 409                               |
| Ofertar fuera de turno                        | 409                               |
| Aceptar una oferta ya superada                | 409                               |
| Tercero intentando cualquier operación        | 403                               |
| Aceptación completa                           | pedido, envío y producto vendido  |
| Fallo simulado a mitad de la aceptación       | ninguna tabla modificada          |
| Dos aceptaciones concurrentes                 | una prospera, la otra 409         |
| Aceptar dos veces la misma oferta             | un solo pedido, un solo envío, sin notificaciones duplicadas |
| Aceptaciones simultáneas de la misma oferta   | una prospera, la otra 409         |

**Shipments** — matriz completa de transiciones: seis estados de origen por seis
de destino. Solo las cuatro transiciones lineales más las cancelaciones desde
estados no finales deben aceptarse. Todas las demás, 409.

### 11.5 Limitación reconocida

La integridad transaccional **real** no queda cubierta por pruebas con
repositorios sustituidos: verifican que el servicio llama a lo que debe, no que
MySQL revierta. La verificación efectiva del `ROLLBACK`, de la concurrencia y de
las claves foráneas exige una base de datos de pruebas — es la decisión G.

Mientras no se apruebe, la fase 3 requiere **verificación manual** de tres
escenarios, con el resultado registrado por escrito:

1. fallo a mitad de la aceptación → ninguna tabla modificada
2. dos aceptaciones concurrentes sobre el mismo producto → un solo pedido
3. aceptación repetida de la misma oferta → sin duplicados

Verificación manual significa que no hay defensa contra regresiones: nada
impide que un cambio futuro rompa cualquiera de los tres sin que nadie lo note.

### 11.6 Puertas de calidad

Antes de dar un módulo por terminado, conforme a `CLAUDE.md`:

```
npm run lint
npm run format:check
npm test
```

Y comprobar que el servidor arranca. No se desactivan pruebas para que pasen ni
se ignoran errores.

---

## 12. Riesgos por fase

### Fase -1

| Riesgo                                                        | Impacto | Mitigación                                                        |
| --------------------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| Auditoría superficial que confirma lo que se espera encontrar     | Alto    | Cada punto se verifica contra el repositorio o la base, no contra la documentación |
| Hallazgos no registrados y olvidados al empezar a implementar     | Medio   | El entregable es un informe escrito, no una impresión               |
| Base de datos con datos previos, descubierta tarde                | Medio   | A7 lo determina antes de planificar el `ALTER pedidos`              |
| Triggers dados por inocuos sin probarlos                          | Alto    | A6 exige prueba real dentro de una transacción, no lectura del SQL  |

### Fase 0

| Riesgo                                      | Impacto | Mitigación                                                    |
| ------------------------------------------- | ------- | ------------------------------------------------------------- |
| Conflictos al unificar las ramas            | Alto    | Integrar primero el esquema, después el código; validar arranque tras cada paso |
| Triggers heredados que abortan transacciones | Alto    | Verificación obligatoria en fase 0, no diferida               |
| Helper transaccional que filtra conexiones   | Alto    | Probar con el pool al límite; `release` en `finally`          |

### Fase 1

| Riesgo                                          | Impacto | Mitigación                                                |
| ----------------------------------------------- | ------- | ---------------------------------------------------------- |
| Variante por defecto desincronizada del precio   | Medio   | Sincronizar en el servicio y cubrirlo con pruebas          |
| Fuga del concepto de variante hacia la API       | Medio   | El modelo público no proyecta variantes                    |
| Subida de imágenes sin política definida         | Medio   | Cerrar P4 antes de empezar                                 |

### Fase 2

| Riesgo                                                  | Impacto | Mitigación                                        |
| -------------------------------------------------------- | ------- | -------------------------------------------------- |
| Seeds de tipos ausentes: la FK `RESTRICT` bloquea todo    | Alto    | Sembrar antes de la primera emisión                |
| Dependencia circular con los módulos de dominio           | Medio   | Notifications no importa ningún módulo de dominio  |
| Sondeo de notificaciones contra el límite global de peticiones | Bajo | Evaluar límite específico para la ruta            |

### Fase 3 — la más expuesta

| Riesgo                                                | Impacto | Mitigación                                                    |
| ------------------------------------------------------ | ------- | -------------------------------------------------------------- |
| Carrera en la aceptación: dos pedidos del mismo producto | Crítico | `SELECT ... FOR UPDATE` y verificación dentro del bloqueo      |
| Transacción parcial por fallo intermedio                | Crítico | Un único `withTransaction`; prueba de fallo simulado           |
| Transacción larga que bloquea el producto               | Alto    | Sin red, correo ni escritura de archivos dentro del bloque; despacho tras el `COMMIT` |
| Aceptación repetida por doble clic o reintento          | Alto    | Estado de la oferta verificado dentro del bloqueo, más `uq_pedidos_negociacion` y `uq_envios_pedido` |
| Correo enviado sobre una operación que luego se revierte | Alto   | El despacho externo ocurre solo después del `COMMIT`           |
| Historial corrompido por una edición accidental         | Alto    | El repositorio no expone `update` de contenido ni `remove`     |
| Turnos mal controlados: ofertas consecutivas del mismo actor | Medio | `ultimo_turno_usuario_id` validado en cada emisión           |
| Crecimiento del chat sin purga                          | Bajo    | Índice `(conversacion_id, created_at)` y paginación obligatoria |

### Fase 4

| Riesgo                                                     | Impacto | Mitigación                                            |
| ------------------------------------------------------------ | ------- | ------------------------------------------------------ |
| `ALTER pedidos` con `vendedor_id NOT NULL` sobre datos previos | Alto  | Secuencia de `DATABASE_DESIGN.md` §5.1                 |
| Estado del envío divergente del historial                    | Medio   | Escribir ambos en la misma transacción, siempre        |
| Cancelación con reglas sin definir                           | Medio   | Comportamiento por defecto documentado; §14            |
| Duplicación conceptual entre estados de pedido y de envío    | Bajo    | El estado operativo vive solo en `envios`              |

### Fase 5

| Riesgo                                          | Impacto | Mitigación                                       |
| ------------------------------------------------ | ------- | ------------------------------------------------- |
| Calificar antes de la entrega                    | Medio   | Validar contra `envios`, no contra `pedidos`      |
| `UNIQUE` de calificaciones más laxo de lo necesario | Bajo | Regla de una por pedido, aplicada en el servicio  |

### Fase 6

| Riesgo                                        | Impacto | Mitigación                                  |
| ---------------------------------------------- | ------- | -------------------------------------------- |
| Exposición de datos sensibles en perfil público | Medio   | Reutilizar `toPublicUser`                    |
| Rol `vendedor` vestigial tras la decisión 4     | Bajo    | Se conserva como rol informativo; §14        |

---

## 13. Checklist de finalización

### 13.1 Por módulo

Ningún módulo se considera terminado sin los doce puntos:

- [ ] Los siete archivos del patrón: model, repository, service, controller, validators, routes, test
- [ ] Documentación en `server/src/docs/<modulo>.md`
- [ ] Router registrado en `routes/index.js`
- [ ] Respuestas en el formato acordado: `{ data, pagination }` y `{ recurso }`
- [ ] Códigos de estado conformes a `CLAUDE.md`, incluido 422 en validaciones
- [ ] Toda la lógica de negocio en el servicio; el controlador solo traduce HTTP
- [ ] Toda consulta SQL en el repositorio
- [ ] Toda validación de entrada en los validators
- [ ] Pruebas que cubren camino feliz, reglas de negocio y validaciones
- [ ] `npm run lint`, `npm run format:check` y `npm test` en verde
- [ ] El servidor arranca sin errores
- [ ] `docs/ROADMAP.md` actualizado

### 13.2 Por fase

- [ ] Todos los módulos de la fase cumplen 13.1
- [ ] Los criterios de aceptación de la fase están verificados uno a uno
- [ ] Los riesgos de la fase están mitigados o registrados como asumidos
- [ ] Sin regresiones en los módulos anteriores

### 13.3 Del proyecto

- [ ] Las trece reglas de `BUSINESS_RULES.md` verificables de extremo a extremo
- [ ] Las tres reglas de `BUSINESS_RULES.md` § *Pendiente de definir* resueltas y documentadas
- [ ] Las siete decisiones pendientes (A–G) de §14 resueltas y documentadas
- [ ] Informe de la fase -1 archivado y sus hallazgos incorporados
- [ ] Flujo completo probado: publicar → ofertar → contraofertar → aceptar → enviar → entregar → calificar
- [ ] Ninguna tabla ni columna eliminada
- [ ] Ningún historial destruido: ofertas, mensajes y seguimiento íntegros
- [ ] Documentación coherente entre los cinco documentos
- [ ] Merge a `develop` autorizado y ejecutado (decisión 7)

### 13.4 Autorizaciones requeridas

Conforme a `CLAUDE.md`, no proceden sin aprobación explícita:

- [ ] Creación de la rama de integración
- [ ] Generación de las migraciones `009`, `010` y `011`
- [ ] Aplicación de migraciones sobre la base de datos
- [ ] Ejecución de los seeds
- [ ] Merge hacia `develop`
- [ ] Cualquier cambio de esquema no previsto en `DATABASE_DESIGN.md`

---

## 14. Decisiones pendientes

No bloquean el inicio, pero deben resolverse antes de la fase indicada. El
informe de auditoría §10 registra qué aportó la fase -1 a cada una: **E** queda
sin obstáculos técnicos, **F** y **G** salen reforzadas —A6 y A7 quedaron sin
verificar precisamente por no haber base de datos— y **A** a **D** siguen
abiertas con su propuesta por defecto. Si se aprueba **G**, fijar el nombre de la
base conforme a H-5.

| #   | Cuestión                                                                         | Necesaria antes de | Propuesta por defecto                                            |
| --- | --------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------- |
| A   | Al cancelar un pedido, ¿el producto vuelve a `activo` o permanece `vendido`?       | Fase 4             | Permanece `vendido`. Conservador y sin contradecir ninguna regla   |
| B   | ¿Se reabren las negociaciones cerradas al aceptar, si el pedido se cancela?        | Fase 4             | No se reabren. Reabrirlas exigiría revertir estados terminales     |
| C   | ¿Las ofertas vencen automáticamente? ¿En cuánto tiempo?                            | Fase 3             | Sin vencimiento. `expira_at` queda nulo y disponible para el futuro |
| D   | ¿Qué papel conserva el rol `vendedor` tras la decisión 4?                          | Fase 6             | Rol informativo, nunca exigido para publicar                       |
| E   | Política de subida de imágenes: destino, tamaño, formatos                          | Fase 1             | Local en `server/uploads/`, 5 MB, jpg/png/webp                     |
| F   | ¿Se cubren las transacciones con pruebas automatizadas o basta la verificación manual? | Fase 3         | Automatizadas. La verificación manual no protege de regresiones    |
| G   | ¿Se crea `provepuentec_test` como base exclusiva de pruebas de integración?        | Fase 3             | Sí. Es la forma concreta de resolver F; aprobar G cierra también F |

### Decisión G · Base de datos exclusiva para pruebas de integración

**Propuesta.** Crear `provepuentec_test`, una base independiente de la de
desarrollo, dedicada a pruebas de integración automatizadas.

**Qué permitiría validar automáticamente**, y que hoy no se puede:

| Aspecto              | Qué se verificaría                                                                 |
| -------------------- | ----------------------------------------------------------------------------------- |
| **Transacciones**    | Que `withTransaction` confirma al terminar bien y libera siempre la conexión          |
| **Rollback**         | Que un fallo a mitad de la aceptación deja las ocho tablas intactas — hoy solo verificable a mano |
| **Concurrencia**     | Que dos aceptaciones simultáneas producen un solo pedido, con `SELECT ... FOR UPDATE` real |
| **Idempotencia**     | Que aceptar dos veces no duplica, apoyándose en las restricciones `UNIQUE` reales     |
| **Claves foráneas**  | Que `RESTRICT`, `CASCADE` y `SET NULL` se comportan como documenta `DATABASE_DESIGN.md` §8 |
| **Triggers**         | Que los cuatro triggers heredados no abortan las transacciones nuevas (A6, de forma automática y repetible) |

**Por qué importa.** La estrategia actual sustituye los repositorios: verifica
que el servicio *llama* a lo que debe, no que MySQL *haga* lo que debe. Toda la
fase 3 descansa sobre garantías que hoy ninguna prueba cubre. Es la mayor
brecha de verificación del proyecto.

**Requisitos si se aprueba:**

- Variable de entorno propia; `env.isTest` ya existe en `config/env.js`
- Esquema aplicado desde las mismas migraciones, sin divergencias
- Limpieza entre pruebas: truncado o transacción revertida por caso
- Nunca apuntar a la base de desarrollo, con salvaguarda explícita
- Script `npm run test:integration`, separado de `npm test`
- Seeds mínimos y deterministas

**Coste.** Configuración inicial, mayor tiempo de ejecución y una dependencia de
entorno para quien ejecute la suite completa.

**Recomendación.** Aprobarla antes de la fase 3. Implementarla después obliga a
reescribir pruebas ya hechas, y deja sin red de seguridad justamente la fase de
mayor riesgo del proyecto.

---

## Documentos relacionados

| Documento                  | Contenido                                        |
| -------------------------- | ------------------------------------------------ |
| `docs/BUSINESS_RULES.md`   | Reglas de negocio. Fuente de verdad funcional     |
| `docs/ARCHITECTURE.md`     | Decisiones, flujo, módulos, endpoints y riesgos   |
| `docs/DATABASE_DESIGN.md`  | Modelo de datos. Referencia oficial de migraciones |
| `docs/ROADMAP.md`          | Estado de avance                                  |
| `CLAUDE.md`                | Convenciones de arquitectura, calidad y trabajo   |
