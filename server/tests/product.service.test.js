'use strict';

const test = require('node:test');
const assert = require('node:assert');

const poolModule = require('../src/database/pool');
const productRepository = require('../src/repositories/product.repository');
const productImageRepository = require('../src/repositories/productImage.repository');
const subcategoryRepository = require('../src/repositories/subcategory.repository');
const brandRepository = require('../src/repositories/brand.repository');
const productService = require('../src/services/product.service');
const { PRODUCT_STATUS } = require('../src/constants/productStatus');
const { NotFoundError, ConflictError } = require('../src/errors');

// El service depende de cuatro repositorios (singletons) y del helper
// transaccional. Estos tests los aíslan sustituyendo sus métodos y el
// `getConnection` del pool, de modo que no se toca MySQL.

// Fila cruda tal y como la devuelve el repositorio, con las relaciones
// resueltas por JOIN.
const dbRow = (over = {}) => ({
  id: 7,
  vendedor_id: 42,
  subcategoria_id: 3,
  marca_id: null,
  titulo: 'Laptop Dell XPS 13',
  slug: 'laptop-dell-xps-13',
  descripcion: 'Como nueva',
  precio: '1500.00',
  condicion: 'usado',
  estado: PRODUCT_STATUS.ACTIVO,
  created_at: '2026-08-01T10:00:00.000Z',
  updated_at: '2026-08-01T10:00:00.000Z',
  deleted_at: null,
  subcategoria_nombre: 'Laptops',
  subcategoria_slug: 'laptops',
  categoria_id: 1,
  categoria_nombre: 'Electrónica',
  categoria_slug: 'electronica',
  marca_nombre: null,
  marca_slug: null,
  ...over,
});

// Conexión falsa: registra la secuencia para comprobar que hubo transacción.
const fakeConnection = () => {
  const calls = [];
  return {
    calls,
    beginTransaction: async () => calls.push('begin'),
    commit: async () => calls.push('commit'),
    rollback: async () => calls.push('rollback'),
    release: () => calls.push('release'),
    execute: async () => [[], []],
  };
};

const PRODUCT_METHODS = [
  'findAll',
  'findById',
  'findBySlug',
  'existsBySlug',
  'create',
  'update',
  'softDelete',
  'createDefaultVariant',
  'syncVariantPrice',
];
const IMAGE_METHODS = ['findByProductId', 'findByProductIds'];
const SUB_METHODS = ['findById'];
const BRAND_METHODS = ['findById'];

const GROUPS = [
  [productRepository, PRODUCT_METHODS, 'productRepository'],
  [productImageRepository, IMAGE_METHODS, 'productImageRepository'],
  [subcategoryRepository, SUB_METHODS, 'subcategoryRepository'],
  [brandRepository, BRAND_METHODS, 'brandRepository'],
];

let originals;
let originalGetConnection;
let connection;

test.beforeEach(() => {
  originals = new Map();
  // Por defecto, cualquier método no configurado por el test falla de forma
  // explícita para detectar llamadas inesperadas.
  for (const [repo, methods, label] of GROUPS) {
    const saved = {};
    for (const name of methods) {
      saved[name] = repo[name];
      repo[name] = async () => {
        throw new Error(`Llamada inesperada a ${label}.${name}`);
      };
    }
    originals.set(repo, saved);
  }

  originalGetConnection = poolModule.pool.getConnection;
  connection = fakeConnection();
  poolModule.pool.getConnection = async () => connection;

  // La galería vacía es el caso habitual y la piden casi todos los casos de uso.
  productImageRepository.findByProductId = async () => [];
  productImageRepository.findByProductIds = async () => [];
});

test.afterEach(() => {
  for (const [repo, saved] of originals) Object.assign(repo, saved);
  poolModule.pool.getConnection = originalGetConnection;
});

// --- create ---------------------------------------------------------------

