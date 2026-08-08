# ARQUITECTURA · PROVEPUENTEC

Documento de arquitectura para la adaptación del proyecto al modelo de
**marketplace con negociación**. Describe el estado real del código, qué se
reutiliza, qué cambia, qué se crea, el flujo completo, el modelo de datos, los
endpoints REST y los riesgos.

Estado: **propuesta aprobada, pendiente de implementación.**

---

## 1. Contexto y hallazgo principal

El esquema de base de datos existente modela un **e-commerce clásico de carrito
y pago**: `carritos`, `cupones`, `pagos`, `inventario`, `producto_variantes`,
estados de pedido `pagado` / `reembolsado`.

Las reglas de negocio vigentes (`docs/BUSINESS_RULES.md`) describen algo
distinto: un **marketplace de negociación 1-a-1**, donde el precio y el envío se
acuerdan entre comprador y vendedor antes de que exista un pedido.

No existen tablas de `negociaciones`, `ofertas`, `envios` ni seguimiento. Esa
brecha es el núcleo de esta adaptación.

La capa de aplicación (`server/src`) es **reutilizable casi en su totalidad**.
Lo que cambia es el dominio, no la arquitectura por capas.

---

## 2. Estado real del código

Verificado sobre la rama `feature/categories`.

| Módulo        | ROADMAP       | Estado real                                                                                          |
| ------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| Auth          | Terminado     | **Completo** — register, login, refresh con rotación, logout, me, cambio/recuperación de contraseña, verificación de correo |
| Users         | Terminado     | **Parcial** — solo `user.repository.js` y `user.model.js`, consumidos por Auth. Faltan service, controller, routes, validators |
| Roles         | Terminado     | **Sin módulo** — existe la constante `constants/roles.js` y las tablas sembradas, pero no hay capa HTTP |
| Categories    | Terminado     | **Completo**, con soft delete y restore                                                                 |
| Subcategories | Terminado     | **Completo**                                                                                            |
| Brands        | Terminado     | **Completo**                                                                                            |
| Products      | En desarrollo | **No iniciado**                                                                                         |

Las tablas `permisos` y `rol_permiso` están sembradas pero sin uso: la
autorización real se resuelve por roles en `middlewares/authorize.js`.

### 2.1 Distribución por ramas

| Rama                 | Contenido                                                                       |
| -------------------- | ------------------------------------------------------------------------------- |
| `main`               | base                                                                              |
| `develop`            | vacío, sin integración                                                            |
| `feature/tooling`    | husky, eslint, prettier                                                           |
| `feature/backend`    | esqueleto Express: app, pool, errores, middlewares base, health                   |
| `feature/database`   | **todo el esquema SQL**: migraciones 001–007, índices, vistas, procedures, triggers, seeds |
| `feature/auth`       | módulo Auth                                                                       |
| `feature/categories` | rama de trabajo actual: auth + categories + subcategories + brands + `008_auth.sql` |

En la rama actual, `database/migrations/` contiene únicamente `008_auth.sql`.
Las migraciones 001–007 viven solo en `feature/database`.

**Decisión tomada (7):** el merge a `develop` queda **aplazado**. El trabajo se
realiza sobre una **rama de integración** que reúna el esquema de
`feature/database` con el código de `feature/categories`, de modo que las tablas
necesarias estén disponibles para implementar los módulos nuevos. `develop` solo
recibirá el trabajo cuando la arquitectura esté estable y validada.

La rama de integración es, por tanto, un prerrequisito operativo: sin ella
ningún módulo nuevo puede ejecutarse contra la base de datos.

---

## 3. Decisiones de arquitectura aprobadas

| #   | Decisión                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------- |
| 1   | **Precio y envío se negocian en la misma negociación.** Cada oferta lleva monto, método de envío y costo de envío. El pedido solo se crea cuando ambos están acordados. |
| 2   | **Variante por defecto autogenerada.** Al crear un producto se crea una única variante interna, de modo que las FK heredadas (`detalle_pedido`, `inventario`) siguen siendo válidas sin cambios destructivos. La API expone el precio de forma plana. |
| 3   | **Se aprueban las alteraciones a `pedidos`:** `+ vendedor_id`, `+ negociacion_id`, y `direccion_id` pasa a admitir `NULL`. |
| 4   | **Cualquier usuario puede vender.** Publicar productos no exige el rol `vendedor`. La autorización de escritura sobre un producto es por **propiedad**, no por rol. |
| 5   | **Las tablas fuera de alcance se mantienen intactas.** No se eliminan ni se marcan como obsoletas. Simplemente no se exponen por API. |
| 6   | **Autorización solo por roles.** No se implementan permisos granulares en esta etapa; `permisos` y `rol_permiso` quedan dormidos. |
| 7   | **Sin merge a `develop` por ahora.** El trabajo se realiza sobre una **rama de integración** que contenga las tablas necesarias para implementar los módulos nuevos. El merge a `develop` se hará únicamente cuando la arquitectura esté estable y validada. |
| 8   | **El helper transaccional es prerrequisito oficial del proyecto.** Debe implementarse **antes** del módulo Negotiations y será reutilizado por Orders y Shipments para garantizar atomicidad. |
| 9   | **Toda negociación conserva un historial completo de mensajes** entre comprador y vendedor. El chat permanece asociado a la negociación incluso después de crear el pedido. |
| 10  | **Toda operación crítica se ejecuta dentro de una única transacción**: aceptar oferta, crear pedido, crear envío, actualizar estados y **registrar** notificaciones. Dentro de la transacción solo se escribe la fila en `notificaciones`; el **despacho externo** (correo, push, cualquier integración de terceros) se ejecuta **después del `COMMIT`**, en un servicio independiente. |

