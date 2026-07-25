'use strict';

const test = require('node:test');
const assert = require('node:assert');

const categoryRepository = require('../src/repositories/category.repository');
const categoryService = require('../src/services/category.service');
const { NotFoundError, ConflictError, BadRequestError } = require('../src/errors');

// El service usa el repositorio (un singleton) como única dependencia de datos.
// Estos tests lo aíslan sustituyendo sus métodos, de modo que no se toca MySQL.

// Fila cruda tal y como la devolvería el repositorio desde la BD.
const dbRow = (over = {}) => ({
  id: 1,
  nombre: 'Electrónica',
  slug: 'electronica',
  descripcion: 'Dispositivos',
  activo: 1,
  created_at: '2026-07-24T10:00:00.000Z',
  updated_at: '2026-07-24T10:00:00.000Z',
  deleted_at: null,
  ...over,
});

// Guarda y restaura los métodos originales del repositorio entre tests para
// que las sustituciones de uno no filtren a otro.
const REPO_METHODS = [
  'findAll',
  'findById',
  'findBySlug',
  'existsBySlug',
  'create',
  'update',
  'softDelete',
  'restore',
];

let originals;

test.beforeEach(() => {
  originals = {};
  for (const name of REPO_METHODS) {
    originals[name] = categoryRepository[name];
    // Por defecto, cualquier método no configurado por el test falla de forma
    // explícita para detectar llamadas inesperadas.
    categoryRepository[name] = async () => {
      throw new Error(`Llamada inesperada a categoryRepository.${name}`);
    };
  }
});

test.afterEach(() => {
  Object.assign(categoryRepository, originals);
});

// --- create ---------------------------------------------------------------

test('create genera el slug a partir del nombre cuando no se envía', async () => {
  let createdWith = null;
  categoryRepository.existsBySlug = async () => false;
  categoryRepository.create = async (data) => {
    createdWith = data;
    return 7;
  };
  categoryRepository.findById = async (id) =>
    dbRow({ id, slug: 'ropa-y-calzado', nombre: 'Ropa y Calzado' });

  const result = await categoryService.create({ nombre: '  Ropa y Calzado  ' });

  assert.strictEqual(createdWith.nombre, 'Ropa y Calzado'); // recorta espacios
  assert.strictEqual(createdWith.slug, 'ropa-y-calzado'); // slug derivado del nombre
  assert.strictEqual(createdWith.activo, true); // activo por defecto
  assert.strictEqual(result.id, 7);
  assert.strictEqual(result.activo, true); // proyección pública (boolean)
});

test('create respeta un slug explícito ya normalizado', async () => {
  let createdWith = null;
  categoryRepository.existsBySlug = async () => false;
  categoryRepository.create = async (data) => {
    createdWith = data;
    return 1;
  };
  categoryRepository.findById = async () => dbRow({ slug: 'mi-slug' });

  await categoryService.create({ nombre: 'Cualquiera', slug: 'mi-slug' });

  assert.strictEqual(createdWith.slug, 'mi-slug');
});

test('create lanza ConflictError si el slug ya existe', async () => {
  categoryRepository.existsBySlug = async () => true;

  await assert.rejects(() => categoryService.create({ nombre: 'Electrónica' }), ConflictError);
});

test('create lanza BadRequestError si el nombre no produce un slug válido', async () => {
  await assert.rejects(() => categoryService.create({ nombre: '!!!' }), BadRequestError);
});

// --- update ---------------------------------------------------------------

test('update lanza NotFoundError si la categoría no existe', async () => {
  categoryRepository.findById = async () => null;

  await assert.rejects(() => categoryService.update(99, { nombre: 'Nuevo' }), NotFoundError);
});