test('create genera el slug, nace en borrador y crea la variante por defecto', async () => {
  let createdWith = null;
  let variantWith = null;
  subcategoryRepository.findById = async () => ({ id: 3, nombre: 'Laptops' });
  productRepository.existsBySlug = async () => false;
  productRepository.create = async (data) => {
    createdWith = data;
    return 7;
  };
  productRepository.createDefaultVariant = async (data) => {
    variantWith = data;
    return 11;
  };
  productRepository.findById = async (id) => dbRow({ id, estado: PRODUCT_STATUS.BORRADOR });

  const result = await productService.create(42, {
    subcategoriaId: 3,
    titulo: '  Laptop Dell XPS 13  ',
    precio: 1500,
    condicion: 'usado',
  });

  assert.equal(createdWith.slug, 'laptop-dell-xps-13');
  assert.equal(createdWith.titulo, 'Laptop Dell XPS 13');
  assert.equal(createdWith.vendedorId, 42);
  assert.equal(createdWith.estado, PRODUCT_STATUS.BORRADOR);
  assert.equal(createdWith.marcaId, null);
  // La variante nace con el mismo precio que el producto (decisión 2).
  assert.deepEqual(variantWith, { productoId: 7, precio: 1500 });
  assert.equal(result.estado, PRODUCT_STATUS.BORRADOR);
});

test('create escribe producto y variante en una sola transacción', async () => {
  subcategoryRepository.findById = async () => ({ id: 3 });
  productRepository.existsBySlug = async () => false;
  productRepository.create = async () => 7;
  productRepository.createDefaultVariant = async () => 11;
  productRepository.findById = async () => dbRow();

  await productService.create(42, { subcategoriaId: 3, titulo: 'Algo', precio: 10 });

  assert.deepEqual(connection.calls, ['begin', 'commit', 'release']);
});

test('create revierte la transacción si falla la variante', async () => {
  subcategoryRepository.findById = async () => ({ id: 3 });
  productRepository.existsBySlug = async () => false;
  productRepository.create = async () => 7;
  productRepository.createDefaultVariant = async () => {
    throw new Error('fallo al crear la variante');
  };

  await assert.rejects(
    () => productService.create(42, { subcategoriaId: 3, titulo: 'Algo', precio: 10 }),
    /fallo al crear la variante/
  );
  assert.deepEqual(connection.calls, ['begin', 'rollback', 'release']);
});

test('create exige que la subcategoría exista', async () => {
  subcategoryRepository.findById = async () => null;

  await assert.rejects(
    () => productService.create(42, { subcategoriaId: 999, titulo: 'Algo' }),
    NotFoundError
  );
});

test('create valida la marca solo cuando llega marcaId', async () => {
  subcategoryRepository.findById = async () => ({ id: 3 });
  brandRepository.findById = async () => null;

  await assert.rejects(
    () => productService.create(42, { subcategoriaId: 3, marcaId: 5, titulo: 'Algo' }),
    NotFoundError
  );
});

test('create rechaza un slug ya usado con 409', async () => {
  subcategoryRepository.findById = async () => ({ id: 3 });
  productRepository.existsBySlug = async () => true;

  await assert.rejects(
    () => productService.create(42, { subcategoriaId: 3, titulo: 'Repetido' }),
    ConflictError
  );
});

test('create aplica precio 0 y condición nuevo por defecto', async () => {
  let createdWith = null;
  subcategoryRepository.findById = async () => ({ id: 3 });
  productRepository.existsBySlug = async () => false;
  productRepository.create = async (data) => {
    createdWith = data;
    return 7;
  };
  productRepository.createDefaultVariant = async () => 11;
  productRepository.findById = async () => dbRow();

  await productService.create(42, { subcategoriaId: 3, titulo: 'Sin precio' });

  assert.equal(createdWith.precio, 0);
  assert.equal(createdWith.condicion, 'nuevo');
});

// --- update ---------------------------------------------------------------

