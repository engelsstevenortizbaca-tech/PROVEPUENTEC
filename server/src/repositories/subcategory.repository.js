'use strict';

const { executor } = require('../database/transaction');
const { limitOffset, buildSet } = require('../database/sql');

// Las subcategorías NO tienen soft delete (se borran de forma definitiva), pero
// su categoría padre sí. Por eso todas las lecturas resuelven la categoría con
// un INNER JOIN que descarta las categorías eliminadas: al eliminar una
// categoría sus subcategorías dejan de ser visibles, y al restaurarla vuelven.
const FROM_SQL = `
    FROM subcategorias s
    INNER JOIN categorias c
       ON c.id = s.categoria_id
      AND c.deleted_at IS NULL`;

const COLUMNS = `s.id, s.categoria_id, s.nombre, s.slug, s.activo, s.created_at, s.updated_at,
         c.nombre AS categoria_nombre, c.slug AS categoria_slug`;

// Acceso a datos de la tabla `subcategorias` (segundo nivel de la taxonomía).
const subcategoryRepository = {
  // Lista paginada con filtros opcionales. Devuelve { rows, total }.
  async findAll({ q = null, activo = null, categoriaId = null, limit = 20, offset = 0 } = {}) {
    const where = [];
    const params = {};

    if (q) {
      where.push('s.nombre LIKE :q');
      params.q = `%${q}%`;
    }
    if (activo !== null) {
      where.push('s.activo = :activo');
      params.activo = activo ? 1 : 0;
    }
    if (categoriaId !== null) {
      where.push('s.categoria_id = :categoriaId');
      params.categoriaId = categoriaId;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await executor().execute(
      `SELECT ${COLUMNS}
       ${FROM_SQL}
       ${whereSql}
        ORDER BY c.nombre ASC, s.nombre ASC
        ${limitOffset({ limit, offset })}`,
      params
    );

    const [countRows] = await executor().execute(
      `SELECT COUNT(*) AS total ${FROM_SQL} ${whereSql}`,
      params
    );

    return { rows, total: Number(countRows[0].total) };
  },

  async findById(id) {
    const [rows] = await executor().execute(
      `SELECT ${COLUMNS}
       ${FROM_SQL}
        WHERE s.id = :id
        LIMIT 1`,
      { id }
    );
    return rows[0] || null;
  },

  async findBySlug(slug) {
    const [rows] = await executor().execute(
      `SELECT ${COLUMNS}
       ${FROM_SQL}
        WHERE s.slug = :slug
        LIMIT 1`,
      { slug }
    );
    return rows[0] || null;
  },

  // Comprueba si el slug ya existe. Consulta la tabla sin JOIN porque `slug` es
  // UNIQUE a nivel global, incluidas las subcategorías de categorías
  // eliminadas. Permite excluir un id (útil al actualizar).
  async existsBySlug(slug, { excludeId = null } = {}) {
    const [rows] = await executor().execute(
      `SELECT 1
         FROM subcategorias
        WHERE slug = :slug
          ${excludeId ? 'AND id <> :excludeId' : ''}
        LIMIT 1`,
      excludeId ? { slug, excludeId } : { slug }
    );
    return rows.length > 0;
  },

  async create({ categoriaId, nombre, slug, activo = true }) {
    const [result] = await executor().execute(
      `INSERT INTO subcategorias (categoria_id, nombre, slug, activo)
       VALUES (:categoriaId, :nombre, :slug, :activo)`,
      { categoriaId, nombre, slug, activo: activo ? 1 : 0 }
    );
    return result.insertId;
  },

  // Actualización parcial: solo aplica los campos presentes en `fields`.
  async update(id, fields) {
    const set = buildSet({
      allowed: ['categoria_id', 'nombre', 'slug', 'activo'],
      fields,
      booleanColumns: ['activo'],
    });
    if (!set) return; // nada que actualizar

    await executor().execute(`UPDATE subcategorias SET ${set.sql} WHERE id = :id`, {
      ...set.params,
      id,
    });
  },

  // Borrado definitivo: la tabla no tiene soft delete.
  async remove(id) {
    const [result] = await executor().execute(`DELETE FROM subcategorias WHERE id = :id`, { id });
    return result.affectedRows > 0;
  },

  // Productos que dependen de la subcategoría. Cuenta también los eliminados
  // por soft delete, porque la FK (ON DELETE RESTRICT) sigue vigente para ellos.
  async countProductos(id) {
    const [rows] = await executor().execute(
      `SELECT COUNT(*) AS total FROM productos WHERE subcategoria_id = :id`,
      { id }
    );
    return Number(rows[0].total);
  },
};

module.exports = subcategoryRepository;