---

## 4. Clasificación de módulos

### 4.1 Permanecen igual

Se reutilizan sin modificación:

- `app.js`, `server.js`, `config/env.js`
- `errors/` — `AppError` y los seis errores HTTP
- `middlewares/` — `authenticate`, `authorize`, `validate`, `errorHandler`, `notFound`, `requestLogger`
- `utils/` — `asyncHandler`, `jwt`, `logger`, `mailer`, `password`, `slug`, `token`
- `constants/` — `httpStatus`, `roles`, `tokens`
- **Auth** — sin cambios
- **Categories, Subcategories, Brands** — además, su estructura de siete archivos es la plantilla obligatoria para todo módulo nuevo

### 4.2 Requieren modificación

| Elemento               | Cambio                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Users**              | Completar service, controller, routes, validators y tests. Añadir perfil público de vendedor con reputación y gestión de direcciones |
| **Roles**              | Módulo de solo lectura más asignación de roles por administrador                                                |
| `routes/index.js`      | Registrar los routers nuevos                                                                                    |
| `database/pool.js`     | Añadir helper transaccional (`database/transaction.js`). **Prerrequisito oficial (decisión 8):** hoy solo se expone `pool.execute`, y las operaciones críticas tocan varias tablas que deben confirmarse o revertirse en bloque |
| `conversaciones`       | Alteración aditiva para vincular el chat a la negociación (decisión 9, ver §6.3)                                |
| `middlewares/`         | Añadir `ownership` (verificación de propiedad y de participación) y `upload` (multer ya está instalado y sin usar) |
| `server/package.json`  | El nombre y la descripción dicen "UCC Market" en lugar de PROVEPUENTEC                                          |

### 4.3 Módulos nuevos

En orden de dependencias:

1. **products** — productos e imágenes
2. **notifications** — primero como service interno, luego capa HTTP
3. **addresses** y **locations** — requeridos antes de aceptar una oferta con
   envío a domicilio
4. **negotiations** — negociaciones y ofertas
5. **messages** — chat de la negociación (decisión 9)
6. **orders**
7. **shipments** — envíos y seguimiento
8. **reviews** — calificaciones
9. **favorites**
10. **reports** y **admin dashboard**

Antes de cualquiera de ellos debe existir el **helper transaccional**
(decisión 8). El orden definitivo, con criterios de aceptación, está en
`docs/IMPLEMENTATION_PLAN.md`.

---

## 5. Flujo completo del marketplace

### 5.1 Publicación

Cualquier usuario autenticado crea un producto en estado `borrador`, sube
imágenes y lo publica pasándolo a `activo`. No se requiere rol `vendedor`
(decisión 4). Al crear el producto se genera automáticamente su variante por
defecto (decisión 2).

### 5.2 Descubrimiento

El comprador busca y filtra el catálogo público, y puede marcar productos como
favoritos.

### 5.3 Negociación

El comprador abre una negociación enviando una **oferta** sobre un producto.
Cada oferta contiene:

- monto propuesto
- método de envío propuesto
- costo de envío propuesto
- mensaje opcional

Condiciones de apertura:

- el producto debe estar `activo`
- el comprador no puede ser el vendedor — *un usuario no puede comprar sus propios productos*
- el producto no puede estar `vendido` — *un producto vendido ya no acepta ofertas*
- solo puede existir una negociación abierta por par (producto, comprador)

El vendedor responde con **aceptar**, **rechazar** o **contraoferta**. Una
contraoferta devuelve el turno al comprador, que a su vez puede aceptar,
rechazar o volver a contraofertar. El turno se controla explícitamente: solo
puede emitir una oferta quien no emitió la última.

El historial es **inmutable**. Las ofertas nunca se borran ni se editan; solo
cambia su campo `estado`:

```
pendiente → aceptada | rechazada | superada | expirada
```

Cada turno genera una notificación a la contraparte.

### 5.3.1 Chat de la negociación