test('update sincroniza la variante cuando cambia el precio', async () => {
  let syncedWith = null;
  productRepository.findById = async () => dbRow({ precio: '1500.00' });
  productRepository.update = async () => {};
  productRepository.syncVariantPrice = async (id, precio) => {
    syncedWith = { id, precio };
    return 1;
  };

  await productService.update(7, { precio: 1200 });

  assert.deepEqual(syncedWith, { id: 7, precio: 1200 });
  assert.deepEqual(connection.calls, ['begin', 'commit', 'release']);
});

test('update revierte el precio del producto si falla la sincronización de la variante', async () => {
  productRepository.findById = async () => dbRow({ precio: '1500.00' });
  productRepository.update = async () => {};
  productRepository.syncVariantPrice = async () => {
    throw new Error('fallo al sincronizar la variante');
  };

  await assert.rejects(
    () => productService.update(7, { precio: 1200 }),
    /fallo al sincronizar la variante/
  );
  // Sin rollback, el producto quedaría a 1200 y la variante a 1500.
  assert.deepEqual(connection.calls, ['begin', 'rollback', 'release']);
});

test('update no toca la variante si el precio no cambia', async () => {
  productRepository.findById = async () => dbRow({ precio: '1500.00' });
  productRepository.update = async () => {};
  // syncVariantPrice sigue lanzando: si se llamara, el test fallaría.

  const result = await productService.update(7, { precio: 1500 });

  assert.equal(result.precio, 1500);
});

test('update recalcula el slug al cambiar el título y detecta duplicados', async () => {
  productRepository.findById = async () => dbRow();
  productRepository.existsBySlug = async () => true;

  await assert.rejects(() => productService.update(7, { titulo: 'Otro título' }), ConflictError);
});

test('update admite marcaId null para desasociar la marca', async () => {
  let updatedWith = null;
  productRepository.findById = async () => dbRow({ marca_id: 5 });
  productRepository.update = async (_id, fields) => {
    updatedWith = fields;
  };

  await productService.update(7, { marcaId: null });

  assert.equal(updatedWith.marca_id, null);
});

test('update lanza 404 si el producto no existe', async () => {
  productRepository.findById = async () => null;

  await assert.rejects(() => productService.update(7, { titulo: 'x' }), NotFoundError);
});

// --- visibilidad ------------------------------------------------------------

test('getById oculta un borrador a un usuario anónimo', async () => {
  productRepository.findById = async () => dbRow({ estado: PRODUCT_STATUS.BORRADOR });

  await assert.rejects(() => productService.getById(7, null), NotFoundError);
});

test('getById oculta un borrador a un usuario que no es el dueño', async () => {
  productRepository.findById = async () => dbRow({ estado: PRODUCT_STATUS.BORRADOR });

  await assert.rejects(() => productService.getById(7, { id: 99 }), NotFoundError);
});

test('getById muestra el borrador a su dueño', async () => {
  productRepository.findById = async () => dbRow({ estado: PRODUCT_STATUS.BORRADOR });

  const result = await productService.getById(7, { id: 42 });

  assert.equal(result.estado, PRODUCT_STATUS.BORRADOR);
});

test('getBySlug aplica la misma regla de visibilidad', async () => {
  productRepository.findBySlug = async () => dbRow({ estado: PRODUCT_STATUS.PAUSADO });

  await assert.rejects(() => productService.getBySlug('x', null), NotFoundError);
  assert.equal((await productService.getBySlug('x', { id: 42 })).estado, PRODUCT_STATUS.PAUSADO);
});

// --- listados ---------------------------------------------------------------

test('list restringe el catálogo público al estado activo', async () => {
  let calledWith = null;
  productRepository.findAll = async (options) => {
    calledWith = options;
    return { rows: [dbRow()], total: 1 };
  };

  const result = await productService.list({ page: '2', limit: '5', orden: 'precio_asc' });

  assert.deepEqual(calledWith.estados, [PRODUCT_STATUS.ACTIVO]);
  assert.equal(calledWith.orden, 'precio_asc');
  assert.deepEqual(result.pagination, { page: 2, limit: 5, total: 1, totalPages: 1 });
});

