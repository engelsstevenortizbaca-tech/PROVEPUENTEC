'use strict';

const { buildSlug } = require('../utils/slug');
const { parsePagination, parseOptionalBoolean, parseSearch, paginated } = require('../utils/query');
const { toPublicCategory } = require('../models/category.model');
const categoryRepository = require('../repositories/category.repository');
const { NotFoundError, ConflictError } = require('../errors');

async function list(query = {}) {
  const { page, limit, offset } = parsePagination(query);

  const { rows, total } = await categoryRepository.findAll({
    q: parseSearch(query.q),
    activo: parseOptionalBoolean(query.activo),
    includeDeleted: false,
    limit,
    offset,
  });

  return paginated(rows.map(toPublicCategory), { page, limit, total });
}

async function getById(id) {
  const row = await categoryRepository.findById(id);
  if (!row) throw new NotFoundError('Categoría no encontrada');
  return toPublicCategory(row);
}

async function getBySlug(slug) {
  const row = await categoryRepository.findBySlug(slug);
  if (!row) throw new NotFoundError('Categoría no encontrada');
  return toPublicCategory(row);
}

async function create(data) {
  const nombre = data.nombre.trim();
  const slug = buildSlug({ slug: data.slug, nombre });

  if (await categoryRepository.existsBySlug(slug)) {
    throw new ConflictError('Ya existe una categoría con ese slug');
  }

  const id = await categoryRepository.create({
    nombre,
    slug,
    descripcion: data.descripcion?.trim() || null,
    activo: data.activo === undefined ? true : Boolean(data.activo),
  });

  return toPublicCategory(await categoryRepository.findById(id, { includeDeleted: true }));
}

async function update(id, data) {
  const current = await categoryRepository.findById(id);
  if (!current) throw new NotFoundError('Categoría no encontrada');

  const fields = {};

  if (data.nombre !== undefined) fields.nombre = data.nombre.trim();
  if (data.descripcion !== undefined) fields.descripcion = data.descripcion?.trim() || null;
  if (data.activo !== undefined) fields.activo = Boolean(data.activo);

  // El slug se recalcula si llega explícito o si cambió el nombre.
  if (data.slug !== undefined || data.nombre !== undefined) {
    const nextSlug = buildSlug({
      slug: data.slug,
      nombre: fields.nombre ?? current.nombre,
    });
    if (nextSlug !== current.slug) {
      if (await categoryRepository.existsBySlug(nextSlug, { excludeId: id })) {
        throw new ConflictError('Ya existe una categoría con ese slug');
      }
      fields.slug = nextSlug;
    }
  }

  await categoryRepository.update(id, fields);
  return toPublicCategory(await categoryRepository.findById(id));
}

async function remove(id) {
  const deleted = await categoryRepository.softDelete(id);
  if (!deleted) throw new NotFoundError('Categoría no encontrada');
}

async function restore(id) {
  const row = await categoryRepository.findById(id, { includeDeleted: true });
  if (!row) throw new NotFoundError('Categoría no encontrada');
  if (!row.deleted_at) {
    throw new ConflictError('La categoría no está eliminada');
  }
  await categoryRepository.restore(id);
  return toPublicCategory(await categoryRepository.findById(id));
}

module.exports = {
  list,
  getById,
  getBySlug,
  create,
  update,
  remove,
  restore,
};
