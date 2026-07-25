'use strict';

const { slugify } = require('../utils/slug');
const { toPublicSubcategory } = require('../models/subcategory.model');
const subcategoryRepository = require('../repositories/subcategory.repository');
const categoryRepository = require('../repositories/category.repository');
const { NotFoundError, ConflictError, BadRequestError } = require('../errors');

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

// Deriva el slug a partir del valor explícito (si viene) o del nombre, y valida
// que no quede vacío tras normalizar.
function buildSlug({ slug, nombre }) {
  const source = slug && slug.trim() ? slug : nombre;
  const result = slugify(source);
  if (!result) {
    throw new BadRequestError('No se pudo generar un slug válido a partir del nombre');
  }
  return result;
}

// La categoría padre debe existir y no estar eliminada.
async function assertCategoryExists(categoriaId) {
  const categoria = await categoryRepository.findById(categoriaId);
  if (!categoria) throw new NotFoundError('Categoría no encontrada');
}

async function list(query = {}) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limitRaw = Number.parseInt(query.limit, 10) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(limitRaw, 1), MAX_LIMIT);
  const offset = (page - 1) * limit;

  const activo =
    query.activo === undefined || query.activo === ''
      ? null
      : query.activo === 'true' || query.activo === '1' || query.activo === true;

  const categoriaId = Number.parseInt(query.categoriaId, 10) || null;

  const { rows, total } = await subcategoryRepository.findAll({
    q: query.q ? String(query.q).trim() : null,
    activo,
    categoriaId,
    limit,
    offset,
  });

  return {
    data: rows.map(toPublicSubcategory),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}

async function getById(id) {
  const row = await subcategoryRepository.findById(id);
  if (!row) throw new NotFoundError('Subcategoría no encontrada');
  return toPublicSubcategory(row);
}

async function getBySlug(slug) {
  const row = await subcategoryRepository.findBySlug(slug);
  if (!row) throw new NotFoundError('Subcategoría no encontrada');
  return toPublicSubcategory(row);
}

async function create(data) {
  const nombre = data.nombre.trim();
  const slug = buildSlug({ slug: data.slug, nombre });

  await assertCategoryExists(data.categoriaId);

  if (await subcategoryRepository.existsBySlug(slug)) {
    throw new ConflictError('Ya existe una subcategoría con ese slug');
  }

  const id = await subcategoryRepository.create({
    categoriaId: data.categoriaId,
    nombre,
    slug,
    activo: data.activo === undefined ? true : Boolean(data.activo),
  });

  return toPublicSubcategory(await subcategoryRepository.findById(id));
}

async function update(id, data) {
  const current = await subcategoryRepository.findById(id);
  if (!current) throw new NotFoundError('Subcategoría no encontrada');

  const fields = {};

  if (data.nombre !== undefined) fields.nombre = data.nombre.trim();
  if (data.activo !== undefined) fields.activo = Boolean(data.activo);

  // Mover la subcategoría a otra categoría exige que la destino exista.
  if (data.categoriaId !== undefined && data.categoriaId !== current.categoria_id) {
    await assertCategoryExists(data.categoriaId);
    fields.categoria_id = data.categoriaId;
  }

  // El slug se recalcula si llega explícito o si cambió el nombre.
  if (data.slug !== undefined || data.nombre !== undefined) {
    const nextSlug = buildSlug({
      slug: data.slug,
      nombre: fields.nombre ?? current.nombre,
    });
    if (nextSlug !== current.slug) {
      if (await subcategoryRepository.existsBySlug(nextSlug, { excludeId: id })) {
        throw new ConflictError('Ya existe una subcategoría con ese slug');
      }
      fields.slug = nextSlug;
    }
  }

  await subcategoryRepository.update(id, fields);
  return toPublicSubcategory(await subcategoryRepository.findById(id));
}

// Borrado definitivo. Se bloquea si hay productos publicados en la
// subcategoría: la FK es ON DELETE RESTRICT y perderíamos su clasificación.
async function remove(id) {
  const current = await subcategoryRepository.findById(id);
  if (!current) throw new NotFoundError('Subcategoría no encontrada');

  const productos = await subcategoryRepository.countProductos(id);
  if (productos > 0) {
    throw new ConflictError('No se puede eliminar una subcategoría con productos asociados');
  }

  await subcategoryRepository.remove(id);
}

module.exports = {
  list,
  getById,
  getBySlug,
  create,
  update,
  remove,
};
