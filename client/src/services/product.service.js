// Endpoints reales de `server/src/routes/product.routes.js`.
import { http } from './http';

// Órdenes admitidos por el catálogo. Es la misma lista blanca del repositorio
// (`ORDER_BY`): enviar otro valor haría que el backend caiga en el por defecto.
export const ORDENES = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'precio_asc', label: 'Precio: menor a mayor' },
  { value: 'precio_desc', label: 'Precio: mayor a menor' },
  { value: 'antiguos', label: 'Más antiguos' },
];

// Mismo valor por defecto que `DEFAULT_ORDER` en el repositorio del backend.
export const ORDEN_POR_DEFECTO = 'recientes';

export const esOrdenValido = (valor) => ORDENES.some((orden) => orden.value === valor);

export const CONDICIONES = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'usado', label: 'Usado' },
];

// Valores del ENUM `productos.estado`. El catálogo público solo devuelve
// `activo`; el resto aparece al consultar una publicación propia.
export const ETIQUETA_ESTADO = {
  borrador: 'Borrador',
  activo: 'Disponible',
  pausado: 'Pausado',
  vendido: 'Vendido',
  eliminado: 'Retirado',
};

// Filtros admitidos por GET /products. Cualquier otra clave se descarta antes
// de construir la query.
const FILTROS = [
  'page',
  'limit',
  'q',
  'categoriaId',
  'subcategoriaId',
  'marcaId',
  'vendedorId',
  'condicion',
  'precioMin',
  'precioMax',
  'orden',
];

const soloFiltrosValidos = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([key]) => FILTROS.includes(key)));

export const productService = {
  // Catálogo público. Devuelve { data, pagination }.
  list: (params) => http.get('/products', { params: soloFiltrosValidos(params) }),

  // Publicaciones propias, borradores incluidos.
  listMine: (params) =>
    http.get('/products/me', { params: soloFiltrosValidos(params), auth: true }),

  // La autenticación es opcional: enviarla permite al dueño ver su borrador.
  getById: async (id) => (await http.get(`/products/${id}`, { auth: true }))?.product || null,

  getBySlug: async (slug) =>
    (await http.get(`/products/slug/${slug}`, { auth: true }))?.product || null,

  create: async (data) => (await http.post('/products', data, { auth: true }))?.product || null,

  update: async (id, data) =>
    (await http.patch(`/products/${id}`, data, { auth: true }))?.product || null,

  changeStatus: async (id, estado) =>
    (await http.patch(`/products/${id}/status`, { estado }, { auth: true }))?.product || null,

  remove: (id) => http.delete(`/products/${id}`, { auth: true }),

  // Galería. El backend espera multipart con el campo repetido `imagenes`.
  addImages: async (id, files) => {
    const form = new FormData();
    for (const file of files) form.append('imagenes', file);
    return (await http.post(`/products/${id}/images`, form, { auth: true }))?.imagenes || [];
  },

  updateImage: async (id, imageId, data) =>
    (await http.patch(`/products/${id}/images/${imageId}`, data, { auth: true }))?.imagenes || [],

  removeImage: (id, imageId) => http.delete(`/products/${id}/images/${imageId}`, { auth: true }),
};