Al abrirse una negociación se crea automáticamente su **conversación asociada**,
con comprador y vendedor como participantes. Ambos pueden intercambiar mensajes
en cualquier momento del ciclo de vida.

- El chat es **independiente del estado de la negociación**: sigue disponible
  después de aceptar la oferta, durante el envío y tras la entrega.
- Los mensajes son **append-only**: no se editan ni se eliminan.
- El chat es el canal para coordinar detalles del envío que no caben en los
  campos estructurados de la oferta.

Se reutilizan las tablas existentes `conversaciones`,
`conversacion_participantes` y `mensajes`; solo se añade el vínculo con la
negociación (§6.3).

### 5.4 Aceptación

Al aceptar una oferta se ejecuta una **única transacción atómica** (decisión 10):

1. bloquear el producto con `SELECT ... FOR UPDATE` y verificar que sigue `activo`
2. marcar la oferta como `aceptada` y la negociación como `aceptada`
3. crear el **pedido** con comprador, vendedor, monto, costo de envío y total
4. crear el **envío** en estado `pendiente` con el método y costo acordados
5. marcar el producto como `vendido`
6. marcar como `superadas` las demás ofertas y cerrar las otras negociaciones abiertas sobre ese producto
7. emitir notificaciones de *oferta aceptada* y *pedido creado* a ambas partes

Si cualquier paso falla, se revierte todo. La conversación de la negociación
**no se cierra ni se archiva**: sigue vinculada y activa (decisión 9).

Esta regla de atomicidad no es exclusiva de la aceptación. Toda operación
crítica se ejecuta bajo el mismo helper transaccional:

| Operación                     | Tablas implicadas                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| Abrir negociación             | `negociaciones`, `ofertas`, `conversaciones`, `conversacion_participantes`, `notificaciones` |
| Emitir contraoferta           | `ofertas` (nueva + `superada` de la anterior), `negociaciones`, `notificaciones`         |
| Rechazar oferta               | `ofertas`, `negociaciones`, `notificaciones`                                             |
| **Aceptar oferta**            | `productos`, `ofertas`, `negociaciones`, `pedidos`, `detalle_pedido`, `envios`, `envio_historial`, `notificaciones` |
| Actualizar estado del envío   | `envios`, `envio_historial`, `notificaciones`                                            |
| Cancelar pedido               | `pedidos`, `envios`, `envio_historial`, `productos`, `notificaciones`                    |
| Registrar calificación        | `calificaciones`, `notificaciones`                                                       |

#### Notificaciones: registro dentro, despacho fuera

La decisión 10 separa dos cosas que suelen confundirse:

| Etapa                  | Cuándo                  | Qué hace                                    |
| ---------------------- | ----------------------- | -------------------------------------------- |
| **Registro**           | dentro de la transacción | `INSERT` en `notificaciones`                 |
| **Despacho**           | después del `COMMIT`     | correo, push, integraciones de terceros      |

El registro va dentro porque si la operación se revierte no debe quedar rastro
de una notificación sobre un hecho que nunca sucedió.

El despacho va fuera por tres razones:

1. **Es irreversible.** Un correo enviado no se recupera con un `ROLLBACK`. Si
   se envía dentro y la transacción falla después, se ha comunicado un hecho
   falso.
2. **Es lento.** Una llamada de red dentro de la transacción mantiene el bloqueo
   sobre `productos` durante cientos de milisegundos, o segundos si el
   proveedor responde mal.
3. **Es frágil.** Un fallo del proveedor de correo revertiría una venta
   perfectamente válida.

Responsabilidades:

- `notification.service.emit(tipo, usuarioId, data, conn)` — **solo escribe la
  fila**. Participa en la transacción del llamador.
- `notification.dispatcher` — servicio independiente que lee las notificaciones
  registradas y las despacha por los canales externos. Se invoca **después** del
  `COMMIT`, y su fallo se registra en el log sin afectar a la operación
  confirmada.

Corolario: **ninguna llamada de red, envío de correo ni escritura de archivos
dentro de un bloque transaccional.**

### 5.5 Envío y seguimiento

El vendedor actualiza el estado del envío siguiendo la máquina de estados:

```
pendiente → preparando → enviado → en_transito → entregado
```

`cancelado` es alcanzable desde cualquier estado no final. No se permiten
retrocesos ni saltos hacia adelante. Cada cambio escribe una fila en el
historial de seguimiento y notifica al comprador.

### 5.6 Calificación

El comprador puede calificar únicamente cuando el envío está `entregado`. Un
pedido admite una sola calificación.

### 5.7 Notificaciones

Ocho eventos generan notificación:

| Evento                        | Destinatario | Tipo                 | Origen                |
| ----------------------------- | ------------ | -------------------- | --------------------- |
| Nueva oferta                  | vendedor     | `nueva_oferta`       | `BUSINESS_RULES`      |
| Nueva contraoferta            | contraparte  | `nueva_contraoferta` | `BUSINESS_RULES`      |
| Oferta aceptada               | contraparte  | `oferta_aceptada`    | `BUSINESS_RULES`      |
| Pedido creado                 | ambos        | `pedido_creado`      | `BUSINESS_RULES`      |
| Cambio de estado del envío    | comprador    | `envio_actualizado`  | `BUSINESS_RULES`      |
| Oferta rechazada              | contraparte  | `oferta_rechazada`   | regla derivada        |
| Nuevo mensaje en el chat      | contraparte  | `nuevo_mensaje`      | regla derivada (dec. 9) |
| Nueva calificación            | vendedor     | `nueva_calificacion` | regla derivada        |

Los dos últimos tipos ya existen sembrados; los seis primeros requieren seeds
nuevos (`DATABASE_DESIGN.md` §14.3).

### 5.8 Diagrama resumido

```
publicar producto (cualquier usuario)
        │
        ▼
  buscar / favoritos
        │
        ▼
  OFERTA  ──►  contraoferta ──►  contraoferta ──►  ...
  (monto + método envío + costo envío)
        │
        ├──  chat de la negociación (append-only, siempre disponible)
        │
        ▼  aceptar
  ┌──────────── transacción ────────────┐
  │ pedido + envío + producto vendido   │
  │ + cierre de ofertas + notificaciones│
  └─────────────────────────────────────┘
        │
        ▼
  pendiente → preparando → enviado → en_transito → entregado
        │                                              │
        └── historial de seguimiento ──────────────────┘
                                                       │
                                                       ▼
                                                 calificación
```

---

## 6. Modelo de datos

### 6.1 Se reutiliza sin cambios

`usuarios`, `roles`, `permisos`, `rol_permiso`, `usuario_rol`, `direcciones`,
`paises`, `departamentos`, `ciudades`, `marcas`, `categorias`, `subcategorias`,
`productos`, `producto_imagenes`, `producto_variantes`, `favoritos`,
`notificaciones`, `tipos_notificacion`, `conversacion_participantes`,
`mensajes`, `calificaciones`, `reportes`, `auditoria`, `logs`,
`configuraciones`, `banners`, y las tres tablas de tokens de `008_auth.sql`.

`conversaciones` también se reutiliza, pero requiere una alteración aditiva para
vincularse a la negociación (§6.3).

`productos.estado` ya incluye `'vendido'`, de modo que la regla *un producto
vendido no acepta ofertas* no requiere cambios de esquema.

### 6.2 Tablas nuevas

Seis tablas, todas introducidas mediante migraciones **aditivas**. El reparto
por archivo de migración y el detalle completo de columnas, índices y
restricciones están en `docs/DATABASE_DESIGN.md`, que es la referencia oficial
del modelo de datos. Lo que sigue es el resumen.

```
metodos_envio
  id, clave, nombre, descripcion, requiere_direccion, activo,
  created_at, updated_at
  UNIQUE (clave)
  seed: acuerdo_directo, recojo_en_persona, encomienda, courier

estados_envio
  id, clave, nombre, orden, es_final, activo, created_at, updated_at
  UNIQUE (clave)
  seed: pendiente(1), preparando(2), enviado(3),
        en_transito(4), entregado(5, final), cancelado(6, final)

negociaciones
  id
  producto_id              FK productos
  comprador_id             FK usuarios
  vendedor_id              FK usuarios
  estado                   ENUM('abierta','aceptada','rechazada','cancelada','expirada')
  oferta_aceptada_id       FK ofertas NULL
  ultimo_turno_usuario_id  FK usuarios
  created_at, updated_at
  UNIQUE (producto_id, comprador_id)

ofertas
  id
  negociacion_id   FK negociaciones
  emisor_id        FK usuarios
  tipo             ENUM('oferta','contraoferta')
  monto            DECIMAL(12,2)
  metodo_envio_id  FK metodos_envio NULL
  costo_envio      DECIMAL(12,2) DEFAULT 0.00
  mensaje          VARCHAR(500) NULL
  estado           ENUM('pendiente','aceptada','rechazada','superada','expirada')
  expira_at        DATETIME NULL
  created_at
  -- sin updated_at, sin deleted_at, sin DELETE: historial inmutable

envios
  id
  pedido_id        FK pedidos  UNIQUE
  metodo_envio_id  FK metodos_envio
  estado_envio_id  FK estados_envio
  direccion_id     FK direcciones NULL
  costo            DECIMAL(12,2)
  transportista    VARCHAR(120) NULL
  tracking_codigo  VARCHAR(120) NULL
  entregado_at     DATETIME NULL
  created_at, updated_at

envio_historial
  id
  envio_id         FK envios
  estado_envio_id  FK estados_envio
  usuario_id       FK usuarios NULL
  nota             VARCHAR(255) NULL
  created_at
  -- append-only: constituye el seguimiento
```

