# INFORME DE AUDITORÍA · FASE -1

Verificación del terreno antes de la Fase 0. **No se escribió código, no se
modificó la base de datos, no se creó ninguna rama.**

| Dato               | Valor                                              |
| ------------------ | -------------------------------------------------- |
| Fecha              | 2026-07-28                                         |
| Rama auditada      | `feature/categories` (`ab1631d`)                   |
| Entorno            | Windows 11 · Node v22.15.0 · npm 10.9.2            |
| Alcance            | Bloques A1 a A7 de `IMPLEMENTATION_PLAN.md`         |
| Resultado          | 5 bloques verificados · 2 bloqueados por entorno    |

---

## 0. Resumen ejecutivo

| Bloque | Tema                     | Veredicto                                  |
| ------ | ------------------------ | ------------------------------------------ |
| A1     | Estado del proyecto       | ✅ Confirmado sin excepciones               |
| A2     | Ramas                     | ⚠️ **Dos supuestos falsos** (H-1, H-2)      |
| A3     | Migraciones               | ✅ Confirmado · 1 observación (H-3)          |
| A4     | Dependencias              | ⚠️ Tooling de raíz ausente en esta rama (H-2)|
| A5     | Estructura                | ✅ Confirmado · arquitectura respetada       |
| A6     | Triggers heredados        | ⚠️ Veredicto **estático**: los cuatro inocuos. Prueba real **imposible** (B-1) |
| A7     | Estado de la base de datos| ⛔ **No verificable**: no hay MySQL ni `.env` (B-1) |

**Puertas de calidad, ejecutadas hoy:**

| Comando                | Resultado                        |
| ---------------------- | -------------------------------- |
| `npm run lint`         | ✅ 0 errores, 0 avisos            |
| `npm run format:check` | ✅ todos los archivos conformes   |
| `npm test`             | ✅ 66 pruebas, 66 pasan           |
| Arranque del servidor  | ✅ escucha en :3000 · `GET /health` → `200 {"status":"ok"}` |

El servidor arranca sin base de datos: registra `WARN: No se pudo verificar la
conexión a MySQL` y sigue. Las rutas de datos devuelven 500 (`ECONNREFUSED`), lo
esperado sin MySQL.

**Veredicto:** se puede pasar a la Fase 0 **salvo** en lo que dependa de una base
de datos viva (verificación real de triggers, `withTransaction`, A7). Ver §9.

---

## 1. A1 · Estado del proyecto — ✅

| Comprobación                                  | Resultado |
| --------------------------------------------- | --------- |
| Auth, Categories, Subcategories, Brands completos | ✅ Confirmado |
| Users solo `user.repository.js` + `user.model.js` | ✅ Confirmado |
| Roles sin capa HTTP (solo `constants/roles.js`)   | ✅ Confirmado |
| Products no iniciado                              | ✅ Confirmado: cero archivos `product.*` |
| Documentación por módulo                          | ✅ `auth.md`, `categories.md`, `subcategories.md`, `brands.md` |
| Coherencia con `ROADMAP.md` y `CLAUDE.md`         | ✅ Coincide |

**Matiz del patrón de siete archivos.** Categories, Subcategories y Brands lo
cumplen literalmente. **Auth no**, y es correcto que no lo cumpla: no tiene
`auth.model.js` ni `auth.repository.js` porque reutiliza `user.model.js`,
`user.repository.js` y los tres repositorios de tokens
(`refreshToken`, `passwordReset`, `emailVerification`). No es una carencia.

Pruebas presentes en `server/tests/`: `brand.service`, `category.service`,
`subcategory.service`, `health`, `jwt`, `password`, `slug`, `token`.
**No hay `auth.service.test.js`** — hueco de cobertura preexistente, anotado sin
acción en esta fase.

`client/` sigue siendo esqueleto vacío (solo `.gitkeep` y `README.md`).
`server/uploads/` existe y contiene únicamente `.gitkeep`.