test('list ignora un orden desconocido y cae en el valor por defecto', async () => {
  let calledWith = null;
  productRepository.findAll = async (options) => {
    calledWith = options;
    return { rows: [], total: 0 };
  };

  await productService.list({ orden: 'precio_asc; DROP TABLE productos' });

  assert.equal(calledWith.orden, productRepository.DEFAULT_ORDER);
});

test('listByOwner no filtra por estado e incluye los borradores', async () => {
  let calledWith = null;
  productRepository.findAll = async (options) => {
    calledWith = options;
    return { rows: [dbRow({ estado: PRODUCT_STATUS.BORRADOR })], total: 1 };
  };

  const result = await productService.listByOwner(42, {});

  assert.equal(calledWith.estados, null);
  assert.equal(calledWith.vendedorId, 42);
  assert.equal(result.data[0].estado, PRODUCT_STATUS.BORRADOR);
});

test('list admite exactamente los cuatro órdenes acordados', async () => {
  const ORDENES = ['recientes', 'precio_asc', 'precio_desc', 'antiguos'];
  let calledWith = null;
  productRepository.findAll = async (options) => {
    calledWith = options;
    return { rows: [], total: 0 };
  };

  for (const orden of ORDENES) {
    await productService.list({ orden });
    assert.equal(calledWith.orden, orden, `el orden ${orden} debe llegar al repositorio`);
  }

  // La lista blanca del repositorio no admite nada más: cualquier añadido
  // futuro debe ser deliberado.
  assert.deepEqual(Object.keys(productRepository.ORDER_BY).sort(), [...ORDENES].sort());
  assert.equal(productRepository.DEFAULT_ORDER, 'recientes');
});

test('todo orden desempata por id para que la paginación sea estable', () => {
  for (const [nombre, expresion] of Object.entries(productRepository.ORDER_BY)) {
    assert.match(expresion, /p\.id (ASC|DESC)$/, `el orden ${nombre} debe desempatar por id`);
  }
});

test('list traduce page y limit a offset y calcula totalPages', async () => {
  let calledWith = null;
  productRepository.findAll = async (options) => {
    calledWith = options;
    return { rows: [], total: 42 };
  };

  const result = await productService.list({ page: '3', limit: '10' });

  assert.equal(calledWith.limit, 10);
  assert.equal(calledWith.offset, 20);
  assert.deepEqual(result.pagination, { page: 3, limit: 10, total: 42, totalPages: 5 });
});

test('list traslada los filtros del catálogo al repositorio', async () => {
  let calledWith = null;
  productRepository.findAll = async (options) => {
    calledWith = options;
    return { rows: [], total: 0 };
  };

  await productService.list({
    q: 'laptop',
    categoriaId: '1',
    subcategoriaId: '3',
    marcaId: '5',
    vendedorId: '42',
    condicion: 'usado',
    precioMin: '100',
    precioMax: '900',
  });

  assert.equal(calledWith.q, 'laptop');
  assert.equal(calledWith.categoriaId, 1);
  assert.equal(calledWith.subcategoriaId, 3);
  assert.equal(calledWith.marcaId, 5);
  assert.equal(calledWith.vendedorId, 42);
  assert.equal(calledWith.condicion, 'usado');
  assert.equal(calledWith.precioMin, 100);
  assert.equal(calledWith.precioMax, 900);
});

test('list descarta una condición que no pertenece al ENUM', async () => {
  let calledWith = null;
  productRepository.findAll = async (options) => {
    calledWith = options;
    return { rows: [], total: 0 };
  };

  await productService.list({ condicion: 'reacondicionado' });

  assert.equal(calledWith.condicion, null);
});