Todas las tablas siguen la convención del esquema existente: `BIGINT UNSIGNED`
autoincremental, InnoDB, `utf8mb4` / `utf8mb4_unicode_ci`, nombres de
restricción `fk_*` / `uq_*` / `idx_*`.

### 6.3 Alteraciones aprobadas a tablas existentes

#### `pedidos`

```sql
ALTER TABLE pedidos
  ADD COLUMN vendedor_id    BIGINT UNSIGNED NOT NULL AFTER comprador_id,
  ADD COLUMN negociacion_id BIGINT UNSIGNED NULL     AFTER vendedor_id,
  MODIFY COLUMN direccion_id BIGINT UNSIGNED NULL;
```

Con sus restricciones:

- `fk_pedidos_vendedor` → `usuarios (id)` `ON DELETE RESTRICT`
- `fk_pedidos_negociacion` → `negociaciones (id)` `ON DELETE SET NULL`
- `uq_pedidos_negociacion (negociacion_id)` — una negociación genera como máximo un pedido

Justificación por regla de negocio:

| Cambio                     | Regla                                            |
| -------------------------- | ------------------------------------------------ |
| `vendedor_id`              | *Cada pedido tiene un vendedor.* Hoy el vendedor solo existe en `detalle_pedido` |
| `negociacion_id` único     | *Solo una oferta aceptada genera un pedido*      |
| `direccion_id` nullable    | *Comprador y vendedor acuerdan el envío* — un acuerdo directo puede no requerir dirección registrada |

#### `conversaciones`

Para dar soporte al chat de la negociación (decisión 9) sin crear tablas de
mensajería paralelas:

```sql
ALTER TABLE conversaciones
  ADD COLUMN negociacion_id BIGINT UNSIGNED NULL AFTER producto_id;
```

Con `fk_conversaciones_negociacion` → `negociaciones (id)` `ON DELETE CASCADE` y
`uq_conversaciones_negociacion (negociacion_id)`: una negociación tiene como
máximo una conversación.

La columna es nullable porque `conversaciones.producto_id` ya permite
conversaciones sueltas de consulta sobre un producto, sin negociación abierta.
Esa vía queda disponible sin quedar dentro del alcance actual.

### 6.4 Variante por defecto

`detalle_pedido.variante_id` e `inventario.variante_id` son `NOT NULL`. Para no
tocar esas restricciones (decisión 2), al crear un producto se inserta
automáticamente una fila en `producto_variantes` con el precio del producto y
`activo = 1`.

Consecuencias:

- todas las FK heredadas siguen siendo válidas, sin cambios destructivos
- la API **no expone variantes**: el precio viaja plano en el recurso producto
- la sincronización de precio producto ↔ variante por defecto vive en
  `product.service.js` y es invisible desde fuera

### 6.5 Tablas fuera del alcance actual

Se mantienen **intactas** y sin exponer por API (decisión 5):

| Tabla                                                   | Motivo                                            |
| ------------------------------------------------------- | ------------------------------------------------- |
| `carritos`, `carrito_items`                             | No hay carrito: se compra vía oferta aceptada     |
| `cupones`                                               | No aparece en las reglas de negocio               |
| `pagos`, `metodos_pago`                                 | El pago no está en el alcance actual              |
| `inventario`                                            | Productos 1-a-1, sin gestión de stock             |
| `atributos`, `atributo_valores`, `producto_atributos`   | Sobre-modelado para el alcance actual             |
| `precio_historial`                                      | Útil, pero secundario                             |
| `comentarios`                                           | Fuera de las reglas y del ROADMAP                 |

### 6.6 Seeds adicionales

`tipos_notificacion` tiene FK `ON DELETE RESTRICT` y solo cuatro tipos
sembrados. Se añaden:

```
nueva_oferta
nueva_contraoferta
oferta_aceptada
oferta_rechazada
pedido_creado
envio_actualizado
```

Sobre `estados_pedido`: sus valores `pagado` y `reembolsado` no encajan con el
flujo. El estado operativo real vive en `envios.estado_envio_id`;
`pedidos.estado_id` se reduce al ciclo `pendiente → entregado | cancelado`. Los
estados sobrantes **no se eliminan** del catálogo.

---

## 7. Estructura de módulos

Cada módulo replica el patrón ya establecido por Brands: modelo, repositorio,
servicio, controlador, validadores, rutas, prueba y documentación.