---

## 2. A2 · Ramas — ⚠️ dos supuestos falsos

### Inventario

| Rama                        | Commit    | Estado respecto al remoto |
| --------------------------- | --------- | ------------------------- |
| `main`                      | `3c9ec88` | al día                    |
| `develop` (local)           | `3fc828b` | **17 commits por detrás** |
| `origin/develop`            | `8769a5e` | —                         |
| `feature/categories` (HEAD) | `ab1631d` | 5 por delante             |
| `feature/database`          | `f71c05b` | al día                    |
| `feature/auth`              | `182f3d2` | 18 por detrás             |
| `feature/backend`           | `66a5105` | al día                    |
| `feature/tooling`           | `b55e85e` | remoto **eliminado**      |

`git merge-base HEAD origin/develop` → `3fc828b`. `feature/categories` nació de
la estructura inicial y **nunca** incorporó el tooling ni el esquema.

### H-1 · `develop` NO está vacío — supuesto falso

`origin/develop` (`8769a5e`) contiene, vía dos pull requests ya fusionados:

- **PR #1** `feature/tooling`: `package.json` de raíz con workspaces, ESLint flat
  config, Prettier, commitlint, husky + lint-staged, `.github/workflows/ci.yml`,
  `package-lock.json`.
- **PR #2** `feature/database`: **el esquema completo**, migraciones 001–007,
  `schema.sql`, índices, vistas, procedimientos, triggers y seeds.

Los documentos (`IMPLEMENTATION_PLAN.md` §2 P1, `ROADMAP.md`, notas de trabajo)
afirman que `develop` está vacío y que el esquema *solo* vive en
`feature/database`. **Ambas afirmaciones son falsas.** Solo la copia **local** de
`develop` está desactualizada.

**Consecuencia para P1.** La rama de integración ya no se construye uniendo
`feature/database` + `feature/categories`. El punto de partida correcto es
`origin/develop`, que ya trae esquema + tooling + CI; lo que falta allí es el
código de los cuatro módulos y `008_auth.sql`.

### H-2 · El tooling de calidad no opera en esta rama

En `feature/categories` **no existen**: `package.json` de raíz,
`eslint.config.js` de raíz, `.lintstagedrc.json`, `commitlint.config.js`,
`.github/workflows/ci.yml`, ni los hooks `.husky/pre-commit` y
`.husky/commit-msg`.

`core.hooksPath` apunta a `.husky/_` (correcto para husky v9), pero `.husky/`
**no contiene ningún hook propio**: solo el directorio `_` con los envoltorios.
Los hooks se ejecutan y no encuentran nada que ejecutar.

> **Los commits de esta rama no pasan por lint-staged ni por commitlint.** Las
> puertas de calidad son hoy manuales, aunque hoy pasen en verde.

`node_modules/` de la raíz existe con 301 paquetes —incluidos `husky`,
`lint-staged` y `@commitlint`— residuo de un `npm install` hecho cuando la raíz
tenía `package.json`. Está huérfano: sin `package.json` de raíz, `npm run lint`
no existe a ese nivel. Los scripts de calidad viven solo en `server/`.

### Conflictos previsibles al integrar

| Zona                              | Riesgo                                                  |
| --------------------------------- | ------------------------------------------------------- |
| `.prettierrc.json`                | Renombrado a `server/.prettierrc.json` en esta rama; en `develop` sigue en la raíz |
| `eslint.config.js`                | Existe en ambos sitios con configuraciones distintas    |
| `server/package.json`             | Modificado en ambas ramas (nombre y dependencias)       |
| `docs/README.md`, `database/README.md`, `README.md` | Modificados en ambas ramas |
| `docs/database/modelo-de-datos.md`| Presente en `develop`, ausente aquí                     |
| `server/src/config/.gitkeep`      | Renombrado a `server/logs/.gitkeep`                     |

Ninguno afecta a código de dominio: son ficheros de configuración y
documentación. Integración factible, pero no automática.

