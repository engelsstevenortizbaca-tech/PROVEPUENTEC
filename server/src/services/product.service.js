'use strict';

const { buildSlug } = require('../utils/slug');
const { parsePagination, parseOptionalId, parseSearch, paginated } = require('../utils/query');
const { withTransaction } = require('../database/transaction');
const { toPublicProduct } = require('../models/product.model');
const productRepository = require('../repositories/product.repository');
const productImageRepository = require('../repositories/productImage.repository');
const subcategoryRepository = require('../repositories/subcategory.repository');
const brandRepository = require('../repositories/brand.repository');
const {
  PRODUCT_STATUS,
  DEFAULT_PRODUCT_STATUS,
  PUBLIC_PRODUCT_STATUSES,
  ASSIGNABLE_PRODUCT_STATUSES,
} = require('../constants/productStatus');
const { PRODUCT_CONDITIONS, DEFAULT_PRODUCT_CONDITION } = require('../constants/productCondition');
const { NotFoundError, ConflictError } = require('../errors');

const NOT_FOUND = 'Producto no encontrado';

// Estados que el dueño ya no puede cambiar: `vendido` lo escribe la aceptación
// de una oferta y `eliminado` es el borrado lógico.
const FINAL_STATUSES = [PRODUCT_STATUS.VENDIDO, PRODUCT_STATUS.ELIMINADO];

// --- Lectura de filtros -----------------------------------------------------

// Precio de filtro: número finito no negativo, o null si no aplica. Los
// Validators ya lo rechazan antes, esto es la última defensa.
const parseOptionalPrice = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const parseOptionalCondition = (value) => (PRODUCT_CONDITIONS.includes(value) ? value : null);

const parseOrden = (value) =>
  productRepository.ORDER_BY[value] ? value : productRepository.DEFAULT_ORDER;

const parseFilters = (query = {}) => ({
  q: parseSearch(query.q),
  subcategoriaId: parseOptionalId(query.subcategoriaId),
  categoriaId: parseOptionalId(query.categoriaId),
  marcaId: parseOptionalId(query.marcaId),
  condicion: parseOptionalCondition(query.condicion),
  precioMin: parseOptionalPrice(query.precioMin),
  precioMax: parseOptionalPrice(query.precioMax),
  orden: parseOrden(query.orden),
});

// --- Validación de relaciones ----------------------------------------------

// La subcategoría es obligatoria y debe existir. `findById` ya descarta las
// subcategorías cuya categoría fue eliminada.
async function assertSubcategoryExists(subcategoriaId) {
  const subcategoria = await subcategoryRepository.findById(subcategoriaId);
  if (!subcategoria) throw new NotFoundError('Subcategoría no encontrada');
}

// La marca es opcional: null la desasocia y solo se valida cuando llega un id.
async function assertBrandExists(marcaId) {
  const marca = await brandRepository.findById(marcaId);
  if (!marca) throw new NotFoundError('Marca no encontrada');
}

// --- Composición de la respuesta -------------------------------------------

// Adjunta la galería a una lista de productos con una sola consulta, en lugar
// de una por producto.
async function withImages(rows) {
  if (rows.length === 0) return [];

  const imagenes = await productImageRepository.findByProductIds(rows.map((row) => row.id));
  const byProduct = new Map();
  for (const imagen of imagenes) {
    const bucket = byProduct.get(imagen.producto_id);
    if (bucket) bucket.push(imagen);
    else byProduct.set(imagen.producto_id, [imagen]);
  }

  return rows.map((row) => toPublicProduct(row, { imagenes: byProduct.get(row.id) || [] }));
}

async function oneWithImages(row) {
  const imagenes = await productImageRepository.findByProductId(row.id);
  return toPublicProduct(row, { imagenes });
}

// El catálogo público solo muestra productos activos; el dueño ve los suyos en
// cualquier estado.
const isVisibleFor = (row, actor) =>
  PUBLIC_PRODUCT_STATUSES.includes(row.estado) ||
  (actor != null && Number(actor.id) === Number(row.vendedor_id));

// --- Casos de uso -----------------------------------------------------------

// Catálogo público: solo productos activos y no eliminados.
async function list(query = {}) {
  const { page, limit, offset } = parsePagination(query);

  const { rows, total } = await productRepository.findAll({
    ...parseFilters(query),
    vendedorId: parseOptionalId(query.vendedorId),
    estados: PUBLIC_PRODUCT_STATUSES,
    limit,
    offset,
  });

  return paginated(await withImages(rows), { page, limit, total });
}

// Publicaciones propias: incluye borradores y pausados, nunca las eliminadas.
async function listByOwner(vendedorId, query = {}) {
  const { page, limit, offset } = parsePagination(query);

  const { rows, total } = await productRepository.findAll({
    ...parseFilters(query),
    vendedorId,
    estados: null,
    limit,
    offset,
  });

  return paginated(await withImages(rows), { page, limit, total });
}

// `actor` es null en una petición anónima: un producto que no esté activo
// responde 404 en lugar de 403, para no revelar que existe.
async function getById(id, actor = null) {
  const row = await productRepository.findById(id);
  if (!row || !isVisibleFor(row, actor)) throw new NotFoundError(NOT_FOUND);
  return oneWithImages(row);
}

