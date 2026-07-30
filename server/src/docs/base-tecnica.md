# Base técnica (Fase 0)

Infraestructura compartida por todos los módulos de dominio. No expone
endpoints: son piezas que los servicios, repositorios y rutas reutilizan.

Corresponde a los prerrequisitos **P2 a P5** de `docs/IMPLEMENTATION_PLAN.md`.

| Pieza                | Archivo                        |
| -------------------- | ------------------------------ |
| Helper transaccional | `src/database/transaction.js`  |
| Middleware ownership | `src/middlewares/ownership.js` |
| Middleware upload    | `src/middlewares/upload.js`    |
| Utilidades de subida | `src/utils/uploads.js`         |
| Constantes de estado | `src/constants/*Status.js`     |

---

## 1. Helper transaccional

```js
const { withTransaction, executor } = require('../database/transaction');

await withTransaction(async (conn) => {
  const pedidoId = await orderRepository.create(datos, conn);
  await shipmentRepository.create({ pedidoId }, conn);
  return pedidoId;
});
```

Garantías:

- Confirma (`COMMIT`) si el callback termina sin error y devuelve su resultado.
- Revierte (`ROLLBACK`) y **propaga el error original** si falla. Si el propio
  `ROLLBACK` falla, se registra en el log y se sigue propagando el error de
  negocio, no el del rollback.
- **Libera siempre** la conexión, incluso si falla el `COMMIT`.
- **No anida.** Si ya hay una transacción activa, reutiliza su conexión sin
  abrir otra: MySQL no soporta transacciones anidadas.

La conexión activa viaja por `AsyncLocalStorage`, así que no hace falta
encadenarla manualmente por toda la pila de llamadas.

### Repositorios que participan en una transacción

Aceptan la conexión como último parámetro opcional:

```js
async create(data, conn) {
  const [result] = await executor(conn).execute(`INSERT ...`, data);
  return result.insertId;
}
```

`executor(conn)` resuelve, en este orden: la conexión explícita, la de la
transacción activa, y en su defecto el pool. Los siete repositorios existentes
usan `pool.execute` directamente; se les añadirá el parámetro cuando participen
en una transacción.

### Reglas

- Ninguna llamada de red (correo, push, HTTP) dentro de un bloque transaccional:
  el despacho externo ocurre **después** del `COMMIT`.
- Las notificaciones se **registran** dentro de la transacción; se **despachan**
  fuera.

---

## 2. Middleware `ownership`

Autoriza por **propiedad** o **participación** sobre un recurso concreto.
Complementa a `authorize`, que decide por rol. Va siempre después de
`authenticate`.

```js
const { authenticate, ownership } = require('../middlewares');

router.patch(
  '/:id',
  authenticate,
  ownership((req) => productRepository.findById(req.params.id), {
    owners: ['vendedor_id'],
    as: 'product',
    notFoundMessage: 'Producto no encontrado',
  }),
  asyncHandler(controller.update)
);
```

| Opción            | Por defecto               | Descripción                                 |
| ----------------- | ------------------------- | ------------------------------------------- |
| `owners`          | `['usuario_id']`          | Campos del recurso con ids autorizados.     |
| `as`              | `'resource'`              | Clave de `req` donde se adjunta el recurso. |
| `notFoundMessage` | `'Recurso no encontrado'` | Mensaje del 404.                            |

Respuestas: `401` sin autenticar · `404` si el recurso no existe · `403` si el
usuario no figura en ninguno de los campos de `owners`. El recurso cargado queda
en `req[as]` para que el controlador no repita la consulta.

Para participación se listan varios campos:
`owners: ['comprador_id', 'vendedor_id']`.

---

## 3. Middleware `upload`

Política (decisión E del plan): almacenamiento **local** en `server/uploads`,
**5 MB** por archivo y formatos **jpg / png / webp**. Todo configurable por
entorno.

```js
const { authenticate, upload } = require('../middlewares');

router.post('/:id/images', authenticate, upload.array('imagenes'), handler);
router.post('/avatar', authenticate, upload.single('avatar'), handler);
```