---

## 3. A3 · Migraciones — ✅ con una observación

### Inventario

| Archivo                              | Rama                 | Tablas |
| ------------------------------------ | -------------------- | ------ |
| `001_ubicaciones.sql`                | `feature/database`   | `paises`, `departamentos`, `ciudades` |
| `002_usuarios.sql`                   | `feature/database`   | `roles`, `permisos`, `rol_permiso`, `usuarios`, `usuario_rol`, `direcciones` |
| `003_productos.sql`                  | `feature/database`   | `marcas`, `categorias`, `subcategorias`, `productos`, `producto_variantes`, `atributos`, `atributo_valores`, `producto_atributos`, `producto_imagenes`, `inventario`, `precio_historial`, `favoritos` |
| `004_administracion.sql`             | `feature/database`   | `cupones`, `configuraciones`, `banners`, `logs`, `auditoria` |
| `005_ventas.sql`                     | `feature/database`   | `estados_pedido`, `metodos_pago`, `carritos`, `carrito_items`, `pedidos`, `detalle_pedido`, `pagos` |
| `006_comunicacion.sql`               | `feature/database`   | `conversaciones`, `conversacion_participantes`, `mensajes`, `tipos_notificacion`, `notificaciones` |
| `007_comunidad.sql`                  | `feature/database`   | `calificaciones`, `comentarios`, `reportes` |
| `008_auth.sql`                       | **solo** `feature/categories` | tres tablas de tokens |

- Numeración **sin huecos ni repeticiones**: 001–008. ✅
- `009`, `010`, `011` **no existen**. ✅
- Orden de aplicación respeta las dependencias de claves foráneas. ✅
- Complementos: `indexes/001_performance_indexes.sql` (14 sentencias),
  `views/001_views.sql` (`vw_productos_activos`, `vw_stock_bajo`,
  `vw_reputacion_vendedor`, `vw_pedidos_resumen`),
  `procedures/001_procedures.sql` (`fn_total_pedido`,
  `sp_recalcular_totales_pedido`, `sp_cambiar_estado_pedido`,
  `sp_registrar_pago`), `triggers/001_triggers.sql` (cuatro triggers),
  `seeds/001_catalogos.sql` y `seeds/002_demo.sql`.

### H-3 · `schema.sql` no incluye `008_auth.sql`

El orquestador aplica 001–007, índices, vistas, procedimientos y triggers, pero
`008_auth.sql` no está referenciado: vive en otra rama. **Al integrar hay que
añadir el `SOURCE migrations/008_auth.sql;`**, o una base creada desde
`schema.sql` no tendrá las tablas de tokens y Auth fallará en ejecución.

Detalle menor: `schema.sql` crea la base con el nombre **`marketplace`**, igual
que `DB_NAME` en `.env.example`. Los documentos hablan de `provepuentec` y de
`provepuentec_test` (decisión G). Ver H-5.

### Observación · seeds de `tipos_notificacion`

`seeds/001_catalogos.sql` siembra cuatro tipos: `nuevo_mensaje`,
`cambio_pedido`, `nueva_calificacion`, `promocion`. Coincide exactamente con
`ARCHITECTURE.md` §6.6: faltan los seis de negociación y envío. Sin ellos, la FK
`ON DELETE RESTRICT` bloquea la primera emisión. Sin discrepancia documental.

También siembra `roles` (`admin`, `vendedor`, `comprador`, `soporte`),
`permisos`, `rol_permiso`, `estados_pedido`, `metodos_pago`, ubicaciones de Perú,
categorías, subcategorías y `configuraciones`.

---

## 4. A4 · Dependencias — ⚠️

