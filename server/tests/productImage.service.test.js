'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const path = require('node:path');

const env = require('../src/config/env');
const poolModule = require('../src/database/pool');
const productImageRepository = require('../src/repositories/productImage.repository');
const productImageService = require('../src/services/productImage.service');
const { publicUrl } = require('../src/utils/uploads');
const { NotFoundError, ValidationError } = require('../src/errors');

// El service se aísla sustituyendo los métodos del repositorio (singleton) y el
// `getConnection` del pool, de modo que no se toca MySQL.
//
// La limpieza de archivos huérfanos sí se comprueba contra el disco real: el
// service destructura `utils/uploads` al cargarse, así que sustituir el módulo
// no tendría efecto. Los archivos se crean en `env.upload.dir` con un prefijo
// propio y se borran en el afterEach.

const PREFIJO = 'test-imagen-';

const dbRow = (over = {}) => ({
  id: 40,
  producto_id: 7,
  variante_id: null,
  url: '/uploads/foto-a.webp',
  orden: 0,
  es_principal: 1,
  created_at: '2026-08-01T10:00:00.000Z',
  updated_at: '2026-08-01T10:00:00.000Z',
  ...over,
});

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

const IMAGE_METHODS = [
  'findByProductId',
  'findById',
  'create',
  'update',
  'remove',
  'clearPrincipal',
  'countByProductId',
  'maxOrden',
];

// Crea un archivo real en el directorio de subidas y devuelve el nombre que
// multer habría generado.
async function crearArchivo(nombre) {
  await fs.mkdir(env.upload.dir, { recursive: true });
  await fs.writeFile(path.join(env.upload.dir, nombre), 'bytes');
  return nombre;
}

const existe = async (nombre) =>
  fs
    .access(path.join(env.upload.dir, nombre))
    .then(() => true)
    .catch(() => false);

let originals;
let originalGetConnection;
let connection;

test.beforeEach(() => {
  originals = {};
  for (const name of IMAGE_METHODS) {
    originals[name] = productImageRepository[name];
    productImageRepository[name] = async () => {
      throw new Error(`Llamada inesperada a productImageRepository.${name}`);
    };
  }

  originalGetConnection = poolModule.pool.getConnection;
  connection = fakeConnection();
  poolModule.pool.getConnection = async () => connection;
});

test.afterEach(async () => {
  Object.assign(productImageRepository, originals);
  poolModule.pool.getConnection = originalGetConnection;

  // Barre cualquier archivo que un test haya dejado atrás.
  const entradas = await fs.readdir(env.upload.dir).catch(() => []);
  await Promise.all(
    entradas
      .filter((nombre) => nombre.startsWith(PREFIJO))
      .map((nombre) => fs.unlink(path.join(env.upload.dir, nombre)).catch(() => {}))
  );
});

// --- addImages --------------------------------------------------------------

test('addImages rechaza una subida sin archivos con 422', async () => {
  await assert.rejects(() => productImageService.addImages(7, []), ValidationError);
});

test('addImages escribe toda la galería en una sola transacción', async () => {
  productImageRepository.countByProductId = async () => 0;
  productImageRepository.maxOrden = async () => -1;
  productImageRepository.create = async () => 40;
  productImageRepository.findByProductId = async () => [dbRow()];

  await productImageService.addImages(7, [{ filename: 'a.webp' }, { filename: 'b.webp' }]);

  assert.deepEqual(connection.calls, ['begin', 'commit', 'release']);
});

test('addImages marca principal la primera imagen de un producto sin galería', async () => {
  const creadas = [];
  productImageRepository.countByProductId = async () => 0;
  productImageRepository.maxOrden = async () => -1;
  productImageRepository.create = async (data) => {
    creadas.push(data);
    return creadas.length;
  };
  productImageRepository.findByProductId = async () => [];

  await productImageService.addImages(7, [{ filename: 'a.webp' }, { filename: 'b.webp' }]);

  assert.equal(creadas[0].esPrincipal, true);
  assert.equal(creadas[1].esPrincipal, false);
  // La numeración arranca en 0 cuando la galería está vacía.
  assert.deepEqual(
    creadas.map((c) => c.orden),
    [0, 1]
  );
  assert.equal(creadas[0].url, publicUrl('a.webp'));
});

test('addImages no toca la principal si el producto ya tiene imágenes', async () => {
  const creadas = [];
  productImageRepository.countByProductId = async () => 3;
  productImageRepository.maxOrden = async () => 4;
  productImageRepository.create = async (data) => {
    creadas.push(data);
    return creadas.length;
  };
  productImageRepository.findByProductId = async () => [];

  await productImageService.addImages(7, [{ filename: 'c.webp' }]);

  assert.equal(creadas[0].esPrincipal, false);
  // Continúa la numeración desde la última imagen, no desde 0.
  assert.equal(creadas[0].orden, 5);
});

