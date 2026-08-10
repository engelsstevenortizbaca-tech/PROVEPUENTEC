'use strict';

const { toPublicProductImage } = require('./productImage.model');

// Proyecta una fila de `productos` a su representación pública.
//
// La variante por defecto (decisión 2) es un detalle interno del modelo de
// datos: existe para que las FK heredadas sigan siendo válidas, pero la API
// expone el precio de forma plana y nunca menciona variantes.
//
// `precio` llega de MySQL como cadena (DECIMAL se serializa así para no perder
// precisión); se convierte a número para que el JSON no mezcle tipos.
const toPublicProduct = (row, { imagenes } = {}) => ({
  id: row.id,
  vendedorId: row.vendedor_id,
  subcategoriaId: row.subcategoria_id,
  marcaId: row.marca_id,
  titulo: row.titulo,
  slug: row.slug,
  descripcion: row.descripcion,
  precio: Number(row.precio),
  condicion: row.condicion,
  estado: row.estado,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  // Las relaciones solo se anidan cuando la consulta las resolvió por JOIN.
  ...(row.subcategoria_nombre !== undefined && {
    subcategoria: {
      id: row.subcategoria_id,
      nombre: row.subcategoria_nombre,
      slug: row.subcategoria_slug,
    },
  }),
  ...(row.categoria_nombre !== undefined && {
    categoria: {
      id: row.categoria_id,
      nombre: row.categoria_nombre,
      slug: row.categoria_slug,
    },
  }),
  // La marca es opcional: con marca_id NULL el LEFT JOIN no aporta nombre.
  ...(row.marca_nombre != null && {
    marca: {
      id: row.marca_id,
      nombre: row.marca_nombre,
      slug: row.marca_slug,
    },
  }),
  ...(imagenes !== undefined && { imagenes: imagenes.map(toPublicProductImage) }),
});

module.exports = { toPublicProduct };