test('ningún listado pide los productos borrados', async () => {
  const recibidos = [];
  productRepository.findAll = async (options) => {
    recibidos.push(options.includeDeleted);
    return { rows: [], total: 0 };
  };

  await productService.list({});
  await productService.listByOwner(42, {});

  // El repositorio filtra `deleted_at IS NULL` salvo que se pida lo contrario:
  // el service nunca lo pide, ni siquiera para el dueño.
  assert.deepEqual(recibidos, [undefined, undefined]);
});

test('el listado resuelve la galería en una sola consulta, no una por producto', async () => {
  let llamadas = 0;
  let pedidos = null;
  productRepository.findAll = async () => ({
    rows: [dbRow({ id: 1 }), dbRow({ id: 2 }), dbRow({ id: 3 })],
    total: 3,
  });
  productImageRepository.findByProductIds = async (ids) => {
    llamadas += 1;
    pedidos = ids;
    return [
      { id: 10, producto_id: 1, url: '/uploads/a.webp', orden: 0, es_principal: 1 },
      { id: 11, producto_id: 3, url: '/uploads/b.webp', orden: 0, es_principal: 1 },
    ];
  };

  const result = await productService.list({});

  assert.equal(llamadas, 1);
  assert.deepEqual(pedidos, [1, 2, 3]);
  assert.equal(result.data[0].imagenes.length, 1);
  // Un producto sin imágenes recibe una galería vacía, no undefined.
  assert.deepEqual(result.data[1].imagenes, []);
  assert.equal(result.data[2].imagenes[0].id, 11);
});

test('un listado vacío no consulta la galería', async () => {
  productRepository.findAll = async () => ({ rows: [], total: 0 });
  productImageRepository.findByProductIds = async () => {
    throw new Error('no debe consultarse la galería sin productos');
  };

  const result = await productService.list({});

  assert.deepEqual(result.data, []);
});

test('la respuesta no expone el concepto de variante', async () => {
  productRepository.findById = async () => dbRow();

  const result = await productService.getById(7, null);

  const serializado = JSON.stringify(result);
  assert.ok(!serializado.includes('variante'));
  assert.ok(!serializado.includes('variant'));
  assert.equal(result.precio, 1500);
  assert.equal(typeof result.precio, 'number');
});

// --- estado y borrado -------------------------------------------------------

test('changeStatus publica un borrador', async () => {
  let updatedWith = null;
  const rows = [
    dbRow({ estado: PRODUCT_STATUS.BORRADOR }),
    dbRow({ estado: PRODUCT_STATUS.ACTIVO }),
  ];
  productRepository.findById = async () => rows.shift();
  productRepository.update = async (_id, fields) => {
    updatedWith = fields;
  };

  const result = await productService.changeStatus(7, PRODUCT_STATUS.ACTIVO);

  assert.deepEqual(updatedWith, { estado: PRODUCT_STATUS.ACTIVO });
  assert.equal(result.estado, PRODUCT_STATUS.ACTIVO);
});

test('changeStatus rechaza un estado no asignable por el dueño', async () => {
  productRepository.findById = async () => dbRow({ estado: PRODUCT_STATUS.ACTIVO });

  await assert.rejects(() => productService.changeStatus(7, PRODUCT_STATUS.VENDIDO), ConflictError);
});

test('changeStatus no saca a un producto vendido de su estado final', async () => {
  productRepository.findById = async () => dbRow({ estado: PRODUCT_STATUS.VENDIDO });

  await assert.rejects(() => productService.changeStatus(7, PRODUCT_STATUS.ACTIVO), ConflictError);
});

test('remove hace borrado lógico y marca el estado eliminado', async () => {
  let softDeletedWith = null;
  productRepository.findById = async () => dbRow();
  productRepository.softDelete = async (id, estado) => {
    softDeletedWith = { id, estado };
    return true;
  };

  await productService.remove(7);

  assert.deepEqual(softDeletedWith, { id: 7, estado: PRODUCT_STATUS.ELIMINADO });
});

test('remove lanza 404 si el producto no existe', async () => {
  productRepository.findById = async () => null;

  await assert.rejects(() => productService.remove(7), NotFoundError);
});