test('addImages borra los archivos huérfanos si falla la escritura en BD', async () => {
  const a = await crearArchivo(`${PREFIJO}a.webp`);
  const b = await crearArchivo(`${PREFIJO}b.webp`);

  productImageRepository.countByProductId = async () => 0;
  productImageRepository.maxOrden = async () => -1;
  productImageRepository.create = async () => {
    throw new Error('fallo al insertar la imagen');
  };

  await assert.rejects(
    () => productImageService.addImages(7, [{ filename: a }, { filename: b }]),
    /fallo al insertar la imagen/
  );

  assert.deepEqual(connection.calls, ['begin', 'rollback', 'release']);
  assert.equal(await existe(a), false, 'el archivo huérfano debe borrarse');
  assert.equal(await existe(b), false, 'el archivo huérfano debe borrarse');
});

// --- update -----------------------------------------------------------------

test('update marca la nueva principal y desmarca la anterior en la misma transacción', async () => {
  const orden = [];
  productImageRepository.findById = async () => dbRow({ id: 41, es_principal: 0 });
  productImageRepository.clearPrincipal = async (productoId, options) => {
    orden.push({ paso: 'clear', productoId, exceptId: options.exceptId });
  };
  productImageRepository.update = async (id, fields) => {
    orden.push({ paso: 'update', id, fields });
  };
  productImageRepository.findByProductId = async () => [dbRow({ id: 41 })];

  await productImageService.update(7, 41, { esPrincipal: true });

  assert.deepEqual(orden, [
    { paso: 'clear', productoId: 7, exceptId: 41 },
    { paso: 'update', id: 41, fields: { es_principal: true } },
  ]);
  assert.deepEqual(connection.calls, ['begin', 'commit', 'release']);
});

test('update solo reordena sin tocar la imagen principal', async () => {
  let updatedWith = null;
  productImageRepository.findById = async () => dbRow({ id: 41 });
  // clearPrincipal sigue lanzando: si se llamara, el test fallaría.
  productImageRepository.update = async (_id, fields) => {
    updatedWith = fields;
  };
  productImageRepository.findByProductId = async () => [];

  await productImageService.update(7, 41, { orden: 3 });

  assert.deepEqual(updatedWith, { orden: 3 });
});

test('update devuelve la galería completa actualizada', async () => {
  productImageRepository.findById = async () => dbRow({ id: 41 });
  productImageRepository.update = async () => {};
  productImageRepository.findByProductId = async () => [
    dbRow({ id: 41, es_principal: 1 }),
    dbRow({ id: 42, es_principal: 0, orden: 1 }),
  ];

  const galeria = await productImageService.update(7, 41, { orden: 0 });

  assert.equal(galeria.length, 2);
  assert.equal(galeria[0].esPrincipal, true);
  assert.equal(galeria[1].esPrincipal, false);
  // El modelo público expone camelCase, no las columnas crudas.
  assert.equal(galeria[0].productoId, 7);
});

test('update lanza 404 si la imagen no pertenece al producto', async () => {
  // El repositorio acota por producto: un imageId ajeno no se encuentra.
  productImageRepository.findById = async () => null;

  await assert.rejects(() => productImageService.update(7, 999, { orden: 1 }), NotFoundError);
});

// --- remove -----------------------------------------------------------------

test('remove elimina la fila y el archivo de forma definitiva', async () => {
  const archivo = await crearArchivo(`${PREFIJO}borrar.webp`);
  let removedId = null;

  productImageRepository.findById = async () => dbRow({ id: 41, url: publicUrl(archivo) });
  productImageRepository.remove = async (id) => {
    removedId = id;
    return true;
  };

  await productImageService.remove(7, 41);

  assert.equal(removedId, 41);
  assert.equal(await existe(archivo), false, 'el archivo debe borrarse con la fila');
});

test('remove no borra el archivo si falla el borrado de la fila', async () => {
  const archivo = await crearArchivo(`${PREFIJO}intacto.webp`);

  productImageRepository.findById = async () => dbRow({ id: 41, url: publicUrl(archivo) });
  productImageRepository.remove = async () => {
    throw new Error('fallo al borrar la fila');
  };

  await assert.rejects(() => productImageService.remove(7, 41), /fallo al borrar la fila/);

  assert.equal(await existe(archivo), true, 'sin fila borrada no debe tocarse el archivo');
});

test('remove tolera que el archivo ya no esté en disco', async () => {
  productImageRepository.findById = async () => dbRow({ id: 41, url: '/uploads/no-existe.webp' });
  productImageRepository.remove = async () => true;

  await productImageService.remove(7, 41);
});

test('remove lanza 404 si la imagen no existe', async () => {
  productImageRepository.findById = async () => null;

  await assert.rejects(() => productImageService.remove(7, 41), NotFoundError);
});

// --- list -------------------------------------------------------------------

test('list proyecta la galería al modelo público', async () => {
  productImageRepository.findByProductId = async () => [dbRow({ es_principal: 1 })];

  const galeria = await productImageService.list(7);

  assert.deepEqual(Object.keys(galeria[0]), [
    'id',
    'productoId',
    'url',
    'orden',
    'esPrincipal',
    'createdAt',
    'updatedAt',
  ]);
  // `variante_id` no se expone: la API no habla de variantes.
  assert.equal(galeria[0].varianteId, undefined);
});
