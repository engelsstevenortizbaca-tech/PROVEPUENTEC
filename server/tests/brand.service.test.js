'use strict';

const test = require('node:test');
const assert = require('node:assert');

const brandRepository = require('../src/repositories/brand.repository');
const brandService = require('../src/services/brand.service');
const { NotFoundError, ConflictError, BadRequestError } = require('../src/errors');

// El service usa el repositorio (un singleton) como única dependencia de datos.
// Estos tests lo aíslan sustituyendo sus métodos, de modo que no se toca MySQL.

// Fila cruda tal y como la devolvería el repositorio desde la BD.
const dbRow = (over = {}) => ({
  id: 1,
  nombre: 'Samsung',
  slug: 'samsung',
  logo_url: 'https://cdn.example.com/samsung.png',
  activo: 1,
  created_at: '2026-07-25T10:00:00.000Z',
  updated_at: '2026-07-25T10:00:00.000Z',
  ...over,
});

// Guarda y restaura los métodos originales del repositorio entre tests para
// que las sustituciones de uno no filtren a otro.
const REPO_METHODS = [
  'findAll',
  'findById',
  'findBySlug',
  'existsBySlug',
  'existsByNombre',
  'create',
  'update',
  'remove',
];

let originals;

test.beforeEach(() => {
  originals = {};
  for (const name of REPO_METHODS) {
    originals[name] = brandRepository[name];
    // Por defecto, cualquier método no configurado por el test falla de forma
    // explícita para detectar llamadas inesperadas.
    brandRepository[name] = async () => {
      throw new Error(`Llamada inesperada a brandRepository.${name}`);
    };
  }
});

test.afterEach(() => {
  Object.assign(brandRepository, originals);
});

// --- create ---------------------------------------------------------------

test('create genera el slug a partir del nombre cuando no se envía', async () => {
  let createdWith = null;
  brandRepository.existsByNombre = async () => false;
  brandRepository.existsBySlug = async () => false;
  brandRepository.create = async (data) => {
    createdWith = data;
    return 5;
  };
  brandRepository.findById = async (id) =>
    dbRow({ id, nombre: 'Möbel Diseño', slug: 'mobel-diseno' });

  const result = await brandService.create({ nombre: '  Möbel Diseño  ' });

  assert.strictEqual(createdWith.nombre, 'Möbel Diseño'); // recorta espacios
  assert.strictEqual(createdWith.slug, 'mobel-diseno'); // slug sin diacríticos
  assert.strictEqual(createdWith.logoUrl, null); // sin logo por defecto
  assert.strictEqual(createdWith.activo, true); // activo por defecto
  assert.strictEqual(result.id, 5);
  assert.strictEqual(result.activo, true); // proyección pública (boolean)
});

test('create respeta un slug explícito y guarda el logo', async () => {
  let createdWith = null;
  brandRepository.existsByNombre = async () => false;
  brandRepository.existsBySlug = async () => false;
  brandRepository.create = async (data) => {
    createdWith = data;
    return 1;
  };
  brandRepository.findById = async () => dbRow();

  await brandService.create({
    nombre: 'Samsung',
    slug: 'mi-slug',
    logoUrl: '  https://cdn.example.com/samsung.png  ',
  });

  assert.strictEqual(createdWith.slug, 'mi-slug');
  assert.strictEqual(createdWith.logoUrl, 'https://cdn.example.com/samsung.png'); // recortado
});

test('create lanza ConflictError si el nombre ya existe', async () => {
  brandRepository.existsByNombre = async () => true;

  await assert.rejects(() => brandService.create({ nombre: 'Samsung' }), ConflictError);
});

test('create lanza ConflictError si el slug ya existe', async () => {
  brandRepository.existsByNombre = async () => false;
  brandRepository.existsBySlug = async () => true;

  await assert.rejects(() => brandService.create({ nombre: 'Samsung' }), ConflictError);
});

test('create lanza BadRequestError si el nombre no produce un slug válido', async () => {
  await assert.rejects(() => brandService.create({ nombre: '***' }), BadRequestError);
});

// --- update ---------------------------------------------------------------

test('update lanza NotFoundError si la marca no existe', async () => {
  brandRepository.findById = async () => null;

  await assert.rejects(() => brandService.update(99, { nombre: 'Nuevo' }), NotFoundError);
});