```
server/src/
├── models/         product · productImage · negotiation · offer · order
│                   shipment · shipmentEvent · conversation · message
│                   review · favorite · notification · address · location
├── repositories/   product · productImage · negotiation · offer · order
│                   shipment · shipmentEvent · conversation · message
│                   review · favorite · notification · address · location · role
├── services/       product · negotiation · message · order · shipment
│                   review · favorite · notification · user · address
│                   location · role
├── controllers/    uno por servicio expuesto
├── validators/     uno por controlador
├── routes/         uno por controlador
├── middlewares/    + ownership.js   + upload.js
├── constants/      + offerStatus.js · shipmentStatus.js
│                   + notificationTypes.js · productStatus.js
├── database/       pool.js  + transaction.js      ← prerrequisito (decisión 8)
├── docs/           products · negotiations · messages · orders · shipments
│                   reviews · favorites · notifications · users
└── tests/          *.service.test.js
```

### 7.1 Reglas de disciplina

- La **máquina de estados del envío** vive en `shipment.service.js`. Nunca en el
  controlador ni en SQL.
- La **aceptación de oferta** vive en `negotiation.service.js` y orquesta
  pedido, envío, producto y notificaciones dentro de una sola transacción.
- `notification.service.js` expone `emit(tipo, usuarioId, data, conn)` para
  consumo interno de los demás servicios. La dependencia es unidireccional.
  Solo registra en base de datos; no despacha por canales externos.
- `notification.dispatcher` se invoca **después** del `COMMIT`, nunca dentro de
  la transacción. Su fallo no revierte nada.
- Los repositorios se mantienen como **objetos singleton con métodos**: las
  pruebas actuales los sustituyen por reemplazo de métodos y ese patrón debe
  conservarse.
- Los métodos de repositorio que participen en transacciones aceptan una
  conexión opcional: `create(data, conn = pool)`. Esta firma es **obligatoria**
  en todo repositorio que intervenga en las operaciones críticas de §5.4.
- Ningún servicio abre transacciones por su cuenta: todas pasan por
  `database/transaction.js`. Las transacciones **no se anidan**; el servicio que
  inicia la operación es el único que abre y confirma.
- `message.service.js` no participa en la transacción de aceptación: el chat es
  independiente del ciclo de vida de la oferta.
- La autorización de escritura sobre productos, negociaciones, pedidos y envíos
  se resuelve por **propiedad o participación**, no por rol (decisión 4).

---

## 8. Endpoints REST

Base: `/api`. Las colecciones devuelven `{ data, pagination }`; los recursos
individuales, `{ recurso }`. Métodos permitidos: `GET`, `POST`, `PATCH`,
`DELETE`.

### 8.1 Products

```
GET    /products                       público    q, categoriaId, subcategoriaId,
                                                  marcaId, condicion, precioMin,
                                                  precioMax, vendedorId, orden
GET    /products/slug/:slug            público
GET    /products/:id                   público
GET    /products/me                    auth       mis publicaciones, incluye borradores
POST   /products                       auth       cualquier usuario puede publicar
PATCH  /products/:id                   dueño
PATCH  /products/:id/status            dueño      publicar / pausar
DELETE /products/:id                   dueño | admin    soft delete
POST   /products/:id/images            dueño      multipart
PATCH  /products/:id/images/:imageId   dueño      orden / principal
DELETE /products/:id/images/:imageId   dueño
```

### 8.2 Negotiations y Offers

```
POST   /products/:id/offers                       auth           abre negociación + primera oferta
GET    /negotiations                              auth           ?rol=comprador|vendedor &estado=
GET    /negotiations/:id                          participante   incluye historial de ofertas
POST   /negotiations/:id/offers                   participante   contraoferta, solo si es su turno
PATCH  /negotiations/:id/offers/:offerId/accept   participante   genera el pedido
PATCH  /negotiations/:id/offers/:offerId/reject   participante
PATCH  /negotiations/:id/cancel                   participante
```

No existe `DELETE` en este módulo: el historial nunca se elimina.

### 8.3 Messages — chat de la negociación

```
GET    /negotiations/:id/messages       participante   paginado, orden cronológico
POST   /negotiations/:id/messages       participante   { contenido }
PATCH  /negotiations/:id/messages/read  participante   marca como leídos
```

Disponible en **cualquier** estado de la negociación, incluida `aceptada`
(decisión 9). Sin `PATCH` de contenido ni `DELETE`: los mensajes son
append-only.

### 8.4 Orders

```
GET    /orders               auth           ?rol=comprador|vendedor
GET    /orders/:id           participante
GET    /orders/code/:codigo  participante
PATCH  /orders/:id/cancel    participante   solo si el envío no ha salido
```

No existe `POST /orders`: un pedido solo nace de una oferta aceptada.

### 8.5 Shipments y Tracking

```
GET    /orders/:id/shipment           participante
PATCH  /orders/:id/shipment           vendedor       transportista, tracking, dirección
PATCH  /orders/:id/shipment/status    vendedor       transición validada + notificación
GET    /orders/:id/shipment/tracking  participante   historial completo
GET    /shipping-methods              público        catálogo
GET    /shipment-statuses             público        catálogo
```

### 8.6 Reviews

