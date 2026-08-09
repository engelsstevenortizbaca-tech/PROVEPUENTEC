# DISEÑO DE BASE DE DATOS · PROVEPUENTEC

**Referencia oficial del modelo de datos.** Toda migración futura y todo
desarrollo de backend debe ajustarse a este documento.

Motor: MySQL 8 · InnoDB · `utf8mb4` / `utf8mb4_unicode_ci`
Convenciones heredadas del esquema existente: claves `BIGINT UNSIGNED`
autoincrementales, restricciones nombradas `fk_*` / `uq_*` / `idx_*`,
marcas de tiempo `created_at` / `updated_at`, borrado lógico mediante
`deleted_at` donde aplica.

Estado: **diseño aprobado, sin migraciones generadas.**

---

## Índice

1. [Alcance y principios](#1-alcance-y-principios)
2. [Diagrama entidad-relación](#2-diagrama-entidad-relación)
3. [Tablas existentes reutilizadas](#3-tablas-existentes-reutilizadas)
4. [Tablas nuevas](#4-tablas-nuevas)
5. [Alteraciones a tablas existentes](#5-alteraciones-a-tablas-existentes)
6. [Relaciones entre tablas](#6-relaciones-entre-tablas)
7. [Claves primarias](#7-claves-primarias)
8. [Claves foráneas](#8-claves-foráneas)
9. [Índices recomendados](#9-índices-recomendados)
10. [Restricciones de integridad](#10-restricciones-de-integridad)
11. [Justificación de cada tabla nueva](#11-justificación-de-cada-tabla-nueva)
12. [Flujo de creación de datos](#12-flujo-de-creación-de-datos)
13. [Dependencias entre módulos y base de datos](#13-dependencias-entre-módulos-y-base-de-datos)
14. [Datos de catálogo requeridos](#14-datos-de-catálogo-requeridos)
15. [Reglas para futuras migraciones](#15-reglas-para-futuras-migraciones)

---

## 1. Alcance y principios

### 1.1 Principios rectores

1. **Aditivo antes que destructivo.** No se elimina ninguna tabla ni columna. Lo
   que queda fuera de alcance permanece intacto y sin exponer.
2. **El historial es inmutable.** Ofertas y mensajes son *append-only*: solo
   cambia el campo `estado` de una oferta, nunca su contenido.
3. **Integridad en la base, reglas en el servicio.** La base garantiza la
   integridad referencial y la unicidad; las reglas de negocio (turnos,
   transiciones de estado, propiedad) viven en los servicios.
4. **Atomicidad obligatoria.** Toda operación crítica se ejecuta en una única
   transacción.
5. **Compatibilidad con lo construido.** Las FK heredadas siguen siendo válidas
   sin modificarlas.

### 1.2 Fuera de alcance

Estas tablas **se conservan intactas** y no se exponen por API:

`carritos`, `carrito_items`, `cupones`, `pagos`, `metodos_pago`, `inventario`,
`atributos`, `atributo_valores`, `producto_atributos`, `precio_historial`,
`comentarios`.

---

## 2. Diagrama entidad-relación

### 2.1 Núcleo del marketplace de negociación

```
                          ┌──────────────┐
                          │   usuarios   │
                          └──────┬───────┘
              ┌──────────────────┼──────────────────┐
              │ vendedor         │ comprador        │ emisor
              │                  │                  │
       ┌──────▼──────┐    ┌──────▼────────┐         │
       │  productos  │◄───┤ negociaciones ├─────────┤
       └──────┬──────┘ 1:N└───────┬───────┘         │
              │                   │ 1:N             │
              │            ┌──────▼──────┐          │
              │            │   ofertas   ├──────────┘
              │            └──────┬──────┘
              │                   │ oferta aceptada
              │                   │ (1:1)
              │            ┌──────▼──────┐
              │            │   pedidos   │
              │            └──────┬──────┘
              │             1:1   │   1:N
              │        ┌──────────┴────────────┐
              │        │                       │
              │  ┌─────▼─────┐         ┌───────▼────────┐
              │  │  envios   │         │ detalle_pedido │
              │  └─────┬─────┘         └───────┬────────┘
              │        │ 1:N                   │
              │  ┌─────▼───────────┐           │
              │  │ envio_historial │           │
              │  └─────────────────┘           │
              │                                │
              └────────────────────────────────┘
                     producto ─ variante

       ┌───────────────┐        ┌──────────────────┐
       │ metodos_envio │        │  estados_envio   │
       └───────┬───────┘        └────────┬─────────┘
               │ referenciado por         │ referenciado por
        ofertas y envios            envios y envio_historial
```

### 2.2 Chat de la negociación

```
┌───────────────┐  1:1   ┌────────────────┐  1:N   ┌──────────┐
│ negociaciones ├───────►│ conversaciones ├───────►│ mensajes │
└───────────────┘        └───────┬────────┘        └────┬─────┘
                                 │ 1:N                  │ emisor
                    ┌────────────▼───────────────┐      │
                    │ conversacion_participantes │◄─────┘
                    └────────────────────────────┘
                                 │
                            usuarios
```

### 2.3 Cierre del ciclo

```
   pedidos ──1:1──► calificaciones ──► usuarios (autor y vendedor)
                            │
                            └────────► productos

   usuarios ──1:N──► favoritos ──N:1──► productos

   usuarios ──1:N──► notificaciones ──N:1──► tipos_notificacion
```

### 2.4 Taxonomía y ubicaciones (sin cambios)

```
categorias ──1:N──► subcategorias ──1:N──► productos ──N:1──► marcas
                                               │
                                               ├──1:N──► producto_imagenes
                                               └──1:N──► producto_variantes

paises ──1:N──► departamentos ──1:N──► ciudades ──1:N──► direcciones
                                                              │
                                                          usuarios
```

---

## 3. Tablas existentes reutilizadas

### 3.1 Sin ninguna modificación

| Tabla                        | Rol en el nuevo modelo                                        |
| ---------------------------- | ------------------------------------------------------------- |
| `usuarios`                   | Actor único: cualquier usuario compra y vende (decisión 4)     |
| `roles`, `usuario_rol`       | Autorización por roles (decisión 6)                            |
| `permisos`, `rol_permiso`    | Sembradas y **dormidas**; no se consultan en esta etapa        |
| `refresh_tokens`             | Sesiones (módulo Auth)                                         |
| `password_reset_tokens`      | Recuperación de contraseña                                     |
| `email_verification_tokens`  | Verificación de correo                                         |
| `paises`, `departamentos`, `ciudades` | Jerarquía geográfica para direcciones                 |
| `direcciones`                | Destino de envío cuando el método lo requiere                  |
| `categorias`, `subcategorias`| Taxonomía obligatoria del producto                             |
| `marcas`                     | Marca opcional del producto                                    |
| `productos`                  | Entidad negociada. `estado` ya incluye `'vendido'`             |
| `producto_imagenes`          | Galería del producto                                           |
| `producto_variantes`         | **Variante por defecto autogenerada** (decisión 2)             |
| `detalle_pedido`             | Una única línea por pedido en el nuevo flujo                   |
| `favoritos`                  | Lista de deseos                                                |
| `calificaciones`             | Reseña posterior a la entrega                                  |
| `conversacion_participantes` | Comprador y vendedor de la negociación                         |
| `mensajes`                   | Chat append-only (decisión 9)                                  |
| `notificaciones`             | Bandeja del usuario                                            |
| `tipos_notificacion`         | Catálogo de tipos; requiere seeds nuevos (§14)                 |
| `reportes`                   | Denuncias de contenido                                         |
| `auditoria`, `logs`          | Trazabilidad                                                   |
| `configuraciones`, `banners` | Administración                                                 |
| `estados_pedido`             | Ciclo simplificado; el estado operativo vive en `envios`       |

### 3.2 Notas de reutilización relevantes

**`productos.estado`** — `ENUM('borrador','activo','pausado','vendido','eliminado')`.
La regla *un producto vendido ya no acepta ofertas* se resuelve leyendo este
campo. No requiere columna nueva.

**`producto_variantes`** — `detalle_pedido.variante_id` e `inventario.variante_id`
son `NOT NULL`. Al crear un producto se inserta automáticamente **una** variante
con el precio del producto y `activo = 1`. Así ninguna FK heredada se rompe y la
API nunca expone el concepto de variante. La sincronización de precio
producto ↔ variante vive en `product.service.js`.

**`detalle_pedido`** — se mantiene aunque cada pedido tenga una sola línea. No
introducirla obligaría a alterar FK existentes y a perder `vw_pedidos_resumen`.

**`calificaciones`** — su `UNIQUE (pedido_id, producto_id, autor_id)` fue
diseñado para pedidos multiproducto. En el nuevo flujo es más laxo de lo
necesario, pero es correcto: no requiere cambio.

**`estados_pedido`** — sus valores `pagado` y `reembolsado` no se usan. El estado
operativo real vive en `envios.estado_envio_id`. Los registros sobrantes **no se
eliminan**.

---

## 4. Tablas nuevas

Seis tablas. Todas se introducen en una migración **aditiva**.

### 4.1 `metodos_envio`

Catálogo de formas de envío acordables.

| Columna      | Tipo             | Nulo | Notas                          |
| ------------ | ---------------- | ---- | ------------------------------ |
| `id`         | BIGINT UNSIGNED  | NO   | PK, AUTO_INCREMENT             |
| `clave`      | VARCHAR(40)      | NO   | Identificador técnico, único   |
| `nombre`     | VARCHAR(80)      | NO   |                                |
| `descripcion`| VARCHAR(255)     | SÍ   |                                |
| `requiere_direccion` | TINYINT(1) | NO | DEFAULT 1. `0` en acuerdo directo y recojo en persona |
| `activo`     | TINYINT(1)       | NO   | DEFAULT 1                      |
| `created_at` | DATETIME         | NO   | DEFAULT CURRENT_TIMESTAMP      |
| `updated_at` | DATETIME         | NO   | ON UPDATE CURRENT_TIMESTAMP    |

### 4.2 `estados_envio`

Catálogo de los seis estados definidos en las reglas de negocio.

| Columna      | Tipo             | Nulo | Notas                                    |
| ------------ | ---------------- | ---- | ---------------------------------------- |
| `id`         | BIGINT UNSIGNED  | NO   | PK, AUTO_INCREMENT                       |
| `clave`      | VARCHAR(40)      | NO   | Identificador técnico, único             |
| `nombre`     | VARCHAR(80)      | NO   | Etiqueta visible                         |
| `orden`      | INT              | NO   | DEFAULT 0. Posición en el flujo          |
| `es_final`   | TINYINT(1)       | NO   | DEFAULT 0. `1` en entregado y cancelado  |
| `activo`     | TINYINT(1)       | NO   | DEFAULT 1                                |
| `created_at` | DATETIME         | NO   |                                          |
| `updated_at` | DATETIME         | NO   |                                          |

### 4.3 `negociaciones`

Contenedor de una negociación entre un comprador y un vendedor sobre un producto.

| Columna                   | Tipo             | Nulo | Notas                                              |
| ------------------------- | ---------------- | ---- | -------------------------------------------------- |
| `id`                      | BIGINT UNSIGNED  | NO   | PK, AUTO_INCREMENT                                 |
| `producto_id`             | BIGINT UNSIGNED  | NO   | FK `productos`                                     |
| `comprador_id`            | BIGINT UNSIGNED  | NO   | FK `usuarios`                                      |
| `vendedor_id`             | BIGINT UNSIGNED  | NO   | FK `usuarios`. Desnormalizado desde `productos.vendedor_id` |
| `estado`                  | ENUM             | NO   | `abierta`, `aceptada`, `rechazada`, `cancelada`, `expirada`. DEFAULT `abierta` |
| `oferta_aceptada_id`      | BIGINT UNSIGNED  | SÍ   | FK `ofertas`. Se rellena al aceptar                |
| `ultimo_turno_usuario_id` | BIGINT UNSIGNED  | NO   | FK `usuarios`. Quién emitió la última oferta       |
| `created_at`              | DATETIME         | NO   |                                                    |
| `updated_at`              | DATETIME         | NO   |                                                    |

`vendedor_id` está desnormalizado deliberadamente: permite listar «mis
negociaciones como vendedor» sin unir con `productos`, y congela quién era el
vendedor en el momento de negociar.

### 4.4 `ofertas`

Cada turno de la negociación. **Inmutable salvo el campo `estado`.**

| Columna           | Tipo             | Nulo | Notas                                                    |
| ----------------- | ---------------- | ---- | -------------------------------------------------------- |
| `id`              | BIGINT UNSIGNED  | NO   | PK, AUTO_INCREMENT                                       |
| `negociacion_id`  | BIGINT UNSIGNED  | NO   | FK `negociaciones`                                       |
| `emisor_id`       | BIGINT UNSIGNED  | NO   | FK `usuarios`                                            |
| `tipo`            | ENUM             | NO   | `oferta`, `contraoferta`                                 |
| `monto`           | DECIMAL(12,2)    | NO   | Precio propuesto del producto                            |
| `metodo_envio_id` | BIGINT UNSIGNED  | SÍ   | FK `metodos_envio`. Método propuesto                     |
| `costo_envio`     | DECIMAL(12,2)    | NO   | DEFAULT 0.00                                             |
| `mensaje`         | VARCHAR(500)     | SÍ   | Nota breve adjunta a la oferta                           |
| `estado`          | ENUM             | NO   | `pendiente`, `aceptada`, `rechazada`, `superada`, `expirada`. DEFAULT `pendiente` |
| `expira_at`       | DATETIME         | SÍ   | Vencimiento opcional                                     |
| `created_at`      | DATETIME         | NO   |                                                          |

**Sin `updated_at`. Sin `deleted_at`. Sin `DELETE`.** El único cambio admitido
es la transición de `estado`, y solo hacia un valor terminal.

Monto y envío viajan juntos en la misma fila: es la materialización de la
decisión 1 — precio y envío se acuerdan en el mismo acto.

### 4.5 `envios`

Un envío por pedido. Concentra el acuerdo logístico y el estado operativo.

| Columna           | Tipo             | Nulo | Notas                                                 |
| ----------------- | ---------------- | ---- | ----------------------------------------------------- |
| `id`              | BIGINT UNSIGNED  | NO   | PK, AUTO_INCREMENT                                    |
| `pedido_id`       | BIGINT UNSIGNED  | NO   | FK `pedidos`, **único**                               |
| `metodo_envio_id` | BIGINT UNSIGNED  | NO   | FK `metodos_envio`. Copiado de la oferta aceptada     |
| `estado_envio_id` | BIGINT UNSIGNED  | NO   | FK `estados_envio`. Arranca en `pendiente`            |
| `direccion_id`    | BIGINT UNSIGNED  | SÍ   | FK `direcciones`. Nulo si el método no la requiere    |
| `costo`           | DECIMAL(12,2)    | NO   | DEFAULT 0.00. Copiado de la oferta aceptada           |
| `transportista`   | VARCHAR(120)     | SÍ   | Informado por el vendedor                             |
| `tracking_codigo` | VARCHAR(120)     | SÍ   | Guía de seguimiento externa                           |
| `entregado_at`    | DATETIME         | SÍ   | Se sella al pasar a `entregado`. Habilita calificar   |
| `created_at`      | DATETIME         | NO   |                                                       |
| `updated_at`      | DATETIME         | NO   |                                                       |

`entregado_at` es redundante con el historial, pero evita una subconsulta en
cada validación de calificación.

### 4.6 `envio_historial`

Seguimiento (*tracking*). Append-only.

| Columna           | Tipo             | Nulo | Notas                                          |
| ----------------- | ---------------- | ---- | ---------------------------------------------- |
| `id`              | BIGINT UNSIGNED  | NO   | PK, AUTO_INCREMENT                             |
| `envio_id`        | BIGINT UNSIGNED  | NO   | FK `envios`                                    |
| `estado_envio_id` | BIGINT UNSIGNED  | NO   | FK `estados_envio`                             |
| `usuario_id`      | BIGINT UNSIGNED  | SÍ   | FK `usuarios`. Nulo si lo genera el sistema    |
| `nota`            | VARCHAR(255)     | SÍ   | Comentario del vendedor                        |
| `created_at`      | DATETIME         | NO   |                                                |

Se inserta una fila **en cada** transición, incluida la inicial a `pendiente`.
El estado actual de `envios` siempre coincide con la fila más reciente.

---

## 5. Alteraciones a tablas existentes

Dos tablas. Ambas alteraciones son **aditivas** salvo el relajamiento de una
restricción `NOT NULL`, que nunca invalida datos existentes.

### 5.1 `pedidos` (decisión 3)

```sql
ALTER TABLE pedidos
  ADD COLUMN vendedor_id    BIGINT UNSIGNED NOT NULL AFTER comprador_id,
  ADD COLUMN negociacion_id BIGINT UNSIGNED NULL     AFTER vendedor_id,
  MODIFY COLUMN direccion_id BIGINT UNSIGNED NULL;
```

| Cambio                    | Regla de negocio que lo exige                                          |
| ------------------------- | ---------------------------------------------------------------------- |
| `+ vendedor_id`           | *Cada pedido tiene un vendedor.* Hoy solo existe en `detalle_pedido`   |
| `+ negociacion_id` único  | *Solo una oferta aceptada genera un pedido*                            |
| `direccion_id` → nullable | *Comprador y vendedor acuerdan el envío*: un acuerdo directo o un recojo en persona no requiere dirección registrada |

Restricciones asociadas:

- `fk_pedidos_vendedor` → `usuarios (id)` `ON DELETE RESTRICT ON UPDATE CASCADE`
- `fk_pedidos_negociacion` → `negociaciones (id)` `ON DELETE SET NULL ON UPDATE CASCADE`
- `uq_pedidos_negociacion (negociacion_id)`

> **Nota de despliegue.** Si existen pedidos previos, `vendedor_id` no puede
> añadirse como `NOT NULL` en un solo paso. Secuencia correcta: añadir nullable
> → rellenar desde `detalle_pedido.vendedor_id` → aplicar `NOT NULL` → crear la
> FK. En una base vacía la alteración es directa.

### 5.2 `conversaciones` (decisión 9)

```sql
ALTER TABLE conversaciones
  ADD COLUMN negociacion_id BIGINT UNSIGNED NULL AFTER producto_id;
```

- `fk_conversaciones_negociacion` → `negociaciones (id)` `ON DELETE CASCADE ON UPDATE CASCADE`
- `uq_conversaciones_negociacion (negociacion_id)`

Nullable porque `conversaciones.producto_id` ya admite conversaciones de
consulta sin negociación. Esa vía queda disponible en el esquema aunque el
alcance actual no la use.

Esta alteración evita crear tablas de mensajería paralelas: el chat de la
negociación reutiliza `conversaciones`, `conversacion_participantes` y
`mensajes`.

---

## 6. Relaciones entre tablas

### 6.1 Cardinalidades del núcleo

| Origen             | Cardinalidad | Destino          | Regla                                              |
| ------------------ | ------------ | ---------------- | -------------------------------------------------- |
| `usuarios`         | 1:N          | `productos`      | Un usuario publica muchos productos                |
| `productos`        | 1:N          | `negociaciones`  | Varios compradores negocian el mismo producto      |
| `usuarios`         | 1:N          | `negociaciones`  | Como comprador y como vendedor                     |
| `negociaciones`    | 1:N          | `ofertas`        | Turnos sucesivos                                   |
| `negociaciones`    | 1:1          | `pedidos`        | Como máximo un pedido por negociación              |
| `negociaciones`    | 1:1          | `conversaciones` | Un chat por negociación                            |
| `ofertas`          | 1:1          | `negociaciones`  | Vía `oferta_aceptada_id`, la oferta ganadora       |
| `pedidos`          | 1:1          | `envios`         | Un envío por pedido                                |
| `pedidos`          | 1:N          | `detalle_pedido` | En el nuevo flujo, siempre una sola línea          |
| `envios`           | 1:N          | `envio_historial`| Una fila por transición                            |
| `pedidos`          | 1:N          | `calificaciones` | En la práctica, una sola                           |
| `conversaciones`   | 1:N          | `mensajes`       | Chat append-only                                   |
| `conversaciones`   | 1:N          | `conversacion_participantes` | Comprador y vendedor              |
| `metodos_envio`    | 1:N          | `ofertas`        | Método propuesto en cada oferta                    |
| `metodos_envio`    | 1:N          | `envios`         | Método finalmente acordado                         |
| `estados_envio`    | 1:N          | `envios`         | Estado actual                                      |
| `estados_envio`    | 1:N          | `envio_historial`| Estado en cada transición                          |

### 6.2 Cadena de propagación del acuerdo

El acuerdo alcanzado en la negociación se **copia**, no se referencia, hacia el
pedido y el envío:

```
oferta aceptada
  ├── monto           ──► pedidos.subtotal        y detalle_pedido.precio_unitario
  ├── costo_envio     ──► pedidos.envio           y envios.costo
  ├── metodo_envio_id ──► envios.metodo_envio_id
  └── (monto + envío) ──► pedidos.total
```

Es una desnormalización intencional: el pedido debe conservar las condiciones
exactas del acuerdo, con independencia de lo que ocurra después con el catálogo
de métodos de envío o con la negociación.

---

## 7. Claves primarias

Todas las tablas nuevas usan clave primaria **sustituta**, simple y
autoincremental:

| Tabla              | PK   | Tipo                             |
| ------------------ | ---- | -------------------------------- |
| `metodos_envio`    | `id` | BIGINT UNSIGNED AUTO_INCREMENT   |
| `estados_envio`    | `id` | BIGINT UNSIGNED AUTO_INCREMENT   |
| `negociaciones`    | `id` | BIGINT UNSIGNED AUTO_INCREMENT   |
| `ofertas`          | `id` | BIGINT UNSIGNED AUTO_INCREMENT   |
| `envios`           | `id` | BIGINT UNSIGNED AUTO_INCREMENT   |
| `envio_historial`  | `id` | BIGINT UNSIGNED AUTO_INCREMENT   |

Criterio: coherencia con el esquema existente y con InnoDB, donde una PK
monotónica reduce la fragmentación del índice agrupado. No se usan claves
compuestas como PK en tablas nuevas; la unicidad de negocio se expresa mediante
restricciones `UNIQUE` explícitas (§10).

---

## 8. Claves foráneas

### 8.1 Tablas nuevas

| Restricción                        | Columna → Destino                          | ON DELETE | ON UPDATE |
| ---------------------------------- | ------------------------------------------ | --------- | --------- |
| `fk_negociaciones_producto`        | `negociaciones.producto_id` → `productos.id` | CASCADE   | CASCADE   |
| `fk_negociaciones_comprador`       | `negociaciones.comprador_id` → `usuarios.id` | CASCADE   | CASCADE   |
| `fk_negociaciones_vendedor`        | `negociaciones.vendedor_id` → `usuarios.id`  | CASCADE   | CASCADE   |
| `fk_negociaciones_oferta_aceptada` | `negociaciones.oferta_aceptada_id` → `ofertas.id` | SET NULL | CASCADE |
| `fk_negociaciones_turno`           | `negociaciones.ultimo_turno_usuario_id` → `usuarios.id` | CASCADE | CASCADE |
| `fk_ofertas_negociacion`           | `ofertas.negociacion_id` → `negociaciones.id` | CASCADE  | CASCADE   |
| `fk_ofertas_emisor`                | `ofertas.emisor_id` → `usuarios.id`         | CASCADE   | CASCADE   |
| `fk_ofertas_metodo_envio`          | `ofertas.metodo_envio_id` → `metodos_envio.id` | RESTRICT | CASCADE  |
| `fk_envios_pedido`                 | `envios.pedido_id` → `pedidos.id`           | CASCADE   | CASCADE   |
| `fk_envios_metodo`                 | `envios.metodo_envio_id` → `metodos_envio.id` | RESTRICT | CASCADE  |
| `fk_envios_estado`                 | `envios.estado_envio_id` → `estados_envio.id` | RESTRICT | CASCADE  |
| `fk_envios_direccion`              | `envios.direccion_id` → `direcciones.id`    | RESTRICT  | CASCADE   |
| `fk_envio_hist_envio`              | `envio_historial.envio_id` → `envios.id`    | CASCADE   | CASCADE   |
| `fk_envio_hist_estado`             | `envio_historial.estado_envio_id` → `estados_envio.id` | RESTRICT | CASCADE |
| `fk_envio_hist_usuario`            | `envio_historial.usuario_id` → `usuarios.id` | SET NULL  | CASCADE   |

### 8.2 Tablas alteradas

| Restricción                     | Columna → Destino                          | ON DELETE | ON UPDATE |
| ------------------------------- | ------------------------------------------ | --------- | --------- |
| `fk_pedidos_vendedor`           | `pedidos.vendedor_id` → `usuarios.id`      | RESTRICT  | CASCADE   |
| `fk_pedidos_negociacion`        | `pedidos.negociacion_id` → `negociaciones.id` | SET NULL | CASCADE  |
| `fk_conversaciones_negociacion` | `conversaciones.negociacion_id` → `negociaciones.id` | CASCADE | CASCADE |

### 8.3 Criterio de las acciones referenciales

| Acción       | Cuándo se usa                                                                  |
| ------------ | ------------------------------------------------------------------------------ |
| **CASCADE**  | El registro hijo no tiene sentido sin el padre: ofertas sin negociación, historial sin envío, chat sin negociación |
| **RESTRICT** | Protege datos de catálogo y contables: no se borra un método de envío en uso, ni un usuario con pedidos |
| **SET NULL** | La referencia es informativa y su pérdida no invalida el registro: autor de un evento de seguimiento, vínculo del pedido con la negociación |

Nótese la asimetría deliberada: `negociaciones` se borra en cascada si
desaparece el producto, pero `pedidos.negociacion_id` es `SET NULL`. **Un pedido
nunca se pierde**, aunque su rastro de negociación desaparezca.

---

## 9. Índices recomendados

### 9.1 `negociaciones`

```sql
UNIQUE KEY uq_negociaciones_producto_comprador (producto_id, comprador_id)
KEY idx_negociaciones_comprador_estado (comprador_id, estado)
KEY idx_negociaciones_vendedor_estado  (vendedor_id, estado)
KEY idx_negociaciones_producto_estado  (producto_id, estado)
KEY idx_negociaciones_created          (created_at)
```

Los dos primeros índices compuestos sirven la consulta dominante: «mis
negociaciones abiertas», filtrada por rol.

### 9.2 `ofertas`

```sql
KEY idx_ofertas_negociacion_created (negociacion_id, created_at)
KEY idx_ofertas_negociacion_estado  (negociacion_id, estado)
KEY idx_ofertas_emisor              (emisor_id)
KEY idx_ofertas_expira              (expira_at)
```

`(negociacion_id, created_at)` sirve el historial cronológico, que es la lectura
más frecuente. `idx_ofertas_expira` habilita el barrido de ofertas vencidas.

### 9.3 `envios`

```sql
UNIQUE KEY uq_envios_pedido (pedido_id)
KEY idx_envios_estado   (estado_envio_id)
KEY idx_envios_tracking (tracking_codigo)
```

### 9.4 `envio_historial`

```sql
KEY idx_envio_hist_envio_created (envio_id, created_at)
KEY idx_envio_hist_estado        (estado_envio_id)
```

### 9.5 Catálogos

```sql
UNIQUE KEY uq_metodos_envio_clave (clave)
UNIQUE KEY uq_estados_envio_clave (clave)
KEY        idx_estados_envio_orden (orden)
```

### 9.6 Tablas existentes

```sql
-- pedidos (columnas nuevas)
UNIQUE KEY uq_pedidos_negociacion (negociacion_id)
KEY        idx_pedidos_vendedor   (vendedor_id)
KEY        idx_pedidos_comprador_created (comprador_id, created_at)

-- conversaciones (columna nueva)
UNIQUE KEY uq_conversaciones_negociacion (negociacion_id)

-- mensajes: paginación del chat (verificar si ya existe en 006)
KEY idx_mensajes_conversacion_created (conversacion_id, created_at)

-- productos: catálogo público filtrado
KEY idx_productos_estado_created  (estado, created_at)
KEY idx_productos_vendedor_estado (vendedor_id, estado)
```

> Antes de crear cualquier índice de §9.6, **verificar** contra
> `database/indexes/001_performance_indexes.sql`: varios pueden existir ya. No
> duplicar índices.

---

## 10. Restricciones de integridad

### 10.1 Garantizadas por la base de datos

| Restricción                                           | Regla que protege                                   |
| ----------------------------------------------------- | --------------------------------------------------- |
| `uq_negociaciones_producto_comprador`                 | Un comprador no abre dos negociaciones sobre el mismo producto |
| `uq_pedidos_negociacion`                              | *Solo una oferta aceptada genera un pedido*         |
| `uq_envios_pedido`                                    | Un pedido tiene exactamente un envío                |
| `uq_conversaciones_negociacion`                       | Un chat por negociación                             |
| `uq_calificacion_pedido_producto` *(existente)*       | Una calificación por pedido, producto y autor       |
| `uq_favoritos_usuario_producto` *(existente)*         | Sin favoritos duplicados                            |
| `fk_pedidos_vendedor` NOT NULL                        | *Cada pedido tiene un vendedor*                     |
| `pedidos.comprador_id` NOT NULL *(existente)*         | *Cada pedido tiene un comprador*                    |
| `productos.subcategoria_id` NOT NULL *(existente)*    | *Todo producto pertenece a una subcategoría*        |
| `productos.marca_id` NULL *(existente)*               | *Puede pertenecer a una marca*                      |
| FK `RESTRICT` sobre catálogos                         | No se borra un método o estado de envío en uso      |

### 10.2 Garantizadas por la capa de servicio

Estas reglas **no** se expresan en el esquema porque MySQL no las cubre de forma
razonable, o porque dependen de estado dinámico:

| Regla                                                          | Dónde vive                          |
| -------------------------------------------------------------- | ----------------------------------- |
| Un usuario no puede comprar sus propios productos               | `negotiation.service.js`            |
| Un producto vendido ya no acepta ofertas                        | `negotiation.service.js`            |
| Solo puede ofertar quien no emitió la última oferta (turnos)    | `negotiation.service.js`            |
| Una oferta no cambia de estado terminal a otro                  | `negotiation.service.js`            |
| Las ofertas nunca se editan ni se borran                        | Repositorio sin `update` ni `remove` |
| Transiciones válidas del estado de envío                        | `shipment.service.js`               |
| Solo el vendedor actualiza el estado del envío                  | `shipment.service.js` + `ownership` |
| Calificar solo si el envío está `entregado`                     | `review.service.js`                 |
| `direccion_id` obligatoria si `metodos_envio.requiere_direccion = 1` | `negotiation.service.js` al aceptar |
| Los mensajes nunca se editan ni se borran                       | Repositorio sin `update` ni `remove` |

**Decisión explícita: no se usan triggers para las reglas nuevas.** El esquema
existente ya tiene cuatro triggers y su comportamiento dentro de transacciones
largas es difícil de razonar. Toda regla nueva vive en la capa de servicio, en
línea con `CLAUDE.md`.

### 10.3 Triggers heredados: verificación obligatoria

Antes de crear el primer pedido debe comprobarse el comportamiento de:

| Trigger                              | Se dispara al                | Riesgo                                            |
| ------------------------------------ | ---------------------------- | ------------------------------------------------- |
| `trg_detalle_pedido_descuenta_stock` | Insertar en `detalle_pedido` | Actualiza `inventario`; sin fila, debería ser inocuo |
| `trg_pedidos_incrementa_uso_cupon`   | Insertar en `pedidos`        | Con `cupon_id` nulo, debería ser inocuo           |
| `trg_variantes_precio_historial`     | Cambiar precio de variante   | Escribe en `precio_historial`; inocuo             |
| `trg_mensajes_actualiza_conversacion`| Insertar en `mensajes`       | **Útil**: mantiene `ultimo_mensaje_at`            |

Un trigger que falle dentro de la transacción de aceptación la revierte por
completo. La verificación no es opcional.

---

## 11. Justificación de cada tabla nueva

### `metodos_envio`

*Por qué existe.* Las reglas dicen que comprador y vendedor **acuerdan** el
envío. Un acuerdo requiere un vocabulario común y cerrado.

*Por qué no un ENUM.* Un catálogo en tabla permite añadir métodos sin `ALTER
TABLE`, y `requiere_direccion` es un atributo por método que un ENUM no puede
transportar.

*Por qué no reutilizar `metodos_pago`.* Semántica distinta; mezclarlas
confundiría pago con logística.

### `estados_envio`

*Por qué existe.* Las reglas enumeran seis estados exactos. `estados_pedido` ya
existe pero modela otra cosa (`pagado`, `reembolsado`) y no puede reinterpretarse
sin borrar filas, algo prohibido por la decisión 5.

*Por qué en tabla y no ENUM.* `orden` y `es_final` son metadatos por estado que
la máquina de estados del servicio consulta directamente. Sigue además el patrón
ya establecido por `estados_pedido`.

### `negociaciones`

*Por qué existe.* Es la entidad que faltaba por completo. Sin ella, una oferta
sería un hecho suelto sin hilo conductor, y no habría dónde anclar el estado
global del intercambio, el turno actual ni el chat.

*Por qué no colgar las ofertas del producto.* Un producto recibe ofertas de
varios compradores en paralelo. Sin agrupar por comprador no puede determinarse
de quién es el turno ni cerrar un hilo sin cerrar los demás.

*Por qué `ultimo_turno_usuario_id`.* Alternativa: deducir el turno de la última
oferta. Se prefiere el campo explícito porque evita una subconsulta en cada
validación, que es la operación más frecuente del módulo.

### `ofertas`

*Por qué existe.* Materializa *el comprador puede hacer ofertas* y *el vendedor
puede aceptar, rechazar o contraofertar*.

*Por qué append-only.* La regla es literal: *el historial nunca debe
eliminarse*. Una oferta editable destruiría la trazabilidad de lo acordado. Por
eso la tabla carece de `updated_at` y `deleted_at`: la ausencia de esas columnas
comunica la intención mejor que cualquier comentario.

*Por qué monto y envío en la misma fila.* Decisión 1. Separarlos exigiría una
segunda máquina de estados y permitiría un limbo donde el precio está acordado y
el envío no.

*Por qué `tipo` si es deducible del emisor.* Legibilidad de la API y de los
informes. El coste es un ENUM de dos valores.

### `envios`

*Por qué existe.* El esquema actual resuelve el envío con una columna
`pedidos.envio DECIMAL`: solo el costo. No hay dónde guardar método, estado,
transportista, guía ni destino.

*Por qué 1:1 con el pedido y no columnas en `pedidos`.* Serían siete columnas
mayoritariamente nulas en la tabla más consultada del sistema, y el envío tiene
su propio ciclo de vida y sus propios permisos de escritura (solo el vendedor).

*Por qué `entregado_at` redundante.* Evita recorrer el historial en cada
validación de calificación, que es la comprobación más repetida del módulo
Reviews.

### `envio_historial`

*Por qué existe.* Es el módulo Tracking del ROADMAP. Sin él, `envios` solo
conoce su estado actual y se pierde cuándo y quién hizo cada cambio.

*Por qué append-only.* Mismo principio que las ofertas: el seguimiento es un
registro histórico. Un evento corregible deja de ser evidencia.

*Por qué incluye la transición inicial.* Que el historial arranque en
`pendiente` hace que la fila más reciente coincida **siempre** con
`envios.estado_envio_id`, sin casos especiales.

---

## 12. Flujo de creación de datos

De la publicación de un producto al cierre de la compra. Los bloques marcados
como **TX** son transacciones únicas (decisión 10).

### Paso 1 — Publicación **TX**

```
INSERT productos           (vendedor_id, subcategoria_id, marca_id?, titulo,
                            slug, precio, condicion, estado='borrador')
INSERT producto_variantes  (producto_id, precio, activo=1)     ← variante por defecto
INSERT producto_imagenes   (producto_id, url, orden, es_principal)   [0..N]
UPDATE productos SET estado='activo'                            ← al publicar
```

### Paso 2 — Descubrimiento

```
SELECT productos WHERE estado='activo' AND deleted_at IS NULL   [+ filtros]
INSERT favoritos (usuario_id, producto_id)                      [opcional]
```

Sin escrituras críticas.

### Paso 3 — Apertura de la negociación **TX**

```
-- Validaciones previas en el servicio:
--   producto.estado = 'activo'
--   producto.vendedor_id <> comprador          (no comprar lo propio)
--   no existe negociación abierta (producto, comprador)

INSERT negociaciones              (producto_id, comprador_id, vendedor_id,
                                   estado='abierta',
                                   ultimo_turno_usuario_id = comprador)
INSERT ofertas                    (negociacion_id, emisor_id=comprador,
                                   tipo='oferta', monto, metodo_envio_id,
                                   costo_envio, estado='pendiente')
INSERT conversaciones             (producto_id, negociacion_id)
INSERT conversacion_participantes (conversacion_id, comprador, 'comprador')
INSERT conversacion_participantes (conversacion_id, vendedor,  'vendedor')
INSERT notificaciones             (vendedor, 'nueva_oferta')
```

### Paso 4 — Contraofertas **TX** (0..N veces)

```
-- Validación: el emisor NO es ultimo_turno_usuario_id

UPDATE ofertas SET estado='superada' WHERE negociacion_id=? AND estado='pendiente'
INSERT ofertas          (negociacion_id, emisor_id, tipo='contraoferta',
                         monto, metodo_envio_id, costo_envio, estado='pendiente')
UPDATE negociaciones SET ultimo_turno_usuario_id = emisor
INSERT notificaciones   (contraparte, 'nueva_contraoferta')
```

### Paso 4b — Chat (en cualquier momento, no transaccional)

```
INSERT mensajes (conversacion_id, emisor_id, contenido)
-- trg_mensajes_actualiza_conversacion refresca ultimo_mensaje_at
INSERT notificaciones (contraparte, 'nuevo_mensaje')
```

Independiente del estado de la negociación. Sigue disponible después de crear el
pedido y tras la entrega (decisión 9).

### Paso 5 — Aceptación **TX** (la operación crítica)

```
BEGIN

  SELECT ... FROM productos WHERE id=? FOR UPDATE          ← bloqueo
  -- verificar dentro del bloqueo: estado = 'activo'

  UPDATE ofertas       SET estado='aceptada'  WHERE id = ofertaId
  UPDATE ofertas       SET estado='superada'
                       WHERE negociacion_id=? AND estado='pendiente'
  UPDATE negociaciones SET estado='aceptada', oferta_aceptada_id = ofertaId

  INSERT pedidos        (codigo, comprador_id, vendedor_id, negociacion_id,
                         direccion_id?, estado_id='pendiente',
                         subtotal=monto, descuento=0,
                         envio=costo_envio, total=monto+costo_envio)

  INSERT detalle_pedido (pedido_id, producto_id, variante_id,   ← variante por defecto
                         vendedor_id, cantidad=1,
                         precio_unitario=monto, subtotal=monto)

  INSERT envios         (pedido_id, metodo_envio_id, estado_envio_id='pendiente',
                         direccion_id?, costo=costo_envio)

  INSERT envio_historial(envio_id, estado_envio_id='pendiente', usuario_id=?)

  UPDATE productos     SET estado='vendido' WHERE id=?

  UPDATE negociaciones SET estado='cancelada'                  ← cierra las rivales
                       WHERE producto_id=? AND estado='abierta' AND id<>?

  INSERT notificaciones (comprador, 'oferta_aceptada')
  INSERT notificaciones (comprador, 'pedido_creado')
  INSERT notificaciones (vendedor,  'pedido_creado')

COMMIT

-- Después del COMMIT, fuera de la transacción:
--   notification.dispatcher despacha por correo / push las filas registradas.
--   Su fallo se registra en el log y NO revierte la venta.
```

Ocho tablas, un único bloque atómico. Si algo falla, no queda ni un producto
vendido sin pedido ni una notificación de un hecho que no ocurrió.

**Generación de `pedidos.codigo`.** La columna es `VARCHAR(30) NOT NULL UNIQUE`
y el esquema no la genera. Estrategia: `ORD-` más el `id` del pedido rellenado
a seis dígitos (`ORD-000123`), asignado **después** del `INSERT` mediante un
`UPDATE` dentro de la misma transacción. Evita colisiones sin necesidad de una
secuencia aparte ni de reintentos. Alternativa descartada: un identificador
aleatorio, que perdería legibilidad y ordenación natural.

### Paso 6 — Ciclo del envío **TX** (una por transición)

```
-- Validaciones: el actor es el vendedor; la transición es válida;
-- el estado actual no es final

UPDATE envios          SET estado_envio_id = nuevoEstado
                          [, transportista, tracking_codigo]
                          [, entregado_at = NOW() si nuevoEstado='entregado']
INSERT envio_historial (envio_id, estado_envio_id=nuevoEstado, usuario_id, nota)
INSERT notificaciones  (comprador, 'envio_actualizado')

-- al llegar a 'entregado':
UPDATE pedidos SET estado_id = 'entregado'
```

Transiciones permitidas:

```
pendiente ──► preparando ──► enviado ──► en_transito ──► entregado ✔
     │             │            │             │
     └─────────────┴────────────┴─────────────┴──► cancelado ✔

✔ = estado final, sin salida
```

### Paso 6b — Cancelación **TX** (camino alternativo)

```
-- Validación: el envío no ha salido (estado en pendiente o preparando)
--             el actor es comprador o vendedor del pedido

UPDATE envios          SET estado_envio_id = 'cancelado'
INSERT envio_historial (envio_id, estado_envio_id='cancelado', usuario_id, nota)
UPDATE pedidos         SET estado_id = 'cancelado'
INSERT notificaciones  (contraparte, 'envio_actualizado')

-- ¿Y el producto?  ← REGLA PENDIENTE DE DEFINIR
```

> **Regla abierta.** No está definido si al cancelar un pedido el producto
> vuelve a `activo` o permanece `vendido`, ni si las negociaciones cerradas
> durante la aceptación pueden reabrirse. Registrado en
> `docs/BUSINESS_RULES.md` § *Pendiente de definir*.
>
> Comportamiento por defecto mientras no se decida: **el producto permanece
> `vendido` y las negociaciones cerradas no se reabren.** Es la opción
> conservadora: no resucita estado y no contradice ninguna regla existente. Si
> se decide lo contrario, la reversión debe ocurrir dentro de esta misma
> transacción.

### Paso 7 — Calificación **TX**

```
-- Validación: envios.estado_envio_id = 'entregado'
--             y el autor es el comprador del pedido

INSERT calificaciones (pedido_id, autor_id, vendedor_id, producto_id,
                       puntuacion, comentario)
INSERT notificaciones (vendedor, 'nueva_calificacion')
```

### Paso 8 — Estado final

```
producto        estado = 'vendido'
negociación     estado = 'aceptada'      · historial de ofertas íntegro
conversación    activa                   · historial de mensajes íntegro
pedido          estado = 'entregado'
envío           estado = 'entregado'     · historial de seguimiento completo
calificación    registrada
```

Nada se ha borrado en todo el recorrido.

---

## 13. Dependencias entre módulos y base de datos

### 13.1 Tablas por módulo

| Módulo            | Lee                                                        | Escribe                                                    |
| ----------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| **Auth**          | `usuarios`, `usuario_rol`, `roles`                          | tablas de tokens, `usuarios`                                |
| **Users**         | `usuarios`, `usuario_rol`, `calificaciones`                 | `usuarios`, `usuario_rol`                                   |
| **Addresses**     | `direcciones`, `ciudades`                                   | `direcciones`                                               |
| **Locations**     | `paises`, `departamentos`, `ciudades`                       | — (solo lectura)                                            |
| **Categories**    | `categorias`                                                | `categorias`                                                |
| **Subcategories** | `subcategorias`, `categorias`, `productos`                  | `subcategorias`                                             |
| **Brands**        | `marcas`                                                    | `marcas`                                                    |
| **Products**      | `productos`, `subcategorias`, `marcas`, `producto_imagenes`, `producto_variantes` | `productos`, `producto_variantes`, `producto_imagenes` |
| **Negotiations**  | `productos`, `usuarios`, `metodos_envio`                    | `negociaciones`, `ofertas`, `conversaciones`, `conversacion_participantes`, **+ todo el paso 5** |
| **Messages**      | `conversaciones`, `conversacion_participantes`, `negociaciones` | `mensajes`, `conversacion_participantes` (lectura marcada) |
| **Orders**        | `pedidos`, `detalle_pedido`, `envios`, `usuarios`           | `pedidos`                                                   |
| **Shipments**     | `envios`, `estados_envio`, `metodos_envio`, `pedidos`       | `envios`, `envio_historial`, `pedidos`                      |
| **Reviews**       | `calificaciones`, `pedidos`, `envios`                       | `calificaciones`                                            |
| **Favorites**     | `favoritos`, `productos`                                    | `favoritos`                                                 |
| **Notifications** | `notificaciones`, `tipos_notificacion`                      | `notificaciones`                                            |
| **Reports**       | `reportes`                                                  | `reportes`                                                  |

### 13.2 Orden obligatorio de implementación

Impuesto por las dependencias de FK:

```
0. Rama de integración con el esquema completo        ← prerrequisito operativo
1. Helper transaccional (database/transaction.js)     ← prerrequisito (decisión 8)
2. Catálogos: metodos_envio + estados_envio           ← sin dependencias
3. Products           (+ variante por defecto)
4. Notifications      (service interno; lo usa el paso 6)
5. Addresses + Locations
   └── requiere: direcciones, ciudades, departamentos, paises
   └── necesario antes de aceptar una oferta cuyo método exige dirección
6. Negotiations       (+ negociaciones y ofertas)
   └── requiere: productos, usuarios, metodos_envio, transacciones
7. Messages           (+ ALTER conversaciones)
   └── requiere: negociaciones
8. Orders             (+ ALTER pedidos)
   └── requiere: negociaciones, ofertas, direcciones
9. Shipments          (+ envios y envio_historial)
   └── requiere: pedidos, estados_envio, metodos_envio, direcciones
10. Reviews
    └── requiere: envios en estado entregado
11. Users, Roles, Favorites, Reports, Admin   ← independientes, en cualquier momento
```

### 13.3 Módulos que comparten transacción

`negotiation.service.js` es el orquestador de la operación crítica. Escribe en
tablas que pertenecen a Orders y Shipments dentro de una única transacción.

Regla para no romper la arquitectura por capas:

- El servicio que **inicia** la transacción es el único que la abre y confirma.
- Los repositorios de los demás módulos exponen métodos que aceptan una conexión:
  `create(data, conn = pool)`.
- **Las transacciones no se anidan.** Ningún servicio llamado desde dentro de una
  transacción abre otra.
- `notification.service.emit()` participa en la transacción del llamador y
  **solo escribe la fila** en `notificaciones`. Nunca al revés.
- El despacho por canales externos (correo, push) corre a cargo de
  `notification.dispatcher`, **después del `COMMIT`**. Ninguna llamada de red
  ocurre dentro de una transacción.
- `message.service.js` **no** participa en la transacción de aceptación: el chat
  es independiente del ciclo de vida de la oferta.

### 13.4 Migraciones previstas

| Archivo                    | Contenido                                                         |
| -------------------------- | ----------------------------------------------------------------- |
| `009_negociacion.sql`      | `metodos_envio`, `estados_envio`, `negociaciones`, `ofertas`       |
| `010_envios.sql`           | `envios`, `envio_historial`, `ALTER pedidos`                       |
| `011_chat_negociacion.sql` | `ALTER conversaciones`                                             |
| `seeds/003_envios.sql`     | Catálogos de métodos y estados de envío                            |
| `seeds/004_notificaciones.sql` | Tipos de notificación nuevos                                   |

Numeración continuando desde `008_auth.sql`. **Estos archivos no se han
generado**: su creación requiere autorización explícita conforme a `CLAUDE.md`.

---

## 14. Datos de catálogo requeridos

### 14.1 `metodos_envio`

| clave             | nombre                      | requiere_direccion |
| ----------------- | --------------------------- | ------------------ |
| `acuerdo_directo` | Acuerdo directo entre partes | 0                  |
| `recojo_en_persona` | Recojo en persona         | 0                  |
| `encomienda`      | Encomienda                   | 1                  |
| `courier`         | Courier / mensajería         | 1                  |

### 14.2 `estados_envio`

| clave         | nombre       | orden | es_final |
| ------------- | ------------ | ----- | -------- |
| `pendiente`   | Pendiente    | 1     | 0        |
| `preparando`  | Preparando   | 2     | 0        |
| `enviado`     | Enviado      | 3     | 0        |
| `en_transito` | En tránsito  | 4     | 0        |
| `entregado`   | Entregado    | 5     | 1        |
| `cancelado`   | Cancelado    | 6     | 1        |

Coincide literalmente con la lista de `docs/BUSINESS_RULES.md`.

### 14.3 `tipos_notificacion` — nuevos

`tipos_notificacion` tiene FK `ON DELETE RESTRICT` desde `notificaciones`: sin
estos registros, ninguna notificación puede insertarse.

| clave                | nombre               | plantilla                                              |
| -------------------- | -------------------- | ------------------------------------------------------ |
| `nueva_oferta`       | Nueva oferta         | `{comprador} ofertó {monto} por {producto}`            |
| `nueva_contraoferta` | Nueva contraoferta   | `{emisor} contraofertó {monto} por {producto}`         |
| `oferta_aceptada`    | Oferta aceptada      | `Tu oferta por {producto} fue aceptada`                |
| `oferta_rechazada`   | Oferta rechazada     | `Tu oferta por {producto} fue rechazada`               |
| `pedido_creado`      | Pedido creado        | `Se generó el pedido {codigo}`                         |
| `envio_actualizado`  | Envío actualizado    | `Tu envío del pedido {codigo} ahora está {estado}`     |

Ya existen y se reutilizan: `nuevo_mensaje`, `nueva_calificacion`.

---

## 15. Reglas para futuras migraciones

1. **Numeración correlativa** desde `008_auth.sql`. Nunca reutilizar un número.
2. **Cada migración es aditiva.** Sin `DROP TABLE`, sin `DROP COLUMN`, sin
   eliminar FK existentes.
3. **Cabecera obligatoria**, siguiendo el formato de las migraciones actuales:
   propósito, tipo (aditiva o correctiva), dependencias, motor y juego de
   caracteres.
4. **Restricciones nombradas explícitamente**: `fk_*`, `uq_*`, `idx_*`. Sin
   nombres generados por MySQL.
5. **Convenciones de tipos**: identificadores `BIGINT UNSIGNED`, dinero
   `DECIMAL(12,2)`, booleanos `TINYINT(1)`, marcas de tiempo `DATETIME` con
   `DEFAULT CURRENT_TIMESTAMP` y `ON UPDATE CURRENT_TIMESTAMP` donde
   corresponda.
6. **Sin triggers nuevos.** Las reglas de negocio viven en la capa de servicio
   (§10.2).
7. **Verificar los índices existentes** en
   `database/indexes/001_performance_indexes.sql` antes de crear uno nuevo.
8. **Los seeds van aparte** de la estructura, en `database/seeds/`.
9. **Autorización previa.** Conforme a `CLAUDE.md`, ninguna migración se genera
   ni se aplica sin presentar antes el análisis y obtener aprobación.
10. **Este documento se actualiza junto con la migración**, en el mismo cambio.
    Un modelo de datos documentado a posteriori deja de ser una referencia
    fiable.

---

## Documentos relacionados

| Documento                | Contenido                                                   |
| ------------------------ | ----------------------------------------------------------- |
| `docs/ARCHITECTURE.md`   | Arquitectura, flujo, módulos, endpoints, riesgos y decisiones |
| `docs/BUSINESS_RULES.md` | Reglas de negocio — fuente de verdad funcional               |
| `docs/ROADMAP.md`        | Estado y orden de los módulos                                |
| `CLAUDE.md`              | Convenciones de arquitectura, calidad y trabajo              |
