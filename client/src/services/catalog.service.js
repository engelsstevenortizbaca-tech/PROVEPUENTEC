// Taxonomía y marcas. Endpoints reales de category.routes.js,
// subcategory.routes.js y brand.routes.js.
//
// Solo se exponen las lecturas públicas: la gestión (POST/PATCH/DELETE) exige
// rol `admin` y no forma parte de las pantallas priorizadas.
import { http } from './http';

export const categoryService = {
  // { data, pagination }. `activo=true` deja fuera las categorías desactivadas.
  list: (params) => http.get('/categories', { params }),
  getBySlug: async (slug) => (await http.get(`/categories/slug/${slug}`))?.category || null,
  getById: async (id) => (await http.get(`/categories/${id}`))?.category || null,
};

export const subcategoryService = {
  // Filtrable por `categoriaId` para poblar el segundo nivel de la taxonomía.
  list: (params) => http.get('/subcategories', { params }),
  getBySlug: async (slug) => (await http.get(`/subcategories/slug/${slug}`))?.subcategory || null,
  getById: async (id) => (await http.get(`/subcategories/${id}`))?.subcategory || null,
};

export const brandService = {
  list: (params) => http.get('/brands', { params }),
  getBySlug: async (slug) => (await http.get(`/brands/slug/${slug}`))?.brand || null,
  getById: async (id) => (await http.get(`/brands/${id}`))?.brand || null,
};
