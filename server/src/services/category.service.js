'use strict';

const { slugify } = require('../utils/slug');
const { toPublicCategory } = require('../models/category.model');
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

async function list(query = {}) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limitRaw = Number.parseInt(query.limit, 10) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(limitRaw, 1), MAX_LIMIT);
  const offset = (page - 1) * limit;

  const activo =
    query.activo === undefined || query.activo === ''
      ? null
      : query.activo === 'true' || query.activo === '1' || query.activo === true;

  const { rows, total } = await categoryRepository.findAll({
    q: query.q ? String(query.q).trim() : null,
    activo,
    includeDeleted: false,
    limit,
    offset,
  });

  return {
    data: rows.map(toPublicCategory),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
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