async function getBySlug(slug, actor = null) {
  const row = await productRepository.findBySlug(slug);
  if (!row || !isVisibleFor(row, actor)) throw new NotFoundError(NOT_FOUND);
  return oneWithImages(row);
}

// Publica un producto. Cualquier usuario autenticado puede hacerlo, sin rol
// `vendedor` (decisión 4). Nace en `borrador`.
//
// La variante por defecto (decisión 2) se crea en la misma transacción: un
// producto sin variante rompería las FK heredadas de `detalle_pedido` e
// `inventario` en cuanto se negociara.
async function create(vendedorId, data) {
  const titulo = data.titulo.trim();
  const slug = buildSlug({ slug: data.slug, nombre: titulo });
  const precio = data.precio === undefined ? 0 : Number(data.precio);

  await assertSubcategoryExists(data.subcategoriaId);
  if (data.marcaId !== undefined && data.marcaId !== null) {
    await assertBrandExists(data.marcaId);
  }
  if (await productRepository.existsBySlug(slug)) {
    throw new ConflictError('Ya existe un producto con ese slug');
  }

  const id = await withTransaction(async () => {
    const productoId = await productRepository.create({
      vendedorId,
      subcategoriaId: data.subcategoriaId,
      marcaId: data.marcaId ?? null,
      titulo,
      slug,
      descripcion: data.descripcion?.trim() || null,
      precio,
      condicion: data.condicion || DEFAULT_PRODUCT_CONDITION,
      estado: DEFAULT_PRODUCT_STATUS,
    });

    await productRepository.createDefaultVariant({ productoId, precio });
    return productoId;
  });

  return oneWithImages(await productRepository.findById(id));
}

// Actualización parcial. El estado no se toca aquí: tiene su propio caso de uso.
async function update(id, data) {
  const current = await productRepository.findById(id);
  if (!current) throw new NotFoundError(NOT_FOUND);

  const fields = {};

  if (data.titulo !== undefined) fields.titulo = data.titulo.trim();
  if (data.descripcion !== undefined) fields.descripcion = data.descripcion?.trim() || null;
  if (data.condicion !== undefined) fields.condicion = data.condicion;
  if (data.precio !== undefined) fields.precio = Number(data.precio);

  if (data.subcategoriaId !== undefined && data.subcategoriaId !== current.subcategoria_id) {
    await assertSubcategoryExists(data.subcategoriaId);
    fields.subcategoria_id = data.subcategoriaId;
  }

  // marcaId: null desasocia la marca; un id la valida antes de asignarla.
  if (data.marcaId !== undefined && data.marcaId !== current.marca_id) {
    if (data.marcaId !== null) await assertBrandExists(data.marcaId);
    fields.marca_id = data.marcaId;
  }

  // El slug se recalcula si llega explícito o si cambió el título.
  if (data.slug !== undefined || data.titulo !== undefined) {
    const nextSlug = buildSlug({
      slug: data.slug,
      nombre: fields.titulo ?? current.titulo,
    });
    if (nextSlug !== current.slug) {
      if (await productRepository.existsBySlug(nextSlug, { excludeId: id })) {
        throw new ConflictError('Ya existe un producto con ese slug');
      }
      fields.slug = nextSlug;
    }
  }

  // Cambiar el precio obliga a sincronizar la variante por defecto: ambas
  // escrituras van juntas o no va ninguna.
  const cambiaPrecio = fields.precio !== undefined && Number(current.precio) !== fields.precio;

  await withTransaction(async () => {
    await productRepository.update(id, fields);
    if (cambiaPrecio) await productRepository.syncVariantPrice(id, fields.precio);
  });

  return oneWithImages(await productRepository.findById(id));
}

// Publicar, pausar o volver a borrador. `vendido` y `eliminado` no son
// asignables por el dueño y tampoco se sale de ellos desde aquí.
async function changeStatus(id, estado) {
  const current = await productRepository.findById(id);
  if (!current) throw new NotFoundError(NOT_FOUND);

  if (!ASSIGNABLE_PRODUCT_STATUSES.includes(estado)) {
    throw new ConflictError(`No puedes asignar el estado "${estado}"`);
  }
  if (FINAL_STATUSES.includes(current.estado)) {
    throw new ConflictError(`Un producto en estado "${current.estado}" ya no cambia de estado`);
  }

  if (current.estado !== estado) await productRepository.update(id, { estado });

  return oneWithImages(await productRepository.findById(id));
}

// Borrado lógico: la fila y sus imágenes permanecen, porque las negociaciones y
// los pedidos que la referencian deben seguir siendo legibles.
async function remove(id) {
  const current = await productRepository.findById(id);
  if (!current) throw new NotFoundError(NOT_FOUND);

  await productRepository.softDelete(id, PRODUCT_STATUS.ELIMINADO);
}

module.exports = {
  list,
  listByOwner,
  getById,
  getBySlug,
  create,
  update,
  changeStatus,
  remove,
};