| Comprobación                          | Resultado |
| ------------------------------------- | --------- |
| Árbol de `server/node_modules` sano   | ✅ `npm ls --depth=0` sin conflictos |
| Node contra `engines: >=18`           | ✅ v22.15.0 |
| `multer@2.2.0` instalado y **sin uso** | ✅ Confirmado: ninguna importación |
| `uuid@14.0.1` instalado y sin uso      | ✅ Confirmado |
| `package.json` de raíz                 | ✅ **No existe** en esta rama (ver H-2) |
| Husky operativo                        | ❌ **No opera** (ver H-2) |

**Papel de `uuid`.** No es necesario para `pedidos.codigo`: el formato acordado
es `ORD-` + id a seis dígitos, derivado del autoincremento. Queda como
dependencia sin uso, candidata a nombrar archivos subidos en P4 (evita colisiones
y no filtra el nombre original). Si P4 opta por otro esquema, `uuid` debería
retirarse en lugar de quedar como peso muerto.

**Vulnerabilidades.** `npm audit` no se ejecutó: requiere red y no formaba parte
del terreno verificable en este entorno. Queda pendiente, sin bloquear.

---

## 5. A5 · Estructura — ✅

| Comprobación                                        | Resultado |
| --------------------------------------------------- | --------- |
| `server/src` coincide con lo documentado            | ✅        |
| Servicios sin SQL                                    | ✅ Cero coincidencias de `SELECT`/`INSERT`/`UPDATE`/`DELETE`/`pool` en `services/` |
| `database/pool` importado solo por repositorios      | ✅ Siete repositorios + `server.js` (cierre ordenado) |
| Controladores sin lógica de negocio                  | ✅ Solo traducen HTTP y delegan |
| Repositorios como objeto singleton sustituible       | ✅ Objeto literal exportado; las pruebas sustituyen métodos |
| Documentación de módulos en `server/src/docs/`       | ✅        |

**Hallazgo relevante para P2.** Los repositorios llaman a `pool.execute(...)`
directamente: **ningún método acepta conexión**. El contrato
`create(data, conn = pool)` exige tocar los siete existentes cuando participen en
una transacción. Es viable sin fricción porque una conexión del pool expone la
misma interfaz `execute`. Los repositorios usan *named placeholders*
(`:param`) — el helper debe preservar esa configuración al obtener conexión.

**Middlewares presentes:** `authenticate`, `authorize`, `errorHandler`,
`notFound`, `requestLogger`, `validate`. `ownership` (P3) y `upload` (P4) **no
existen**, como preveía el plan.

---

## 6. A6 · Triggers heredados — ⚠️ veredicto estático

**La prueba real exigida por el plan —un `INSERT` en `pedidos` y en
`detalle_pedido` dentro de una transacción— no pudo ejecutarse: no hay MySQL en
este entorno (ver B-1).** Lo que sigue es análisis del DDL contra el esquema, no
observación en ejecución.

| Trigger | Veredicto estático | Fundamento |
| ------- | ------------------ | ---------- |
| `trg_detalle_pedido_descuenta_stock` | **Inocuo** | `UPDATE inventario ... WHERE variante_id = NEW.variante_id`. Sin fila coincidente afecta 0 filas y no falla. `GREATEST(stock - cantidad, 0)` impide violar `chk_inventario_stock (stock >= 0)`. No aborta la transacción |
| `trg_pedidos_incrementa_uso_cupon`   | **Inocuo** | Cuerpo íntegramente bajo `IF NEW.cupon_id IS NOT NULL`. `pedidos.cupon_id` es `NULL`able y la aceptación no usa cupones: el cuerpo nunca se ejecuta |
| `trg_variantes_precio_historial`     | **Inocuo, con efecto colateral esperado** | Inserta en `precio_historial` al cambiar `producto_variantes.precio`. Verificado columna por columna: `usuario_id`, `precio_anterior` y `motivo` son `NULL`ables, `precio_nuevo` viene del `NEW`, `vigente_desde` y `created_at` tienen `DEFAULT`. Las FK a `productos` y `producto_variantes` se satisfacen porque ambas filas existen. **No puede fallar por columna obligatoria ausente** |
| `trg_mensajes_actualiza_conversacion`| **Correcto** | `AFTER INSERT ON mensajes` propaga `NEW.created_at` a `conversaciones.ultimo_mensaje_at`. `mensajes.created_at` tiene `DEFAULT CURRENT_TIMESTAMP`, ya resuelto en `AFTER INSERT`; `conversaciones.ultimo_mensaje_at` es `DATETIME NULL`. Mantiene la marca sin intervención del servicio |

