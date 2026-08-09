'use strict';

const { executor } = require('../database/transaction');
const { limitOffset, buildSet } = require('../database/sql');

const COLUMNS = `id, nombre, slug, descripcion, activo, created_at, updated_at, deleted_at`;

// Acceso a datos de la tabla `categorias` (categorías de primer nivel).
// Las categorías usan soft delete: `deleted_at` marca la eliminación lógica.
const categoryRepository = {
  // Lista paginada con filtros opcionales. Devuelve { rows, total }.
  // Por defecto excluye las eliminadas (deleted_at IS NULL).
  async findAll({ q = null, activo = null, includeDeleted = false, limit = 20, offset = 0 } = {}) {
    const where = [];
    const params = {};

    if (!includeDeleted) where.push('deleted_at IS NULL');
    if (q) {
      where.push('nombre LIKE :q');
      params.q = `%${q}%`;
    }
    if (activo !== null) {
      where.push('activo = :activo');
      params.activo = activo ? 1 : 0;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await executor().execute(
      `SELECT ${COLUMNS}
         FROM categorias
         ${whereSql}
        ORDER BY nombre ASC
        ${limitOffset({ limit, offset })}`,
      params
    );

    const [countRows] = await executor().execute(
      `SELECT COUNT(*) AS total FROM categorias ${whereSql}`,
      params
    );

    return { rows, total: Number(countRows[0].total) };
  },

  async findById(id, { includeDeleted = false } = {}) {
    const [rows] = await executor().execute(
      `SELECT ${COLUMNS}
         FROM categorias
        WHERE id = :id
          ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
        LIMIT 1`,
      { id }
    );
    return rows[0] || null;
  },

  async findBySlug(slug, { includeDeleted = false } = {}) {
    const [rows] = await executor().execute(
      `SELECT ${COLUMNS}
         FROM categorias
        WHERE slug = :slug
          ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
        LIMIT 1`,
      { slug }
    );
    return rows[0] || null;
  },

  // Comprueba si el slug ya existe (incluye las eliminadas, porque `slug` es
  // UNIQUE en la BD). Permite excluir un id (útil al actualizar).
  async existsBySlug(slug, { excludeId = null } = {}) {
    const [rows] = await executor().execute(
      `SELECT 1
         FROM categorias
        WHERE slug = :slug
          ${excludeId ? 'AND id <> :excludeId' : ''}
        LIMIT 1`,
      excludeId ? { slug, excludeId } : { slug }
    );
    return rows.length > 0;
  },

  async create({ nombre, slug, descripcion = null, activo = true }) {
    const [result] = await executor().execute(
      `INSERT INTO categorias (nombre, slug, descripcion, activo)
       VALUES (:nombre, :slug, :descripcion, :activo)`,
      { nombre, slug, descripcion, activo: activo ? 1 : 0 }
    );
    return result.insertId;
  },

  // Actualización parcial: solo aplica los campos presentes en `fields`.
  async update(id, fields) {
    const set = buildSet({
      allowed: ['nombre', 'slug', 'descripcion', 'activo'],
      fields,
      booleanColumns: ['activo'],
    });
    if (!set) return; // nada que actualizar

    await executor().execute(`UPDATE categorias SET ${set.sql} WHERE id = :id`, {
      ...set.params,
      id,
    });
  },

  async softDelete(id) {
    const [result] = await executor().execute(
      `UPDATE categorias
          SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = :id AND deleted_at IS NULL`,
      { id }
    );
    return result.affectedRows > 0;
  },

  async restore(id) {
    const [result] = await executor().execute(
      `UPDATE categorias
          SET deleted_at = NULL
        WHERE id = :id AND deleted_at IS NOT NULL`,
      { id }
    );
    return result.affectedRows > 0;
  },
};

module.exports = categoryRepository;
