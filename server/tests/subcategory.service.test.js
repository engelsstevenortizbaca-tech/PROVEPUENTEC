'use strict';

const test = require('node:test');
const assert = require('node:assert');

const subcategoryRepository = require('../src/repositories/subcategory.repository');
const categoryRepository = require('../src/repositories/category.repository');
const subcategoryService = require('../src/services/subcategory.service');
const { NotFoundError, ConflictError, BadRequestError } = require('../src/errors');

// El service depende de dos repositorios (singletons): el propio y el de
// categorías, para validar la categoría padre. Estos tests los aíslan
// sustituyendo sus métodos, de modo que no se toca MySQL.

// Fila cruda tal y como la devolvería el repositorio (con la categoría padre
// resuelta por JOIN).
const dbRow = (over = {}) => ({
  id: 3,
  categoria_id: 1,
  nombre: 'Laptops',
  slug: 'laptops',
  activo: 1,
  created_at: '2026-07-25T10:00:00.000Z',
  updated_at: '2026-07-25T10:00:00.000Z',
  categoria_nombre: 'Electrónica',
  categoria_slug: 'electronica',
  ...over,
});

const categoryRow = (over = {}) => ({ id: 1, nombre: 'Electrónica', slug: 'electronica', ...over });

// Guarda y restaura los métodos originales de ambos repositorios entre tests
// para que las sustituciones de uno no filtren a otro.
const SUB_METHODS = [
  'findAll',
  'findById',
  'findBySlug',
  'existsBySlug',
  'create',
  'update',
  'remove',
  'countProductos',
];
const CATEGORY_METHODS = ['findById'];

let originals;

test.beforeEach(() => {
  originals = { sub: {}, cat: {} };
  // Por defecto, cualquier método no configurado por el test falla de forma
  // explícita para detectar llamadas inesperadas.
  for (const name of SUB_METHODS) {
    originals.sub[name] = subcategoryRepository[name];
    subcategoryRepository[name] = async () => {
      throw new Error(`Llamada inesperada a subcategoryRepository.${name}`);
    };
  }
  for (const name of CATEGORY_METHODS) {
    originals.cat[name] = categoryRepository[name];
    categoryRepository[name] = async () => {
      throw new Error(`Llamada inesperada a categoryRepository.${name}`);
    };
  }
});

test.afterEach(() => {
  Object.assign(subcategoryRepository, originals.sub);
  Object.assign(categoryRepository, originals.cat);
});

// --- create ---------------------------------------------------------------

test('create genera el slug a partir del nombre y anida la categoría padre', async () => {
  let createdWith = null;
  categoryRepository.findById = async () => categoryRow();
  subcategoryRepository.existsBySlug = async () => false;
  subcategoryRepository.create = async (data) => {
    createdWith = data;
    return 3;
  };
  subcategoryRepository.findById = async (id) => dbRow({ id, nombre: 'Cámaras y Fotografía' });

  const result = await subcategoryService.create({
    categoriaId: 1,
    nombre: '  Cámaras y Fotografía  ',
  });

  assert.strictEqual(createdWith.nombre, 'Cámaras y Fotografía'); // recorta espacios
  assert.strictEqual(createdWith.slug, 'camaras-y-fotografia'); // slug sin acentos
  assert.strictEqual(createdWith.categoriaId, 1);
  assert.strictEqual(createdWith.activo, true); // activo por defecto
  assert.strictEqual(result.id, 3);
  assert.strictEqual(result.activo, true); // proyección pública (boolean)
  assert.deepStrictEqual(result.categoria, {
    id: 1,
    nombre: 'Electrónica',
    slug: 'electronica',
  });
});

test('create lanza NotFoundError si la categoría padre no existe o está eliminada', async () => {
  categoryRepository.findById = async () => null;

  await assert.rejects(
    () => subcategoryService.create({ categoriaId: 99, nombre: 'Laptops' }),
    NotFoundError
  );
});

test('create lanza ConflictError si el slug ya existe', async () => {
  categoryRepository.findById = async () => categoryRow();
  subcategoryRepository.existsBySlug = async () => true;

  await assert.rejects(
    () => subcategoryService.create({ categoriaId: 1, nombre: 'Laptops' }),
    ConflictError
  );
});

test('create lanza BadRequestError si el nombre no produce un slug válido', async () => {
  await assert.rejects(
    () => subcategoryService.create({ categoriaId: 1, nombre: '###' }),
    BadRequestError
  );
});

// --- update ---------------------------------------------------------------

test('update lanza NotFoundError si la subcategoría no existe', async () => {
  subcategoryRepository.findById = async () => null;

  await assert.rejects(() => subcategoryService.update(99, { nombre: 'Nuevo' }), NotFoundError);
});

test('update recalcula el slug al cambiar el nombre', async () => {
  let updatedWith = null;
  subcategoryRepository.findById = async () =>
    updatedWith ? dbRow({ nombre: 'Portátiles', slug: 'portatiles' }) : dbRow();
  subcategoryRepository.existsBySlug = async () => false;
  subcategoryRepository.update = async (id, fields) => {
    updatedWith = fields;
  };

  const result = await subcategoryService.update(3, { nombre: 'Portátiles' });

  assert.strictEqual(updatedWith.slug, 'portatiles');
  assert.strictEqual(result.slug, 'portatiles');
});