test('update recalcula el slug al cambiar el nombre', async () => {
  let updatedWith = null;
  categoryRepository.findById = async (id, opts) => {
    // Primera llamada: estado actual; segunda: fila ya actualizada.
    if (opts === undefined && updatedWith) {
      return dbRow({ nombre: 'Hogar y Jardín', slug: 'hogar-y-jardin' });
    }
    return dbRow({ nombre: 'Hogar', slug: 'hogar' });
  };
  categoryRepository.existsBySlug = async () => false;
  categoryRepository.update = async (id, fields) => {
    updatedWith = fields;
  };

  const result = await categoryService.update(1, { nombre: 'Hogar y Jardín' });

  assert.strictEqual(updatedWith.slug, 'hogar-y-jardin');
  assert.strictEqual(result.slug, 'hogar-y-jardin');
});

test('update no toca el slug si el nombre nuevo produce el mismo slug', async () => {
  let updatedWith = null;
  categoryRepository.findById = async () => dbRow({ nombre: 'Hogar', slug: 'hogar' });
  categoryRepository.update = async (id, fields) => {
    updatedWith = fields;
  };

  await categoryService.update(1, { nombre: 'hogar' });

  assert.strictEqual(updatedWith.slug, undefined); // no se recalcula
});

test('update lanza ConflictError si el nuevo slug colisiona con otra categoría', async () => {
  categoryRepository.findById = async () => dbRow({ nombre: 'Hogar', slug: 'hogar' });
  categoryRepository.existsBySlug = async () => true;

  await assert.rejects(() => categoryService.update(1, { slug: 'electronica' }), ConflictError);
});

// --- remove / restore -----------------------------------------------------

test('remove lanza NotFoundError si no había nada que eliminar', async () => {
  categoryRepository.softDelete = async () => false;

  await assert.rejects(() => categoryService.remove(99), NotFoundError);
});

test('remove resuelve sin error cuando el soft delete tiene efecto', async () => {
  categoryRepository.softDelete = async () => true;

  await assert.doesNotReject(() => categoryService.remove(1));
});

test('restore lanza ConflictError si la categoría no está eliminada', async () => {
  categoryRepository.findById = async () => dbRow({ deleted_at: null });

  await assert.rejects(() => categoryService.restore(1), ConflictError);
});

test('restore reactiva una categoría eliminada', async () => {
  let restored = false;
  categoryRepository.findById = async (id, opts) => {
    if (opts && opts.includeDeleted) return dbRow({ deleted_at: '2026-07-20T00:00:00.000Z' });
    return dbRow({ deleted_at: null });
  };
  categoryRepository.restore = async () => {
    restored = true;
    return true;
  };

  const result = await categoryService.restore(1);

  assert.strictEqual(restored, true);
  assert.strictEqual(result.id, 1);
});

// --- getById / getBySlug --------------------------------------------------

test('getById lanza NotFoundError si no existe', async () => {
  categoryRepository.findById = async () => null;

  await assert.rejects(() => categoryService.getById(99), NotFoundError);
});

test('getBySlug lanza NotFoundError si no existe', async () => {
  categoryRepository.findBySlug = async () => null;

  await assert.rejects(() => categoryService.getBySlug('inexistente'), NotFoundError);
});

// --- list -----------------------------------------------------------------

test('list normaliza la paginación y calcula totalPages', async () => {
  let calledWith = null;
  categoryRepository.findAll = async (opts) => {
    calledWith = opts;
    return { rows: [dbRow()], total: 42 };
  };

  const result = await categoryService.list({
    page: '2',
    limit: '20',
    q: '  tv  ',
    activo: 'true',
  });

  assert.strictEqual(calledWith.limit, 20);
  assert.strictEqual(calledWith.offset, 20); // (page 2 - 1) * 20
  assert.strictEqual(calledWith.q, 'tv'); // recortado
  assert.strictEqual(calledWith.activo, true);
  assert.strictEqual(result.pagination.page, 2);
  assert.strictEqual(result.pagination.total, 42);
  assert.strictEqual(result.pagination.totalPages, 3); // ceil(42 / 20)
  assert.strictEqual(result.data[0].activo, true); // proyección pública
});

test('list acota el limit al máximo permitido (100)', async () => {
  let calledWith = null;
  categoryRepository.findAll = async (opts) => {
    calledWith = opts;
    return { rows: [], total: 0 };
  };

  await categoryService.list({ limit: '999' });

  assert.strictEqual(calledWith.limit, 100);
});
