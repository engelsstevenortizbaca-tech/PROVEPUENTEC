'use strict';

const { executor } = require('../database/transaction');
const { limitOffset, buildSet } = require('../database/sql');

// Los productos usan soft delete (`deleted_at`). La subcategoría es obligatoria
// y la categoría se resuelve a través de ella, así que ambas van con INNER JOIN;
// la marca es opcional y va con LEFT JOIN.
const FROM_SQL = `
    FROM productos p
    INNER JOIN subcategorias s ON s.id = p.subcategoria_id
    INNER JOIN categorias c    ON c.id = s.categoria_id
     LEFT JOIN marcas m        ON m.id = p.marca_id`;

const COLUMNS = `p.id, p.vendedor_id, p.subcategoria_id, p.marca_id, p.titulo, p.slug,
         p.descripcion, p.precio, p.condicion, p.estado, p.created_at, p.updated_at, p.deleted_at,
         s.nombre AS subcategoria_nombre, s.slug AS subcategoria_slug,
         c.id AS categoria_id, c.nombre AS categoria_nombre, c.slug AS categoria_slug,
         m.nombre AS marca_nombre, m.slug AS marca_slug`;

// Órdenes admitidos en el catálogo. Es una lista blanca: el valor del cliente
// nunca llega a la consulta, solo selecciona una de estas expresiones fijas.
// El desempate por `id` mantiene la paginación estable cuando varias filas
// comparten precio o fecha.
const ORDER_BY = Object.freeze({
  recientes: 'p.created_at DESC, p.id DESC',
  antiguos: 'p.created_at ASC, p.id ASC',
  precio_asc: 'p.precio ASC, p.id DESC',
  precio_desc: 'p.precio DESC, p.id DESC',
});

const DEFAULT_ORDER = 'recientes';