| Variable                    | Por defecto                       |
| --------------------------- | --------------------------------- |
| `UPLOAD_DIR`                | `server/uploads`                  |
| `UPLOAD_PUBLIC_PATH`        | `/uploads`                        |
| `UPLOAD_MAX_SIZE_MB`        | `5`                               |
| `UPLOAD_MAX_FILES`          | `8`                               |
| `UPLOAD_ALLOWED_MIME_TYPES` | `image/jpeg,image/png,image/webp` |

- **Nomenclatura:** `randomUUID()` más la extensión derivada del **tipo MIME**,
  nunca del nombre enviado por el cliente.
- **Errores:** los de `multer` se traducen a `ValidationError` → **422**, con el
  mismo formato que el resto de validaciones.
- **Servicio de archivos:** `app.js` los publica como estáticos en
  `UPLOAD_PUBLIC_PATH`; un archivo inexistente cae en el 404 global.
- **Borrado en cascada:** al eliminar la fila que referencia el archivo hay que
  llamar a `removeUpload(url)` de `utils/uploads`. Un archivo ausente no es un
  error.

`utils/uploads` expone además `publicUrl(filename)` —lo que se guarda en la
BD— y `filenameFromUrl(url)`, su inverso.

---

## 4. Constantes de estado

Ningún literal de estado disperso por los servicios.

| Archivo                          | Exporta                                                                                                                           | Origen                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `constants/productStatus.js`     | `PRODUCT_STATUS`, `DEFAULT_PRODUCT_STATUS`, `PUBLIC_PRODUCT_STATUSES`, `ASSIGNABLE_PRODUCT_STATUSES`                              | ENUM `productos.estado`                |
| `constants/negotiationStatus.js` | `NEGOTIATION_STATUS`, `DEFAULT_NEGOTIATION_STATUS`, `TERMINAL_NEGOTIATION_STATUSES`                                               | ENUM `negociaciones.estado`            |
| `constants/offerStatus.js`       | `OFFER_STATUS`, `DEFAULT_OFFER_STATUS`, `TERMINAL_OFFER_STATUSES`, `OFFER_TYPE`                                                   | ENUM `ofertas.estado` y `ofertas.tipo` |
| `constants/shipmentStatus.js`    | `SHIPMENT_STATUS`, `DEFAULT_SHIPMENT_STATUS`, `FINAL_SHIPMENT_STATUSES`, `PRE_DISPATCH_SHIPMENT_STATUSES`, `SHIPMENT_TRANSITIONS` | Catálogo `estados_envio`               |
| `constants/orderStatus.js`       | `ORDER_STATUS`, `DEFAULT_ORDER_STATUS`, `ORDER_CODE_PREFIX`                                                                       | Catálogo `estados_pedido`              |
| `constants/notificationTypes.js` | `NOTIFICATION_TYPE`, `NOTIFICATION_TYPES`                                                                                         | Catálogo `tipos_notificacion`          |

`SHIPMENT_TRANSITIONS` es la topología del flujo —avance lineal de un paso más
`cancelado` desde cualquier estado no final—. La **máquina de estados** que la
aplica vive en `shipment.service.js`, no en el controlador ni en SQL.

De `estados_pedido` solo se usan `pendiente`, `entregado` y `cancelado`. El
catálogo conserva `pagado` y `reembolsado`, que no se eliminan.

---

## 5. Pruebas

| Archivo                     | Cubre                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `tests/transaction.test.js` | Commit, rollback, propagación del error, liberación de la conexión, no anidamiento, `executor` |
| `tests/ownership.test.js`   | 401, 404, 403, propiedad, participación, recurso adjuntado                                     |
| `tests/upload.test.js`      | Formatos admitidos y rechazados, límites, traducción de errores, nombres y URLs                |

Sustituyen el singleton correspondiente (`pool`, cargador del recurso) sin tocar
MySQL ni escribir en disco, siguiendo el patrón del resto de la suite.

**Limitación reconocida:** estas pruebas verifican que el helper _llama_ a
`beginTransaction`, `commit` y `rollback` en el orden correcto, no que MySQL
_revierta_ de verdad. La verificación efectiva del `ROLLBACK`, de la
concurrencia y de las claves foráneas exige una base de datos de pruebas
(decisión G del plan) y sigue pendiente.
