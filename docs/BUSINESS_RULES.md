# BUSINESS RULES

## Proyecto

Nombre:

PROVEPUENTEC

Es un Marketplace donde compradores y vendedores negocian productos.

---

## Productos

Un usuario no puede comprar sus propios productos.

Un producto vendido ya no acepta ofertas.

Todo producto pertenece a una categoría.

Todo producto pertenece a una subcategoría.

Puede pertenecer a una marca.

---

## Negociación

El comprador puede hacer ofertas.

El vendedor puede:

Aceptar.

Rechazar.

Enviar contraoferta.

El historial nunca debe eliminarse.

---

## Pedidos

Solo una oferta aceptada genera un pedido.

Cada pedido tiene un comprador.

Cada pedido tiene un vendedor.

---

## Envíos

Comprador y vendedor acuerdan el envío.

El vendedor actualiza el estado.

Estados:

Pendiente

Preparando

Enviado

En tránsito

Entregado

Cancelado

---

## Calificaciones

Solo cuando el pedido esté entregado.

---

## Notificaciones

Generar notificaciones cuando:

Hay una oferta.

Hay una contraoferta.

Se acepta una oferta.

Se crea un pedido.

Cambia el estado del envío.

---

# REGLAS DERIVADAS

Reglas que amplían las anteriores, aprobadas como decisiones de arquitectura.
Ver `docs/ARCHITECTURE.md` §3.

---

## Negociación

La negociación pertenece a un par comprador–vendedor sobre un producto.

Un comprador solo puede tener una negociación abierta por producto.

Cada oferta incluye tres términos que se acuerdan juntos:

Precio del producto.

Método de envío.

Costo del envío.

Solo puede emitir una oferta quien no emitió la última.

Cuando el vendedor envía una contraoferta, el comprador también puede aceptar,
rechazar o volver a contraofertar.

Una oferta nunca se edita. Solo cambia su estado.

Al aceptar una oferta, las demás ofertas de esa negociación quedan superadas y
las otras negociaciones abiertas sobre el mismo producto se cierran.

---

## Chat

Toda negociación tiene un chat entre comprador y vendedor.

El chat está disponible desde que se abre la negociación.

El historial de mensajes se conserva después de crear el pedido y después de la
entrega.

Los mensajes no se editan ni se eliminan.

---

## Publicación

Cualquier usuario puede publicar productos.

No se requiere un rol de vendedor para publicar.

---

## Envíos

El método de envío determina si se requiere una dirección registrada.

En acuerdo directo y recojo en persona no se requiere dirección.

Solo el vendedor actualiza el estado del envío.

No se permiten retrocesos ni saltos en la secuencia de estados.

Entregado y Cancelado son estados finales.

---

## Notificaciones

Además de las anteriores, generar notificaciones cuando:

Se rechaza una oferta.

Hay un mensaje nuevo en el chat.

Se recibe una calificación.

---

## Pendiente de definir

Qué ocurre con el producto cuando se cancela un pedido: si vuelve a estado
activo o permanece vendido.

Si las negociaciones cerradas al aceptar otra oferta pueden reabrirse tras una
cancelación.

Si las ofertas tienen vencimiento automático y de cuánto tiempo.