```
POST   /orders/:id/review     comprador   solo si el envío está entregado
GET    /products/:id/reviews  público
GET    /users/:id/reviews     público     reputación del vendedor
PATCH  /reviews/:id           autor       ventana de edición limitada
```

### 8.7 Favorites

```
GET    /favorites             auth
POST   /favorites             auth   { productoId }
DELETE /favorites/:productId  auth
```

### 8.8 Notifications

```
GET    /notifications               auth   ?soloNoLeidas=true
GET    /notifications/unread-count  auth
PATCH  /notifications/:id/read      auth
PATCH  /notifications/read-all      auth
```

### 8.9 Users, Addresses, Roles y Locations

```
GET    /users/me                  auth
PATCH  /users/me                  auth
GET    /users/:id                 público   perfil público del vendedor
GET    /users/me/addresses        auth
POST   /users/me/addresses        auth
PATCH  /users/me/addresses/:id    auth
DELETE /users/me/addresses/:id    auth

GET    /users                     admin
PATCH  /users/:id/status          admin     activo / suspendido
PATCH  /users/:id/roles           admin

GET    /roles                     admin
GET    /countries                 público
GET    /departments?paisId=       público
GET    /cities?departamentoId=    público
```

### 8.10 Reports y Admin

```
POST   /reports        auth             denunciar producto, usuario o mensaje
GET    /reports        admin | soporte
PATCH  /reports/:id    admin | soporte
GET    /admin/metrics  admin
```

---

## 9. Riesgos técnicos y dependencias

### 9.1 Bloqueantes

**Rama de integración pendiente.** El esquema vive en `feature/database` y el
código en `feature/categories`. Por decisión 7 no se hace merge a `develop`,
pero sí se requiere una rama de integración que reúna ambos: sin ella los
módulos nuevos se escribirían contra tablas ausentes y el sistema no podría
ejecutarse contra la base de datos. Es el primer paso de la implementación.

**Helper transaccional ausente.** `database/pool.js` solo expone `pool.execute`.
Por decisión 8 esto pasa de riesgo a **prerrequisito oficial**: debe existir
antes del módulo Negotiations, y Orders y Shipments lo reutilizan. Sin él, un
fallo intermedio deja un producto vendido sin pedido, o un pedido sin envío.

### 9.2 Altos

**Condición de carrera en la aceptación.** Dos compradores con ofertas
pendientes sobre el mismo producto pueden aceptar de forma simultánea.
Mitigación: `SELECT ... FOR UPDATE` sobre `productos` al inicio de la
transacción y verificación del estado dentro del bloqueo.

**Triggers heredados.** `trg_detalle_pedido_descuenta_stock` se dispara al
insertar en `detalle_pedido`, y `trg_pedidos_incrementa_uso_cupon` al insertar
en `pedidos`. Con `inventario` vacío y `cupon_id` nulo ambos deberían ser
inocuos, pero debe **verificarse explícitamente** antes de crear el primer
pedido: un trigger que falla aborta la transacción completa. El riesgo crece con
la decisión 10: al ejecutarse todo en una sola transacción, un trigger
defectuoso revierte la operación completa en lugar de fallar de forma aislada.

**Duración de las transacciones.** La transacción de aceptación mantiene un
bloqueo sobre `productos` mientras escribe en ocho tablas. Debe mantenerse
corta: nada de llamadas de red, envío de correo ni escritura de archivos dentro
del bloque. El despacho de notificaciones externas ocurre después del `COMMIT`
(§5.4).

### 9.3 Medios

**Estrategia de pruebas.** `npm test` usa `node --test` con sustitución de
métodos de repositorio; no hay `supertest` ni base de datos de pruebas. Las
transiciones de estado y las reglas de negocio son verificables a nivel de
servicio, pero la integridad transaccional real quedará sin cobertura. Conviene
evaluar pruebas de integración con una base dedicada.

**Subida de imágenes sin implementar.** `multer` figura en `package.json` sin
uso y `server/uploads/` está vacío. Falta decidir almacenamiento local frente a
externo, límites de tamaño, formatos admitidos y borrado en cascada al eliminar
un producto.

**`calificaciones` asume pedidos multiproducto** — `UNIQUE (pedido_id,
producto_id, autor_id)`. En el nuevo flujo un pedido tiene un solo producto, así
que la restricción es más laxa de lo necesario, pero no es incorrecta y no
requiere cambio.

**Deuda conceptual de la variante por defecto.** La decisión 2 evita cambios
destructivos a costa de mantener una entidad que el dominio ya no necesita.
Aceptado de forma deliberada.

**Límite de peticiones global** de 100 cada 15 minutos. Puede estrangular el
sondeo de notificaciones desde el frontend; conviene evaluar límites por ruta.

**Duplicación conceptual de estados** entre `estados_pedido` y `estados_envio`.
Se reduce con la propuesta de §6.6, pero no desaparece.