**Consecuencia para Products.** Cada sincronización de precio de la variante por
defecto escribirá una fila en `precio_historial`, con `usuario_id` y `motivo`
nulos y motivo `'Actualización de precio'`. Es trazabilidad gratuita, no un
problema — pero conviene saberlo antes de leer esa tabla.

**Consecuencia para Messages.** El trigger ya mantiene `ultimo_mensaje_at`: el
servicio **no** debe volver a escribirlo. Duplicar la escritura es redundante y
puede divergir.

**Reserva.** El veredicto es sólido pero incompleto. Tres cosas solo se ven en
ejecución: el modo SQL efectivo, la interacción real con `SELECT ... FOR UPDATE`
y el comportamiento bajo transacción. Confirmarlo es tarea de Fase 0, en cuanto
haya una base viva.

---

## 7. A7 · Estado de la base de datos — ⛔ no verificable

### B-1 · No hay base de datos en este entorno

| Comprobación                        | Resultado |
| ----------------------------------- | --------- |
| Puerto 3306 en `127.0.0.1`          | ❌ Cerrado |
| Servicio MySQL/MariaDB en Windows   | ❌ Ninguno registrado |
| Cliente `mysql` en el `PATH`        | ❌ Ausente |
| `server/.env`                       | ❌ **No existe** (solo `.env.example`) |

Ningún punto de A7 pudo verificarse: ni tablas aplicadas, ni datos, ni motor y
colación efectivos, ni seeds aplicados, ni si `pedidos` tiene filas.

**Lo que sí se puede afirmar.** El proyecto arranca sin base de datos y lo hace
de forma controlada: `pool.js` avisa por log y no aborta el proceso; solo fallan
las rutas que consultan datos. Esa tolerancia permitió verificar el arranque y
`/health` sin MySQL.

**Efecto sobre `ALTER pedidos`.** No se puede determinar si `pedidos` tiene
filas. Pero si no hay base aplicada, no hay datos, y la conclusión práctica es
que **`ALTER pedidos` podrá aplicarse en un solo paso**. Debe reconfirmarse
contra el entorno real donde vaya a aplicarse la migración `010`. Hasta
entonces, la secuencia defensiva de `DATABASE_DESIGN.md` §5.1 sigue vigente como
plan B.

---

## 8. Discrepancias y hallazgos

| #   | Hallazgo | Severidad | Efecto |
| --- | -------- | --------- | ------ |
| H-1 | `develop` no está vacío: `origin/develop` ya tiene tooling **y** el esquema 001–007 | **Alta** | Replantea P1 por completo |
| H-2 | El tooling de calidad (raíz, hooks, CI) no existe en `feature/categories`; husky no ejecuta nada | **Alta** | Sin puerta automática de calidad ni de formato de commits |
| H-3 | `schema.sql` no incluye `008_auth.sql` | Media | Una base creada desde el orquestador no soporta Auth |
| H-4 | `develop` local va 17 commits por detrás; `feature/auth` local, 18 | Media | Cualquier trabajo partiendo de la copia local arrancaría del punto equivocado |
| H-5 | Nombre del proyecto inconsistente: docs dicen `PROVEPUENTEC`; el código dice `@ucc-market/server`; la base se llama `marketplace` | Baja | Confusión; afecta al nombre de la base de pruebas de la decisión G |
| H-6 | No existe `auth.service.test.js` | Baja | Hueco de cobertura preexistente en el módulo más sensible |
| H-7 | `node_modules/` de la raíz huérfano, 301 paquetes sin `package.json` que los declare | Baja | Ruido; puede inducir a creer que el tooling de raíz está activo |
| B-1 | Sin MySQL y sin `.env`: A6 real y A7 no verificables | **Bloqueante parcial** | Aplaza la verificación transaccional a la Fase 0 |