test('update recalcula el slug al cambiar el nombre', async () => {
  let updatedWith = null;
  brandRepository.findById = async () =>
    updatedWith ? dbRow({ nombre: 'Samsung Electronics', slug: 'samsung-electronics' }) : dbRow();
  brandRepository.existsByNombre = async () => false;
  brandRepository.existsBySlug = async () => false;
  brandRepository.update = async (id, fields) => {
    updatedWith = fields;
  };

  const result = await brandService.update(1, { nombre: 'Samsung Electronics' });

  assert.strictEqual(updatedWith.slug, 'samsung-electronics');
  assert.strictEqual(result.slug, 'samsung-electronics');
});

test('update no comprueba el nombre si no cambia', async () => {
  let updatedWith = null;
  brandRepository.findById = async () => dbRow();
  brandRepository.update = async (id, fields) => {
    updatedWith = fields;
  };

  // existsByNombre sigue lanzando: si se llamara, el test fallaría.
  await brandService.update(1, { nombre: 'Samsung' });

  assert.strictEqual(updatedWith.nombre, 'Samsung');
  assert.strictEqual(updatedWith.slug, undefined); // mismo slug, no se recalcula
});

test('update lanza ConflictError si el nuevo nombre pertenece a otra marca', async () => {
  brandRepository.findById = async () => dbRow();
  brandRepository.existsByNombre = async () => true;

  await assert.rejects(() => brandService.update(1, { nombre: 'Sony' }), ConflictError);
});

test('update lanza ConflictError si el nuevo slug colisiona con otra marca', async () => {
  brandRepository.findById = async () => dbRow();
  brandRepository.existsBySlug = async () => true;

  await assert.rejects(() => brandService.update(1, { slug: 'sony' }), ConflictError);
});

test('update con logoUrl null deja la marca sin logo', async () => {
  let updatedWith = null;
  brandRepository.findById = async () => dbRow();
  brandRepository.update = async (id, fields) => {
    updatedWith = fields;
  };

  await brandService.update(1, { logoUrl: null });

  assert.strictEqual(updatedWith.logo_url, null); // mapea a la columna de la BD
});

// --- remove ---------------------------------------------------------------

test('remove lanza NotFoundError si no había nada que eliminar', async () => {
  brandRepository.remove = async () => false;

  await assert.rejects(() => brandService.remove(99), NotFoundError);
});

test('remove resuelve sin error cuando el borrado tiene efecto', async () => {
  let removedId = null;
  brandRepository.remove = async (id) => {
    removedId = id;
    return true;
  };

  await brandService.remove(1);

  assert.strictEqual(removedId, 1);
});

// --- getById / getBySlug --------------------------------------------------

test('getById lanza NotFoundError si no existe', async () => {
  brandRepository.findById = async () => null;

  await assert.rejects(() => brandService.getById(99), NotFoundError);
});

test('getBySlug lanza NotFoundError si no existe', async () => {
  brandRepository.findBySlug = async () => null;

  await assert.rejects(() => brandService.getBySlug('inexistente'), NotFoundError);
});

test('getById proyecta logo_url como logoUrl', async () => {
  brandRepository.findById = async () => dbRow({ logo_url: null });

  const result = await brandService.getById(1);

  assert.strictEqual(result.logoUrl, null);
  assert.strictEqual(result.logo_url, undefined); // no filtra la columna cruda
});

// --- list -----------------------------------------------------------------

test('list normaliza la paginación y calcula totalPages', async () => {
  let calledWith = null;
  brandRepository.findAll = async (opts) => {
    calledWith = opts;
    return { rows: [dbRow()], total: 42 };
  };

  const result = await brandService.list({
    page: '2',
    limit: '20',
    q: '  sam  ',
    activo: 'true',
  });

  assert.strictEqual(calledWith.limit, 20);
  assert.strictEqual(calledWith.offset, 20); // (page 2 - 1) * 20
  assert.strictEqual(calledWith.q, 'sam'); // recortado
  assert.strictEqual(calledWith.activo, true);
  assert.strictEqual(result.pagination.page, 2);
  assert.strictEqual(result.pagination.total, 42);
  assert.strictEqual(result.pagination.totalPages, 3); // ceil(42 / 20)
  assert.strictEqual(result.data[0].activo, true); // proyección pública
});

test('list acota el limit al máximo permitido (100)', async () => {
  let calledWith = null;
  brandRepository.findAll = async (opts) => {
    calledWith = opts;
    return { rows: [], total: 0 };
  };

  await brandService.list({ limit: '999' });

  assert.strictEqual(calledWith.limit, 100);
});