**Crecimiento del chat.** `mensajes` es append-only y sin purga (decisión 9).
Requiere índice por `(conversacion_id, created_at)` y paginación obligatoria en
la lectura. No se contempla borrado ni archivado.

### 9.4 Bajos

- `server/package.json` identifica el proyecto como "UCC Market".
- Las vistas `vw_stock_bajo` y `vw_pedidos_resumen` asumen inventario y pagos, y
  quedarán obsoletas.
- `permisos` y `rol_permiso` permanecen sembrados y sin uso (decisión 6).

### 9.5 Grafo de dependencias

```
rama de integración (esquema + código)
  │
  └── helper transaccional          ← prerrequisito oficial (decisión 8)
        │
        └── products ──┬── favorites
                       ├── notifications (service interno)
                       └── negotiations ──┬── messages (chat)
                                          │
                                          └── orders ── shipments ── reviews
                                                            │
addresses + locations ──────────────────────────────────────┘

users / roles   → transversales, no bloquean
reports / admin → al final
```

Ruta crítica:
`rama de integración → transacciones → products → negotiations → orders → shipments → reviews`.

`notifications` debe existir como servicio **antes** de `negotiations`, porque
participa en su transacción. `messages` depende de `negotiations` pero no la
bloquea: puede construirse en paralelo con `orders`.

Prerrequisitos técnicos transversales, en este orden:

1. rama de integración con el esquema completo
2. **helper transaccional** en `database/transaction.js` (decisión 8)
3. middleware `ownership`
4. middleware `upload`
5. constantes de estados (`offerStatus`, `shipmentStatus`, `productStatus`,
   `notificationTypes`)

---

## 10. Alcance explícitamente excluido

No forman parte de esta etapa:

- pagos y pasarelas de pago
- carrito de compras
- cupones y descuentos
- gestión de inventario y stock
- variantes de producto expuestas por API
- permisos granulares
- **mensajería en tiempo real** (WebSocket / SSE). El chat de la negociación
  (decisión 9) se implementa sobre HTTP con sondeo; el transporte en tiempo real
  queda fuera de esta etapa
- conversaciones de soporte y conversaciones sueltas sobre un producto sin
  negociación abierta: el esquema lo permite, el alcance actual no lo incluye

---

## 11. Trazabilidad con las reglas de negocio

| Regla (`docs/BUSINESS_RULES.md`)                | Dónde se aplica                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| Un usuario no puede comprar sus propios productos | `negotiation.service.js`, al abrir la negociación                             |
| Un producto vendido ya no acepta ofertas          | `negotiation.service.js` + `productos.estado = 'vendido'`                     |
| Todo producto pertenece a categoría y subcategoría | `productos.subcategoria_id NOT NULL` → resuelve la categoría por JOIN         |
| Un producto puede pertenecer a una marca          | `productos.marca_id NULL`                                                     |
| El comprador puede hacer ofertas                  | `POST /products/:id/offers`                                                   |
| El vendedor puede aceptar, rechazar o contraofertar | `PATCH .../accept`, `PATCH .../reject`, `POST /negotiations/:id/offers`      |
| El historial nunca debe eliminarse                | `ofertas` sin `DELETE` ni edición; solo cambia `estado`. `mensajes` append-only, conservado tras crear el pedido (decisión 9) |
| Solo una oferta aceptada genera un pedido         | `uq_pedidos_negociacion` + transacción de aceptación                          |
| Cada pedido tiene un comprador y un vendedor      | `pedidos.comprador_id`, `pedidos.vendedor_id`                                 |
| Comprador y vendedor acuerdan el envío            | Método y costo de envío viajan en cada oferta (decisión 1)                    |
| El vendedor actualiza el estado del envío         | `PATCH /orders/:id/shipment/status`, restringido al vendedor                  |
| Estados de envío definidos                        | Catálogo `estados_envio` con los seis estados                                 |
| Calificaciones solo cuando el pedido esté entregado | `review.service.js` valida `estado_envio = entregado`                       |
| Notificaciones en los cinco eventos indicados     | `notification.service.emit(...)` **registra** la fila dentro de la transacción; el despacho externo ocurre tras el `COMMIT` (decisión 10). El sistema emite ocho eventos en total: ver §5.7 |

---

## 12. Documentos relacionados

| Documento                   | Contenido                                                        |
| --------------------------- | ---------------------------------------------------------------- |
| `docs/BUSINESS_RULES.md`    | Reglas de negocio — fuente de verdad funcional                    |
| `docs/ROADMAP.md`           | Estado y orden de los módulos                                     |
| `docs/DATABASE_DESIGN.md`   | **Referencia oficial del modelo de datos y de toda migración futura** |
| `CLAUDE.md`                 | Convenciones de arquitectura, calidad y trabajo                   |