---

## 9. Veredicto y condiciones para la Fase 0

**Se puede pasar a la Fase 0.** Ningún hallazgo invalida el plan; H-1 lo
simplifica y H-2 añade trabajo que el plan no contemplaba.

Antes de escribir la primera línea de dominio:

1. **Actualizar las copias locales** de `develop` y `feature/auth` (H-4).
   Requiere `git pull` — autorización explícita pendiente (`CLAUDE.md`).
2. **Replantear P1** partiendo de `origin/develop` (H-1), no de
   `feature/database`. Requiere autorización.
3. **Recuperar el tooling** en la rama de integración: `package.json` de raíz,
   hooks de husky, commitlint, lint-staged y CI (H-2).
4. **Añadir `008_auth.sql` a `schema.sql`** al integrar (H-3).
5. **Levantar MySQL y crear `server/.env`** desde `.env.example`. Sin esto,
   ni A6 real ni A7 ni `withTransaction` son verificables (B-1).
6. **Cerrar H-5**: fijar un solo nombre de proyecto y de base de datos.

Los criterios de aceptación de la Fase 0 que dependen de una base viva
—`withTransaction` confirma y revierte, libera conexión con el pool al límite, y
el veredicto de A6 en ejecución— **no pueden darse por cumplidos hasta el
punto 5.**

---

## 10. Decisiones que la auditoría permite cerrar o precisar

| # | Estado tras la auditoría |
| - | ------------------------ |
| **E** · política de imágenes | Sin cerrar, pero sin obstáculos: `multer@2.2.0` instalado y sin uso, `server/uploads/` existe y está vacío, `uuid` disponible para nombrar archivos. La propuesta por defecto (local, 5 MB, jpg/png/webp) es aplicable tal cual |
| **F** y **G** · pruebas de integración | Refuerza aprobarlas. A6 y A7 quedaron sin verificar precisamente por no haber base de datos; el mismo entorno que resuelve B-1 habilita `provepuentec_test`. Si se aprueba G, fijar el nombre conforme a H-5 |
| **A**, **B**, **C**, **D** | Sin datos nuevos. Siguen abiertas con sus propuestas por defecto |

---

## 11. Cómo se verificó

Todo contra el repositorio y el entorno, nunca contra la documentación:

- Ramas y ancestros: `git branch -avv`, `git merge-base`,
  `git merge-base --is-ancestor`, `git diff --name-status origin/develop HEAD`
- Migraciones y triggers: `git show <rama>:<archivo>`, leyendo el DDL columna por
  columna en las tablas que los triggers tocan
- Arquitectura: búsqueda de SQL en `services/`, de `database/pool` en todo
  `src/`, lectura de controladores y repositorios
- Tooling: `git config --get core.hooksPath`, listado de `.husky/`, búsqueda de
  `package.json` en la raíz
- Entorno: `node -v`, `npm -v`, `npm ls --depth=0`, `Test-NetConnection` a 3306,
  `Get-Service`
- Puertas de calidad: `npm run lint`, `npm run format:check`, `npm test`
- Arranque: `node src/server.js` con petición real a `/health` y a
  `/api/brands`

---

## Documentos relacionados

| Documento                    | Relación                                       |
| ---------------------------- | ---------------------------------------------- |
| `docs/IMPLEMENTATION_PLAN.md`| Define esta fase; §2 P1 corregido por H-1       |
| `docs/DATABASE_DESIGN.md`    | Referencia del DDL verificado en A3 y A6        |
| `docs/ARCHITECTURE.md`       | Referencia de §5.7 y §6.6 contrastada en A3     |
| `docs/ROADMAP.md`            | Actualizado con los hallazgos                   |
