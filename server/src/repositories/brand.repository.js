'use strict';

const { pool } = require('../database/pool');

const COLUMNS = `id, nombre, slug, logo_url, activo, created_at, updated_at`;

// Acceso a datos de la tabla `marcas`. La tabla no tiene soft delete: el
// borrado es definitivo.
const brandRepository = {
  // Lista paginada con filtros opcionales. Devuelve { rows, total }.
  async findAll({ q = null, activo = null, limit = 20, offset = 0 } = {}) {
    const where = [];
    const params = {};

    if (q) {
      where.push('nombre LIKE :q');
      params.q = `%${q}%`;
    }
    if (activo !== null) {
      where.push('activo = :activo');
      params.activo = activo ? 1 : 0;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // LIMIT/OFFSET se interpolan como enteros ya saneados (los placeholders
    // preparados de mysql2 no admiten LIMIT/OFFSET de forma fiable).
    const safeLimit = Math.trunc(Number(limit)) || 0;
    const safeOffset = Math.max(Math.trunc(Number(offset)) || 0, 0);

    const [rows] = await pool.execute(
      `SELECT ${COLUMNS}
         FROM marcas
         ${whereSql}
        ORDER BY nombre ASC
        LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM marcas ${whereSql}`,
      params
    );

    return { rows, total: Number(countRows[0].total) };
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT ${COLUMNS}
         FROM marcas
        WHERE id = :id
        LIMIT 1`,
      { id }
    );
    return rows[0] || null;
  },

  async findBySlug(slug) {
    const [rows] = await pool.execute(
      `SELECT ${COLUMNS}
         FROM marcas
        WHERE slug = :slug
        LIMIT 1`,
      { slug }
    );
    return rows[0] || null;
  },

  // Comprueba si el slug ya existe. Permite excluir un id (útil al actualizar).
  async existsBySlug(slug, { excludeId = null } = {}) {
    const [rows] = await pool.execute(
      `SELECT 1
         FROM marcas
        WHERE slug = :slug
          ${excludeId ? 'AND id <> :excludeId' : ''}
        LIMIT 1`,
      excludeId ? { slug, excludeId } : { slug }
    );
    return rows.length > 0;
  },

  // Comprueba si el nombre ya existe. La unicidad del nombre es una regla de
  // negocio (la tabla solo declara UNIQUE en `slug`). La comparación es
  // insensible a mayúsculas y acentos por la collation utf8mb4_unicode_ci.
  async existsByNombre(nombre, { excludeId = null } = {}) {
    const [rows] = await pool.execute(
      `SELECT 1
         FROM marcas
        WHERE nombre = :nombre
          ${excludeId ? 'AND id <> :excludeId' : ''}
        LIMIT 1`,
      excludeId ? { nombre, excludeId } : { nombre }
    );
    return rows.length > 0;
  },

  async create({ nombre, slug, logoUrl = null, activo = true }) {
    const [result] = await pool.execute(
      `INSERT INTO marcas (nombre, slug, logo_url, activo)
       VALUES (:nombre, :slug, :logoUrl, :activo)`,
      { nombre, slug, logoUrl, activo: activo ? 1 : 0 }
    );
    return result.insertId;
  },

  // Actualización parcial: solo aplica los campos presentes en `fields`.
  async update(id, fields) {
    const allowed = ['nombre', 'slug', 'logo_url', 'activo'];
    const sets = [];
    const params = { id };

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = :${key}`);
        params[key] = key === 'activo' ? (fields[key] ? 1 : 0) : fields[key];
      }
    }

    if (sets.length === 0) return; // nada que actualizar

    await pool.execute(`UPDATE marcas SET ${sets.join(', ')} WHERE id = :id`, params);
  },

  // Borrado definitivo: la tabla no tiene soft delete. Los productos de la
  // marca sobreviven con `marca_id = NULL` (FK ON DELETE SET NULL).
  async remove(id) {
    const [result] = await pool.execute(`DELETE FROM marcas WHERE id = :id`, { id });
    return result.affectedRows > 0;
  },
};

module.exports = brandRepository;
