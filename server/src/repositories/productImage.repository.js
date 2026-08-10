'use strict';

const { executor } = require('../database/transaction');
const { buildSet } = require('../database/sql');

const COLUMNS = `id, producto_id, variante_id, url, orden, es_principal, created_at, updated_at`;

// Acceso a datos de `producto_imagenes`. La tabla no tiene soft delete: al
// borrar la fila hay que borrar también el archivo (lo hace el service con
// `utils/uploads`).
//
// `variante_id` queda siempre NULL: la API no expone variantes (decisión 2), de
// modo que las imágenes cuelgan del producto.
const productImageRepository = {
  // Galería completa de un producto, en el orden en que debe mostrarse.
  async findByProductId(productoId) {
    const [rows] = await executor().execute(
      `SELECT ${COLUMNS}
         FROM producto_imagenes
        WHERE producto_id = :productoId
        ORDER BY es_principal DESC, orden ASC, id ASC`,
      { productoId }
    );
    return rows;
  },

  // Galerías de varios productos en una sola consulta: evita las N+1 del
  // listado paginado. Devuelve las filas planas; el service las agrupa.
  async findByProductIds(productoIds = []) {
    if (productoIds.length === 0) return [];

    const params = {};
    const names = productoIds.map((id, i) => {
      params[`id${i}`] = id;
      return `:id${i}`;
    });

    const [rows] = await executor().execute(
      `SELECT ${COLUMNS}
         FROM producto_imagenes
        WHERE producto_id IN (${names.join(', ')})
        ORDER BY producto_id ASC, es_principal DESC, orden ASC, id ASC`,
      params
    );
    return rows;
  },

  // Se acota por producto para que un imageId de otro producto no sea
  // accesible desde la ruta anidada.
  async findById(id, productoId) {
    const [rows] = await executor().execute(
      `SELECT ${COLUMNS}
         FROM producto_imagenes
        WHERE id = :id AND producto_id = :productoId
        LIMIT 1`,
      { id, productoId }
    );
    return rows[0] || null;
  },

  async create({ productoId, url, orden = 0, esPrincipal = false }) {
    const [result] = await executor().execute(
      `INSERT INTO producto_imagenes (producto_id, url, orden, es_principal)
       VALUES (:productoId, :url, :orden, :esPrincipal)`,
      { productoId, url, orden, esPrincipal: esPrincipal ? 1 : 0 }
    );
    return result.insertId;
  },

  async update(id, fields) {
    const set = buildSet({
      allowed: ['orden', 'es_principal'],
      fields,
      booleanColumns: ['es_principal'],
    });
    if (!set) return; // nada que actualizar

    await executor().execute(`UPDATE producto_imagenes SET ${set.sql} WHERE id = :id`, {
      ...set.params,
      id,
    });
  },

  async remove(id) {
    const [result] = await executor().execute(`DELETE FROM producto_imagenes WHERE id = :id`, {
      id,
    });
    return result.affectedRows > 0;
  },

  // Desmarca la principal del producto. Garantiza la regla «solo una principal
  // por producto», que la BD no impone con un índice.
  async clearPrincipal(productoId, { exceptId = null } = {}) {
    await executor().execute(
      `UPDATE producto_imagenes
          SET es_principal = 0
        WHERE producto_id = :productoId
          AND es_principal = 1
          ${exceptId ? 'AND id <> :exceptId' : ''}`,
      exceptId ? { productoId, exceptId } : { productoId }
    );
  },

  async countByProductId(productoId) {
    const [rows] = await executor().execute(
      `SELECT COUNT(*) AS total FROM producto_imagenes WHERE producto_id = :productoId`,
      { productoId }
    );
    return Number(rows[0].total);
  },

  // Último valor de `orden` usado, para añadir al final de la galería.
  async maxOrden(productoId) {
    const [rows] = await executor().execute(
      `SELECT COALESCE(MAX(orden), -1) AS maximo
         FROM producto_imagenes
        WHERE producto_id = :productoId`,
      { productoId }
    );
    return Number(rows[0].maximo);
  },
};

module.exports = productImageRepository;
