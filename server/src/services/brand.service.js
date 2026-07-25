'use strict';

const { slugify } = require('../utils/slug');
const { toPublicBrand } = require('../models/brand.model');
const brandRepository = require('../repositories/brand.repository');
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

  const { rows, total } = await brandRepository.findAll({
    q: query.q ? String(query.q).trim() : null,
    activo,
    limit,
    offset,
  });

  return {
    data: rows.map(toPublicBrand),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}

async function getById(id) {
  const row = await brandRepository.findById(id);
  if (!row) throw new NotFoundError('Marca no encontrada');
  return toPublicBrand(row);
}

async function getBySlug(slug) {
  const row = await brandRepository.findBySlug(slug);
  if (!row) throw new NotFoundError('Marca no encontrada');
  return toPublicBrand(row);
}

async function create(data) {
  const nombre = data.nombre.trim();
  const slug = buildSlug({ slug: data.slug, nombre });

  if (await brandRepository.existsByNombre(nombre)) {
    throw new ConflictError('Ya existe una marca con ese nombre');
  }
  if (await brandRepository.existsBySlug(slug)) {
    throw new ConflictError('Ya existe una marca con ese slug');
  }

  const id = await brandRepository.create({
    nombre,
    slug,
    logoUrl: data.logoUrl?.trim() || null,
    activo: data.activo === undefined ? true : Boolean(data.activo),
  });

  return toPublicBrand(await brandRepository.findById(id));
}

async function update(id, data) {
  const current = await brandRepository.findById(id);
  if (!current) throw new NotFoundError('Marca no encontrada');

  const fields = {};

  if (data.nombre !== undefined) {
    const nombre = data.nombre.trim();
    if (
      nombre !== current.nombre &&
      (await brandRepository.existsByNombre(nombre, { excludeId: id }))
    ) {
      throw new ConflictError('Ya existe una marca con ese nombre');
    }
    fields.nombre = nombre;
  }
  if (data.logoUrl !== undefined) fields.logo_url = data.logoUrl?.trim() || null;
  if (data.activo !== undefined) fields.activo = Boolean(data.activo);

  // El slug se recalcula si llega explícito o si cambió el nombre.
  if (data.slug !== undefined || data.nombre !== undefined) {
    const nextSlug = buildSlug({
      slug: data.slug,
      nombre: fields.nombre ?? current.nombre,
    });
    if (nextSlug !== current.slug) {
      if (await brandRepository.existsBySlug(nextSlug, { excludeId: id })) {
        throw new ConflictError('Ya existe una marca con ese slug');
      }
      fields.slug = nextSlug;
    }
  }

  await brandRepository.update(id, fields);
  return toPublicBrand(await brandRepository.findById(id));
}

// Borrado definitivo. No se bloquea por productos asociados: la FK
// `productos.marca_id` es ON DELETE SET NULL, así que los productos
// sobreviven y simplemente se quedan sin marca.
async function remove(id) {
  const deleted = await brandRepository.remove(id);
  if (!deleted) throw new NotFoundError('Marca no encontrada');
}

module.exports = {
  list,
  getById,
  getBySlug,
  create,
  update,
  remove,
};