test('update no toca el slug si el nombre nuevo produce el mismo slug', async () => {
  let updatedWith = null;
  subcategoryRepository.findById = async () => dbRow();
  subcategoryRepository.update = async (id, fields) => {
    updatedWith = fields;
  };

  await subcategoryService.update(3, { nombre: 'laptops' });

  assert.strictEqual(updatedWith.slug, undefined); // no se recalcula
});

test('update lanza ConflictError si el nuevo slug colisiona con otra subcategoría', async () => {
  subcategoryRepository.findById = async () => dbRow();
  subcategoryRepository.existsBySlug = async () => true;

  await assert.rejects(() => subcategoryService.update(3, { slug: 'tablets' }), ConflictError);
});

test('update mueve la subcategoría a otra categoría existente', async () => {
  let updatedWith = null;
  let checkedCategoryId = null;
  subcategoryRepository.findById = async () => dbRow();
  categoryRepository.findById = async (id) => {
    checkedCategoryId = id;
    return categoryRow({ id: 2, nombre: 'Hogar', slug: 'hogar' });
  };
  subcategoryRepository.update = async (id, fields) => {
    updatedWith = fields;
  };

  await subcategoryService.update(3, { categoriaId: 2 });

  assert.strictEqual(checkedCategoryId, 2); // valida la categoría destino
  assert.strictEqual(updatedWith.categoria_id, 2); // mapea a la columna de la BD
});

test('update lanza NotFoundError si la categoría destino no existe', async () => {
  subcategoryRepository.findById = async () => dbRow();
  categoryRepository.findById = async () => null;

  await assert.rejects(() => subcategoryService.update(3, { categoriaId: 99 }), NotFoundError);
});

test('update no valida la categoría si categoriaId es la actual', async () => {
  let updatedWith = null;
  subcategoryRepository.findById = async () => dbRow({ categoria_id: 1 });
  subcategoryRepository.update = async (id, fields) => {
    updatedWith = fields;
  };

  // categoryRepository.findById sigue lanzando: si se llamara, el test fallaría.
  await subcategoryService.update(3, { categoriaId: 1, activo: false });

  assert.strictEqual(updatedWith.categoria_id, undefined);
  assert.strictEqual(updatedWith.activo, false);
});

// --- remove ---------------------------------------------------------------

test('remove lanza NotFoundError si la subcategoría no existe', async () => {
  subcategoryRepository.findById = async () => null;

  await assert.rejects(() => subcategoryService.remove(99), NotFoundError);
});

test('remove lanza ConflictError si hay productos asociados', async () => {
  subcategoryRepository.findById = async () => dbRow();
  subcategoryRepository.countProductos = async () => 4;

  await assert.rejects(() => subcategoryService.remove(3), ConflictError);
});

test('remove borra definitivamente cuando no hay productos asociados', async () => {
  let removedId = null;
  subcategoryRepository.findById = async () => dbRow();
  subcategoryRepository.countProductos = async () => 0;
  subcategoryRepository.remove = async (id) => {
    removedId = id;
    return true;
  };

  await subcategoryService.remove(3);

  assert.strictEqual(removedId, 3);
});

// --- getById / getBySlug --------------------------------------------------

test('getById lanza NotFoundError si no existe', async () => {
  subcategoryRepository.findById = async () => null;

  await assert.rejects(() => subcategoryService.getById(99), NotFoundError);
});

test('getBySlug lanza NotFoundError si no existe', async () => {
  subcategoryRepository.findBySlug = async () => null;

  await assert.rejects(() => subcategoryService.getBySlug('inexistente'), NotFoundError);
});

// --- list -----------------------------------------------------------------

test('list normaliza la paginación y propaga el filtro por categoría', async () => {
  let calledWith = null;
  subcategoryRepository.findAll = async (opts) => {
    calledWith = opts;
    return { rows: [dbRow()], total: 42 };
  };

  const result = await subcategoryService.list({
    page: '2',
    limit: '20',
    q: '  lap  ',
    activo: 'true',
    categoriaId: '1',
  });

  assert.strictEqual(calledWith.limit, 20);
  assert.strictEqual(calledWith.offset, 20); // (page 2 - 1) * 20
  assert.strictEqual(calledWith.q, 'lap'); // recortado
  assert.strictEqual(calledWith.activo, true);
  assert.strictEqual(calledWith.categoriaId, 1); // entero, no cadena
  assert.strictEqual(result.pagination.page, 2);
  assert.strictEqual(result.pagination.totalPages, 3); // ceil(42 / 20)
  assert.strictEqual(result.data[0].activo, true); // proyección pública
});

test('list acota el limit al máximo permitido (100)', async () => {
  let calledWith = null;
  subcategoryRepository.findAll = async (opts) => {
    calledWith = opts;
    return { rows: [], total: 0 };
  };

  await subcategoryService.list({ limit: '999' });

  assert.strictEqual(calledWith.limit, 100);
  assert.strictEqual(calledWith.categoriaId, null); // sin filtro por categoría
});