// Acceso a datos de `productos` y de su variante por defecto (decisión 2). La
// variante no tiene repositorio propio porque no es una entidad del dominio
// expuesto: pertenece al mismo agregado y solo se toca junto al producto.
const productRepository = {
  ORDER_BY,
  DEFAULT_ORDER,

  // Lista paginada con filtros opcionales. Devuelve { rows, total }.
  // `estados` restringe por estado (el catálogo público pasa solo 'activo').
  async findAll({
    q = null,
    subcategoriaId = null,
    categoriaId = null,
    marcaId = null,
    condicion = null,
    precioMin = null,
    precioMax = null,
    vendedorId = null,
    estados = null,
    includeDeleted = false,
    orden = DEFAULT_ORDER,
    limit = 20,
    offset = 0,
  } = {}) {
    const where = [];
    const params = {};

    if (!includeDeleted) where.push('p.deleted_at IS NULL');
    if (q) {
      where.push('(p.titulo LIKE :q OR p.descripcion LIKE :q)');
      params.q = `%${q}%`;
    }
    if (subcategoriaId !== null) {
      where.push('p.subcategoria_id = :subcategoriaId');
      params.subcategoriaId = subcategoriaId;
    }
    if (categoriaId !== null) {
      where.push('s.categoria_id = :categoriaId');
      params.categoriaId = categoriaId;
    }
    if (marcaId !== null) {
      where.push('p.marca_id = :marcaId');
      params.marcaId = marcaId;
    }
    if (condicion !== null) {
      where.push('p.condicion = :condicion');
      params.condicion = condicion;
    }
    if (precioMin !== null) {
      where.push('p.precio >= :precioMin');
      params.precioMin = precioMin;
    }
    if (precioMax !== null) {
      where.push('p.precio <= :precioMax');
      params.precioMax = precioMax;
    }
    if (vendedorId !== null) {
      where.push('p.vendedor_id = :vendedorId');
      params.vendedorId = vendedorId;
    }
    // Un placeholder por estado: la lista viene de constantes del servidor, no
    // del cliente, pero se parametriza igual por coherencia.
    if (Array.isArray(estados) && estados.length > 0) {
      const names = estados.map((estado, i) => {
        params[`estado${i}`] = estado;
        return `:estado${i}`;
      });
      where.push(`p.estado IN (${names.join(', ')})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderSql = ORDER_BY[orden] || ORDER_BY[DEFAULT_ORDER];

    const [rows] = await executor().execute(
      `SELECT ${COLUMNS}
       ${FROM_SQL}
       ${whereSql}
        ORDER BY ${orderSql}
        ${limitOffset({ limit, offset })}`,
      params
    );

    const [countRows] = await executor().execute(
      `SELECT COUNT(*) AS total ${FROM_SQL} ${whereSql}`,
      params
    );

    return { rows, total: Number(countRows[0].total) };
  },

  async findById(id, { includeDeleted = false } = {}) {
    const [rows] = await executor().execute(
      `SELECT ${COLUMNS}
       ${FROM_SQL}
        WHERE p.id = :id
          ${includeDeleted ? '' : 'AND p.deleted_at IS NULL'}
        LIMIT 1`,
      { id }
    );
    return rows[0] || null;
  },

  async findBySlug(slug, { includeDeleted = false } = {}) {
    const [rows] = await executor().execute(
      `SELECT ${COLUMNS}
       ${FROM_SQL}
        WHERE p.slug = :slug
          ${includeDeleted ? '' : 'AND p.deleted_at IS NULL'}
        LIMIT 1`,
      { slug }
    );
    return rows[0] || null;
  },

  // Comprueba si el slug ya existe. Incluye los productos eliminados porque
  // `slug` es UNIQUE en la BD y el soft delete no libera el valor.
  async existsBySlug(slug, { excludeId = null } = {}) {
    const [rows] = await executor().execute(
      `SELECT 1
         FROM productos
        WHERE slug = :slug
          ${excludeId ? 'AND id <> :excludeId' : ''}
        LIMIT 1`,
      excludeId ? { slug, excludeId } : { slug }
    );
    return rows.length > 0;
  },

  async create({
    vendedorId,
    subcategoriaId,
    marcaId = null,
    titulo,
    slug,
    descripcion = null,
    precio,
    condicion,
    estado,
  }) {
    const [result] = await executor().execute(
      `INSERT INTO productos
         (vendedor_id, subcategoria_id, marca_id, titulo, slug, descripcion, precio, condicion, estado)
       VALUES
         (:vendedorId, :subcategoriaId, :marcaId, :titulo, :slug, :descripcion, :precio, :condicion, :estado)`,
      { vendedorId, subcategoriaId, marcaId, titulo, slug, descripcion, precio, condicion, estado }
    );
    return result.insertId;
  },

  // Actualización parcial: solo aplica los campos presentes en `fields`.
  async update(id, fields) {
    const set = buildSet({
      allowed: [
        'subcategoria_id',
        'marca_id',
        'titulo',
        'slug',
        'descripcion',
        'precio',
        'condicion',
        'estado',
      ],
      fields,
    });
    if (!set) return; // nada que actualizar

    await executor().execute(`UPDATE productos SET ${set.sql} WHERE id = :id`, {
      ...set.params,
      id,
    });
  },

  // Borrado lógico. Marca además el ENUM `estado` como 'eliminado' para que las
  // consultas que solo miran el estado (negociaciones) lo descarten igual.
  async softDelete(id, estadoEliminado) {
    const [result] = await executor().execute(
      `UPDATE productos
          SET deleted_at = CURRENT_TIMESTAMP, estado = :estado
        WHERE id = :id AND deleted_at IS NULL`,
      { id, estado: estadoEliminado }
    );
    return result.affectedRows > 0;
  },

  // --- Variante por defecto (decisión 2) ---------------------------------
  // Todo producto tiene exactamente una. Se crea con el producto, dentro de la
  // misma transacción, y su precio es el autoritativo para las tablas
  // transaccionales heredadas.

  async createDefaultVariant({ productoId, precio }) {
    const [result] = await executor().execute(
      `INSERT INTO producto_variantes (producto_id, precio, activo)
       VALUES (:productoId, :precio, 1)`,
      { productoId, precio }
    );
    return result.insertId;
  },

  // Sincroniza el precio de la variante con el del producto. El trigger
  // `trg_variantes_precio_historial` registra el cambio en `precio_historial`,
  // así que aquí no se escribe historial.
  async syncVariantPrice(productoId, precio) {
    const [result] = await executor().execute(
      `UPDATE producto_variantes SET precio = :precio WHERE producto_id = :productoId`,
      { productoId, precio }
    );
    return result.affectedRows;
  },
};

module.exports = productRepository;
